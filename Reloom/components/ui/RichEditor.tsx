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
    /**
     * Journal edit mode. The journal Title is the first <h1> of the TenTap
     * document and the Date is injected as a non-editable header above the
     * editor (via journalDate) so both scroll with the body.
     */
    journalMeta?: boolean;
    /** Formatted journal date string rendered as a non-editable header above the editor. */
    journalDate?: string;
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
    journalMeta = false,
    journalDate = '',
}) => {
    const { colors, theme } = useAppTheme();

    const isDark = theme === 'dark';
    const textColor = colors.text;
    const bgColor = colors.background;
    const tintColor = colors.tint;
    const secondaryColor = colors.secondary;
    const borderColor = colors.border;
    const surfaceColor = colors.surface || (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)');
    // Reader (MarkdownText.tsx) uses fontSize:16, lineHeight:26 as the base paragraph spec.
    const baseFontSize = fontSize;
    const baseLineHeight = lineHeight ?? 26;

    const customCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap');

        *, *::before, *::after { box-sizing: border-box !important; }

        /* Fix #5: Theme caret color across the whole editor body (incl. Android
           selection teardrops / caret blink) */
        * { caret-color: ${tintColor} !important; }

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
            /* Fix #4: Android IME / Enter-key composition bug */
            -webkit-user-select: text !important;
            user-select: text !important;
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
            /* Fix #5: Theme caret color */
            caret-color: ${tintColor} !important;
            /* Fix #5: Android selection handle color */
            accent-color: ${tintColor} !important;
            /* Fix #4: Android IME composition fix */
            -webkit-user-select: text !important;
            user-select: text !important;
        }

        /* Fix #6: Autoscroll — ensure ProseMirror's scroll container is the body, not the editor */
        .ProseMirror-focused { scroll-margin-bottom: ${bottomPadding}px !important; }

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

        /* Fix #5: Caret / selection theme color */
        ::selection { background-color: ${tintColor}40 !important; }

        /* === PARAGRAPH — mirrors MarkdownText paragraph style pixel-for-pixel
           (fontSize + lineHeight come from the same values passed to MarkdownText,
           margin-bottom 4px; side padding comes from horizontalPadding below,
           which matches MarkdownText's paddingHorizontal). === */
        p {
            font-size: ${baseFontSize}px !important;
            line-height: ${baseLineHeight}px !important;
            margin-top: 0 !important;
            margin-bottom: 4px !important;
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
        blockquote p { color: ${secondaryColor} !important; margin: 0 !important; }

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

        /* === INLINE CODE — mirrors MarkdownText inlineCode: Menlo 14px, px6, r6 === */
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
    `;

    // Journal edit mode. The date header is injected ABOVE .ProseMirror by
    // journalMetaJS, so it lives outside the editable region (can't be focused,
    // typed, or deleted) yet still scrolls with the document. The title is the
    // first h1 (mirrors the old native titleInput 32/38/800/-1sp), the 'Untitled'
    // placeholder and divider-line rendering are driven by classes that
    // journalMetaJS toggles (ProseMirror's schema strips classes, so we manage
    // them from JS).
    const journalMetaCSS = `
        .reloom-journal-date {
            font-size: 12px !important;
            line-height: 16px !important;
            font-weight: 700 !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
            text-transform: uppercase !important;
            letter-spacing: 1.5px !important;
            opacity: 0.4 !important;
            padding: 8px 0 12px 0 !important;
            color: ${textColor} !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            pointer-events: none !important;
        }
        .ProseMirror > h1:first-of-type {
            font-size: 32px !important;
            line-height: 38px !important;
            font-weight: 800 !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
            letter-spacing: -1px !important;
            margin: 0 0 16px 0 !important;
            color: ${textColor} !important;
        }
        /* 'Untitled' placeholder — only shown while the title h1 is empty */
        .ProseMirror > h1:first-of-type.reloom-title-empty::before {
            content: 'Untitled';
            color: ${secondaryColor} !important;
            opacity: 0.55 !important;
            pointer-events: none !important;
            float: left !important;
            height: 0 !important;
            font-weight: 400 !important;
        }
        /* Divider paragraphs (---) render as a visible 1px line in the editor */
        .ProseMirror p.reloom-divider {
            height: 1px !important;
            margin: 14px 0 !important;
            background-color: ${borderColor} !important;
            opacity: 0.6 !important;
            border: none !important;
            padding: 0 !important;
            color: transparent !important;
            font-size: 0 !important;
            line-height: 0 !important;
            overflow: hidden !important;
        }
    `;

    // Injected into the WebView after load. Keeps the non-editable date header in
    // place, shows the 'Untitled' placeholder whenever the title h1 is empty
    // (visible directly on screen, hides when text is typed, reappears if
    // cleared), and renders divider paragraphs as lines. Uses a lightweight
    // observer on the ProseMirror subtree only and debounces via rAF to avoid
    // frozen input.
    const journalMetaJS = journalDate
        ? `
        (function () {
            var dateText = ${JSON.stringify(journalDate)};
            function ensureDate(pm) {
                if (document.querySelector('.reloom-journal-date')) return;
                var dateEl = document.createElement('div');
                dateEl.className = 'reloom-journal-date';
                dateEl.setAttribute('contenteditable', 'false');
                dateEl.textContent = dateText;
                if (pm && pm.parentNode) pm.parentNode.insertBefore(dateEl, pm);
            }
            function syncMeta() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) return;

                ensureDate(pm);

                var first = pm.firstElementChild;
                var h1 = first && first.tagName === 'H1' ? first : null;
                if (h1) {
                    var empty = (h1.textContent || '').trim().length === 0;
                    if (h1.classList.contains('reloom-title-empty') !== empty) {
                        h1.classList.toggle('reloom-title-empty', empty);
                    }
                }

                var ps = pm.querySelectorAll('p');
                for (var i = 0; i < ps.length; i++) {
                    var el = ps[i];
                    var t = (el.textContent || '').trim();
                    var isDivider = t === '---' || t === '___' || t === '***';
                    if (el.classList.contains('reloom-divider') !== isDivider) {
                        el.classList.toggle('reloom-divider', isDivider);
                    }
                }
            }
            var scheduled = false;
            function scheduleSync() {
                if (scheduled) return;
                scheduled = true;
                requestAnimationFrame(function () {
                    scheduled = false;
                    syncMeta();
                });
            }
            function attachObserver() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) {
                    var bodyObs = new MutationObserver(function (m, obs) {
                        var p = document.querySelector('.ProseMirror');
                        if (p) {
                            obs.disconnect();
                            scheduleSync();
                            new MutationObserver(scheduleSync).observe(p, {
                                childList: true,
                                subtree: true,
                                characterData: true
                            });
                        }
                    });
                    bodyObs.observe(document.body, { childList: true, subtree: true });
                    return;
                }
                scheduleSync();
                new MutationObserver(scheduleSync).observe(pm, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
            }
            attachObserver();
        })();
        `
        : '';

    const resolvedCSS = journalMeta ? `${customCSS}\n${journalMetaCSS}` : customCSS;

    // Inject CSS when the WebView finishes loading.
    // avoidIosKeyboard in useEditorBridge handles keyboard avoidance natively.
    const handleLoad = useCallback(() => {
        if (!editor) return;
        editor.injectCSS(resolvedCSS, 'reloom-theme');
        if (journalMeta && journalMetaJS) {
            editor.injectJS(journalMetaJS);
        }
    }, [editor, resolvedCSS, journalMeta, journalMetaJS]);

    return (
        <View style={[styles.container, style]}>
            <RichText
                editor={editor}
                style={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                containerStyle={{ flex: 1, width: '100%', backgroundColor: bgColor }}
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
