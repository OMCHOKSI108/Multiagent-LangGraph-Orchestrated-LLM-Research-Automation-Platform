# Survey & Literature Review Methodology

Our system employs a **Hybrid Mixed-Methods Approach** combining automated information retrieval with structured systematic review protocols.

## 1. Framework: PRISMA
We adhere to the **Preferred Reporting Items for Systematic Reviews and Meta-Analyses (PRISMA)** guidelines.
- **Identification**: Automated searching across multiple diverse databases.
- **Screening**: LLM-based relevance scoring of titles and abstracts.
- **Eligibility**: Full-context processing to determine if papers meet the research criteria.
- **Included**: Final set of papers used for synthesis.

## 2. Retrieval Augmented Generation (RAG) Architecture
The survey agent (`SystematicLiteratureReviewAgent`) utilizes a **Multi-Source RAG** pipeline:

### Data Sources
1.  **Arxiv Provider**: 
    -   *Technique*: Keyword-based API search sorted by relevance/date.
    -   *Purpose*: Retrieves high-quality, pre-print scientific literature with full LaTeX/PDF metadata.
2.  **Google Search Provider**:
    -   *Technique*: Advanced operator search (`site:`, `filetype:pdf`).
    -   *Purpose*: Captures broad academic and grey literature not indexed in Arxiv.
3.  **DuckDuckGo Provider**:
    -   *Technique*: Privacy-preserving general web context.
    -   *Purpose*: Identifies industry trends, blog posts, and recent news.

## 3. Synthesis Technique
The **Meta-Analysis Agent** processes the retrieved data using:
-   **Thematic Analysis**: Clustering papers by common topics/methods.
-   **Gap Analysis**: Identifying missing intersections in the retrieved clusters.
-   **Contradiction Mapping**: Highlighting studies with conflicting results.
