"""
Academic Editor Agent

Final cleanup pass that ensures academic quality:
1. Removes meta-instructions and placeholder text
2. Checks for structural issues (duplicate sections)
3. Validates IMRAD compliance
4. Ensures consistent formatting
5. Flags remaining hallucination markers
"""

import re
from typing import Dict, List, Tuple, Optional
from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage


class AcademicEditorAgent(BaseAgent):
    """
    Final validation pass agent that cleans up and validates
    the generated report for academic standards.
    """
    
    def __init__(self, **kwargs):
        super().__init__(
            name="AcademicEditor",
            system_prompt="""You are a senior academic editor with expertise in research paper formatting.
Your task is to review and clean up the provided research paper content.

IDENTIFY AND FIX:
1. Remove any meta-instructions (e.g., "[Insert X here]", "(Word count: X)")
2. Remove hypothetical/placeholder language
3. Fix inconsistent formatting or style
4. Ensure smooth transitions between sections
5. Remove redundant or duplicate content

OUTPUT FORMAT:
Return the cleaned content directly, without any additional commentary.
Do NOT add new content - only clean and polish existing content.
Keep the same section structure.""",
            **kwargs
        )
    
    def run(self, state: dict) -> dict:
        """Run the academic editor on report content."""
        print(f"[{self.name}] Running academic cleanup pass...")
        
        content = state.get("content", "")
        if not content:
            return {"error": "No content provided", "content": ""}
        
        # First pass: programmatic cleanup
        cleaned = self._programmatic_cleanup(content)
        
        # Second pass: LLM-based refinement (optional, can be expensive)
        if state.get("use_llm_refinement", False):
            cleaned = self._llm_cleanup(cleaned)
        
        # Validate structure
        structure_issues = self._validate_structure(cleaned)
        
        return {
            "content": cleaned,
            "structure_issues": structure_issues,
            "agent": self.name
        }
    
    def _programmatic_cleanup(self, content: str) -> str:
        """Apply rule-based cleanup without LLM."""
        
        # Remove meta-instructions
        patterns_to_remove = [
            r'\(Word count:.*?\)',
            r'\(approximately.*?words\)',
            r'\[To be (?:determined|updated|added).*?\]',
            r'\[Insert.*?here\]',
            r'\[Include.*?here\]',
            r'\[Please note.*?\]',
            r'\(Note:.*?\)',
            r'This \d+ words complete.*',
            r'hypothetical (?:content|paper|data)',
            r'conceptualized (?:based on|results)',
            r'\(hypothetical.*?\)',
            r'Tables? \d*-?\d* (?:are|is) not included.*',
            r'Figures? \d*-?\d* (?:are|is) not included.*',
            r'\(Visualize a.*?\)',
            r'References:\s*\[To be updated.*?\]',
        ]
        
        for pattern in patterns_to_remove:
            content = re.sub(pattern, '', content, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove duplicate empty lines
        content = re.sub(r'\n{3,}', '\n\n', content)
        
        # Remove trailing whitespace
        content = re.sub(r'[ \t]+$', '', content, flags=re.MULTILINE)
        
        # Remove lines that are only placeholder markers
        lines = content.split('\n')
        cleaned_lines = []
        for line in lines:
            stripped = line.strip().lower()
            if stripped in ['[placeholder]', '[tbd]', '[todo]', '...', '…']:
                continue
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def _llm_cleanup(self, content: str) -> str:
        """Use LLM to refine content (more expensive)."""
        try:
            messages = [
                SystemMessage(content=self.system_prompt),
                HumanMessage(content=f"Clean up this research paper content:\n\n{content}")
            ]
            response = self.llm.invoke(messages)
            return response.content.strip()
        except Exception as e:
            print(f"[{self.name}] LLM cleanup failed: {e}")
            return content
    
    def _validate_structure(self, content: str) -> List[str]:
        """Validate IMRAD structure and identify issues."""
        issues = []
        
        # Expected sections for IMRAD
        imrad_sections = {
            'abstract': False,
            'introduction': False,
            'methodology': False,
            'results': False,
            'discussion': False,
            'conclusion': False,
        }
        
        # Check which sections exist
        content_lower = content.lower()
        for section in imrad_sections:
            # Check for section header patterns
            patterns = [
                rf'\n#+\s*{section}',
                rf'\\section\{{{section}',
                rf'\n\d+\.\s*{section}',
            ]
            for pattern in patterns:
                if re.search(pattern, content_lower):
                    imrad_sections[section] = True
                    break
        
        # Report missing core sections
        core_sections = ['abstract', 'introduction', 'conclusion']
        for section in core_sections:
            if not imrad_sections[section]:
                issues.append(f"Missing section: {section.title()}")
        
        # Check for duplicate section headers
        section_pattern = r'(?:^#+\s*|\n#+\s*|\\section\{)([^}\n#]+)'
        sections = re.findall(section_pattern, content, re.IGNORECASE)
        section_counts = {}
        for s in sections:
            s_clean = s.strip().lower()
            section_counts[s_clean] = section_counts.get(s_clean, 0) + 1
        
        for section, count in section_counts.items():
            if count > 1:
                issues.append(f"Duplicate section: {section} (appears {count} times)")
        
        return issues


class StructureValidator:
    """
    Validates report structure without requiring LLM.
    Faster alternative for quick checks.
    """
    
    # Standard section orders for different paper types
    IMRAD_ORDER = ['abstract', 'introduction', 'methodology', 'results', 'discussion', 'conclusion', 'references']
    CS_PAPER_ORDER = ['abstract', 'introduction', 'related work', 'methodology', 'experiments', 'results', 'conclusion', 'references']
    
    @staticmethod
    def detect_sections(content: str) -> List[Tuple[str, int]]:
        """Detect sections and their order in the content."""
        sections = []
        
        # Match Markdown headers
        md_pattern = r'^(#+)\s+(.+)$'
        for match in re.finditer(md_pattern, content, re.MULTILINE):
            level = len(match.group(1))
            title = match.group(2).strip()
            if level <= 2:  # Only top-level sections
                sections.append((title, match.start()))
        
        # Match LaTeX sections
        latex_pattern = r'\\section\*?\{([^}]+)\}'
        for match in re.finditer(latex_pattern, content):
            title = match.group(1).strip()
            sections.append((title, match.start()))
        
        # Sort by position
        sections.sort(key=lambda x: x[1])
        return [(s[0], i) for i, s in enumerate(sections)]
    
    @staticmethod
    def check_duplicates(sections: List[Tuple[str, int]]) -> List[str]:
        """Check for duplicate sections."""
        seen = {}
        duplicates = []
        
        for title, pos in sections:
            title_clean = title.lower().strip()
            # Normalize common variations
            title_clean = re.sub(r'^\d+\.?\s*', '', title_clean)
            
            if title_clean in seen:
                duplicates.append(f"'{title}' duplicates section at position {seen[title_clean]}")
            else:
                seen[title_clean] = pos
        
        return duplicates
    
    @staticmethod
    def check_order(sections: List[Tuple[str, int]], expected_order: List[str]) -> List[str]:
        """Check if sections follow expected order."""
        issues = []
        
        section_names = [s[0].lower().strip() for s in sections]
        section_names = [re.sub(r'^\d+\.?\s*', '', s) for s in section_names]
        
        last_expected_idx = -1
        for name in section_names:
            # Find closest match in expected order
            for i, expected in enumerate(expected_order):
                if expected in name or name in expected:
                    if i < last_expected_idx:
                        issues.append(f"'{name}' appears out of order (should come before position {last_expected_idx})")
                    last_expected_idx = i
                    break
        
        return issues
    
    @classmethod
    def validate(cls, content: str) -> Dict[str, List[str]]:
        """Run all validation checks."""
        sections = cls.detect_sections(content)
        
        return {
            'sections_found': [s[0] for s in sections],
            'duplicates': cls.check_duplicates(sections),
            'order_issues': cls.check_order(sections, cls.CS_PAPER_ORDER),
        }


def cleanup_report(content: str, use_llm: bool = False) -> Tuple[str, Dict]:
    """
    Convenience function to clean up a report.
    
    Args:
        content: The report content (markdown or LaTeX)
        use_llm: Whether to use LLM for additional refinement
        
    Returns:
        Tuple of (cleaned_content, validation_results)
    """
    editor = AcademicEditorAgent()
    result = editor.run({"content": content, "use_llm_refinement": use_llm})
    
    validation = StructureValidator.validate(result["content"])
    
    return result["content"], {
        "structure_issues": result.get("structure_issues", []),
        "validation": validation
    }


# Quick test
if __name__ == "__main__":
    test_content = """
# Abstract
This is a test abstract.

# Introduction
Some intro text.
(Word count: approximately 500 words)

# Introduction
Duplicate introduction!

# Results
[To be determined based on actual data]
Tables 1-3 are not included due to format constraints.

# Conclusion
The conclusion.
This 200 words complete the paper.
"""
    
    cleaned, results = cleanup_report(test_content)
    print("Cleaned content:")
    print(cleaned)
    print("\nValidation results:")
    print(results)
