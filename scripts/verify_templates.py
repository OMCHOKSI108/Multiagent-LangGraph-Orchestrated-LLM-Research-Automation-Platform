
import sys
import os
import unittest
from unittest.mock import MagicMock, patch

# Add project root to path
# Assuming verify_templates.py is in scripts/, so .. is project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Need to import BaseAgent to mock cache
from ai_engine.agents.base import BaseAgent
from ai_engine.agents.report.agents import ScientificWritingAgent, LaTeXGenerationAgent
from ai_engine.agents.report.domain_templates import detect_domain, get_template, DOMAIN_KEYWORDS

class TestTemplateIntegration(unittest.TestCase):
    def setUp(self):
        # Mock findings and task
        self.task_ieee = "IEEE Conference Paper on Transformers"
        self.findings = {"test_finding": "Some data"}

    def test_domain_detection(self):
        # Ensure we have keywords
        self.assertIn("ieee_conference", DOMAIN_KEYWORDS)
        
        domain = detect_domain(self.task_ieee, self.findings)
        print(f"Detected domain for '{self.task_ieee}': {domain}")
        self.assertEqual(domain, "ieee_conference")

    def test_scientific_writing_formatting(self):
        # Instantiate agent
        agent = ScientificWritingAgent(model_name="gpt-4o")
        
        # Mock LLM to avoid calls
        agent.llm = MagicMock()
        agent.llm.invoke.return_value.content = "# Report\nContent"
        
        # Mock cache to force run logic
        with patch.object(BaseAgent, '_get_from_cache', return_value=None):
            with patch.object(BaseAgent, '_save_to_cache'):
                state = {"task": self.task_ieee, "findings": self.findings}
                agent.run(state)
        
        # Verify prompts
        call_args = agent.llm.invoke.call_args
        if call_args:
            messages = call_args[0][0]
            human_msg = messages[1].content
            print("\nScientificWriting Prompt Subset:\n", human_msg[:500])
            
            # Check for IEEE sections
            self.assertIn("RELATED WORK", human_msg.upper())
            self.assertIn("EXPERIMENTS", human_msg.upper())
            self.assertIn("Strict IEEE format citations", human_msg)

    def test_latex_generation_preamble(self):
        agent = LaTeXGenerationAgent(model_name="gpt-4o")
        agent.llm = MagicMock()
        agent.llm.invoke.return_value.content = "Latex Code"
        
        with patch.object(BaseAgent, '_get_from_cache', return_value=None):
            with patch.object(BaseAgent, '_save_to_cache'):
                state = {
                    "task": self.task_ieee, 
                    "findings": {"scientific_writing": {"markdown_report": "# Test Report"}}
                }
                agent.run(state)
        
        call_args = agent.llm.invoke.call_args
        if call_args:
            messages = call_args[0][0]
            human_msg = messages[1].content
            print("\nLaTeXGeneration Prompt Subset:\n", human_msg[:500])
            
            # Check for Preamble injection
            self.assertIn("documentclass[conference", human_msg)
            self.assertIn("IEEEtran", human_msg)

if __name__ == '__main__':
    unittest.main()
