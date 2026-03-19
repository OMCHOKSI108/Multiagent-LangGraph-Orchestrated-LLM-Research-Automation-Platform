import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from .logger import CompileAttempt, parse_compiler_log
from .repair_engine import remove_section


@dataclass
class CompileResult:
    success: bool
    pdf_path: Path
    tex_path: Path
    attempts: List[CompileAttempt]
    removed_sections: List[str]
    final_tex: str


def _run_latexmk(work_dir: Path, engine: str) -> Tuple[bool, int, str, Path]:
    log_path = work_dir / f"compile_{engine}.log"
    tex_path = work_dir / "main.tex"
    cmd = ["latexmk", "-interaction=nonstopmode", "-synctex=1"]
    if engine == "xelatex":
        cmd.extend(["-xelatex", "main.tex"])
    else:
        cmd.extend(["-pdf", "main.tex"])

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(work_dir),
            capture_output=True,
            text=True,
            check=False,
            timeout=180,
        )
        output = (proc.stdout or "") + "\n" + (proc.stderr or "")
    except FileNotFoundError:
        output = "latexmk binary not found"
        proc = subprocess.CompletedProcess(cmd, returncode=127)
    except subprocess.TimeoutExpired as exc:
        output = (exc.stdout or "") + "\n" + (exc.stderr or "") + "\nCompilation timeout"
        proc = subprocess.CompletedProcess(cmd, returncode=124)

    log_path.write_text(output, encoding="utf-8", errors="ignore")
    pdf_path = work_dir / "main.pdf"
    return pdf_path.exists(), proc.returncode, output, log_path


def _extract_suspect_section(error_output: str) -> str:
    # Heuristic: if a section title appears near a runaway error, target it.
    if "Runaway argument" not in error_output:
        return ""
    for line in error_output.splitlines():
        if "\\section{" in line:
            start = line.find("\\section{") + len("\\section{")
            end = line.find("}", start)
            if end > start:
                return line[start:end].strip()
    return ""


def compile_with_fallback(tex: str, work_dir: Path) -> CompileResult:
    work_dir.mkdir(parents=True, exist_ok=True)
    tex_path = work_dir / "main.tex"
    tex_path.write_text(tex, encoding="utf-8")

    attempts: List[CompileAttempt] = []
    removed_sections: List[str] = []
    current_tex = tex

    for engine in ("pdflatex", "xelatex"):
        success, exit_code, output, log_path = _run_latexmk(work_dir, engine)
        parsed_errors = parse_compiler_log(output)
        attempts.append(
            CompileAttempt(
                engine=engine,
                success=success,
                exit_code=exit_code,
                log_path=str(log_path),
                errors=parsed_errors,
            )
        )
        if success:
            return CompileResult(
                success=True,
                pdf_path=work_dir / "main.pdf",
                tex_path=tex_path,
                attempts=attempts,
                removed_sections=removed_sections,
                final_tex=current_tex,
            )

    # Isolation strategy: remove failing section and retry with xelatex.
    suspect = _extract_suspect_section((work_dir / "compile_xelatex.log").read_text(encoding="utf-8", errors="ignore"))
    if suspect:
        rr = remove_section(current_tex, suspect)
        if rr.removed_sections:
            removed_sections.extend(rr.removed_sections)
            current_tex = rr.tex
            tex_path.write_text(current_tex, encoding="utf-8")
            success, exit_code, output, log_path = _run_latexmk(work_dir, "xelatex")
            attempts.append(
                CompileAttempt(
                    engine="xelatex-isolated",
                    success=success,
                    exit_code=exit_code,
                    log_path=str(log_path),
                    errors=parse_compiler_log(output),
                )
            )
            if success:
                return CompileResult(
                    success=True,
                    pdf_path=work_dir / "main.pdf",
                    tex_path=tex_path,
                    attempts=attempts,
                    removed_sections=removed_sections,
                    final_tex=current_tex,
                )

    return CompileResult(
        success=False,
        pdf_path=work_dir / "main.pdf",
        tex_path=tex_path,
        attempts=attempts,
        removed_sections=removed_sections,
        final_tex=current_tex,
    )


def has_latex_toolchain() -> bool:
    return bool(shutil.which("latexmk"))
