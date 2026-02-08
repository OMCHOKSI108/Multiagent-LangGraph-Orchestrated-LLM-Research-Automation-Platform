"""
Multi-Stage Report Generation Pipeline

Orchestrates the entire report generation process:
1. Domain classification
2. Template selection
3. Section-by-section generation with focused context
4. Assembly into full report
5. LaTeX conversion and PDF compilation
"""

import os
import re
import subprocess
from datetime import datetime
from typing import Dict, Optional

from .domain_templates import detect_domain, get_template, DomainType, DomainTemplate
from .context_manager import get_section_context
from .section_writers import get_section_writer
from .latex_sanitizer import sanitize_latex, validate_latex
from .citation_validator import validate_citations, get_citation_report
from .cleanup_agent import AcademicEditorAgent, StructureValidator

# Import event emitter for granular updates
try:
    from utils.event_emitter import emit_event
except ImportError:
    def emit_event(*args, **kwargs): pass


class ReportPipeline:
    """
    Orchestrates multi-stage report generation with domain-specific templates.
    
    Instead of sending all findings to one LLM, this pipeline:
    1. Classifies the research domain
    2. Selects appropriate section structure
    3. Generates each section with focused context
    4. Assembles into complete report
    5. Converts to LaTeX and compiles PDF
    """
    
    def __init__(self, output_dir: Optional[str] = None, model_name: Optional[str] = None):
        """
        Initialize the report pipeline.
        
        Args:
            output_dir: Directory to write output files
            model_name: Optional LLM model name to use for all section writers
        """
        self.output_dir = output_dir or os.path.abspath(
            os.path.join(os.path.dirname(__file__), "..", "..", "..", "output")
        )
        self.model_name = model_name  # Will use default if None
        os.makedirs(self.output_dir, exist_ok=True)
        
    def generate_report(self, findings: dict, task: str, job_id: str = "unknown") -> dict:
        """
        Generate a complete research report from findings.
        
        Args:
            findings: Research findings from pipeline
            task: Research task/topic
            job_id: Job identifier for file naming
            
        Returns:
            dict with markdown, latex, paths, and metadata
        """
        print(f"[ReportPipeline] Starting multi-stage report generation for job {job_id}")
        
        # Stage 1: Domain classification
        emit_event("analyzing", "Classifying research domain...", research_id=int(job_id) if str(job_id).isdigit() else None)
        domain = detect_domain(task, findings)
        template = get_template(domain)
        print(f"[ReportPipeline] Detected domain: {domain} ({template['name']})")
        emit_event("analyzing", f"Detected Domain: {domain}", details={"template": template['name']}, research_id=int(job_id) if str(job_id).isdigit() else None)
        
        # Stage 2: Generate each section
        sections = {}
        section_order = template["sections"]
        
        for section_name in section_order:
            print(f"[ReportPipeline] Generating section: {section_name}")
            emit_event("writing", f"Drafting Section: {section_name.replace('_', ' ').title()}", research_id=int(job_id) if str(job_id).isdigit() else None)
            
            # Get focused context for this section
            context = get_section_context(
                section_name=section_name,
                task=task,
                findings=findings,
                previous_sections=sections,
                template=template
            )
            
            # Get section-specific prompt
            section_prompt = template.get("section_prompts", {}).get(section_name, "")
            
            # Get the writer and generate, passing model_name if configured
            writer_kwargs = {}
            if self.model_name:
                writer_kwargs['model_name'] = self.model_name
            writer = get_section_writer(section_name, **writer_kwargs)
            result = writer.run(context, section_prompt)
            
            if "error" in result:
                print(f"[ReportPipeline] Warning: Error in {section_name}: {result['error']}")
                sections[section_name] = f"[Section generation failed: {result['error']}]"
            else:
                sections[section_name] = result.get("content", "")
        
        # Stage 3: Assemble markdown report
        emit_event("writing", "Assembling final report...", research_id=int(job_id) if str(job_id).isdigit() else None)
        markdown_report = self._assemble_markdown(sections, task, template)
        
        # Stage 3.5: Validate citations
        citation_issues = validate_citations(markdown_report)
        total_citation_issues = sum(len(v) for v in citation_issues.values())
        if total_citation_issues > 0:
            print(f"[ReportPipeline] Citation Issues: {total_citation_issues}")
            for issue_type, issues in citation_issues.items():
                if issues:
                    print(f"[ReportPipeline]   {issue_type}: {len(issues)}")
        
        # Stage 3.6: Academic cleanup pass
        cleanup_agent = AcademicEditorAgent()
        cleanup_result = cleanup_agent.run({"content": markdown_report, "use_llm_refinement": False})
        if cleanup_result.get("content"):
            markdown_report = cleanup_result["content"]
            print(f"[ReportPipeline] Cleanup pass completed")
        
        # Stage 3.7: Validate structure (IMRAD compliance)
        structure_validation = StructureValidator.validate(markdown_report)
        if structure_validation.get("duplicates"):
            print(f"[ReportPipeline] Duplicate sections: {structure_validation['duplicates']}")
        if structure_validation.get("order_issues"):
            print(f"[ReportPipeline] Order issues: {structure_validation['order_issues']}")
        
        # Stage 4: Convert to LaTeX
        latex_source = self._convert_to_latex(markdown_report, task, template)
        
        # Stage 5: Sanitize LaTeX (remove Markdown artifacts, fix math, etc.)
        latex_source = sanitize_latex(latex_source)
        is_valid, warnings = validate_latex(latex_source)
        if warnings:
            for w in warnings:
                print(f"[ReportPipeline] LaTeX Warning: {w}")
        
        # Stage 6: Save files and compile PDF
        md_path = os.path.join(self.output_dir, f"research_{job_id}.md")
        tex_path = os.path.join(self.output_dir, f"research_{job_id}.tex")
        pdf_path = None
        
        # Save markdown
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(markdown_report)
        print(f"[ReportPipeline] Markdown saved: {md_path}")
        
        emit_event("writing", "Compiling PDF document...", research_id=int(job_id) if str(job_id).isdigit() else None)
        
        # Save LaTeX
        with open(tex_path, "w", encoding="utf-8") as f:
            f.write(latex_source)
        print(f"[ReportPipeline] LaTeX saved: {tex_path}")
        
        # Try to compile PDF
        pdf_path = self._compile_pdf(tex_path, job_id)
        
        return {
            "markdown_report": markdown_report,
            "latex_source": latex_source,
            "domain": domain,
            "template": template["name"],
            "sections": list(sections.keys()),
            "md_path": md_path,
            "tex_path": tex_path,
            "pdf_path": pdf_path
        }
    
    def _assemble_markdown(self, sections: Dict[str, str], task: str, template: DomainTemplate) -> str:
        """Assemble individual sections into a complete markdown document."""
        parts = []
        
        # Title
        parts.append(f"# {task}\n")
        parts.append(f"*Generated by AI Research Engine - {template['name']} Format*\n")
        parts.append(f"*Date: {datetime.now().strftime('%Y-%m-%d')}*\n")
        parts.append("---\n")
        
        # Section headers mapping
        section_titles = {
            "abstract": "Abstract",
            "introduction": "1. Introduction",
            "related_work": "2. Related Work",
            "literature_review": "2. Literature Review",
            "theoretical_framework": "2. Theoretical Framework",
            "materials_methods": "3. Materials and Methods",
            "methodology": "3. Methodology",
            "problem_formulation": "3. Problem Formulation",
            "proposed_solution": "4. Proposed Solution",
            "implementation": "5. Implementation",
            "experimental_methods": "3. Experimental Methods",
            "experiments": "4. Experiments",
            "results": "4. Results",
            "findings": "4. Findings",
            "evaluation": "5. Evaluation",
            "error_analysis": "5. Error Analysis",
            "discussion": "5. Discussion",
            "policy_implications": "6. Policy Implications",
            "conclusion": "6. Conclusion",
            "references": "References"
        }
        
        # Add each section
        section_num = 1
        for section_name in template["sections"]:
            if section_name in sections:
                content = sections[section_name]
                
                # Get title (use numbered title or default)
                title = section_titles.get(section_name, section_name.replace("_", " ").title())
                
                # Special formatting for abstract
                if section_name == "abstract":
                    parts.append(f"## Abstract\n")
                    parts.append(f"*{content}*\n")
                else:
                    parts.append(f"## {title}\n")
                    parts.append(f"{content}\n")
                
                parts.append("")  # Empty line between sections
        
        return "\n".join(parts)
    
    def _convert_to_latex(self, markdown: str, task: str, template: DomainTemplate) -> str:
        """Convert markdown report to LaTeX source."""
        latex_class = template.get("latex_class", "article")
        citation_style = template.get("citation_style", "plain")
        
        # Start with preamble
        preamble = f"""\\documentclass[12pt, a4paper]{{{latex_class}}}
\\usepackage[margin=1in]{{geometry}}
\\usepackage{{times}}
\\usepackage{{graphicx}}
\\usepackage{{hyperref}}
\\usepackage{{amsmath}}
\\usepackage{{amssymb}}
\\usepackage{{fancyhdr}}
\\usepackage{{booktabs}}
\\usepackage{{longtable}}
\\usepackage[utf8]{{inputenc}}

\\pagestyle{{fancy}}
\\fancyhf{{}}
\\rfoot{{Page \\thepage}}
\\lfoot{{Generated by AI Research Engine}}

\\title{{{self._escape_latex(task)}}}
\\author{{AI Research Engine}}
\\date{{\\today}}

\\begin{{document}}
\\maketitle
\\tableofcontents
\\newpage

"""
        
        # Convert markdown to LaTeX
        body = self._markdown_to_latex(markdown)
        
        # End document
        ending = """
\\end{document}
"""
        
        return preamble + body + ending
    
    def _markdown_to_latex(self, markdown: str) -> str:
        """Convert markdown content to LaTeX body."""
        content = markdown
        
        # Remove the title section (we already have it in LaTeX)
        lines = content.split("\n")
        start_idx = 0
        for i, line in enumerate(lines):
            if line.strip() == "---":
                start_idx = i + 1
                break
        content = "\n".join(lines[start_idx:])
        
        # Headers
        content = re.sub(r'^## Abstract\s*$', r'\\begin{abstract}', content, flags=re.MULTILINE)
        content = re.sub(r'^## (References)\s*$', r'\\section*{\1}', content, flags=re.MULTILINE)
        content = re.sub(r'^## (\d+\.?\s*)(.+)$', r'\\section{\2}', content, flags=re.MULTILINE)
        content = re.sub(r'^### (.+)$', r'\\subsection{\1}', content, flags=re.MULTILINE)
        content = re.sub(r'^#### (.+)$', r'\\subsubsection{\1}', content, flags=re.MULTILINE)
        
        # Bold and italic
        content = re.sub(r'\*\*\*(.+?)\*\*\*', r'\\textbf{\\textit{\1}}', content)
        content = re.sub(r'\*\*(.+?)\*\*', r'\\textbf{\1}', content)
        content = re.sub(r'\*(.+?)\*', r'\\textit{\1}', content)
        
        # Close abstract
        # Find where abstract content ends (at next section)
        if "\\begin{abstract}" in content:
            lines = content.split("\n")
            new_lines = []
            in_abstract = False
            for line in lines:
                if "\\begin{abstract}" in line:
                    in_abstract = True
                    new_lines.append(line)
                elif in_abstract and line.strip().startswith("\\section"):
                    new_lines.append("\\end{abstract}\n")
                    in_abstract = False
                    new_lines.append(line)
                else:
                    new_lines.append(line)
            if in_abstract:
                new_lines.append("\\end{abstract}")
            content = "\n".join(new_lines)
        
        # Bullet points
        content = re.sub(r'^- (.+)$', r'\\item \1', content, flags=re.MULTILINE)
        
        # Wrap itemize environments
        lines = content.split("\n")
        new_lines = []
        in_list = False
        for line in lines:
            if line.strip().startswith("\\item") and not in_list:
                new_lines.append("\\begin{itemize}")
                in_list = True
            elif not line.strip().startswith("\\item") and in_list and line.strip():
                new_lines.append("\\end{itemize}")
                in_list = False
            new_lines.append(line)
        if in_list:
            new_lines.append("\\end{itemize}")
        content = "\n".join(new_lines)
        
        # Escape special characters (but not already escaped ones)
        content = self._escape_latex_content(content)
        
        return content
    
    def _escape_latex(self, text: str) -> str:
        """Escape special LaTeX characters in text."""
        replacements = [
            ('\\', '\\textbackslash{}'),
            ('&', '\\&'),
            ('%', '\\%'),
            ('$', '\\$'),
            ('#', '\\#'),
            ('_', '\\_'),
            ('{', '\\{'),
            ('}', '\\}'),
            ('~', '\\textasciitilde{}'),
            ('^', '\\textasciicircum{}'),
        ]
        for old, new in replacements:
            text = text.replace(old, new)
        return text
    
    def _escape_latex_content(self, content: str) -> str:
        """Escape LaTeX special chars while preserving LaTeX commands."""
        # Only escape specific problematic characters that aren't part of commands
        content = re.sub(r'(?<!\\)&(?!\\)', r'\\&', content)
        content = re.sub(r'(?<!\\)%', r'\\%', content)
        content = re.sub(r'(?<!\\)#(?!\\)', r'\\#', content)
        # Don't escape $ as it's used for math
        # Don't escape _ as it's common in text and already handled
        return content
    
    def _compile_pdf(self, tex_path: str, job_id: str) -> Optional[str]:
        """Compile LaTeX to PDF using pdflatex."""
        try:
            # Run pdflatex twice for TOC
            for _ in range(2):
                result = subprocess.run(
                    ["pdflatex", "-interaction=nonstopmode", "-output-directory", self.output_dir, tex_path],
                    capture_output=True,
                    text=True,
                    timeout=120,
                    cwd=self.output_dir
                )
            
            pdf_path = os.path.join(self.output_dir, f"research_{job_id}.pdf")
            if os.path.exists(pdf_path):
                print(f"[ReportPipeline] PDF compiled: {pdf_path}")
                
                # Clean up auxiliary files
                for ext in [".aux", ".log", ".toc", ".out"]:
                    aux_file = os.path.join(self.output_dir, f"research_{job_id}{ext}")
                    if os.path.exists(aux_file):
                        try:
                            os.remove(aux_file)
                        except:
                            pass
                
                return pdf_path
            else:
                print(f"[ReportPipeline] PDF compilation failed. Check {tex_path} for errors.")
                return None
                
        except FileNotFoundError:
            print("[ReportPipeline] pdflatex not found. Install TeX Live or MiKTeX for PDF generation.")
            return None
        except subprocess.TimeoutExpired:
            print("[ReportPipeline] PDF compilation timed out.")
            return None
        except Exception as e:
            print(f"[ReportPipeline] PDF error: {e}")
            return None


