/**
 * Bidirectional conversion between standard Markdown (for SQLite storage & MarkdownText viewer)
 * and HTML (for TenTap / TipTap Rich Editor).
 */

export function markdownToHtml(markdown: string): string {
    if (!markdown || typeof markdown !== 'string' || !markdown.trim()) return '<p></p>';

    // If input is already valid HTML, return as-is
    if (markdown.trim().startsWith('<') && markdown.trim().endsWith('>')) {
        return markdown;
    }

    try {
        const lines = markdown.split(/\r?\n/);
        const htmlLines: string[] = [];
        let inBulletList = false;
        let inOrderedList = false;
        let inTaskList = false;
        let inBlockquote = false;

        const closeLists = () => {
            if (inBulletList) {
                htmlLines.push('</ul>');
                inBulletList = false;
            }
            if (inOrderedList) {
                htmlLines.push('</ol>');
                inOrderedList = false;
            }
            if (inTaskList) {
                htmlLines.push('</ul>');
                inTaskList = false;
            }
            if (inBlockquote) {
                htmlLines.push('</blockquote>');
                inBlockquote = false;
            }
        };

        const convertInline = (text: string): string => {
            let res = text;
            res = res.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            res = res.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            res = res.replace(/\*(.+?)\*/g, '<em>$1</em>');
            res = res.replace(/~~(.+?)~~/g, '<s>$1</s>');
            res = res.replace(/`(.+?)`/g, '<code>$1</code>');
            return res;
        };

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const trimmed = rawLine.trim();

            if (!trimmed) {
                closeLists();
                // Use empty <p></p> — ProseMirror renders this as a paragraph break
                // without the extra line height that <p><br></p> produces.
                htmlLines.push('<p></p>');
                continue;
            }

            // Horizontal Rule — a ^---$ multiline match becomes a paragraph whose text is
            // exactly '---'. A real <hr> cannot be used: the editor's schema has no
            // hr node and would strip it on load, so the divider must live inside
            // editable content. RichEditor renders it as a 1px line, and
            // htmlToMarkdown maps it back to a canonical \n\n---\n\n on save.
            if (trimmed === '---' || trimmed === '___' || /^[-*_]{3,}$/.test(trimmed)) {
                closeLists();
                htmlLines.push('<p>---</p>');
                continue;
            }

            // Headings
            if (trimmed.startsWith('# ')) {
                closeLists();
                htmlLines.push(`<h1>${convertInline(trimmed.substring(2))}</h1>`);
                continue;
            }
            if (trimmed.startsWith('## ')) {
                closeLists();
                htmlLines.push(`<h2>${convertInline(trimmed.substring(3))}</h2>`);
                continue;
            }
            if (trimmed.startsWith('### ')) {
                closeLists();
                htmlLines.push(`<h3>${convertInline(trimmed.substring(4))}</h3>`);
                continue;
            }

            // Blockquote
            if (trimmed.startsWith('> ')) {
                if (!inBlockquote) {
                    closeLists();
                    htmlLines.push('<blockquote>');
                    inBlockquote = true;
                }
                htmlLines.push(`<p>${convertInline(trimmed.substring(2))}</p>`);
                continue;
            } else if (inBlockquote) {
                htmlLines.push('</blockquote>');
                inBlockquote = false;
            }

            // Task List
            if (trimmed.startsWith('[ ] ') || trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ')) {
                const isChecked = trimmed.startsWith('[x] ') || trimmed.startsWith('[X] ');
                const taskText = trimmed.substring(4);
                if (!inTaskList) {
                    closeLists();
                    htmlLines.push('<ul data-type="taskList">');
                    inTaskList = true;
                }
                htmlLines.push(`<li data-type="taskItem" data-checked="${isChecked}"><p>${convertInline(taskText)}</p></li>`);
                continue;
            }

            // Bullet list
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                if (!inBulletList) {
                    closeLists();
                    htmlLines.push('<ul>');
                    inBulletList = true;
                }
                htmlLines.push(`<li><p>${convertInline(trimmed.substring(2))}</p></li>`);
                continue;
            }

            // Ordered list
            const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (orderedMatch) {
                if (!inOrderedList) {
                    closeLists();
                    htmlLines.push('<ol>');
                    inOrderedList = true;
                }
                htmlLines.push(`<li><p>${convertInline(orderedMatch[2])}</p></li>`);
                continue;
            }

            // Regular paragraph
            closeLists();
            htmlLines.push(`<p>${convertInline(rawLine)}</p>`);
        }

        closeLists();
        return htmlLines.join('') || '<p></p>';
    } catch (error) {
        console.error('[markdownToHtml] Conversion error, using safe fallback:', error);
        return `<p>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
}

export function htmlToMarkdown(html: string): string {
    if (!html || !html.trim()) return '';

    let md = html;

    // Remove scripts and styles
    md = md.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    md = md.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Headings
    md = md.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n');
    md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n');
    md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n');

    // Task list items
    md = md.replace(/<li[^>]*data-type="taskItem"[^>]*data-checked="true"[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
        const clean = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1').trim();
        return `[x] ${clean}\n`;
    });
    md = md.replace(/<li[^>]*data-type="taskItem"[^>]*data-checked="false"[^>]*>([\s\S]*?)<\/li>/gi, (_, content) => {
        const clean = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1').trim();
        return `[ ] ${clean}\n`;
    });

    // Lists
    md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
        return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__: any, c: string) => {
            const clean = c.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1').trim();
            if (clean.startsWith('[ ]') || clean.startsWith('[x]')) return `${clean}\n`;
            return `- ${clean}\n`;
        }) + '\n';
    });

    md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
        let idx = 1;
        return items.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (__: any, c: string) => {
            const clean = c.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1').trim();
            return `${idx++}. ${clean}\n`;
        }) + '\n';
    });

    // Blockquotes
    md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, content) => {
        const clean = content.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n').trim();
        return `> ${clean}\n\n`;
    });

    // Paragraphs & Line Breaks
    // Divider paragraphs (<p>---</p>, <p>___</p>, <p>***</p>) → canonical thematic break
    md = md.replace(/<p[^>]*>\s*(---|___|\*\*\*)\s*<\/p>/gi, '\n\n---\n\n');
    // Empty paragraphs (<p></p> or <p><br></p>) → single blank line
    md = md.replace(/<p[^>]*>\s*(<br\s*\/?>)?\s*<\/p>/gi, '\n');
    // Regular paragraphs → content + double newline
    md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n');
    md = md.replace(/<br\s*\/?>/gi, '\n');

    // Inline marks
    md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**');
    md = md.replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**');
    md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*');
    md = md.replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*');
    md = md.replace(/<s[^>]*>([\s\S]*?)<\/s>/gi, '~~$1~~');
    md = md.replace(/<del[^>]*>([\s\S]*?)<\/del>/gi, '~~$1~~');
    md = md.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`');

    // Strip any remaining HTML tags
    md = md.replace(/<[^>]+>/g, '');

    // Decode HTML entities
    md = md.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');

    // Normalize multiple consecutive blank lines
    md = md.replace(/\n{3,}/g, '\n\n');

    return md.trim();
}

