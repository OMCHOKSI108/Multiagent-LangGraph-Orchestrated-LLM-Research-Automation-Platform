"""
Citation Validator Module

Validates citations in research papers to detect:
1. Fake/invented journal names
2. Future-dated papers
3. Wikipedia as academic source
4. Inline citations without matching references
5. References never cited in text
6. Inconsistent citation style
"""

import re
from typing import Dict, List, Tuple, Set
from datetime import datetime


# Known fake or suspicious journal patterns
SUSPICIOUS_JOURNAL_PATTERNS = [
    r'Journal of (?:AI|Artificial Intelligence|Machine Learning) (?:Research|Applications|Studies)',
    r'AI (?:Research|Interpretability|Ethics) Journal',
    r'(?:Human-Computer|Machine-Human) (?:Interaction|Symbiosis) (?:Journal|Quarterly)',
    r'International (?:Review|Journal) (?:on|of) AI',
    r'(?:Future|Modern|Advanced) (?:Computing|AI|ML) (?:Journal|Review)',
]

# Known reputable venues (whitelist)
REPUTABLE_VENUES = [
    'arxiv', 'nips', 'neurips', 'icml', 'iclr', 'aaai', 'acl', 'emnlp', 'naacl',
    'cvpr', 'iccv', 'eccv', 'nature', 'science', 'cell', 'pnas', 'ieee', 'acm',
    'springer', 'elsevier', 'mit press', 'cambridge', 'oxford',
]


def extract_inline_citations(content: str) -> Set[str]:
    """Extract inline citation markers like [1], [2], [Smith et al., 2023]."""
    citations = set()
    
    # Numeric citations [1], [2], [1-3], [1, 2, 3]
    numeric_matches = re.findall(r'\[(\d+(?:\s*,\s*\d+)*(?:\s*-\s*\d+)?)\]', content)
    for match in numeric_matches:
        # Parse ranges and lists
        parts = re.split(r'[,\-]', match)
        for part in parts:
            part = part.strip()
            if part.isdigit():
                citations.add(part)
    
    # Author-date citations [Smith, 2023], [Smith et al., 2023]
    author_matches = re.findall(r'\[([A-Z][a-z]+(?:\s+et al\.?)?,?\s*\d{4})\]', content)
    for match in author_matches:
        citations.add(match)
    
    return citations


def extract_references(content: str) -> Dict[str, Dict]:
    """Extract references from the References section."""
    references = {}
    
    # Find References section
    ref_section_match = re.search(
        r'(?:References|Bibliography|Works Cited)[:\s]*\n(.*?)(?=\\section|\Z)',
        content, re.DOTALL | re.IGNORECASE
    )
    
    if not ref_section_match:
        return references
    
    ref_text = ref_section_match.group(1)
    
    # Parse numbered references [1] Author, Title...
    numbered_refs = re.finditer(
        r'\[(\d+)\]\s*([^[]+?)(?=\[\d+\]|\Z)',
        ref_text, re.DOTALL
    )
    
    for match in numbered_refs:
        num = match.group(1)
        ref_content = match.group(2).strip()
        
        # Extract year
        year_match = re.search(r'\b(19|20)\d{2}\b', ref_content)
        year = int(year_match.group()) if year_match else None
        
        references[num] = {
            'content': ref_content,
            'year': year,
            'is_suspicious': False
        }
    
    return references


def detect_fake_journals(content: str) -> List[str]:
    """Detect suspicious/fake journal names."""
    suspicious = []
    
    for pattern in SUSPICIOUS_JOURNAL_PATTERNS:
        matches = re.findall(pattern, content, re.IGNORECASE)
        suspicious.extend(matches)
    
    return list(set(suspicious))


def detect_future_citations(references: Dict[str, Dict]) -> List[str]:
    """Detect citations with future dates."""
    current_year = datetime.now().year
    future = []
    
    for ref_id, ref_data in references.items():
        year = ref_data.get('year')
        if year and year > current_year:
            future.append(f"[{ref_id}]: Year {year} is in the future")
    
    return future


def detect_wikipedia_citations(content: str) -> List[str]:
    """Detect Wikipedia used as academic source."""
    wiki_patterns = [
        r'Wikipedia(?:\s+contributors)?.*?\d{4}',
        r'https?://(?:\w+\.)?wikipedia\.org',
        r'\\textit\{Wikipedia\}',
    ]
    
    wiki_citations = []
    for pattern in wiki_patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        wiki_citations.extend(matches)
    
    return wiki_citations


