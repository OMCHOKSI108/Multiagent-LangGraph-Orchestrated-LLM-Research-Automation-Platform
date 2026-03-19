import argparse
import json
import tempfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional

from .compiler import compile_with_fallback, has_latex_toolchain
from .logger import RepairSummary, write_report
from .repair_engine import apply_auto_repair
from .sanitizer import sanitize_input
from .structure_builder import generate_latex_document, reconstruct_structure
from .validator import validate_latex


@dataclass
class PipelineOutput:
    success: bool
    cleaned_tex_path: str
    final_tex_path: str
    pdf_path: str
    debug_log_path: str
    repair_report_path: str
    report: dict


def run_pipeline(raw_text: str, output_dir: Optional[Path] = None, title: str = "Auto-Generated Research Paper") -> PipelineOutput:
    work_dir = Path(output_dir) if output_dir else Path(tempfile.mkdtemp(prefix="latex_pipeline_"))
    work_dir.mkdir(parents=True, exist_ok=True)

    summary = RepairSummary()

    # Module 1: Input Sanitization
    sanitized = sanitize_input(raw_text)
    summary.fixes_applied.extend(sanitized.fixes_applied)

    # Module 2: Structure Reconstruction + Module 5 Generation
    structured = reconstruct_structure(sanitized.text)
    summary.fixes_applied.extend(structured.fixes_applied)
    generated_tex = generate_latex_document(structured, title=title)

    # Module 3: Validation
    validated = validate_latex(generated_tex)
    summary.errors.extend(validated.errors)
    summary.fixes_applied.extend(validated.fixes_applied)

    # Module 4: Auto-repair
    repaired = apply_auto_repair(validated.tex)
    summary.fixes_applied.extend(repaired.fixes_applied)
    summary.removed_sections.extend(repaired.removed_sections)

    cleaned_tex_path = work_dir / "cleaned_main.tex"
    cleaned_tex_path.write_text(repaired.tex, encoding="utf-8")

    # Module 6: Compilation
    compile_result = compile_with_fallback(repaired.tex, work_dir=work_dir)
    summary.compile_attempts.extend(compile_result.attempts)
    summary.removed_sections.extend(compile_result.removed_sections)
    if not compile_result.success:
        summary.errors.append("Compilation failed after fallback attempts")
    else:
        summary.fixes_applied.append("Compilation succeeded")

    final_tex_path = work_dir / "main.tex"
    final_tex_path.write_text(compile_result.final_tex, encoding="utf-8")

    # Module 7: Error parser + logging
    report_path = work_dir / "repair_summary.json"
    write_report(report_path, summary)

    debug_log_path = work_dir / "debug.log"
    debug_lines = [
        f"toolchain_available={has_latex_toolchain()}",
        f"success={compile_result.success}",
        f"attempts={len(summary.compile_attempts)}",
    ]
    debug_log_path.write_text("\n".join(debug_lines) + "\n", encoding="utf-8")

    return PipelineOutput(
        success=compile_result.success,
        cleaned_tex_path=str(cleaned_tex_path),
        final_tex_path=str(final_tex_path),
        pdf_path=str(compile_result.pdf_path),
        debug_log_path=str(debug_log_path),
        repair_report_path=str(report_path),
        report=summary.to_dict(),
    )


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Robust LaTeX sanitize-repair-compile pipeline")
    parser.add_argument("--input-file", type=str, default="")
    parser.add_argument("--output-dir", type=str, default="")
    parser.add_argument("--title", type=str, default="Auto-Generated Research Paper")
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    if args.input_file:
        raw_text = Path(args.input_file).read_text(encoding="utf-8", errors="ignore")
    else:
        raw_text = ""

    result = run_pipeline(
        raw_text=raw_text,
        output_dir=Path(args.output_dir) if args.output_dir else None,
        title=args.title,
    )
    print(json.dumps(asdict(result), ensure_ascii=True))
    return 0 if result.success else 1


if __name__ == "__main__":
    raise SystemExit(main())

