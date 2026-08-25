/**
 * Shared @mention pattern helpers.
 *
 * A mention is literal `@Full Name` text matched against known connection
 * names, longest-name-first, with a word-boundary lookahead so partial names
 * (`@Annaless`) and emails never match. Used by the journal screen (tag
 * reconciliation), MarkdownText (reader highlighting) and RichEditor
 * (editor highlighting via injected patterns).
 */

export function escapedMentionPatterns(names: string[]): string[] {
    return Array.from(new Set(names.filter(n => n && n.trim())))
        .sort((a, b) => b.length - a.length)
        .map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
}

/** Returns the mentioned names (without '@', canonical casing), deduplicated, in order of appearance. */
export function extractMentionedNames(text: string, names: string[]): string[] {
    const patterns = escapedMentionPatterns(names);
    if (!patterns.length || !text || !text.includes('@')) return [];
    // lowercase -> canonical, so '@adin' resolves to the stored 'Adin'
    const canonical = new Map<string, string>();
    for (const n of names) {
        if (n && n.trim()) canonical.set(n.toLowerCase(), n);
    }
    const re = new RegExp(`(@(?:${patterns.join('|')}))(?=$|[^\\w'\u2019-])`, 'gi');
    const found = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
        const typed = m[1].slice(1);
        found.add(canonical.get(typed.toLowerCase()) ?? typed);
        if (m[0].length === 0) re.lastIndex++;
    }
    return Array.from(found);
}

/** Person ids whose names appear as @mentions in the text. */
export function extractMentionedIds<T extends { id: number; name: string }>(text: string, persons: T[]): number[] {
    const mentioned = new Set(extractMentionedNames(text, persons.map(p => p.name)).map(n => n.toLowerCase()));
    return persons.filter(p => mentioned.has(p.name.toLowerCase())).map(p => p.id);
}
