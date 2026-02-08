"""
Section Writer Agents for Multi-Stage Report Generation

Each agent is specialized for writing a specific section of the research paper.
They receive focused context and produce quality output for their section only.
"""

from ..base import BaseAgent
from langchain_core.messages import SystemMessage, HumanMessage


class SectionWriterBase(BaseAgent):
    """Base class for all section writers with common functionality."""
    
    def __init__(self, section_name: str, word_target: str, **kwargs):
        self.section_name = section_name
        self.word_target = word_target
        super().__init__(**kwargs)
    
    def run(self, context: str, section_prompt: str = "") -> dict:
        """Generate the section content based on provided context."""
        print(f"[{self.name}] Writing {self.section_name} section...")
        
        full_prompt = f"{self.system_prompt}\n\nTarget length: {self.word_target}"
        if section_prompt:
            full_prompt += f"\n\nSpecific guidelines: {section_prompt}"
        
        messages = [
            SystemMessage(content=full_prompt),
            HumanMessage(content=f"Based on the following research data, write the {self.section_name} section NOW:\n\n{context}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            content = response.content.strip()
            
            # Remove any markdown headers if they're duplicating section name
            lines = content.split("\n")
            if lines and lines[0].startswith("#"):
                header = lines[0].lower().replace("#", "").strip()
                if self.section_name.lower().replace("_", " ") in header:
                    content = "\n".join(lines[1:]).strip()
            
            return {
                "content": content,
                "section": self.section_name,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e), "section": self.section_name}


class AbstractWriter(SectionWriterBase):
    """Writes the Abstract section - concise summary of entire paper."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="abstract",
            word_target="150-250 words",
            name="AbstractWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Abstract section.

The Abstract must include:
1. Background/Context (1-2 sentences)
2. Research objective/problem (1 sentence)
3. Methodology briefly (1-2 sentences)
4. Key findings/results (2-3 sentences)
5. Significance/implications (1 sentence)

RULES:
- Write in third person, past tense for methods/results
- Be specific, avoid vague statements
- Do NOT include citations in the abstract
- Output ONLY the abstract text, no headers
- Stay within 150-250 words""",
            **kwargs
        )


class IntroductionWriter(SectionWriterBase):
    """Writes the Introduction section - background and motivation."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="introduction",
            word_target="400-600 words",
            name="IntroductionWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Introduction section.

The Introduction must include:
1. Opening hook - Broad context establishing importance
2. Background - Key concepts needed to understand the research
3. Problem statement - What gap or challenge exists
4. Research motivation - Why this problem matters
5. Objectives - What this research aims to accomplish
6. Brief overview - How the paper is organized (optional)

RULES:
- Start broad, then narrow to specific research focus
- Use citations like [Author, Year] or [1] where appropriate
- Write in formal academic prose
- Create smooth transitions between paragraphs
- Output the section text, you may use ### for subsections
- Target 400-600 words""",
            **kwargs
        )


class LitReviewWriter(SectionWriterBase):
    """Writes the Literature Review / Related Work section."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="literature_review",
            word_target="600-1000 words",
            name="LitReviewWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Literature Review (or Related Work) section.

The Literature Review must:
1. Organize sources into THEMES, not just list papers
2. Compare and contrast different approaches
3. Identify agreements and disagreements in the field
4. Show evolution of ideas over time
5. Highlight the research gap this work addresses

RULES:
- Synthesize, don't just summarize each paper
- Group related work by theme or methodology
- Use transition sentences between themes
- End by identifying what's missing (the gap)
- Use citations throughout: [Author, Year] or numbered [1]
- Target 600-1000 words""",
            **kwargs
        )


class MethodologyWriter(SectionWriterBase):
    """Writes the Methodology section - research approach and methods."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="methodology",
            word_target="500-800 words",
            name="MethodologyWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Methodology section.

The Methodology must describe:
1. Research design/approach
2. Data sources and collection methods
3. Analysis techniques and procedures
4. Tools, models, or frameworks used
5. Validation or verification approach

RULES:
- Be specific enough for reproducibility
- Use technical terminology appropriately
- Include mathematical notation where relevant: $equation$
- Justify methodological choices when necessary
- Structure with subsections if complex
- Target 500-800 words""",
            **kwargs
        )


class ResultsWriter(SectionWriterBase):
    """Writes the Results section - presenting findings."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="results",
            word_target="500-700 words",
            name="ResultsWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Results section.

The Results must:
1. Present key findings clearly and objectively
2. Use data, statistics, or evidence to support claims
3. Organize results logically (by research question, chronology, or importance)
4. Reference figures/tables where appropriate: "As shown in Table 1..."
5. Report unexpected or negative results too

RULES:
- Focus on WHAT was found, not interpretation (save for Discussion)
- Be precise with numbers and statistics
- Use bullet points or tables for clarity where appropriate
- Don't editorialize - state results objectively
- Target 500-700 words""",
            **kwargs
        )