def check_citation_reference_match(
    inline_citations: Set[str],
    references: Dict[str, Dict]
) -> Tuple[List[str], List[str]]:
    """Check if inline citations match references."""
    
    # Citations in text but not in references
    missing_refs = []
    for cite in inline_citations:
        if cite.isdigit() and cite not in references:
            missing_refs.append(f"[{cite}] cited but no matching reference")
    
    # References never cited
    unused_refs = []
    ref_ids = set(references.keys())
    cited_ids = {c for c in inline_citations if c.isdigit()}
    for ref_id in ref_ids - cited_ids:
        unused_refs.append(f"Reference [{ref_id}] never cited in text")
    
    return missing_refs, unused_refs


def detect_placeholder_citations(content: str) -> List[str]:
    """Detect placeholder citation markers."""
    placeholders = []
    
    patterns = [
        r'\[To be (?:determined|updated|added)\]',
        r'\[Insert (?:citation|reference|source)\s*here?\]',
        r'\[Author,?\s*Year\]',
        r'\[XX+\]',
        r'\[?\?\?+\]?',
        r'Publication Date\]',
        r'\[Accessed:?\s*\[',
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, content, re.IGNORECASE)
        placeholders.extend(matches)
    
    return placeholders


def validate_citations(content: str) -> Dict[str, List[str]]:
    """
    Main validation function - runs all checks.
    
    Returns:
        {
            "fake_journals": [...],
            "future_dates": [...],
            "wikipedia": [...],
            "missing_refs": [...],
            "unused_refs": [...],
            "placeholders": [...],
        }
    """
    results = {
        "fake_journals": [],
        "future_dates": [],
        "wikipedia": [],
        "missing_refs": [],
        "unused_refs": [],
        "placeholders": [],
    }
    
    # Extract citations and references
    inline_citations = extract_inline_citations(content)
    references = extract_references(content)
    
    # Run checks
    results["fake_journals"] = detect_fake_journals(content)
    results["future_dates"] = detect_future_citations(references)
    results["wikipedia"] = detect_wikipedia_citations(content)
    results["placeholders"] = detect_placeholder_citations(content)
    
    missing, unused = check_citation_reference_match(inline_citations, references)
    results["missing_refs"] = missing
    results["unused_refs"] = unused
    
    return results


def get_citation_report(content: str) -> str:
    """Generate a human-readable citation validation report."""
    results = validate_citations(content)
    
    lines = ["Citation Validation Report", "=" * 30]
    
    total_issues = sum(len(v) for v in results.values())
    
    if total_issues == 0:
        lines.append("✓ No citation issues detected")
    else:
        lines.append(f"⚠ {total_issues} potential issue(s) found:\n")
        
        if results["fake_journals"]:
            lines.append("Suspicious Journals:")
            for j in results["fake_journals"]:
                lines.append(f"  - {j}")
        
        if results["future_dates"]:
            lines.append("\nFuture-Dated Citations:")
            for f in results["future_dates"]:
                lines.append(f"  - {f}")
        
        if results["wikipedia"]:
            lines.append("\nWikipedia Citations (use primary sources):")
            for w in results["wikipedia"]:
                lines.append(f"  - {w[:50]}...")
        
        if results["placeholders"]:
            lines.append("\nPlaceholder Citations:")
            for p in results["placeholders"]:
                lines.append(f"  - {p}")
        
        if results["missing_refs"]:
            lines.append("\nMissing References:")
            for m in results["missing_refs"]:
                lines.append(f"  - {m}")
        
        if results["unused_refs"]:
            lines.append("\nUnused References:")
            for u in results["unused_refs"]:
                lines.append(f"  - {u}")
    
    return "\n".join(lines)


# Quick test
if __name__ == "__main__":
    test_content = """
    According to Smith et al. [1], transformers are important.
    
    The Journal of AI Research Applications published [2].
    
    Wikipedia contributors (2024) define LLMs as...
    
    [To be determined based on actual data]
    
    References:
    [1] Smith, J. (2023). Real paper title. Real Journal.
    [2] Doe, J. (2025). Future paper. Journal of AI Research Applications.
    [3] Unused reference that is never cited.
    """
    
    print(get_citation_report(test_content))
