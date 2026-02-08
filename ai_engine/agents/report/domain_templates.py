"""
Domain Templates for Multi-Stage Report Generation

This module defines the report structure templates for different academic domains.
Each template specifies sections, citation style, and formatting preferences.
"""

from typing import TypedDict, List, Literal

DomainType = Literal["cs_ai", "biology", "physics", "social_sciences", "engineering", "general"]

class DomainTemplate(TypedDict):
    name: str
    sections: List[str]
    style: str
    math_heavy: bool
    citation_style: str
    latex_class: str
    section_prompts: dict

# ============================================
# DOMAIN TEMPLATE DEFINITIONS
# ============================================

DOMAIN_TEMPLATES: dict[str, DomainTemplate] = {
    "cs_ai": {
        "name": "Computer Science / Artificial Intelligence",
        "sections": [
            "abstract",
            "introduction", 
            "related_work",
            "methodology",
            "experiments",
            "results",
            "discussion",
            "conclusion",
            "references"
        ],
        "style": "technical",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "article",
        "section_prompts": {
            "abstract": "Summarize: problem, approach, key results, significance. 150-250 words.",
            "introduction": "Background, problem statement, motivation, contributions. 400-600 words.",
            "related_work": "Synthesize prior work into themes. Compare approaches. 600-1000 words.",
            "methodology": "Technical approach, algorithms, models. Use math notation. 500-800 words.",
            "experiments": "Datasets, baselines, metrics, experimental setup. 400-600 words.",
            "results": "Performance tables, comparisons, ablations. 400-600 words.",
            "discussion": "Analysis, limitations, implications. 300-500 words.",
            "conclusion": "Summary, contributions, future work. 200-300 words.",
            "references": "List all cited sources in IEEE format."
        }
    },
    
    "biology": {
        "name": "Biology / Life Sciences",
        "sections": [
            "abstract",
            "introduction",
            "materials_methods",
            "results",
            "discussion",
            "conclusion",
            "references"
        ],
        "style": "imrad",
        "math_heavy": False,
        "citation_style": "apa",
        "latex_class": "article",
        "section_prompts": {
            "abstract": "Background, objectives, methods, results, conclusions. 200-300 words.",
            "introduction": "Scientific context, research gap, hypothesis, objectives. 500-700 words.",
            "materials_methods": "Subjects, materials, procedures, analysis methods. 600-900 words.",
            "results": "Findings with statistical analysis. Use tables/figures. 500-800 words.",
            "discussion": "Interpretation, comparison to literature, implications. 600-900 words.",
            "conclusion": "Key findings, significance, future directions. 200-300 words.",
            "references": "List all cited sources in APA format."
        }
    },
    
    "physics": {
        "name": "Physics",
        "sections": [
            "abstract",
            "introduction",
            "theoretical_framework",
            "experimental_methods",
            "results",
            "error_analysis",
            "discussion",
            "conclusion",
            "references"
        ],
        "style": "formal",
        "math_heavy": True,
        "citation_style": "aps",
        "latex_class": "revtex4-2",
        "section_prompts": {
            "abstract": "Motivation, method, principal results. 150-200 words.",
            "introduction": "Physical context, prior work, motivation. 400-600 words.",
            "theoretical_framework": "Mathematical derivations, equations, theory. Use LaTeX math. 600-1000 words.",
            "experimental_methods": "Apparatus, procedures, measurement techniques. 400-600 words.",
            "results": "Data presentation, graphs, observations. 400-600 words.",
            "error_analysis": "Systematic and random errors, uncertainty propagation. 300-500 words.",
            "discussion": "Physical interpretation, comparison to theory. 400-600 words.",
            "conclusion": "Summary of findings, significance. 150-250 words.",
            "references": "List all cited sources in APS format."
        }
    },
    
    "social_sciences": {
        "name": "Social Sciences",
        "sections": [
            "abstract",
            "introduction",
            "literature_review",
            "methodology",
            "findings",
            "discussion",
            "policy_implications",
            "conclusion",
            "references"
        ],
        "style": "qualitative",
        "math_heavy": False,
        "citation_style": "apa",
        "latex_class": "article",
        "section_prompts": {
            "abstract": "Context, purpose, methodology, findings, implications. 200-250 words.",
            "introduction": "Social context, research problem, significance. 500-700 words.",
            "literature_review": "Theoretical frameworks, prior research, gaps. 800-1200 words.",
            "methodology": "Research design, participants, data collection, analysis. 600-800 words.",
            "findings": "Themes, patterns, participant quotes. 700-1000 words.",
            "discussion": "Interpretation, relation to theory, limitations. 500-700 words.",
            "policy_implications": "Practical recommendations, stakeholder relevance. 300-500 words.",
            "conclusion": "Summary, contributions, future research. 250-350 words.",
            "references": "List all cited sources in APA format."
        }
    },
    
    "engineering": {
        "name": "Engineering",
        "sections": [
            "abstract",
            "introduction",
            "problem_formulation",
            "proposed_solution",
            "implementation",
            "evaluation",
            "discussion",
            "conclusion",
            "references"
        ],
        "style": "technical",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "IEEEtran",
        "section_prompts": {
            "abstract": "Problem, solution, results, significance. 150-200 words.",
            "introduction": "Engineering context, challenges, motivation. 400-600 words.",
            "problem_formulation": "Formal problem definition, constraints, objectives. 400-600 words.",
            "proposed_solution": "Design, architecture, algorithms. 600-900 words.",
            "implementation": "System details, technologies, deployment. 500-700 words.",
            "evaluation": "Benchmarks, performance metrics, comparisons. 500-700 words.",
            "discussion": "Trade-offs, limitations, lessons learned. 400-600 words.",
            "conclusion": "Contributions, future work. 200-300 words.",
            "references": "List all cited sources in IEEE format."
        }
    },
    
    "general": {
        "name": "General / Multidisciplinary",
        "sections": [
            "abstract",
            "introduction",
            "literature_review",
            "methodology",
            "results",
            "discussion",
            "conclusion",
            "references"
        ],
        "style": "academic",
        "math_heavy": False,
        "citation_style": "apa",
        "latex_class": "article",
        "section_prompts": {
            "abstract": "Summary of research question, approach, findings. 150-250 words.",
            "introduction": "Background, problem, objectives, structure. 400-600 words.",
            "literature_review": "Prior work, themes, research gaps. 600-900 words.",
            "methodology": "Research approach, methods, data sources. 400-600 words.",
            "results": "Key findings, analysis. 500-700 words.",
            "discussion": "Interpretation, implications, limitations. 400-600 words.",
            "conclusion": "Summary, contributions, future directions. 200-300 words.",
            "references": "List all cited sources."
        }
    }
}

