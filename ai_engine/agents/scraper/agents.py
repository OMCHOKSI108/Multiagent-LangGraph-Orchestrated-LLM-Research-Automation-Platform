from ..base import BaseAgent
from utils.providers import WebSearchProvider, GoogleSearchProvider, WikipediaProvider, PDFReaderProvider, ArxivProvider, HtmlScraperProvider
from langchain_core.messages import SystemMessage, HumanMessage

class DataScraperAgent(BaseAgent):
    def __init__(self, **kwargs):
        # ... (init code) ...
        super().__init__(
            name="DataScraper",
            system_prompt="""You are an expert Data Collector and Web Scraper.
            Your job is to gather accurate information from the provided topic or URL.
            
            1. If given a URL, determine if it's a PDF or a webpage and extract key info.
            2. If given a Topic, perform a multi-source search to compile a dataset.
            
            Output JSON with keys: 
            'source_type' (pdf/web/arxiv),
            'extracted_content_summary', 
            'key_data_points' (list of facts/stats),
            'raw_url'
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
            wiki_res = self.wiki_provider.search(task, max_results=1)
            # 2. Arxiv
            arxiv_res = self.arxiv_provider.search_papers(task, max_results=2)
            # 3. Google
            google_res = self.google_provider.search(task, max_results=2)
            
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
            
        # Call LLM to structure the extracted mess
        enhanced_prompt = f"{self.system_prompt}\n\nRAW SCRAPED DATA:\n{extracted_text[:12000]}" # Limit context
        
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
