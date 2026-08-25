import React from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { escapedMentionPatterns } from '../../utils/mentions';

interface MarkdownTextProps {
    content: string;
    style?: any;
    /**
     * Horizontal padding applied to the container. Must exactly match the
     * RichEditor's `horizontalPadding` so words wrap at the same position
     * in Read and Edit modes (journal passes 0 + outer padding; editor.tsx
     * passes 20).
     */
    paddingHorizontal?: number;
    /**
     * Connection names to highlight as @mentions. When provided, any
     * "@Full Name" whose name matches one of these entries renders in the
     * tint color (journal reader). Omitted elsewhere — plain text stays.
     */
    mentionNames?: string[];
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({ content, style, paddingHorizontal = 0, mentionNames }) => {
    const { colors } = useAppTheme();

    // Mention matcher: longest-name-first alternation of the provided
    // connection names. Rebuilt only when the name list identity changes.
    const mentionRegex = React.useMemo(() => {
        const escaped = escapedMentionPatterns(mentionNames || []);
        if (escaped.length === 0) return null;
        try {
            return new RegExp(`(@(?:${escaped.join('|')}))(?=$|[^\\w'’-])`, 'gi');
        } catch {
            return null;
        }
    }, [mentionNames]);

    const parseLine = (rawLine: string, index: number) => {
        const line = rawLine.replace(/\r/g, '').trim();
        // Blank markdown lines are paragraph separators — paragraph margins
        // already provide the rhythm; rendering them adds phantom gaps.
        if (!line) return null;
        // Handle Horizontal Rule — explicit check first, then regex fallback
        if (line === '---' || line === '___' || /^[-*_]{3,}$/.test(line)) {
            return (
                <View key={index} style={[styles.divider, { backgroundColor: colors.border }]} />
            );
        }
        // Handle Headings
        if (line.startsWith('# ')) {
            return (
                <ThemedText key={index} style={[styles.h1, { color: colors.text }]}>
                    {renderInline(line.substring(2), [styles.h1, { color: colors.text }])}
                </ThemedText>
            );
        }
        if (line.startsWith('## ')) {
            return (
                <ThemedText key={index} style={[styles.h2, { color: colors.text }]}>
                    {renderInline(line.substring(3), [styles.h2, { color: colors.text }])}
                </ThemedText>
            );
        }

        // Handle Blockquotes
        if (line.startsWith('> ')) {
            return (
                <View key={index} style={[styles.blockquote, { borderLeftColor: colors.tint + '60', backgroundColor: colors.tint + '10' }]}>
                    <ThemedText style={[styles.paragraph, { color: colors.secondary }, style]}>
                        {renderInline(line.substring(2), [styles.paragraph, { color: colors.secondary }, style])}
                    </ThemedText>
                </View>
            );
        }


        // Handle Bullets
        if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
                <View key={index} style={styles.listItem}>
                    <ThemedText style={{ color: colors.tint, marginRight: 8 }}>•</ThemedText>
                    <ThemedText style={[styles.paragraph, { color: colors.text }, style]}>
                        {renderInline(line.substring(2), [styles.paragraph, { color: colors.text }, style])}
                    </ThemedText>
                </View>
            );
        }

        // Handle Ordered Lists — mirrors markdownConverter's /^(\d+)\.\s+/ rule
        // so numbered entries render as lists in both the editor and reader.
        const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (orderedMatch) {
            return (
                <View key={index} style={styles.listItem}>
                    <ThemedText style={{ color: colors.tint, marginRight: 8 }}>{orderedMatch[1]}.</ThemedText>
                    <ThemedText style={[styles.paragraph, { color: colors.text }, style]}>
                        {renderInline(orderedMatch[2], [styles.paragraph, { color: colors.text }, style])}
                    </ThemedText>
                </View>
            );
        }

        // Handle Checkboxes
        if (line.startsWith('[ ] ')) {
            return (
                <View key={index} style={styles.listItem}>
                    <View style={[styles.checkbox, { borderColor: colors.secondary }]} />
                    <ThemedText style={[styles.paragraph, { color: colors.text }, style]}>
                        {renderInline(line.substring(4), [styles.paragraph, { color: colors.text }, style])}
                    </ThemedText>
                </View>
            );
        }
        if (line.startsWith('[x] ') || line.startsWith('[X] ')) {
            return (
                <View key={index} style={styles.listItem}>
                    <View style={[styles.checkbox, styles.checkboxChecked, { backgroundColor: colors.tint, borderColor: colors.tint }]} />
                    <ThemedText style={[styles.paragraph, { color: colors.text, opacity: 0.6, textDecorationLine: 'line-through' }, style]}>
                        {renderInline(line.substring(4), [styles.paragraph, { color: colors.text, opacity: 0.6, textDecorationLine: 'line-through' }, style])}
                    </ThemedText>
                </View>
            );
        }

