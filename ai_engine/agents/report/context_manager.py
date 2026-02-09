"""
Context Manager for Multi-Stage Report Generation

Extracts only relevant context for each section to avoid overwhelming the LLM.
Each section gets focused input based on what it actually needs.
"""

from typing import Dict, Any, Optional
import json


# ============================================
# CONTEXT MAPPING: What each section needs
# ============================================

SECTION_CONTEXT_MAP = {
    "abstract": {
        "findings_keys": ["task", "_final_summary"],
        "previous_sections": False,  # Abstract is written first
        "max_chars": 2000
    },
    "introduction": {
        "findings_keys": ["domain_intelligence", "historical_review"],
        "previous_sections": ["abstract"],
        "max_chars": 4000
    },
    "related_work": {
        "findings_keys": ["slr", "gap_synthesis", "domain_intelligence"],
        "previous_sections": ["introduction"],
        "max_chars": 6000
    },
    "literature_review": {  # Alias for related_work in some domains
        "findings_keys": ["slr", "gap_synthesis", "domain_intelligence"],
        "previous_sections": ["introduction"],
        "max_chars": 6000
    },
    "theoretical_framework": {
        "findings_keys": ["domain_intelligence", "paper_decomposition"],
        "previous_sections": ["introduction"],
        "max_chars": 5000
    },
    "materials_methods": {
        "findings_keys": ["paper_decomposition", "baseline_reproduction"],
        "previous_sections": ["introduction"],
        "max_chars": 4000
    },
    "methodology": {
        "findings_keys": ["paper_decomposition", "baseline_reproduction", "domain_intelligence"],
        "previous_sections": ["literature_review", "related_work"],
        "max_chars": 4000
    },
    "problem_formulation": {
        "findings_keys": ["domain_intelligence", "gap_synthesis"],
        "previous_sections": ["introduction"],
        "max_chars": 3000
    },
    "proposed_solution": {
        "findings_keys": ["innovation_novelty", "paper_decomposition"],
        "previous_sections": ["problem_formulation"],
        "max_chars": 5000
    },
    "implementation": {
        "findings_keys": ["baseline_reproduction", "paper_decomposition"],
        "previous_sections": ["proposed_solution"],
        "max_chars": 4000
    },
    "experimental_methods": {
        "findings_keys": ["baseline_reproduction", "paper_decomposition"],
        "previous_sections": ["theoretical_framework"],
        "max_chars": 4000
    },
    "experiments": {
        "findings_keys": ["baseline_reproduction", "validation_robustness"],
        "previous_sections": ["methodology"],
        "max_chars": 4000
    },
    "results": {
        "findings_keys": ["innovation_novelty", "validation_robustness", "visualization"],
        "previous_sections": ["methodology", "experiments"],
        "max_chars": 5000
    },
    "findings": {  # Social sciences alias
        "findings_keys": ["slr", "gap_synthesis", "innovation_novelty"],
        "previous_sections": ["methodology"],
        "max_chars": 5000
    },
    "evaluation": {
        "findings_keys": ["validation_robustness", "baseline_reproduction"],
        "previous_sections": ["implementation"],
        "max_chars": 4000
    },
    "error_analysis": {
        "findings_keys": ["validation_robustness"],
        "previous_sections": ["results"],
        "max_chars": 3000
    },
    "discussion": {
        "findings_keys": ["gap_synthesis", "innovation_novelty", "reviewer_critique"],
        "previous_sections": ["results", "findings"],
        "max_chars": 4000
    },
    "policy_implications": {
        "findings_keys": ["gap_synthesis", "domain_intelligence"],
        "previous_sections": ["discussion"],
        "max_chars": 3000
    },
    "conclusion": {
        "findings_keys": [],  # Relies on summary of all previous sections
        "previous_sections": ["abstract", "discussion"],
        "max_chars": 2000
    },
    "references": {
        "findings_keys": ["slr", "historical_review", "domain_intelligence"],
        "previous_sections": False,
        "max_chars": 8000,
        "extract_refs": True
    }
}


def extract_text_from_finding(finding: Any, max_chars: int = 2000) -> str:
    """Extract readable text from a finding value."""
    if finding is None:
        return ""
    
    if isinstance(finding, str):
        return finding[:max_chars]
    
    if isinstance(finding, dict):
        # Priority order for text extraction
        for key in ["raw_text", "markdown_report", "summary", "content", "text"]:
            if key in finding and isinstance(finding[key], str):
                return finding[key][:max_chars]
        
        # Try to extract meaningful parts
        text_parts = []
        for k, v in finding.items():
            if k.startswith("_"):
                continue
            if isinstance(v, str) and len(v) > 20:
                text_parts.append(f"{k}: {v[:500]}")
            elif isinstance(v, list) and v:
                if all(isinstance(x, str) for x in v[:5]):
                    text_parts.append(f"{k}: {', '.join(v[:10])}")
        
        return "\n".join(text_parts)[:max_chars]
    
    if isinstance(finding, list):
        if all(isinstance(x, str) for x in finding[:5]):
            return ", ".join(finding[:20])[:max_chars]
        return str(finding)[:max_chars]
    
    return str(finding)[:max_chars]


