import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { RichText, type EditorBridge } from '@10play/tentap-editor';
import { useAppTheme } from '../../hooks/useAppTheme';

interface RichEditorProps {
    editor: EditorBridge;
    style?: any;
    placeholder?: string;
    fontSize?: number;
    lineHeight?: number;
    horizontalPadding?: number;
    topPadding?: number;
    bottomPadding?: number;
}

export const RichEditor: React.FC<RichEditorProps> = ({
    editor,
    style,
    placeholder = 'Start writing...',
    fontSize = 16,
    lineHeight,
    horizontalPadding = 20,
    topPadding = 16,
    bottomPadding = 120,
}) => {
    const { colors, theme } = useAppTheme();

    const isDark = theme === 'dark';
    const textColor = colors.text;
    const bgColor = colors.background;
    const tintColor = colors.tint;
    const secondaryColor = colors.secondary;
    const borderColor = colors.border;
    const surfaceColor = colors.surface || (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)');
    // Reader uses fontSize:16, lineHeight:26 as base. Scale relative to prop.
    const baseFontSize = fontSize;          // mirrors MarkdownText paragraph.fontSize
    const baseLineHeight = lineHeight ?? 26; // mirrors MarkdownText paragraph.lineHeight

    const customCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap');

        *, *::before, *::after { box-sizing: border-box !important; }

        html, body {
            width: 100% !important;
            max-width: 100% !important;
            overflow-x: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: ${bgColor} !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: ${baseFontSize}px !important;
            line-height: ${baseLineHeight}px !important;
            -webkit-font-smoothing: antialiased;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
        }

        .ProseMirror {
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            min-height: 100% !important;
            padding: ${topPadding}px ${horizontalPadding}px ${bottomPadding}px ${horizontalPadding}px !important;
            outline: none !important;
            background-color: ${bgColor} !important;
            color: ${textColor} !important;
            overflow-x: hidden !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
        }

        /* Suppress all TipTap placeholder pseudo-elements */
        .ProseMirror [data-placeholder]::before,
        .ProseMirror .is-empty::before,
        .ProseMirror p.is-empty::before { content: none !important; display: none !important; }

        /* Custom placeholder only on a completely empty document */
        .ProseMirror.is-editor-empty > p:first-child:only-child::before {
            color: ${secondaryColor}80 !important;
            content: "${placeholder}" !important;
            display: block !important;
            float: left !important;
            height: 0 !important;
            pointer-events: none !important;
            font-style: normal !important;
        }

        /* === PARAGRAPH — mirrors MarkdownText paragraph style === */
        p {
            font-size: ${baseFontSize}px !important;
            line-height: ${baseLineHeight}px !important;
            margin: 0 0 4px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        /* === HEADINGS — mirrors MarkdownText h1/h2 styles === */
        h1 {
            font-size: 24px !important;
            line-height: 30px !important;
            font-weight: 900 !important;
            letter-spacing: -0.5px !important;
            margin: 16px 0 8px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
        }
        h2 {
            font-size: 20px !important;
            line-height: 26px !important;
            font-weight: 800 !important;
            margin: 12px 0 6px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
        }
        h3 {
            font-size: 18px !important;
            line-height: 24px !important;
            font-weight: 700 !important;
            margin: 10px 0 4px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
        }

        /* === BLOCKQUOTE — mirrors MarkdownText blockquote style === */
        blockquote {
            border-left: 4px solid ${tintColor}60 !important;
            background-color: ${tintColor}10 !important;
            padding: 8px 8px 8px 16px !important;
            margin: 8px 0 !important;
            border-radius: 4px !important;
            color: ${secondaryColor} !important;
        }
        blockquote p { color: ${secondaryColor} !important; margin-bottom: 0 !important; }

        /* === LISTS — mirrors MarkdownText listItem style === */
        ul, ol { padding-left: 20px !important; margin: 4px 0 !important; }
        li {
            margin-bottom: 4px !important;
            padding-left: 4px !important;
            line-height: ${baseLineHeight}px !important;
        }
        li::marker { color: ${tintColor} !important; }
        li p { margin: 0 !important; display: inline !important; }

        /* === TASK LIST — mirrors MarkdownText checkbox style === */
        ul[data-type="taskList"] { list-style: none !important; padding-left: 0 !important; }
        ul[data-type="taskList"] li {
            display: flex !important;
            align-items: flex-start !important;
            padding-left: 0 !important;
            margin-bottom: 4px !important;
        }
        ul[data-type="taskList"] li > label {
            margin-right: 10px !important;
            margin-top: 4px !important;
            user-select: none !important;
            display: inline-flex !important;
            align-items: center !important;
        }
        ul[data-type="taskList"] li > label > input[type="checkbox"] {
            width: 18px !important;
            height: 18px !important;
            border: 2px solid ${secondaryColor} !important;
            border-radius: 4px !important;
            accent-color: ${tintColor} !important;
            margin: 0 !important;
            -webkit-appearance: checkbox !important;
        }
        ul[data-type="taskList"] li > div { flex: 1 !important; line-height: ${baseLineHeight}px !important; }
        ul[data-type="taskList"] li[data-checked="true"] > div {
            text-decoration: line-through !important;
            opacity: 0.6 !important;
        }

        /* === HORIZONTAL RULE — mirrors MarkdownText divider style exactly ===
           Reader: height:1, backgroundColor:colors.border, marginVertical:14, opacity:0.6
           The HorizontalRule node is provided by TipTap's CoreBridge (no extra bridge needed). */
        hr {
            border: none !important;
            border-top: 1px solid ${borderColor} !important;
            height: 0 !important;
            margin: 14px 0 !important;
            opacity: 0.6 !important;
            width: 100% !important;
            display: block !important;
        }

        /* === INLINE CODE — mirrors MarkdownText inlineCode style === */
        code {
            background-color: ${surfaceColor} !important;
            color: ${tintColor} !important;
            padding: 1px 6px 0 6px !important;
            border-radius: 6px !important;
            font-family: Menlo, Monaco, Consolas, monospace !important;
            font-size: 14px !important;
        }

        strong, b { font-weight: 700 !important; font-family: 'Figtree', -apple-system, sans-serif !important; }
        em, i { font-style: italic !important; }
        s, del { text-decoration: line-through !important; opacity: 0.7 !important; }
        ::selection { background-color: ${tintColor}40 !important; }
    `;

    // Inject CSS when the WebView finishes loading
    const handleLoad = useCallback(() => {
        if (!editor) return;
        editor.injectCSS(customCSS, 'reloom-theme');
    }, [editor, customCSS]);

    return (
        <View style={[styles.container, style]}>
            <RichText
                editor={editor}
                style={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                containerStyle={{ flex: 1, width: '100%', backgroundColor: bgColor, overflow: 'hidden' }}
                showsVerticalScrollIndicator={false}
                onLoad={handleLoad}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
});