/* === Journal document header (title inside the TenTap document) ===
 *
 * The journal Title is the first <h1> of the editor document so it scrolls with
 * the body. The journal DATE is NOT part of the document: RichEditor injects it
 * as a non-editable header ABOVE the editor (so it can't be focused or deleted)
 * while still scrolling with the page.
 *
 * We use plain schema nodes on purpose: TenTap's prebuilt WebView bundle cannot
 * register custom node types, and non-schema attributes/classes do not survive
 * ProseMirror's parse → render round-trip.
 */

const escapeHtml = (text: string): string =>
    String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

export function buildJournalDocumentHtml(opts: { title: string; body: string }): string {
    const title = escapeHtml(opts.title);
    const body = markdownToHtml(opts.body);
    return `<h1 class="journal-title" data-journal-title="true">${title}</h1>` + body;
}

const stripTags = (html: string): string =>
    html
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim();

/**
 * Extracts the journal title and the body from the serialized editor HTML.
 * The title is the leading <h1> — the first block of the built document. If the
 * user deleted the title, no leading h1 exists and title falls back to '' (the
 * caller defaults it to 'Untitled').
 */
export function extractJournalDocument(html: string): { title: string; bodyHtml: string } {
    const trimmed = (html || '').trim();
    if (!trimmed) return { title: '', bodyHtml: '' };

    const titleMatch = trimmed.match(/^<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (!titleMatch) return { title: '', bodyHtml: trimmed };

    return { title: stripTags(titleMatch[1]), bodyHtml: trimmed.slice(titleMatch[0].length) };
}
