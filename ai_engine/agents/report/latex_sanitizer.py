"""
LaTeX Sanitizer Module

Post-processes LaTeX content to fix common LLM output issues:
1. Remove Markdown artifacts (##, **, *, ```)
2. Fix broken math environments
3. Sanitize Unicode corruption
4. Validate structure balance
5. Remove meta-instructions
"""

import re
from typing import Tuple, List


# Problematic patterns that indicate meta-instructions or hallucinations
META_INSTRUCTION_PATTERNS = [
    r'\(Word count:.*?\)',
    r'\(approximately.*?words\)',
    r'This \d+ words complete',
    r'\[To be determined.*?\]',
    r'\[Insert.*?here\]',
    r'\[Include.*?here\]',
    r'hypothetical content',
    r'hypothetical paper',
    r'Hypothetical Paper Preview',
    r'\(hypothetical.*?\)',
    r'conceptualized results',
    r'conceptualized based on',
    r'Tables?.*?not included due to',
    r'Figures?.*?not included due to',
    r'\(Visualize a.*?\)',
]

# Unicode corruption replacements
UNICODE_FIXES = {
    '': "'",
    '': "'",
    '"': '"',
    '"': '"',
    '': '-',
    '–': '--',
    '—': '---',
    '…': '...',
    '′': "'",
    '¡': '',
    '': '',
    '\ufeff': '',  # BOM
    '\u200b': '',  # Zero-width space
}

# Markdown to remove from LaTeX content
MARKDOWN_PATTERNS = [
    (r'^#{1,6}\s+', ''),  # Headers ##, ###, etc.
    (r'\*\*\*(.+?)\*\*\*', r'\\textbf{\\textit{\1}}'),  # Bold-italic
    (r'\*\*(.+?)\*\*', r'\\textbf{\1}'),  # Bold
    (r'(?<![\\])\*([^*]+?)\*(?!\*)', r'\\textit{\1}'),  # Italic (not already escaped)
    (r'```.*?```', ''),  # Code blocks
    (r'`([^`]+)`', r'\\texttt{\1}'),  # Inline code
    (r'^\s*>\s+', ''),  # Blockquotes
    (r'\[([^\]]+)\]\([^)]+\)', r'\1'),  # Links [text](url) -> text
]


def sanitize_unicode(content: str) -> str:
    """Replace corrupted Unicode characters with safe equivalents."""
    for bad, good in UNICODE_FIXES.items():
        content = content.replace(bad, good)
    return content


def remove_markdown_artifacts(content: str) -> str:
    """Remove Markdown syntax that shouldn't appear in LaTeX."""
    for pattern, replacement in MARKDOWN_PATTERNS:
        content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
    
    # Fix escaped Markdown that LLM produces (\#\#)
    content = re.sub(r'\\#\\#\\#\\#', '', content)
    content = re.sub(r'\\#\\#\\#', '', content)
    content = re.sub(r'\\#\\#', '', content)
    
    return content


def remove_meta_instructions(content: str) -> str:
    """Remove meta-instructions and hypothetical markers."""
    for pattern in META_INSTRUCTION_PATTERNS:
        content = re.sub(pattern, '', content, flags=re.IGNORECASE)
    
    # Remove lines that are pure placeholders
    lines = content.split('\n')
    cleaned_lines = []
    for line in lines:
        stripped = line.strip().lower()
        if stripped in ['[references]', '[to be updated]', '[placeholder]']:
            continue
        cleaned_lines.append(line)
    
    return '\n'.join(cleaned_lines)


def fix_math_environments(content: str) -> str:
    """Fix common math environment issues."""
    
    # Fix broken fractions: \frac{a}b -> \frac{a}{b}
    content = re.sub(
        r'\\frac\{([^}]+)\}([^{])',
        r'\\frac{\1}{\2}',
        content
    )
    
    # Fix space in math: F1\ Score -> F1~Score
    content = re.sub(r'(\w)\\ (\w)', r'\1~\2', content)
    
    # Fix malformed \left( without \right)
    left_count = len(re.findall(r'\\left[(\[]', content))
    right_count = len(re.findall(r'\\right[)\]]', content))
    if left_count > right_count:
        # Try to fix by removing orphaned \left
        content = re.sub(r'\\left\(([^)]+)\)', r'(\1)', content)
    
    # Fix inline math with line breaks (convert to display math)
    content = re.sub(
        r'\$([^$]*\n[^$]*)\$',
        lambda m: '\\[' + m.group(1).replace('\n', ' ') + '\\]',
        content
    )
    
    # Fix \textit inside math (should be \text)
    content = re.sub(r'(\$[^$]*?)\\textit\{', r'\1\\text{', content)
    content = re.sub(r'(\\[[^\]]*?)\\textit\{', r'\1\\text{', content)
    
    return content