class DiscussionWriter(SectionWriterBase):
    """Writes the Discussion section - interpretation and implications."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="discussion",
            word_target="400-600 words",
            name="DiscussionWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Discussion section.

The Discussion must:
1. Interpret the results - what do they mean?
2. Compare to prior work - how do findings relate to existing research?
3. Explain unexpected findings
4. Acknowledge limitations honestly
5. Discuss implications - theoretical and practical

RULES:
- Link back to research objectives
- Don't just repeat results - interpret them
- Be honest about limitations without undermining the work
- Suggest practical applications where relevant
- Target 400-600 words""",
            **kwargs
        )


class ConclusionWriter(SectionWriterBase):
    """Writes the Conclusion section - summary and future work."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="conclusion",
            word_target="200-300 words",
            name="ConclusionWriter",
            system_prompt="""You are an expert academic writer. Your ONLY task is to write the Conclusion section.

The Conclusion must:
1. Summarize the research problem and objectives
2. Highlight key contributions and findings
3. State the significance/impact of the work
4. Suggest directions for future research

RULES:
- Don't introduce new information
- Be concise and impactful
- Avoid hedging language - be confident
- End on a forward-looking note
- Target 200-300 words""",
            **kwargs
        )


class ReferencesWriter(SectionWriterBase):
    """Formats the References section from collected sources."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="references",
            word_target="N/A - list all sources",
            name="ReferencesWriter",
            system_prompt="""You are a citation formatting expert. Your ONLY task is to format references.

Format each reference properly based on the citation style provided.
Include: Authors, Title, Publication/Conference, Year, URL/DOI if available.

RULES:
- Number references [1], [2], etc.
- Ensure consistent formatting throughout
- Include all sources from the research data
- Order alphabetically by first author (APA) or by citation order (IEEE)
- Output ONLY the formatted reference list""",
            **kwargs
        )


# ============================================
# SPECIALIZED SECTION WRITERS FOR DOMAINS
# ============================================

class TheoreticalFrameworkWriter(SectionWriterBase):
    """Writes theoretical/mathematical framework for physics papers."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="theoretical_framework",
            word_target="600-1000 words",
            name="TheoreticalFrameworkWriter",
            system_prompt="""You are a physics expert. Write the Theoretical Framework section.

Include:
1. Fundamental principles and assumptions
2. Mathematical derivations with proper notation
3. Key equations and their physical meaning
4. Boundary conditions and constraints

RULES:
- Use LaTeX math: $inline$ or $$display$$
- Define all variables and symbols
- Show derivation steps clearly
- Reference foundational work
- Target 600-1000 words""",
            **kwargs
        )


class ErrorAnalysisWriter(SectionWriterBase):
    """Writes error analysis for physics/engineering papers."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="error_analysis",
            word_target="300-500 words",
            name="ErrorAnalysisWriter",
            system_prompt="""You are a measurement expert. Write the Error Analysis section.

Include:
1. Sources of systematic error
2. Sources of random error  
3. Error propagation calculations
4. Uncertainty estimates
5. Confidence intervals

RULES:
- Be quantitative where possible
- Use proper uncertainty notation: value ± error
- Discuss how errors affect conclusions
- Target 300-500 words""",
            **kwargs
        )


class PolicyImplicationsWriter(SectionWriterBase):
    """Writes policy implications for social science papers."""
    
    def __init__(self, **kwargs):
        super().__init__(
            section_name="policy_implications",
            word_target="300-500 words",
            name="PolicyImplicationsWriter",
            system_prompt="""You are a policy expert. Write the Policy Implications section.

Include:
1. Practical recommendations from findings
2. Stakeholder relevance
3. Implementation considerations
4. Potential challenges and solutions

RULES:
- Be action-oriented
- Consider multiple stakeholder perspectives
- Ground recommendations in the research findings
- Target 300-500 words""",
            **kwargs
        )


# ============================================
# SECTION WRITER FACTORY
# ============================================

SECTION_WRITERS = {
    "abstract": AbstractWriter,
    "introduction": IntroductionWriter,
    "related_work": LitReviewWriter,
    "literature_review": LitReviewWriter,
    "methodology": MethodologyWriter,
    "materials_methods": MethodologyWriter,
    "experiments": ResultsWriter,
    "results": ResultsWriter,
    "findings": ResultsWriter,
    "evaluation": ResultsWriter,
    "discussion": DiscussionWriter,
    "conclusion": ConclusionWriter,
    "references": ReferencesWriter,
    "theoretical_framework": TheoreticalFrameworkWriter,
    "error_analysis": ErrorAnalysisWriter,
    "policy_implications": PolicyImplicationsWriter,
    "problem_formulation": IntroductionWriter,  # Similar structure
    "proposed_solution": MethodologyWriter,     # Similar structure
    "implementation": MethodologyWriter,        # Similar structure
    "experimental_methods": MethodologyWriter,  # Similar structure
}


def get_section_writer(section_name: str, **kwargs) -> SectionWriterBase:
    """Get the appropriate section writer for a given section name."""
    writer_class = SECTION_WRITERS.get(section_name, SectionWriterBase)
    return writer_class(**kwargs)
