import re
from dataclasses import dataclass, field
from typing import List, Tuple


BEGIN_PATTERN = re.compile(r"\\begin\{([a-zA-Z*]+)\}")
END_PATTERN = re.compile(r"\\end\{([a-zA-Z*]+)\}")
SECTION_PATTERN = re.compile(r"\\section\{([^{}]*)\}")
UNKNOWN_COMMAND_PATTERN = re.compile(r"\\([a-zA-Z]+)")

ALLOWED_COMMANDS = {
    "documentclass",
    "usepackage",
    "title",
    "author",
    "date",
    "begin",
    "end",
    "maketitle",
    "tableofcontents",
    "newpage",
    "section",
    "subsection",
    "textbf",
    "emph",
    "item",
    "itemize",
    "enumerate",
    "today",
    "href",
    "label",
    "ref",
    "cite",
    "includegraphics",
    "textbackslash",
    "textasciitilde",
    "textasciicircum",
}


@dataclass
class ValidationResult:
    tex: str
    errors: List[str] = field(default_factory=list)
    fixes_applied: List[str] = field(default_factory=list)


def _validate_braces(tex: str) -> Tuple[str, List[str], List[str]]:
    errors: List[str] = []
    fixes: List[str] = []
    balance = 0
    out_chars: List[str] = []
    for ch in tex:
        if ch == "{":
            balance += 1
            out_chars.append(ch)
        elif ch == "}":
            if balance == 0:
                errors.append("Unmatched closing brace removed")
                fixes.append("Removed unmatched '}'")
                continue
            balance -= 1
            out_chars.append(ch)
        else:
            out_chars.append(ch)

    if balance > 0:
        out_chars.extend("}" * balance)
        errors.append(f"Missing {balance} closing brace(s)")
        fixes.append(f"Auto-added {balance} closing brace(s)")

    return "".join(out_chars), errors, fixes


def _validate_environments(tex: str) -> Tuple[str, List[str], List[str]]:
    errors: List[str] = []
    fixes: List[str] = []
    env_stack: List[str] = []
    lines_out: List[str] = []

    for line in tex.splitlines():
        begin_match = BEGIN_PATTERN.search(line)
        end_match = END_PATTERN.search(line)

        if begin_match:
            env_stack.append(begin_match.group(1))
            lines_out.append(line)
            continue

        if end_match:
            env_name = end_match.group(1)
            if not env_stack:
                errors.append(f"Orphan \\end{{{env_name}}} removed")
                fixes.append(f"Removed orphan \\end{{{env_name}}}")
                continue
            if env_stack[-1] != env_name:
                errors.append(
                    f"Environment mismatch: expected \\end{{{env_stack[-1]}}}, found \\end{{{env_name}}}"
                )
                fixes.append(f"Replaced mismatched \\end{{{env_name}}} with \\end{{{env_stack[-1]}}}")
                line = line.replace(rf"\end{{{env_name}}}", rf"\end{{{env_stack[-1]}}}")
            env_stack.pop()
            lines_out.append(line)
            continue

        lines_out.append(line)

    while env_stack:
        env_name = env_stack.pop()
        lines_out.append(rf"\end{{{env_name}}}")
        errors.append(f"Missing \\end{{{env_name}}}")
        fixes.append(f"Auto-closed environment '{env_name}'")

    return "\n".join(lines_out) + "\n", errors, fixes


def _validate_section_titles(tex: str) -> Tuple[str, List[str], List[str]]:
    errors: List[str] = []
    fixes: List[str] = []
    lines: List[str] = []

    for line in tex.splitlines():
        match = SECTION_PATTERN.search(line)
        if not match:
            lines.append(line)
            continue

        title = match.group(1).strip()
        if not title or "\n" in title:
            title = "Section"
            errors.append("Invalid section title replaced")
            fixes.append("Replaced multiline/empty section title")

        if "\\" in title:
            title = re.sub(r"\\[a-zA-Z]+\*?\{([^{}]*)\}", r"\1", title)
            title = re.sub(r"\\[a-zA-Z]+\*?", "", title).strip() or "Section"
            errors.append("Nested commands removed from section title")
            fixes.append("Flattened section title command nesting")

        line = SECTION_PATTERN.sub(rf"\\section{{{title}}}", line)
        lines.append(line)

    return "\n".join(lines) + "\n", errors, fixes


def _replace_unknown_commands(tex: str) -> Tuple[str, List[str], List[str]]:
    errors: List[str] = []
    fixes: List[str] = []

    def repl(match: re.Match) -> str:
        command = match.group(1)
        if command in ALLOWED_COMMANDS:
            return match.group(0)
        errors.append(f"Unknown command '\\{command}' replaced")
        fixes.append(f"Removed unknown command '\\{command}'")
        return ""

    fixed = UNKNOWN_COMMAND_PATTERN.sub(repl, tex)
    return fixed, errors, fixes


def validate_latex(tex: str) -> ValidationResult:
    errors: List[str] = []
    fixes: List[str] = []

    current = tex
    current, e, f = _validate_section_titles(current)
    errors.extend(e)
    fixes.extend(f)

    current, e, f = _validate_braces(current)
    errors.extend(e)
    fixes.extend(f)

    current, e, f = _validate_environments(current)
    errors.extend(e)
    fixes.extend(f)

    current, e, f = _replace_unknown_commands(current)
    errors.extend(e)
    fixes.extend(f)

    return ValidationResult(tex=current, errors=errors, fixes_applied=fixes)