        return (
            <ThemedText key={index} style={[styles.paragraph, { color: colors.text }, style]}>
                {renderInline(line, [styles.paragraph, { color: colors.text }, style])}
            </ThemedText>
        );
    };

    const renderInlineMd = (text: string, baseStyle?: any) => {
        const parts = [];
        let lastIdx = 0;

        // Regex for Bold (**), Italic (*), Strikethrough (~~), Inline Code (`)
        // Order matters for overlapping markers
        const regex = /(\*\*.*?\*\*|\*.*?\*|~~.*?~~|`.*?`)/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            // Text before match
            if (match.index > lastIdx) {
                parts.push(text.substring(lastIdx, match.index));
            }
            const matchStr = match[0];
            if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
                parts.push(
                    <Text key={match.index} style={[baseStyle, { fontFamily: Typography.fontFamily.bold }]}>
                        {matchStr.substring(2, matchStr.length - 2)}
                    </Text>
                );
            } else if (matchStr.startsWith('*') && matchStr.endsWith('*')) {
                parts.push(
                    <Text key={match.index} style={[baseStyle, { fontFamily: Typography.fontFamily.italic }]}>
                        {matchStr.substring(1, matchStr.length - 1)}
                    </Text>
                );
            } else if (matchStr.startsWith('~~') && matchStr.endsWith('~~')) {
                parts.push(
                    <Text key={match.index} style={[baseStyle, { textDecorationLine: 'line-through', opacity: 0.7 }]}>
                        {matchStr.substring(2, matchStr.length - 2)}
                    </Text>
                );
            } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
                parts.push(
                    <View key={match.index} style={[styles.inlineCodeContainer, { backgroundColor: colors.surface }]}>
                        <Text style={[baseStyle, styles.inlineCode, { color: colors.tint }]}>
                            {matchStr.substring(1, matchStr.length - 1)}
                        </Text>
                    </View>
                );
            }
            lastIdx = regex.lastIndex;
        }

        if (lastIdx < text.length) {
            parts.push(text.substring(lastIdx));
        }

        return parts.length > 0 ? parts : text;
    };

    // Outer inline pass: highlights @Name mentions (when a name list is
    // provided) and renders markdown styling inside the remaining segments.
    const renderInline = (text: string, baseStyle?: any) => {
        if (!mentionRegex) return renderInlineMd(text, baseStyle);
        const out: any[] = [];
        let lastIdx = 0;
        const re = new RegExp(mentionRegex.source, 'gi');
        let m;
        while ((m = re.exec(text)) !== null) {
            if (m.index > lastIdx) {
                out.push(renderInlineMd(text.substring(lastIdx, m.index), baseStyle));
            }
            out.push(
                <Text key={`mention-${m.index}`} style={[baseStyle, { color: colors.tint, fontFamily: Typography.fontFamily.semibold }]}>
                    {/* Reader shows just the colored name — the '@' is an
                        editing affordance and stays editor-only. */}
                    {m[0].slice(1)}
                </Text>
            );
            lastIdx = m.index + m[0].length;
            if (m[0].length === 0) re.lastIndex++;
        }
        if (lastIdx < text.length) {
            out.push(renderInlineMd(text.substring(lastIdx), baseStyle));
        }
        return out.length > 0 ? out : text;
    };

    return (
        <View style={[styles.container, { paddingHorizontal: paddingHorizontal ?? 0 }]}>
            {content.split(/\r\n|\r|\n/).map((line, i) => parseLine(line, i))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    h1: {
        fontSize: 24,
        fontFamily: Typography.fontFamily.black,
        fontWeight: '900',
        marginTop: 16,
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    h2: {
        fontSize: 20,
        fontFamily: Typography.fontFamily.extrabold,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 6,
    },
    paragraph: {
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 4,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 4,
        paddingLeft: 4,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 2,
        borderRadius: 4,
        marginRight: 10,
        marginTop: 4,
    },
    checkboxChecked: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        width: '100%',
        marginVertical: 14,
        opacity: 0.6,
    },
    blockquote: {
        borderLeftWidth: 4,
        paddingLeft: 16,
        paddingVertical: 8,
        paddingRight: 8,
        marginVertical: 8,
        borderRadius: 4,
    },
    inlineCodeContainer: {
        paddingHorizontal: 6,
        paddingTop: 3,
        paddingBottom: 1,
        borderRadius: 6,
        marginHorizontal: 2,
        alignSelf: 'flex-start',
    },
    inlineCode: {
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontSize: 14,
    },
});
