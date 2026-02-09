const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');
const { marked } = require('marked');
const archiver = require('archiver');

/**
 * Export research result as Markdown.
 *
 * GET /export/:id/markdown
 */
router.get('/:id/markdown', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT result_json, task, title FROM research_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = result.rows[0];

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract markdown from various possible locations in result_json
        let markdown = '';
        const rj = result_json;

        // Support both new multi_stage_report and old scientific_writing keys
        if (rj.multi_stage_report && rj.multi_stage_report.markdown_report) {
            markdown = rj.multi_stage_report.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.markdown_report) {
            markdown = rj.scientific_writing.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.response) {
            markdown = rj.scientific_writing.response;
        } else if (rj.final_state && rj.final_state.findings) {
            // Fallback: build markdown from findings
            const findings = rj.final_state.findings;
            markdown = `# ${title || task}\n\n`;
            for (const [key, value] of Object.entries(findings)) {
                if (typeof value === 'string') {
                    markdown += `## ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n${value}\n\n`;
                } else if (value && typeof value === 'object' && value.response) {
                    markdown += `## ${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}\n\n${value.response}\n\n`;
                }
            }
        } else {
            // Last resort: stringify
            markdown = `# ${title || task}\n\n\`\`\`json\n${JSON.stringify(result_json, null, 2)}\n\`\`\``;
        }

        const filename = `research_${id}.md`;
        res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(markdown);

    } catch (err) {
        logger.error(`[Export] Markdown error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Export research result as PDF.
 *
 * GET /export/:id/pdf
 */
router.get('/:id/pdf', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT result_json, task, title FROM research_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = result.rows[0];

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract markdown content - support both old and new keys
        let markdown = '';
        const rj = result_json;

        if (rj.multi_stage_report && rj.multi_stage_report.markdown_report) {
            markdown = rj.multi_stage_report.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.markdown_report) {
            markdown = rj.scientific_writing.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.response) {
            markdown = rj.scientific_writing.response;
        } else {
            markdown = `# ${title || task}\n\n${JSON.stringify(result_json, null, 2)}`;
        }

        // For PDF generation, we return properly rendered HTML with print CSS.
        // The frontend downloads this as a .pdf blob; the user can also use
        // the browser's "Save as PDF" via window.print().
        const renderedBody = marked.parse(markdown);

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title || task}</title>
    <style>
        body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #333; line-height: 1.6; }
        h1 { color: #1a1a2e; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
        h2 { color: #16213e; margin-top: 30px; }
        h3 { color: #0f3460; }
        pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
        code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; font-size: 0.9em; }
        pre code { background: transparent; padding: 0; }
        blockquote { border-left: 4px solid #4a90d9; margin: 20px 0; padding: 10px 20px; background: #f8f9fa; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
        th { background: #f2f2f2; }
        img { max-width: 100%; height: auto; }
        a { color: #4a90d9; }
        ul, ol { padding-left: 24px; }
        li { margin-bottom: 4px; }
        @media print { body { margin: 0; } @page { margin: 1in; } }
    </style>
</head>
<body>
${renderedBody}
</body>
</html>`;

        const filename = `research_${id}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);

    } catch (err) {
        logger.error(`[Export] PDF error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Export research result as LaTeX.
 *
 * GET /export/:id/latex
 */
router.get('/:id/latex', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT result_json, task, title FROM research_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = result.rows[0];

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract LaTeX from result - support both old and new keys
        let latex = '';
        const rj = result_json;

        if (rj.multi_stage_report && rj.multi_stage_report.latex_source) {
            latex = rj.multi_stage_report.latex_source;
        } else if (rj.latex_generation && rj.latex_generation.latex_source) {
            latex = rj.latex_generation.latex_source;
        } else if (rj.latex_generation && rj.latex_generation.response) {
            latex = rj.latex_generation.response;
        } else {
            // Generate minimal LaTeX wrapper
            const content = rj.multi_stage_report?.markdown_report || rj.scientific_writing?.response || rj.scientific_writing?.markdown_report || JSON.stringify(rj, null, 2);
            latex = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\title{${(title || task).replace(/[&%$#_{}~^\\]/g, '\\$&')}}
\\date{\\today}
\\begin{document}
\\maketitle

\\begin{verbatim}
${content}
\\end{verbatim}

\\end{document}`;
        }

        const filename = `research_${id}.tex`;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(latex);

    } catch (err) {
        logger.error(`[Export] LaTeX error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Export research as ZIP bundle (markdown + latex + plots).
 *
 * GET /export/:id/zip
 */
router.get('/:id/zip', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT result_json, task, title FROM research_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = result.rows[0];
        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        const rj = result_json;
        const researchTitle = title || task || 'research';

        // Set ZIP headers
        const filename = `research_${id}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        // Add Markdown
        let markdown = '';
        if (rj.multi_stage_report && rj.multi_stage_report.markdown_report) {
            markdown = rj.multi_stage_report.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.markdown_report) {
            markdown = rj.scientific_writing.markdown_report;
        } else if (rj.scientific_writing && rj.scientific_writing.response) {
            markdown = rj.scientific_writing.response;
        } else {
            markdown = `# ${researchTitle}\n\n${JSON.stringify(rj, null, 2)}`;
        }
        archive.append(markdown, { name: `${researchTitle}.md` });

        // Add LaTeX
        let latex = '';
        if (rj.multi_stage_report && rj.multi_stage_report.latex_source) {
            latex = rj.multi_stage_report.latex_source;
        } else if (rj.latex_generation && rj.latex_generation.latex_source) {
            latex = rj.latex_generation.latex_source;
        }
        if (latex) {
            archive.append(latex, { name: `${researchTitle}.tex` });
        }

        // Add raw JSON
        archive.append(JSON.stringify(rj, null, 2), { name: 'raw_results.json' });

        // Add Mermaid diagrams as separate files
        const viz = rj.final_state?.findings?.visualization?.response || rj.visualization || {};
        let diagramCount = 0;
        if (viz.timeline_mermaid) {
            archive.append(viz.timeline_mermaid, { name: `diagrams/timeline.mmd` });
            diagramCount++;
        }
        if (viz.methodology_mermaid) {
            archive.append(viz.methodology_mermaid, { name: `diagrams/methodology.mmd` });
            diagramCount++;
        }
        if (viz.data_chart_mermaid) {
            archive.append(viz.data_chart_mermaid, { name: `diagrams/data_chart.mmd` });
            diagramCount++;
        }

        await archive.finalize();

    } catch (err) {
        logger.error(`[Export] ZIP error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

/**
 * Export only plots/diagrams as ZIP.
 *
 * GET /export/:id/plots
 */
router.get('/:id/plots', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            'SELECT result_json, task, title FROM research_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = result.rows[0];
        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        const rj = result_json;

        const filename = `research_${id}_plots.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.on('error', (err) => { throw err; });
        archive.pipe(res);

        const viz = rj.final_state?.findings?.visualization?.response || rj.visualization || {};
        let hasContent = false;

        if (viz.timeline_mermaid) {
            archive.append(viz.timeline_mermaid, { name: 'timeline.mmd' });
            hasContent = true;
        }
        if (viz.methodology_mermaid) {
            archive.append(viz.methodology_mermaid, { name: 'methodology.mmd' });
            hasContent = true;
        }
        if (viz.data_chart_mermaid) {
            archive.append(viz.data_chart_mermaid, { name: 'data_chart.mmd' });
            hasContent = true;
        }

        // Include a summary of image URLs if present
        if (viz.image_urls && Array.isArray(viz.image_urls) && viz.image_urls.length > 0) {
            const urlList = viz.image_urls.join('\n');
            archive.append(urlList, { name: 'image_urls.txt' });
            hasContent = true;
        }

        if (!hasContent) {
            archive.append('No diagrams or plots were generated for this research.', { name: 'README.txt' });
        }

        await archive.finalize();

    } catch (err) {
        logger.error(`[Export] Plots ZIP error: ${err.message}`);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Server error' });
        }
    }
});

module.exports = router;