# ============================================
# DOMAIN DETECTION KEYWORDS
# ============================================

DOMAIN_KEYWORDS = {
    "cs_ai": [
        "machine learning", "neural network", "deep learning", "algorithm",
        "transformer", "bert", "gpt", "llm", "nlp", "computer vision",
        "reinforcement learning", "classification", "regression", "clustering",
        "convolutional", "recurrent", "attention mechanism", "embedding",
        "accuracy", "precision", "recall", "f1 score", "benchmark"
    ],
    "biology": [
        "gene", "protein", "cell", "organism", "species", "evolution",
        "dna", "rna", "genome", "mutation", "enzyme", "metabolism",
        "clinical", "patient", "treatment", "disease", "therapy",
        "in vitro", "in vivo", "specimen", "tissue", "molecular"
    ],
    "physics": [
        "quantum", "particle", "wave", "energy", "momentum", "force",
        "relativity", "electromagnetic", "thermodynamic", "entropy",
        "hamiltonian", "lagrangian", "schrödinger", "planck",
        "photon", "electron", "proton", "neutron", "quark"
    ],
    "social_sciences": [
        "society", "culture", "behavior", "psychology", "sociology",
        "ethnography", "qualitative", "interview", "survey", "participant",
        "policy", "governance", "institution", "demographic", "socioeconomic"
    ],
    "engineering": [
        "system design", "architecture", "implementation", "deployment",
        "scalability", "performance", "latency", "throughput", "efficiency",
        "circuit", "hardware", "software", "embedded", "iot", "sensor"
    ]
}


def detect_domain(task: str, findings: dict) -> DomainType:
    """
    Detect the most likely academic domain based on task and findings.
    Returns one of: cs_ai, biology, physics, social_sciences, engineering, general
    """
    # Combine all text for analysis
    text_parts = [task.lower()]
    
    for key, value in findings.items():
        if key.startswith("_"):
            continue
        if isinstance(value, dict):
            for v in value.values():
                if isinstance(v, str):
                    text_parts.append(v.lower()[:1000])
        elif isinstance(value, str):
            text_parts.append(value.lower()[:1000])
    
    combined_text = " ".join(text_parts)
    
    # Score each domain by keyword matches
    scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined_text)
        scores[domain] = score
    
    # Return domain with highest score, defaulting to general
    best_domain = max(scores, key=scores.get)
    if scores[best_domain] < 2:
        return "general"
    
    return best_domain


def get_template(domain: DomainType) -> DomainTemplate:
    """Get the template for a specific domain."""
    return DOMAIN_TEMPLATES.get(domain, DOMAIN_TEMPLATES["general"])
