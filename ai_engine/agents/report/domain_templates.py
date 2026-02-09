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
    },

    "ieee_conference": {
        "name": "IEEE Conference Paper",
        "sections": [
            "abstract",
            "introduction",
            "related_work",
            "methodology",
            "experiments",
            "results_discussion",
            "conclusion",
            "references"
        ],
        "style": "technical",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "IEEEtran",
        "latex_preamble": r"""\documentclass[conference,letterpaper]{IEEEtran}
\usepackage{graphicx}
\usepackage{subcaption}
\usepackage{fixltx2e}
\usepackage{gensymb}
\usepackage{todonotes}
\usepackage{url}
\hyphenation{op-tical net-works semi-conduc-tor top-ology}
""",
        "section_prompts": {
            "abstract": "Concise summary of problem, method, and results. 150-250 words. No citations.",
            "introduction": "Problem context, motivation, contributions. 400-500 words.",
            "related_work": "Brief review of relevant prior work. 300-400 words.",
            "methodology": "Technical details, algorithms, system model. 500-700 words.",
            "experiments": "Setup, datasets, baselines. 300-400 words.",
            "results_discussion": "Performance analysis, comparison. 400-600 words.",
            "conclusion": "Summary and future work. 150-200 words.",
            "references": "Strict IEEE format citations."
        }
    },

    "comprehensive_report": {
        "name": "Comprehensive Research Report",
        "sections": [
            "abstract",
            "introduction",
            "pipeline_architecture",
            "data_processing",
            "mathematical_foundations",
            "exploratory_analysis",
            "model_development",
            "results_discussion",
            "deployment",
            "conclusion",
            "references"
        ],
        "style": "detailed",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "article",
        "latex_preamble": r"""\documentclass[12pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage[utf8]{inputenc}
\usepackage{lmodern}
\usepackage{geometry}
\geometry{margin=0.9in}
\usepackage{graphicx}
\usepackage{float}
\usepackage{booktabs}
\usepackage{amsmath, amssymb}
\usepackage{hyperref}
\usepackage{caption}
\usepackage{subcaption}
\usepackage{enumitem}
\usepackage{xcolor}
\usepackage{pgffor}
\usepackage{siunitx}
\graphicspath{{fig/}}
\newcommand{\plotfigure}[3]{
  \begin{figure}[H]
    \centering
    \includegraphics[width=0.85\linewidth]{#1}
    \caption{#2}
    \label{#3}
  \end{figure}
}
""",
        "section_prompts": {
            "abstract": "Comprehensive summary of the entire project. 250-350 words.",
            "introduction": "Context, problem statement, business impact, objectives. 600-800 words.",
            "pipeline_architecture": "Detailed system flow, diagrams, steps. 400-600 words.",
            "data_processing": "Data loading, cleaning, feature engineering logic. 500-700 words.",
            "mathematical_foundations": "Theoretical background of models/algorithms used. 600-900 words.",
            "exploratory_analysis": "Key insights from data distributions and correlations. 500-700 words.",
            "model_development": "Training process, hyperparameter tuning, model selection. 500-700 words.",
            "results_discussion": "Performance metrics, comparison tables, error analysis. 600-900 words.",
            "deployment": "Implementation details, API, production considerations. 300-500 words.",
            "conclusion": "Final thoughts, limitations, future work. 300-400 words.",
            "references": "Detailed bibliography."
        }
    },
    
    "ieee_conference": {
        "name": "IEEE Conference Paper",
        "sections": [
            "abstract",
            "introduction",
            "related_work",
            "methodology",
            "experiments",
            "results_discussion",
            "conclusion",
            "references"
        ],
        "style": "technical",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "IEEEtran",
        "section_prompts": {
            "abstract": "Concise summary of problem, method, and results. 150-250 words. No citations.",
            "introduction": "Problem context, motivation, contributions. 400-500 words.",
            "related_work": "Brief review of relevant prior work. 300-400 words.",
            "methodology": "Technical details, algorithms, system model. 500-700 words.",
            "experiments": "Setup, datasets, baselines. 300-400 words.",
            "results_discussion": "Performance analysis, comparison. 400-600 words.",
            "conclusion": "Summary and future work. 150-200 words.",
            "references": "Strict IEEE format citations."
        }
    },

    "comprehensive_report": {
        "name": "Comprehensive Research Report",
        "sections": [
            "abstract",
            "introduction",
            "pipeline_architecture",
            "data_processing",
            "mathematical_foundations",
            "exploratory_analysis",
            "model_development",
            "results_discussion",
            "deployment",
            "conclusion",
            "references"
        ],
        "style": "detailed",
        "math_heavy": True,
        "citation_style": "ieee",
        "latex_class": "article",
        "section_prompts": {
            "abstract": "Comprehensive summary of the entire project. 250-350 words.",
            "introduction": "Context, problem statement, business impact, objectives. 600-800 words.",
            "pipeline_architecture": "Detailed system flow, diagrams, steps. 400-600 words.",
            "data_processing": "Data loading, cleaning, feature engineering logic. 500-700 words.",
            "mathematical_foundations": "Theoretical background of models/algorithms used. 600-900 words.",
            "exploratory_analysis": "Key insights from data distributions and correlations. 500-700 words.",
            "model_development": "Training process, hyperparameter tuning, model selection. 500-700 words.",
            "results_discussion": "Performance metrics, comparison tables, error analysis. 600-900 words.",
            "deployment": "Implementation details, API, production considerations. 300-500 words.",
            "conclusion": "Final thoughts, limitations, future work. 300-400 words.",
            "references": "Detailed bibliography."
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
    ],
    "ieee_conference": [
        "ieee", "conference", "transactions", "proceedings", "symposium"
    ],
    "comprehensive_report": [
        "detailed report", "comprehensive analysis", "full project", "end-to-end", "case study"
    ]
}


# ============================================
# HELPER FUNCTIONS
# ============================================

def detect_domain(task: str, findings: dict) -> DomainType:
    """
    Detect the most appropriate academic domain based on task and findings.
    
    Args:
        task: The research task description
        findings: Dictionary of research findings from previous agents
        
    Returns:
        DomainType: The detected domain key (e.g., 'cs_ai', 'ieee_conference')
    """
    # Combine all text for analysis
    combined_text = task.lower()
    
    # Add findings text
    for key, value in findings.items():
        if isinstance(value, str):
            combined_text += " " + value.lower()
        elif isinstance(value, dict):
            for v in value.values():
                if isinstance(v, str):
                    combined_text += " " + v.lower()
    
    # Score each domain based on keyword matches
    scores = {}
    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = 0
        for keyword in keywords:
            if keyword.lower() in combined_text:
                score += 1
        scores[domain] = score
    
    # Find best matching domain
    if not scores:
        return "general"
    
    best_domain = max(scores, key=scores.get)
    
    # Require minimum score threshold
    if scores[best_domain] < 2:
        return "general"
    
    return best_domain


def get_template(domain: DomainType) -> DomainTemplate:
    """
    Get the template configuration for a specific domain.
    
    Args:
        domain: The domain key to retrieve template for
        
    Returns:
        DomainTemplate: The template configuration dictionary
    """
    return DOMAIN_TEMPLATES.get(domain, DOMAIN_TEMPLATES["general"])