def fix_special_characters(content: str) -> str:
    """Escape special LaTeX characters that weren't properly escaped."""
    
    # Only escape if not already escaped and not in a command
    # & not preceded by \
    content = re.sub(r'(?<!\\)&(?!\\)', r'\\&', content)
    
    # % not preceded by \
    content = re.sub(r'(?<!\\)%', r'\\%', content)
    
    # # not preceded by \ and not part of color code
    content = re.sub(r'(?<!\\)#(?![0-9a-fA-F]{6}|[0-9a-fA-F]{3})', r'\\#', content)

    # Escape underscores if not in math mode or URL
    # This is tricky with regex. A safe bet for LLM output is to escape all _ 
    # and then unescape those inside $...$ or \url{...}
    # For now, we'll do a simple pass that avoids typical command usages like \usepackage{..._...}
    
    # 1. Escape ALL underscores first (temporary placeholder)
    # content = content.replace('_', '___TEMP_UNDERSCORE___')
    
    # ... actually, implementing a full robust latex parser is hard. 
    # Let's just catch the most common text-mode underscores.
    
    # Escape _ if it's surrounded by spaces or words, and not inside a macro like \something_else
    # content = re.sub(r'(?<!\\)_', r'\\_', content) 
    # (Commented out because it breaks math mode heavily. Better to let the LLM handle it, 
    # or rely on the `pipeline.py` which already has `_escape_latex` method. 
    # The pipeline calls `_markdown_to_latex` which calls `_escape_latex_content`.
    # This sanitizer is a post-processor.
    
    return content


def validate_environment_balance(content: str) -> Tuple[bool, List[str]]:
    """Check if all LaTeX environments are properly closed."""
    errors = []
    
    # Find all \begin{env} and \end{env}
    begins = re.findall(r'\\begin\{(\w+)\}', content)
    ends = re.findall(r'\\end\{(\w+)\}', content)
    
    begin_counts = {}
    for env in begins:
        begin_counts[env] = begin_counts.get(env, 0) + 1
    
    end_counts = {}
    for env in ends:
        end_counts[env] = end_counts.get(env, 0) + 1
    
    # Check for mismatches
    all_envs = set(begin_counts.keys()) | set(end_counts.keys())
    for env in all_envs:
        b = begin_counts.get(env, 0)
        e = end_counts.get(env, 0)
        if b > e:
            errors.append(f"Missing \\end{{{env}}} ({b - e} unclosed)")
        elif e > b:
            errors.append(f"Extra \\end{{{env}}} ({e - b} unmatched)")
    
    return len(errors) == 0, errors


def fix_environment_balance(content: str) -> str:
    """Attempt to fix unbalanced environments."""
    
    # Common fixes
    environments = ['abstract', 'itemize', 'enumerate', 'table', 'figure', 'equation']
    
    for env in environments:
        begin_pattern = f'\\begin{{{env}}}'
        end_pattern = f'\\end{{{env}}}'
        
        begin_count = content.count(begin_pattern)
        end_count = content.count(end_pattern)
        
        # Add missing \end
        if begin_count > end_count:
            # Find last occurrence of \begin{env} and add \end before next \section
            for _ in range(begin_count - end_count):
                # Find \begin without matching \end
                pattern = f'(\\\\begin{{{env}}}[^\\\\]*?)(?=\\\\section|\\\\end{{document}})'
                match = re.search(pattern, content, re.DOTALL)
                if match:
                    insert_pos = match.end()
                    content = content[:insert_pos] + f'\n\\end{{{env}}}\n' + content[insert_pos:]
    
    return content


def sanitize_latex(content: str) -> str:
    """
    Main sanitization function - applies all fixes.
    
    Args:
        content: Raw LaTeX content from LLM
        
    Returns:
        Cleaned LaTeX content ready for compilation
    """
    # Order matters!
    
    # 1. Fix Unicode first (before any regex)
    content = sanitize_unicode(content)
    
    # 2. Remove Markdown artifacts
    content = remove_markdown_artifacts(content)
    
    # 3. Remove meta-instructions and hallucination markers
    content = remove_meta_instructions(content)
    
    # 4. Fix math environments
    content = fix_math_environments(content)
    
    # 5. Fix special characters
    content = fix_special_characters(content)
    
    # 6. Try to fix environment balance
    content = fix_environment_balance(content)
    
    # 7. Clean up excessive whitespace
    content = re.sub(r'\n{4,}', '\n\n\n', content)
    content = re.sub(r'[ \t]+\n', '\n', content)
    
    return content


def validate_latex(content: str) -> Tuple[bool, List[str]]:
    """
    Validate LaTeX content and return list of potential issues.
    
    Returns:
        (is_valid, list_of_warnings)
    """
    warnings = []
    
    # Check environment balance
    balanced, env_errors = validate_environment_balance(content)
    if not balanced:
        warnings.extend(env_errors)
    
    # Check for remaining Markdown
    if re.search(r'^#{1,6}\s', content, re.MULTILINE):
        warnings.append("Markdown headers (##) still present")
    
    if '**' in content:
        warnings.append("Markdown bold (**) still present")
    
    # Check for meta-instructions
    for pattern in META_INSTRUCTION_PATTERNS[:5]:
        if re.search(pattern, content, re.IGNORECASE):
            warnings.append(f"Meta-instruction pattern found: {pattern[:30]}...")
            break
    
    # Check for broken math
    if re.search(r'\$[^$]*\n[^$]*\$', content):
        warnings.append("Multi-line inline math detected")
    
    return len(warnings) == 0, warnings


# Quick test
if __name__ == "__main__":
    test_content = """
    \\#\\# This is a test
    *Abstract: This is a test abstract.*
    
    (Word count: approximately 200 words)
    
    $$F1\\ Score = 2\\textit{\\left(\\frac{Precision}Recall}{Precision+Recall}\\right)$$
    
    [To be determined based on actual data]
    
    hypothetical content here
    
    Tables not included due to format constraints.
    """
    
    cleaned = sanitize_latex(test_content)
    print("Cleaned:")
    print(cleaned)
    
    valid, warnings = validate_latex(cleaned)
    print(f"\nValid: {valid}")
    print(f"Warnings: {warnings}")
