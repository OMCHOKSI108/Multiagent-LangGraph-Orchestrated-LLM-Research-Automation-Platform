/**
 * Splits a monolithic markdown report into sections based on headers.
 * @param {string} markdown - The full markdown content.
 * @returns {Array<{title: string, content: string, order: number}>}
 */
function splitMarkdownIntoSections(markdown) {
    if (!markdown) return [];

    const sections = [];
    // Split by level 1 or level 2 headers, but keep the header line
    const regex = /^(#{1,2}\s+.+)$/gm;
    const parts = markdown.split(regex);
    
    let currentTitle = "Introduction";
    let order = 0;

    // If the first part isn't a header, it's likely the abstract or preamble
    if (parts[0].trim().length > 0 && !parts[0].trim().startsWith('#')) {
        sections.push({
            title: "Abstract",
            content: parts[0].trim(),
            order: order++
        });
    }

    for (let i = 1; i < parts.length; i += 2) {
        const titleLine = parts[i];
        const content = parts[i + 1] ? parts[i + 1].trim() : "";
        
        // Clean up title (remove #)
        const title = titleLine.replace(/^#+\s+/, "").trim();
        
        if (title && content) {
            sections.push({
                title: title,
                content: content,
                order: order++
            });
        }
    }

    return sections;
}

module.exports = { splitMarkdownIntoSections };
