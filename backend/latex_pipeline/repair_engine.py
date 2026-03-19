import re
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class RepairResult:
    tex: str
    fixes_applied: List[str] = field(default_factory=list)
    removed_sections: List[str] = field(default_factory=list)


SECTION_HEADER = re.compile(r"^\\section\{([^{}]+)\}\s*$")


def _drop_broken_lines(tex: str) -> Tuple[str, List[str]]:
    fixes: List[str] = []
    out_lines: List[str] = []
    for line in tex.splitlines():
        # Remove clear junk patterns that often break TeX parsers.
        if any(token in line for token in ("<|", "</analysis>", "```", "\\\\\\")):
            fixes.append("Removed broken artifact line")
            continue
        out_lines.append(line)
    return "\n".join(out_lines) + "\n", fixes


def _repair_runaway_arguments(tex: str) -> Tuple[str, List[str]]:
    fixes: List[str] = []
    # Add missing closing brace for lines that start a command arg but do not close.
    lines: List[str] = []
    for line in tex.splitlines():
        if re.search(r"\\[a-zA-Z]+\{[^}]*$", line):
            line += "}"
            fixes.append("Added missing closing brace for malformed command argument")
        lines.append(line)
    return "\n".join(lines) + "\n", fixes


def remove_section(tex: str, section_title: str) -> RepairResult:
    target = section_title.strip().lower()
    out_lines: List[str] = []
    skip_mode = False
    removed = False
    for line in tex.splitlines():
        m = SECTION_HEADER.match(line.strip())
        if m:
            title = m.group(1).strip().lower()
            if title == target:
                skip_mode = True
                removed = True
                continue
            if skip_mode:
                skip_mode = False
        if not skip_mode:
            out_lines.append(line)

    fixes = []
    removed_sections = []
    if removed:
        fixes.append(f"Removed irreparable section '{section_title}'")
        removed_sections.append(section_title)
    return RepairResult(tex="\n".join(out_lines) + "\n", fixes_applied=fixes, removed_sections=removed_sections)


def apply_auto_repair(tex: str) -> RepairResult:
    fixes: List[str] = []
    removed_sections: List[str] = []

    current, f = _drop_broken_lines(tex)
    fixes.extend(f)

    current, f = _repair_runaway_arguments(current)
    fixes.extend(f)

    return RepairResult(tex=current, fixes_applied=fixes, removed_sections=removed_sections)

