from ..base import BaseAgent
from utils.providers import WebSearchProvider, GoogleSearchProvider, WikipediaProvider, PDFReaderProvider, ArxivProvider, HtmlScraperProvider
from utils.event_emitter import emit_source
from langchain_core.messages import SystemMessage, HumanMessage

class DataScraperAgent(BaseAgent):
    def __init__(self, **kwargs):
        # ... (init code) ...
        super().__init__(
            name="DataScraper",
            system_prompt="""Your Role: Data Reliability Engineer
            
            Short basic instruction:
            Scrape web data and validate it for research use.
            
            What you should do:
            - Scrape content from provided URLs.
            - Convert to Markdown.
            - Cross-check claims against at least two sources.
            
            Your Goal:
            Provide clean, citation-ready research inputs.
            
            Result:
            - Markdown dataset
            - Source list
            - Confidence score per claim
            
            Constraint:
            - No anonymous or unverifiable sources.
            - Log scraping failures.
            
            Output JSON with keys:
            'source_type' (pdf/web/arxiv),
            'markdown_content',
            'sources': [{"url": "...", "confidence": 0.0-1.0}],
            'key_data_points' (list of facts/stats)
            """,
            **kwargs
        )
        # Initialize all providers
        self.web_provider = WebSearchProvider()
        self.google_provider = GoogleSearchProvider()
        self.wiki_provider = WikipediaProvider()
        self.pdf_provider = PDFReaderProvider()
        self.arxiv_provider = ArxivProvider()
        self.html_provider = HtmlScraperProvider()

    def run(self, state: dict) -> dict:
        print(f"[{self.name}] Initiating Scraping Sequence...")
        task = state.get("task", "")
        url = state.get("paper_url") or state.get("url", "")
        
        extracted_text = ""
        source_type = "unknown"
        
        # Strategy A: Direct URL extraction
        if url:
            if url.endswith(".pdf") or "arxiv.org/abs" in url:
                print(f"[{self.name}] Mode: PDF Extraction")
                # Fix Arxiv URL if needed
                if "arxiv.org/abs" in url: url = url.replace("abs", "pdf") + ".pdf"
                
                extracted_text = self.pdf_provider.read_pdf(url)
                source_type = "pdf"
            else:
                print(f"[{self.name}] Mode: Deep Web Page Extraction")
                # Use the new HTML Scraper to get the ACTUAL page content
                extracted_text = self.html_provider.scrape_url(url)
                if len(extracted_text) < 100:
                    extracted_text += "\n(Content too short, falling back to metadata search...)"
                source_type = "web_html"
        # Strategy B: Topic Search
        else:
            print(f"[{self.name}] Mode: Deep Web Search")
            source_type = "multi_source_search"
            
            # 1. Wiki
            wiki_res = self.wiki_provider.search(task, max_results=3)
            # 2. Arxiv
            arxiv_res = self.arxiv_provider.search_papers(task, max_results=5)
            # 3. Google
            google_res = self.google_provider.search(task, max_results=5)
            
            extracted_text = "SOURCES COLLECTED:\n"
            
            # Helper to add content
            def add_content(source_name, items, fetch_full=False):
                content = f"\n[{source_name}]:\n"
                for i, r in enumerate(items):
                    content += f"- {r.get('title', 'Unknown')}: {r.get('summary', '') or r.get('body', '')}\n"
                    # Fetch full content for the very first result
                    if fetch_full and i == 0 and r.get('url'):
                        try:
                            print(f"   - Deep scraping {source_name} top result: {r['url']}")
                            full_text = self.html_provider.scrape_url(r['url'])
                            content += f"   DETAILS: {full_text[:4000]}...\n"
                        except Exception as e:
                            print(f"   - Deep scrape failed: {e}")
                return content

            extracted_text += add_content("Wikipedia", wiki_res, fetch_full=False)
            extracted_text += add_content("Arxiv", arxiv_res, fetch_full=False)
            extracted_text += add_content("Google Web", google_res, fetch_full=True)

        # ── Dataset / Survey Discovery ──
        # Search for datasets, GitHub repos, and Kaggle datasets related to the topic
        try:
            print(f"[{self.name}] Searching for datasets and surveys...")
            dataset_queries = [
                f"{task} dataset site:kaggle.com",
                f"{task} dataset OR benchmark site:github.com",
                f"{task} survey dataset OR corpus",
            ]
            for dq in dataset_queries:
                ds_results = self.google_provider.search(dq, max_results=3)
                for r in ds_results:
                    url_lower = (r.get("url", "") or "").lower()
                    title = r.get("title", "Unknown Dataset")
                    desc = r.get("body", "") or r.get("description", "") or ""
                    domain = r.get("domain", "")

                    # Classify source type based on URL
                    if "kaggle.com" in url_lower:
                        st = "kaggle"
                        domain = "kaggle.com"
                    elif "github.com" in url_lower:
                        st = "github"
                        domain = "github.com"
                    else:
                        st = "dataset"

                    emit_source(
                        source_type=st,
                        domain=domain,
                        url=r.get("url"),
                        title=title,
                        description=desc[:200],
                        items_found=1,
                        status="success",
                    )
        except Exception as ds_err:
            print(f"[{self.name}] Dataset search error (non-fatal): {ds_err}")
            
        # Call LLM to structure the extracted mess
        enhanced_prompt = f"{self.system_prompt}\n\nRAW SCRAPED DATA:\n{extracted_text[:20000]}" # Limit context
        
        messages = [
            SystemMessage(content=enhanced_prompt + "\n\nIMPORTANT: Output ONLY valid JSON."),
            HumanMessage(content=str(state))
        ]
        
        try:
            response = self.llm.invoke(messages)
            return {
                "response": self._extract_json(response.content),
                "raw": response.content,
                "agent": self.name
            }
        except Exception as e:
            print(f"[{self.name}] Error: {e}")
            return {"error": str(e)}
