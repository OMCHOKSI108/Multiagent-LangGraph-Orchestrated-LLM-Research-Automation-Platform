const express = require('express');
const router = express.Router();
const db = require('../config/db');
const logger = require('../utils/logger');
const auth = require('../middleware/auth');
const { marked } = require('marked');
const archiver = require('archiver');
const puppeteer = require('puppeteer-core');

/**
 * Workspace-aware research lookup.
 * Tries research_sessions first (Phase 2+), falls back to research_logs (legacy).
 */
async function findResearch(id, userId) {
    // Try workspace-scoped sessions first
    try {
        const sessResult = await db.query(
            `SELECT rs.id, rs.result_json, rs.task, rs.title, rs.workspace_id
             FROM research_sessions rs
             JOIN workspaces w ON rs.workspace_id = w.id
             WHERE rs.id = $1 AND w.owner_id = $2`,
            [id, userId]
        );
        if (sessResult.rows.length > 0) return sessResult.rows[0];
    } catch (e) {
        // research_sessions table may not exist yet
    }

    // Fall back to legacy research_logs
    const result = await db.query(
        'SELECT id, result_json, task, title FROM research_logs WHERE id = $1 AND user_id = $2',
        [id, userId]
    );
    return result.rows[0] || null;
}

/**
 * Shared helper: extract markdown report from result_json.
 * Checks both top-level keys and the nested final_state.findings path
 * used by the LangGraph pipeline.
 */
function extractMarkdown(rj, title) {
    if (!rj) return null;

    const findings = rj.final_state?.findings || {};

    // 1. multi_stage_report (new pipeline) — check nested first, then top-level
    const msr = findings.multi_stage_report || rj.multi_stage_report;
    if (msr) {
        if (msr.markdown_report) return msr.markdown_report;
        if (typeof msr.response === 'string' && msr.response.length > 50) return msr.response;
    }

    // 2. scientific_writing (legacy pipeline)
    const sw = findings.scientific_writing || rj.scientific_writing;
    if (sw) {
        if (sw.markdown_report) return sw.markdown_report;
        if (typeof sw.response === 'string' && sw.response.length > 50) return sw.response;
    }

    // 3. Build from individual findings (fallback)
    if (Object.keys(findings).length > 0) {
        let md = `# ${title || 'Research Report'}\n\n`;
        for (const [key, value] of Object.entries(findings)) {
            if (!value) continue;
            const heading = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            if (typeof value === 'string' && value.length > 20) {
                md += `## ${heading}\n\n${value}\n\n`;
            } else if (value && typeof value === 'object' && typeof value.response === 'string' && value.response.length > 20) {
                md += `## ${heading}\n\n${value.response}\n\n`;
            }
        }
        if (md.length > 100) return md;
    }

    return null;
}

/**
 * Shared helper: extract LaTeX source from result_json.
 */
function extractLatex(rj) {
    if (!rj) return null;

    const findings = rj.final_state?.findings || {};

    // multi_stage_report
    const msr = findings.multi_stage_report || rj.multi_stage_report;
    if (msr?.latex_source) return msr.latex_source;

    // latex_generation
    const lg = findings.latex_generation || rj.latex_generation;
    if (lg?.latex_source) return lg.latex_source;
    if (lg?.response && typeof lg.response === 'string' && lg.response.includes('\\documentclass')) return lg.response;

    // scientific_writing
    const sw = findings.scientific_writing || rj.scientific_writing;
    if (sw?.latex_source) return sw.latex_source;

    return null;
}

