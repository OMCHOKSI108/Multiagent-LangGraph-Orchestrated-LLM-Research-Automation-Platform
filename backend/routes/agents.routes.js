const express = require('express');
const router = express.Router();
const axios = require('axios');
const logger = require('../utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

// List all available agents
router.get('/', async (req, res) => {
    try {
        const response = await axios.get(`${AI_ENGINE_URL}/agents`);
        res.json(response.data);
    } catch (error) {
        logger.error(`[Agents] Failed to fetch agents: ${error.message}`);
        res.status(502).json({ error: 'Failed to fetch agents from AI engine' });
    }
});

// Test individual agent
router.post('/:agent_slug/test', async (req, res) => {
    try {
        const { agent_slug } = req.params;
        const { task, options } = req.body;

        // Default inputs for each agent if not provided
        const defaultInputs = {
            topic_discovery: "artificial intelligence in healthcare",
            domain_intelligence: "quantum computing applications", 
            historical_review: "neural networks development",
            slr: "transformer architecture papers",
            gap_synthesis: "computer vision limitations",
            innovation_novelty: "sustainable AI computing",
            paper_decomposition: "https://arxiv.org/abs/1706.03762",
            paper_understanding: "Attention mechanism in transformers",
            technical_verification: "BERT achieves 95% accuracy on GLUE benchmark",
            interactive_chatbot: "Explain the attention mechanism in simple terms",
            visualization: "GPU performance: RTX 4090: 100 TFLOPS, RTX 4080: 80 TFLOPS, RTX 4070: 60 TFLOPS",
            scientific_writing: "Write introduction for machine learning survey",
            latex_generation: "Generate LaTeX table for experimental results",
            adversarial_critique: "AI will replace all human jobs within 5 years",
            hallucination_detection: "GPT-4 has 1 trillion parameters and was trained on 100TB of data",
            data_scraper: "https://arxiv.org/abs/2023.12345",
            news: "recent AI breakthroughs 2024",
            scoring: "evaluate research methodology quality"
        };

        const testTask = task || defaultInputs[agent_slug] || "test input";

        const response = await axios.post(`${AI_ENGINE_URL}/agents/${agent_slug}/test`, {
            task: testTask,
            options: options || {}
        }, {
            timeout: 60000 // 1 minute timeout
        });

        res.json(response.data);
    } catch (error) {
        logger.error(`[Agents] Agent test failed: ${error.message}`);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(502).json({ 
                error: 'Failed to test agent',
                details: error.message 
            });
        }
    }
});

// Get search providers
router.get('/providers', async (req, res) => {
    try {
        const response = await axios.get(`${AI_ENGINE_URL}/providers`);
        res.json(response.data);
    } catch (error) {
        logger.error(`[Agents] Failed to fetch providers: ${error.message}`);
        res.status(502).json({ error: 'Failed to fetch search providers' });
    }
});

// Test search provider
router.post('/providers/test', async (req, res) => {
    try {
        const { provider = 'duckduckgo', query = 'test query' } = req.body;
        
        const response = await axios.post(`${AI_ENGINE_URL}/providers/test`, null, {
            params: { provider, query },
            timeout: 30000
        });

        res.json(response.data);
    } catch (error) {
        logger.error(`[Agents] Provider test failed: ${error.message}`);
        
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(502).json({ 
                error: 'Failed to test provider',
                details: error.message 
            });
        }
    }
});

module.exports = router;