import re
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


REQUIRED_SECTIONS = [
    "Abstract",
    "Introduction",
    "Related Work",
    "Methodology",
    "Results",
    "Discussion",
    "Conclusion",
]

SECTION_KEYWORDS = {
    "Abstract": ["abstract", "summary", "overview"],
    "Introduction": ["introduction", "motivation", "background", "problem"],
    "Related Work": ["related work", "literature", "prior", "survey", "existing"],
    "Methodology": ["method", "approach", "algorithm", "model", "pipeline", "framework"],
    "Results": ["result", "accuracy", "evaluation", "metric", "performance", "experiment"],
    "Discussion": ["discussion", "analysis", "implication", "limitation", "threat"],
    "Conclusion": ["conclusion", "future work", "closing", "summary"],
}

TITLE_PATTERN = re.compile(r"\\section\{([^{}]+)\}")


@dataclass
class StructureResult:
    sections: Dict[str, List[str]] = field(default_factory=dict)
    fixes_applied: List[str] = field(default_factory=list)


def _normalize_title(title: str) -> str:
    return re.sub(r"[^a-z]+", " ", title.lower()).strip()


def _map_title_to_required(title: str) -> str:
    normalized = _normalize_title(title)
    for section in REQUIRED_SECTIONS:
        if _normalize_title(section) in normalized or normalized in _normalize_title(section):
            return section
    return ""


def _infer_section_from_text(text: str) -> str:
    low = text.lower()
    scores: List[Tuple[int, str]] = []
    for section, keywords in SECTION_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in low)
        scores.append((score, section))
    scores.sort(reverse=True)
    if scores and scores[0][0] > 0:
        return scores[0][1]
    return "Introduction"


def _strip_command_prefix(line: str) -> str:
    if line.lstrip().startswith("\\"):
        # Keep command lines only if they look like plain text wrappers.
        if line.lstrip().startswith(r"\textbf{") or line.lstrip().startswith(r"\emph{"):
            return re.sub(r"\\[a-zA-Z]+\{([^{}]*)\}", r"\1", line).strip()
        return ""
    return line.strip()


def reconstruct_structure(clean_text: str) -> StructureResult:
    sections: Dict[str, List[str]] = {key: [] for key in REQUIRED_SECTIONS}
    current_section = "Introduction"
    fixes: List[str] = []

    for raw_line in clean_text.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        match = TITLE_PATTERN.search(line)
        if match:
            mapped = _map_title_to_required(match.group(1))
            if mapped:
                current_section = mapped
            else:
                current_section = _infer_section_from_text(match.group(1))
                fixes.append(f"Mapped non-standard heading '{match.group(1)}' to '{current_section}'")
            continue

        plain = _strip_command_prefix(line)
        if not plain:
            continue
        target = _infer_section_from_text(plain) if current_section not in REQUIRED_SECTIONS else current_section
        sections[target].append(plain)

    for section in REQUIRED_SECTIONS:
        if not sections[section]:
            sections[section].append(_default_placeholder(section))
            fixes.append(f"Inserted placeholder content for missing section '{section}'")

    return StructureResult(sections=sections, fixes_applied=fixes)


def _default_placeholder(section: str) -> str:
    placeholders = {
        "Abstract": "This paper presents an automatically reconstructed research manuscript.",
        "Introduction": "This section introduces the problem context and motivation.",
        "Related Work": "Existing literature and prior approaches are summarized here.",
        "Methodology": "The methodological approach is described with reproducible steps.",
        "Results": "Experimental and analytical outcomes are reported in this section.",
        "Discussion": "The implications and limitations of the findings are discussed.",
        "Conclusion": "The paper concludes with key findings and future directions.",
    }
    return placeholders.get(section, "Content reconstructed by deterministic fallback.")


def _latex_escape_text(text: str) -> str:
    text = text.replace("\\", r"\textbackslash{}")
    text = text.replace("%", r"\%").replace("#", r"\#").replace("&", r"\&")
    text = text.replace("$", r"\$").replace("_", r"\_")
    text = text.replace("~", r"\textasciitilde{}").replace("^", r"\textasciicircum{}")
    return text


def generate_latex_document(structure: StructureResult, title: str = "Auto-Generated Research Paper") -> str:
    safe_title = _latex_escape_text(title.strip() or "Auto-Generated Research Paper")
    lines: List[str] = [
        r"\documentclass[12pt,a4paper]{article}",
        r"\usepackage[margin=1in]{geometry}",
        r"\usepackage{times}",
        r"\usepackage{amsmath,amssymb}",
        r"\usepackage{graphicx}",
        r"\usepackage{hyperref}",
        "",
        rf"\title{{{safe_title}}}",
        r"\author{AI Research Engine}",
        r"\date{\today}",
        "",
        r"\begin{document}",
        "",
        r"\maketitle",
        r"\tableofcontents",
        r"\newpage",
        "",
    ]

    for section in REQUIRED_SECTIONS:
        lines.append(rf"\section{{{section}}}")
        lines.append("")
        for paragraph in structure.sections.get(section, []):
            para = _latex_escape_text(paragraph.strip())
            if para:
                lines.append(para)
                lines.append("")

    lines.extend([r"\end{document}", ""])
    return "\n".join(lines)

