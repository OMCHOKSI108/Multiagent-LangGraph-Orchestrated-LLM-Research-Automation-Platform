import json
import re
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List


ERROR_PATTERNS = {
    "missing_brace": re.compile(r"Missing \} inserted|Missing \{ inserted", re.IGNORECASE),
    "runaway_argument": re.compile(r"Runaway argument\?", re.IGNORECASE),
    "undefined_control_sequence": re.compile(r"Undefined control sequence", re.IGNORECASE),
    "environment_mismatch": re.compile(r"\\begin\{.*\}.*ended by \\end\{.*\}", re.IGNORECASE),
}


@dataclass
class CompileAttempt:
    engine: str
    success: bool
    exit_code: int
    log_path: str
    errors: List[str] = field(default_factory=list)


@dataclass
class RepairSummary:
    errors: List[str] = field(default_factory=list)
    fixes_applied: List[str] = field(default_factory=list)
    removed_sections: List[str] = field(default_factory=list)
    compile_attempts: List[CompileAttempt] = field(default_factory=list)

    def to_dict(self) -> Dict:
        return {
            "errors": self.errors,
            "fixes_applied": self.fixes_applied,
            "removed_sections": self.removed_sections,
            "compile_attempts": [asdict(a) for a in self.compile_attempts],
        }


def parse_compiler_log(log_text: str) -> List[str]:
    findings: List[str] = []
    for kind, pattern in ERROR_PATTERNS.items():
        if pattern.search(log_text):
            findings.append(kind)
    return findings


def write_report(path: Path, report: RepairSummary) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report.to_dict(), indent=2), encoding="utf-8")

