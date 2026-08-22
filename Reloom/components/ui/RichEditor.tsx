import React, { useCallback } from 'react';
import { PixelRatio, View, StyleSheet } from 'react-native';
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
     * Journal edit mode. The Date renders as an inert div and the Title as a
     * plain contenteditable div — both are HTML SIBLINGS placed ABOVE the
     * ProseMirror root by enhanceJS, scrolling together with the body. Because
     * neither belongs to the ProseMirror document, the body's backspace can
     * never reach them and no structural guards are needed.
     */
    journalMeta?: boolean;
    /** Formatted journal date rendered above the editor. */
    journalDate?: string;
    /** Title rendered in the editable header above the body (boot value). */
    journalTitle?: string;
    /** Live title updates streamed from the header input (webview → RN). */
    onTitleChange?: (title: string) => void;
    /** Focus state of the header input (webview → RN), for toolbar gating. */
    onTitleFocusChange?: (focused: boolean) => void;
    /** Auto-focus the title header on boot (used for brand-new journals). */
    journalFocusTitle?: boolean;
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
    journalTitle = '',
    onTitleChange,
    onTitleFocusChange,
    journalFocusTitle = false,
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
    // Reader <Text> follows the OS font-size setting (allowFontScaling); WebView
    // CSS pixels do not. Scale our CSS sizes by the same factor so Edit mode
    // matches Read mode on devices with a non-default system font size. RN
    // explicit lineHeights are NOT scaled — keep them literal here too.
    const fontScale = PixelRatio.getFontScale();
    const fs = (n: number) => Math.round(n * fontScale * 100) / 100;

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
            font-size: ${fs(baseFontSize)}px !important;
            line-height: ${baseLineHeight}px !important;
            /* Match RN text metrics exactly — disables Chromium's font boosting,
               which otherwise renders body blocks larger/smaller than the reader */
            -webkit-text-size-adjust: 100% !important;
            text-size-adjust: 100% !important;
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
            font-size: ${fs(baseFontSize)}px !important;
            line-height: ${baseLineHeight}px !important;
            margin-top: 0 !important;
            margin-bottom: 4px !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }

        /* === HEADINGS — mirrors MarkdownText h1/h2 styles === */
        h1 {
            font-size: ${fs(24)}px !important;
            line-height: 30px !important;
            font-weight: 900 !important;
            letter-spacing: -0.5px !important;
            margin: 16px 0 8px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
        }
        h2 {
            font-size: ${fs(20)}px !important;
            line-height: 26px !important;
            font-weight: 800 !important;
            margin: 12px 0 6px 0 !important;
            color: ${textColor} !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
        }
        h3 {
            font-size: ${fs(18)}px !important;
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
            font-size: ${fs(14)}px !important;
        }

        strong, b { font-weight: 700 !important; font-family: 'Figtree', -apple-system, sans-serif !important; }
        em, i { font-style: italic !important; }
        s, del { text-decoration: line-through !important; opacity: 0.7 !important; }
    `;

    // Journal edit mode. The Date and Title are plain HTML widgets injected
    // ABOVE .ProseMirror by enhanceJS (see the enhanceJS docs) — outside the
    // editable document, yet scrolling with it. These rules style those
    // widgets plus the divider-line rendering for '---' paragraphs.
    const journalMetaCSS = `
        /* Date — mirrors the reader's fullDate (ThemedText tiny + Figtree-Bold,
           12/16, uppercase, ls 1.5, opacity .4). Padding-top 12 matches the
           reader ScrollView's contentContainer paddingTop so the header starts
           at the same offset in both modes. */
        .reloom-journal-date {
            font-size: ${fs(12)}px !important;
            line-height: 16px !important;
            font-weight: 700 !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
            text-transform: uppercase !important;
            letter-spacing: 1.5px !important;
            opacity: 0.4 !important;
            padding: 12px 0 12px 0 !important;
            color: ${textColor} !important;
            user-select: none !important;
            -webkit-user-select: none !important;
            pointer-events: none !important;
        }
        /* Title — mirrors the reader's display style (32px / lineHeight 40 /
           letterSpacing -1). Display-Bold is a native-only font; web uses the
           closest weight of the same family stack. */
        .reloom-journal-title {
            font-size: ${fs(32)}px !important;
            line-height: 40px !important;
            font-weight: 800 !important;
            font-family: 'Figtree', -apple-system, sans-serif !important;
            letter-spacing: -1px !important;
            margin: 0 0 16px 0 !important;
            color: ${textColor} !important;
            outline: none !important;
            border: none !important;
            padding: 0 !important;
            background: transparent !important;
            min-height: 40px !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            caret-color: ${tintColor} !important;
            -webkit-user-select: text !important;
            user-select: text !important;
        }
        /* 'Untitled' placeholder — inverted-default: shows unless JS marks the
           title .reloom-filled, so it is visible at boot with no timing
           dependence whatsoever. */
        .reloom-journal-title:not(.reloom-filled)::before {
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

        // Injected into the WebView after load in EVERY editor session.
    //
    // 1) Doc-empty placeholder: TenTap's Placeholder extension is filtered out
    //    of bridgeExtensions, so TipTap never adds its is-editor-empty class —
    //    we toggle it ourselves so the custom placeholder CSS actually works.
    //
    // 2) Journal mode (JOURNAL=true): builds the header widgets ABOVE the
    //    ProseMirror root as plain HTML siblings:
    //      - .reloom-journal-date: inert date line,
    //      - .reloom-journal-title: an INDEPENDENT contenteditable div. It is
    //        not part of the ProseMirror document, so the body's backspace can
    //        never reach or delete it structurally — typing behaves exactly
    //        like a normal field. Its value streams to React Native via
    //        postMessage ({type:'reloom-title'}) and focus changes stream as
    //        {type:'reloom-title-focus'} so the app can hide the toolbar while
    //        the title is focused.
    //      - top-level '---' paragraphs render as divider lines.
    //
    // IMPORTANT: syncs are rAF-debounced, observers watch ONLY .ProseMirror,
    // every class write is a guarded no-op when unchanged, and a slow
    // setInterval acts as a safety net for observer races.
    const enhanceJS = `
        (function () {
            var JOURNAL = ${journalMeta ? 'true' : 'false'};
            var DATE_TEXT = ${JSON.stringify(journalDate)};
            var TITLE_TEXT = ${JSON.stringify(journalTitle)};
            var FOCUS_TITLE = ${journalFocusTitle ? 'true' : 'false'};
            var focusAttempts = 0;

            function postMsg(payload) {
                try {
                    if (window.ReactNativeWebView) {
                        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
                    }
                } catch (_e) {}
            }

            function syncDocEmpty(pm) {
                var empty = (pm.textContent || '').trim().length === 0;
                if (pm.classList.contains('is-editor-empty') !== empty) {
                    pm.classList.toggle('is-editor-empty', empty);
                }
            }

            function ensureDate(pm) {
                if (!DATE_TEXT || document.querySelector('.reloom-journal-date')) return;
                var dateEl = document.createElement('div');
                dateEl.className = 'reloom-journal-date';
                dateEl.setAttribute('contenteditable', 'false');
                dateEl.textContent = DATE_TEXT;
                if (pm.parentNode) pm.parentNode.insertBefore(dateEl, pm);
            }

            function normalizeTitle(el) {
                var txt = (el.textContent || '');
                var visibleEmpty = txt.trim().length === 0;
                // Browsers leave a stray <br> once all text is deleted; clear
                // it so the placeholder pseudo-element shows again.
                if (visibleEmpty && el.firstChild) el.innerHTML = '';
                else if (txt.length > 200) el.textContent = txt.substring(0, 200);
                var filled = (el.textContent || '').trim().length > 0;
                if (el.classList.contains('reloom-filled') !== filled) {
                    el.classList.toggle('reloom-filled', filled);
                }
            }

            function focusBody() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) return;
                pm.focus();
                try {
                    var sel = window.getSelection();
                    var r = document.createRange();
                    r.selectNodeContents(pm);
                    r.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(r);
                } catch (_e) {}
            }

            function wireTitle(el) {
                function report() {
                    normalizeTitle(el);
                    postMsg({
                        type: 'reloom-title',
                        value: (el.textContent || '').replace(/\\u00a0/g, ' ')
                    });
                }
                el.addEventListener('input', report);
                el.addEventListener('focus', function () {
                    postMsg({ type: 'reloom-title-focus', value: true });
                });
                el.addEventListener('blur', function () {
                    report();
                    postMsg({ type: 'reloom-title-focus', value: false });
                });
                // Single-line title: Enter commits and moves into the body.
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        report();
                        focusBody();
                    }
                });
                // Plain-text titles only: strip formatting and newlines.
                el.addEventListener('paste', function (e) {
                    e.preventDefault();
                    var text = '';
                    try {
                        text = (e.clipboardData || window.clipboardData).getData('text/plain') || '';
                    } catch (_e) {}
                    text = text.replace(/\\s*[\\r\\n]+\\s*/g, ' ').trim();
                    var room = 200 - (el.textContent || '').trim().length;
                    if (room <= 0) return;
                    if (text.length > room) text = text.substring(0, room);
                    if (text) document.execCommand('insertText', false, text);
                    report();
                });
            }

            function ensureTitle(pm) {
                var el = document.querySelector('.reloom-journal-title');
                if (!el) {
                    el = document.createElement('div');
                    el.className = 'reloom-journal-title';
                    el.setAttribute('contenteditable', 'true');
                    el.setAttribute('spellcheck', 'false');
                    el.setAttribute('autocorrect', 'off');
                    el.textContent = TITLE_TEXT || '';
                    pm.parentNode.insertBefore(el, pm);
                    wireTitle(el);
                    // Apply the filled/placeholder state IMMEDIATELY at creation
                    // so existing titles never flash the 'Untitled' placeholder.
                    normalizeTitle(el);
                }
                return el;
            }

            function syncDividers(pm) {
                // Top-level paragraphs only — the converter emits dividers
                // exclusively at the top level, so list items / blockquotes
                // containing '---' keep their literal text (matches reader).
                var children = pm.children;
                for (var i = 0; i < children.length; i++) {
                    var el = children[i];
                    if (el.tagName !== 'P') continue;
                    var t = (el.textContent || '').trim();
                    var isDivider = t === '---' || t === '___' || t === '***';
                    if (el.classList.contains('reloom-divider') !== isDivider) {
                        el.classList.toggle('reloom-divider', isDivider);
                    }
                    // Dividers are ATOMIC: hide the caret path entirely. The
                    // paragraph renders as a 1px line while its real text stays
                    // '---'; without contenteditable=false a tap on the line
                    // would place the caret inside the transparent text and any
                    // keystroke nearby could silently corrupt it ('---' -> '-').
                    var ce = el.getAttribute('contenteditable');
                    if (isDivider && ce !== 'false') {
                        el.setAttribute('contenteditable', 'false');
                    } else if (!isDivider && ce === 'false') {
                        el.removeAttribute('contenteditable');
                    }
                }
            }

            function syncAll() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) return;
                syncDocEmpty(pm);
                if (!JOURNAL) return;
                ensureDate(pm);
                ensureTitle(pm);
                syncDividers(pm);
                // Boot focus for brand-new journals: take the caret only while
                // nothing else has been focused yet, and only while the title
                // is empty.
                if (FOCUS_TITLE && focusAttempts < 12) {
                    focusAttempts++;
                    var active = document.activeElement;
                    if (!active || active === document.body) {
                        var t = document.querySelector('.reloom-journal-title');
                        if (t && !t.classList.contains('reloom-filled')) t.focus();
                    }
                }
            }

            var scheduled = false;
            function scheduleSync() {
                if (scheduled) return;
                scheduled = true;
                requestAnimationFrame(function () {
                    scheduled = false;
                    syncAll();
                });
            }

            function attach() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) {
                    // Editor not booted yet — watch the body only until it
                    // exists, then hand off to a .ProseMirror-scoped observer.
                    var bodyObs = new MutationObserver(function (_m, obs) {
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
                } else {
                    scheduleSync();
                    new MutationObserver(scheduleSync).observe(pm, {
                        childList: true,
                        subtree: true,
                        characterData: true
                    });
                }
                // Safety net: converge even if an observer record is missed.
                setInterval(syncAll, 350);
                // Early-boot passes: cover slow ProseMirror boots and any
                // node recreation during initial transactions.
                setTimeout(syncAll, 60);
                setTimeout(syncAll, 300);
                setTimeout(syncAll, 900);
                setTimeout(syncAll, 2000);
            }

            attach();
            scheduleSync();
        })();
    `;

    // Bridges our custom header messages out of the RichText webview without
    // disturbing TenTap's own messaging (exclusivelyUseCustomOnMessage=false
    // lets both handlers receive every message).
    type WebviewMessageLike = { nativeEvent: { data?: unknown } };
    const handleWebviewMessage = useCallback((event: WebviewMessageLike) => {
        const data = event?.nativeEvent?.data;
        if (typeof data !== 'string' || data.charCodeAt(0) !== 0x7b /* '{' */) return;
        try {
            const msg = JSON.parse(data) as { type?: string; value?: unknown };
            if (msg.type === 'reloom-title' && onTitleChange) {
                onTitleChange(typeof msg.value === 'string' ? msg.value.replace(/\u00a0/g, ' ') : '');
            } else if (msg.type === 'reloom-title-focus' && onTitleFocusChange) {
                onTitleFocusChange(msg.value === true);
            }
        } catch (_err) { /* non-JSON messages are not ours */ }
    }, [onTitleChange, onTitleFocusChange]);

    const resolvedCSS = journalMeta ? `${customCSS}\n${journalMetaCSS}` : customCSS;

    // Inject CSS + enhancement JS when the WebView finishes loading.
    // avoidIosKeyboard in useEditorBridge handles keyboard avoidance natively.
    const handleLoad = useCallback(() => {
        if (!editor) return;
        editor.injectCSS(resolvedCSS, 'reloom-theme');
        editor.injectJS(enhanceJS);
    }, [editor, resolvedCSS, enhanceJS]);

    return (
        <View style={[styles.container, style]}>
            <RichText
                editor={editor}
                style={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                containerStyle={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                showsVerticalScrollIndicator={false}
                onLoad={handleLoad}
                {...(journalMeta && (onTitleChange || onTitleFocusChange)
                    ? { exclusivelyUseCustomOnMessage: false, onMessage: handleWebviewMessage }
                    : {})}
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