// Reuse a single browser instance where possible to reduce startup cost
let _pdfBrowserPromise = null;
async function getPdfBrowser() {
    if (_pdfBrowserPromise) return _pdfBrowserPromise;

    // Use executablePath from env (provided by Docker image) when using puppeteer-core
    let execPath = process.env.PUPPETEER_EXECUTABLE_PATH;

    // If not set, try to find local Chrome (for dev on Windows/Mac)
    if (!execPath) {
        const fs = require('fs');
        const os = require('os');
        const platform = os.platform();

        if (platform === 'win32') {
            const possiblePaths = [
                'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
                process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
            ];
            execPath = possiblePaths.find(path => fs.existsSync(path));
        } else if (platform === 'darwin') {
            const possiblePaths = [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            ];
            execPath = possiblePaths.find(path => fs.existsSync(path));
        }
    }

    // Fallback to linux default if still not found
    if (!execPath) {
        execPath = '/usr/bin/chromium';
    }

    // Verify it exists to avoid obscure errors
    const fs = require('fs');
    if (!fs.existsSync(execPath)) {
        console.warn(`[Export] Chrome executable not found at ${execPath}. PDF generation may fail.`);
    }

    _pdfBrowserPromise = puppeteer.launch({
        executablePath: execPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    return _pdfBrowserPromise;
}

/**
 * Export research result as Markdown.
 *
 * GET /export/:id/markdown
 */
router.get('/:id/markdown', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await findResearch(id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = row;

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract markdown from various possible locations in result_json
        const rj = result_json;
        let markdown = extractMarkdown(rj, title || task);

        if (!markdown) {
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
router.get('/:id/pdf', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await findResearch(id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = row;

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract markdown content - support nested findings path
        const rj = result_json;
        let markdown = extractMarkdown(rj, title || task);

        if (!markdown) {
            markdown = `# ${title || task}\n\nNo report content could be extracted.`;
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

        // Generate a binary PDF via Puppeteer and send it. If PDF generation
        // fails, fall back to sending the rendered HTML.
        try {
            const browser = await getPdfBrowser();
            const page = await (await browser).newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
            await page.close();

            const filename = `research_${id}.pdf`;
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(pdfBuffer);
        } catch (pdfErr) {
            logger.error(`[Export] PDF generation failed, falling back to HTML: ${pdfErr.message}`);
            const filename = `research_${id}.html`;
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.send(html);
        }

    } catch (err) {
        logger.error(`[Export] PDF error: ${err.message}`);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * Compile custom content to PDF (Simulated LaTeX Compilation)
 * 
 * POST /export/compile
 * Body: { researchId, content }
 */
router.post('/compile', auth, async (req, res) => {
    try {
        const { researchId, content } = req.body;

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        // Fetch title/task for metadata if needed
        let title = 'Document';
        if (researchId) {
            const result = await db.query('SELECT title, task FROM research_logs WHERE id = $1 AND user_id = $2', [researchId, req.user.id]);
            if (result.rows.length > 0) {
                title = result.rows[0].title || result.rows[0].task || title;
            }
        }

        // Use the same HTML template logic as GET /pdf
        // Logic duplicated for now to ensure isolation for this "compile" feature
        // In production, refactor to shared function
        const renderedBody = marked.parse(content);
        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${title}</title>
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

        const browser = await getPdfBrowser();
        const page = await (await browser).newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
        await page.close();

        res.setHeader('Content-Type', 'application/pdf');
        res.send(pdfBuffer);

    } catch (err) {
        logger.error(`[Export] Compile error: ${err.message}`);
        res.status(500).json({ error: 'Compilation failed' });
    }
});

/**
 * Export research result as LaTeX.
 *
 * GET /export/:id/latex
 */
router.get('/:id/latex', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await findResearch(id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = row;

        if (!result_json) {
            return res.status(400).json({ error: 'Research not yet completed' });
        }

        // Extract LaTeX from result - support nested findings path
        const rj = result_json;
        let latex = extractLatex(rj);

        if (!latex) {
            // Generate minimal LaTeX wrapper from markdown content
            const content = extractMarkdown(rj, title || task) || JSON.stringify(rj, null, 2);
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
router.get('/:id/zip', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await findResearch(id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = row;
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
        let markdown = extractMarkdown(rj, researchTitle);
        if (!markdown) {
            markdown = `# ${researchTitle}\n\n${JSON.stringify(rj, null, 2)}`;
        }
        archive.append(markdown, { name: `${researchTitle}.md` });

        // Add LaTeX
        let latex = extractLatex(rj);
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
router.get('/:id/plots', auth, async (req, res) => {
    try {
        const { id } = req.params;
        const row = await findResearch(id, req.user.id);

        if (!row) {
            return res.status(404).json({ error: 'Research not found' });
        }

        const { result_json, task, title } = row;
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