# ============================================
# AGENT WRAPPER FOR PIPELINE INTEGRATION
# ============================================

# Import event emitter for live transparency
try:
    from utils.event_emitter import emit_agent_start, emit_agent_complete, emit_stage_change
except ImportError:
    # Fallback if running standalone
    def emit_agent_start(*args, **kwargs): pass
    def emit_agent_complete(*args, **kwargs): pass
    def emit_stage_change(*args, **kwargs): pass

import time


class MultiStageReportAgent:
    """Wrapper to make ReportPipeline compatible with agent-based pipeline."""
    
    def __init__(self, **kwargs):
        self.name = "MultiStageReport"
        self.pipeline = ReportPipeline()
    
    def run(self, state: dict) -> dict:
        """Run the multi-stage report generation with live event emission."""
        findings = state.get("findings", {})
        task = state.get("task", "Research Report")
        job_id = state.get("_job_id", "unknown")
        research_id = int(job_id) if str(job_id).isdigit() else None
        
        start_time = time.time()
        
        # Emit agent start
        emit_agent_start(self.name, research_id=research_id)
        emit_stage_change("report_generation", research_id=research_id)
        
        try:
            result = self.pipeline.generate_report(findings, task, job_id)
            
            elapsed = time.time() - start_time
            elapsed_ms = int(elapsed * 1000)
            
            # Emit success
            emit_agent_complete(self.name, elapsed_ms, success=True, research_id=research_id)
            
            return {
                "response": {
                    "markdown_report": result["markdown_report"],
                    "latex_source": result["latex_source"],
                    "domain": result["domain"],
                    "template": result["template"],
                    "tex_path": result["tex_path"],
                    "pdf_path": result["pdf_path"]
                },
                "raw": result["markdown_report"],
                "agent": self.name,
                "execution_time": elapsed
            }
        except Exception as e:
            elapsed = time.time() - start_time
            elapsed_ms = int(elapsed * 1000)
            
            # Emit failure
            emit_agent_complete(self.name, elapsed_ms, success=False, research_id=research_id)
            
            return {
                "error": str(e),
                "raw": f"Report generation failed: {e}",
                "agent": self.name
            }