def extract_references(findings: dict) -> str:
    """Extract all references/citations from findings."""
    refs = []
    
    for key, value in findings.items():
        if key.startswith("_"):
            continue
            
        if isinstance(value, dict):
            # Look for sources in meta fields
            for meta_key in ["_meta_sources", "_meta_search_results", "_meta_history_sources"]:
                if meta_key in value and isinstance(value[meta_key], list):
                    for source in value[meta_key]:
                        if isinstance(source, dict):
                            ref = []
                            if "authors" in source:
                                authors = source["authors"]
                                if isinstance(authors, list):
                                    ref.append(", ".join(authors[:3]))
                                else:
                                    ref.append(str(authors))
                            if "title" in source:
                                ref.append(f'"{source["title"]}"')
                            if "published" in source or "year" in source:
                                ref.append(f"({source.get('published', source.get('year', 'n.d.'))})")
                            if "url" in source:
                                ref.append(source["url"])
                            
                            if ref:
                                refs.append(" ".join(ref))
    
    # Deduplicate
    unique_refs = list(dict.fromkeys(refs))
    return "\n".join(f"[{i+1}] {ref}" for i, ref in enumerate(unique_refs[:50]))


def summarize_section(content: str, max_chars: int = 300) -> str:
    """Create a brief summary of a section for context."""
    if not content:
        return ""
    
    # Take first paragraph or first N characters
    lines = content.strip().split("\n")
    first_para = []
    for line in lines:
        if line.strip():
            first_para.append(line.strip())
            if len(" ".join(first_para)) > max_chars:
                break
        elif first_para:
            break
    
    summary = " ".join(first_para)
    if len(summary) > max_chars:
        summary = summary[:max_chars-3] + "..."
    
    return summary


def get_section_context(
    section_name: str,
    task: str,
    findings: dict,
    previous_sections: Dict[str, str],
    template: dict
) -> str:
    """
    Build focused context for a specific section.
    
    Args:
        section_name: Name of the section to generate
        task: Research task/topic
        findings: All findings from research pipeline
        previous_sections: Already generated sections
        template: Domain template with prompts
    
    Returns:
        Focused context string for the section writer
    """
    context_config = SECTION_CONTEXT_MAP.get(section_name, {
        "findings_keys": [],
        "previous_sections": False,
        "max_chars": 3000
    })
    
    parts = [f"RESEARCH TOPIC: {task}\n"]
    
    # Add section-specific instructions from template
    if section_name in template.get("section_prompts", {}):
        parts.append(f"SECTION GUIDELINES: {template['section_prompts'][section_name]}\n")
    
    # Add relevant findings
    max_per_finding = context_config["max_chars"] // max(len(context_config["findings_keys"]), 1)
    
    for key in context_config["findings_keys"]:
        if key in findings:
            text = extract_text_from_finding(findings[key], max_per_finding)
            if text:
                parts.append(f"[{key.upper().replace('_', ' ')}]:\n{text}\n")
    
    # Add previous section summaries for continuity
    prev_sections = context_config.get("previous_sections", [])
    if prev_sections:
        parts.append("\n[PREVIOUS SECTIONS SUMMARY]:")
        for prev_name in prev_sections:
            if prev_name in previous_sections:
                summary = summarize_section(previous_sections[prev_name], 300)
                if summary:
                    parts.append(f"- {prev_name.replace('_', ' ').title()}: {summary}")
    
    # Special handling for references section
    if context_config.get("extract_refs"):
        refs = extract_references(findings)
        if refs:
            parts.append(f"\n[AVAILABLE SOURCES]:\n{refs}")
            
    # Add Scoring Insight if available
    if "scoring" in findings:
        scoring_val = findings["scoring"]
        if isinstance(scoring_val, dict):
            # Extract score summary
            avg_score = scoring_val.get("average_relevance", scoring_val.get("response", {}).get("average_relevance", "N/A"))
            parts.append(f"\n[QUALITY METRICS]:\nAverage Source Relevance: {avg_score}\n")
    
    return "\n".join(parts)
