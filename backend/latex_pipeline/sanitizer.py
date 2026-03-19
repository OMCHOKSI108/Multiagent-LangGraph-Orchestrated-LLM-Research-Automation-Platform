import re
import unicodedata
from dataclasses import dataclass, field
from typing import List, Tuple


@dataclass
class SanitizationResult:
    text: str
    removed_lines: List[str] = field(default_factory=list)
    fixes_applied: List[str] = field(default_factory=list)


ARTIFACT_PREFIXES = (
    "user:",
    "ai:",
    "prompt",
    "assistant:",
    "system:",
)

NOISE_SUBSTRINGS = (
    "<|end|>",
    "</analysis>",
    "```",
    "json",
    "yaml",
)

CONVERSATIONAL_PATTERNS = [
    re.compile(r"^\s*(sorry|i can|as an ai|i apologize|let me)\b", re.IGNORECASE),
    re.compile(r"^\s*(here is|below is)\b", re.IGNORECASE),
]

UNICODE_REPLACEMENTS = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2013": "-",
    "\u2014": "--",
    "\u2026": "...",
    "\u00a0": " ",
}

ESCAPABLE = {
    "%": r"\%",
    "#": r"\#",
    "&": r"\&",
    "$": r"\$",
    "_": r"\_",
}


def _normalize_unicode(text: str) -> str:
    normalized = unicodedata.normalize("NFKC", text)
    for src, dst in UNICODE_REPLACEMENTS.items():
        normalized = normalized.replace(src, dst)
    return normalized


def _is_artifact_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False
    low = stripped.lower()
    if any(low.startswith(prefix) for prefix in ARTIFACT_PREFIXES):
        return True
    if stripped.startswith("#") and not stripped.startswith(r"\#"):
        return True
    if stripped.startswith("{") and stripped.endswith("}") and ":" in stripped:
        return True
    if any(token in low for token in NOISE_SUBSTRINGS):
        return True
    if re.match(r"^\s*[-*]\s+", stripped):
        # markdown bullet likely noise in raw latex context
        return True
    return any(p.search(stripped) for p in CONVERSATIONAL_PATTERNS)


def _strip_markdown_fences(line: str) -> str:
    line = line.replace("```latex", "").replace("```tex", "").replace("```", "")
    return line


def _escape_plain_text(line: str) -> str:
    if not line.strip():
        return line
    if line.lstrip().startswith("\\"):
        return line

    out = []
    for ch in line:
        out.append(ESCAPABLE.get(ch, ch))
    return "".join(out)


def _remove_invalid_inline_constructs(line: str) -> Tuple[str, bool]:
    original = line

    # flatten nested section arguments like \section{\textbf{Title}} -> \section{Title}
    line = re.sub(
        r"\\section\{\s*\\[a-zA-Z]+\*?\{([^{}]+)\}\s*\}",
        lambda m: r"\section{" + m.group(1).strip() + "}",
        line,
    )

    # remove obvious code block wrappers left from markdown
    line = line.replace("`", "")

    # remove paragraph breaks in command arguments on the same line
    line = re.sub(r"\\section\{[^{}]*\n[^{}]*\}", r"\\section{Section}", line)

    return line, (line != original)


def sanitize_input(raw_text: str) -> SanitizationResult:
    raw_text = _normalize_unicode(raw_text or "")
    cleaned_lines: List[str] = []
    removed_lines: List[str] = []
    fixes: List[str] = []

    for line in raw_text.splitlines():
        candidate = _strip_markdown_fences(line)

        if _is_artifact_line(candidate):
            removed_lines.append(line)
            continue

        candidate, changed = _remove_invalid_inline_constructs(candidate)
        if changed:
            fixes.append("Flattened invalid inline command construct")

        candidate = _escape_plain_text(candidate)
        cleaned_lines.append(candidate.rstrip())

    text = "\n".join(cleaned_lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"

    if removed_lines:
        fixes.append(f"Removed {len(removed_lines)} non-LaTeX artifact lines")

    return SanitizationResult(text=text, removed_lines=removed_lines, fixes_applied=fixes)

