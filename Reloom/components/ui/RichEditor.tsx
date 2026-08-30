import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PixelRatio, View, StyleSheet } from 'react-native';
import { RichText, type EditorBridge } from '@10play/tentap-editor';
import { useAppTheme } from '../../hooks/useAppTheme';
import { escapedMentionPatterns } from '../../utils/mentions';

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
    /**
     * Authoritative document HTML for this edit session. Applied right after
     * the WebView finishes loading, guaranteeing the visible doc always equals
     * the latest app state — even if the platform layer somehow booted the
     * page with a stale initialContent (same-instance save → re-edit bug).
     */
    expectedDoc?: string;
    /**
     * Bump to force a document re-sync on an already-mounted (prewarmed)
     * editor. Screens increment this each time edit mode is entered; the
     * initial value is handled by the mount sync.
     */
    sessionToken?: number;
    /** @mention query under the caret ('' after bare '@', null = closed). */
    onMentionQuery?: (query: string | null) => void;
    /**
     * Connection names highlighted as @mentions in the body (journal mode).
     * Streamed into the page for the CSS Custom Highlight painter.
     */
    mentionNames?: string[];
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
    expectedDoc,
    sessionToken = 0,
    onMentionQuery,
    mentionNames,
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
    // Keep exact font size scale matching the app's fixed design system
    const fs = (n: number) => n;

    const customCSS = `
        @import url('https://fonts.googleapis.com/css2?family=Figtree:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&display=swap');

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
        /* @mention highlight — CSS Custom Highlight API paints ranges the JS
           registers as 'reloom-mention' (see syncMentionHighlights). Pure
           paint: no DOM change, ProseMirror never notices. */
        ::highlight(reloom-mention) {
            color: ${tintColor} !important;
            font-weight: 600 !important;
            font-style: normal !important;
            text-decoration: none !important;
        }
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

            window.reloomSetContent = function (html) {
                try {
                    var pm = document.querySelector('.ProseMirror');
                    if (!pm || !pm.editor) return false;
                    var editor = pm.editor;
                    var state = editor.state;
                    var view = editor.view;

                    var element = document.createElement('div');
                    element.innerHTML = html || '';
                    var parser = null;
                    try {
                        var PM = window.ProseMirrorModel || window.prosemirrorModel;
                        if (PM && PM.DOMParser) {
                            parser = PM.DOMParser.fromSchema(state.schema);
                        }
                    } catch (_pErr) {}

                    if (!parser && editor.parser) {
                        parser = editor.parser;
                    }

                    if (parser) {
                        var newDoc = parser.parse(element);
                        if (newDoc) {
                            var tr = state.tr;
                            tr.replaceWith(0, state.doc.content.size, newDoc.content);
                            tr.setMeta('addToHistory', false);
                            view.dispatch(tr);
                            return true;
                        }
                    }
                    return false;
                } catch (_e) {
                    return false;
                }
            };

            window.reloomClearHistory = function () {
                try {
                    var pm = document.querySelector('.ProseMirror');
                    if (!pm || !pm.editor) return;
                    var editor = pm.editor;

                    if (editor.commands && typeof editor.commands.clearHistory === 'function') {
                        editor.commands.clearHistory();
                    }

                    var state = editor.state;
                    if (state && state.plugins) {
                        var plugin = state.plugins.find(function(p) {
                            return p.key && p.key.indexOf('history') !== -1;
                        });
                        if (plugin && plugin.getState) {
                            var currentHist = plugin.getState(state);
                            if (currentHist && currentHist.done && currentHist.done.eventCount > 0) {
                                var emptyBranch = (currentHist.undone && currentHist.undone.eventCount === 0) ? currentHist.undone : null;
                                if (emptyBranch) {
                                    var cleanHist = {
                                        done: emptyBranch,
                                        undone: emptyBranch,
                                        prevRanges: null,
                                        prevTime: 0,
                                        prevComposition: -1
                                    };
                                    var tr = state.tr;
                                    tr.setMeta(plugin.key, { historyState: cleanHist });
                                    tr.setMeta('addToHistory', false);
                                    editor.view.dispatch(tr);
                                }
                            }
                        }
                    }

                    if (editor.storage && editor.storage.history) {
                        if (editor.storage.history.undoStack && typeof editor.storage.history.undoStack.clear === 'function') {
                            editor.storage.history.undoStack.clear();
                        }
                        if (editor.storage.history.redoStack && typeof editor.storage.history.redoStack.clear === 'function') {
                            editor.storage.history.redoStack.clear();
                        }
                    }
                } catch (_e) {}
            };

            function syncDocEmpty(pm) {
                var empty = (pm.textContent || '').trim().length === 0;
                if (pm.classList.contains('is-editor-empty') !== empty) {
                    pm.classList.toggle('is-editor-empty', empty);
                }
            }

            // ---- @mention detection (journal mode) --------------------------
            // Streams the partial query after a caret-adjacent '@' to RN, which
            // shows the connection suggestion bar. null closes it.
            var MENTION_RE = new RegExp('(?:^|[\\\\s\\\\n\\\\r\\\\u200B\\\\uFEFF])@([^\\\\s@\\\\u200B\\\\uFEFF]{0,24})$');

            function detectMention() {
                if (!JOURNAL) return;
                var q = null;
                try {
                    var pm = document.querySelector('.ProseMirror');
                    if (pm && pm.editor && pm.editor.state) {
                        var state = pm.editor.state;
                        var $from = state.selection ? state.selection.$from : null;
                        if ($from && $from.parent) {
                            var textBefore = $from.parent.textBetween(0, $from.parentOffset);
                            var m = textBefore.match(MENTION_RE);
                            if (m) q = m[1];
                        }
                    }
                    if (q === null) {
                        var sel = window.getSelection();
                        if (sel && sel.rangeCount) {
                            var range = sel.getRangeAt(0);
                            var node = range.startContainer;
                            if (node && node.nodeType === 1) {
                                node = node.childNodes[range.startOffset - 1] || node.childNodes[range.startOffset] || node.lastChild || node;
                            }
                            if (node && node.nodeType === 3) {
                                var host = node.parentElement && node.parentElement.closest('.reloom-journal-title');
                                if (!host) {
                                    var before = String(node.textContent || '').slice(0, range.startOffset);
                                    var m2 = before.match(MENTION_RE);
                                    if (m2) q = m2[1];
                                }
                            }
                        }
                    }
                } catch (_e) {}
                postMsg({ type: 'reloom-mention', value: q });
            }

            window.reloomInsertMention = function (name) {
                try {
                    var pm = document.querySelector('.ProseMirror');
                    if (!pm || !pm.editor) return false;
                    var editor = pm.editor;
                    var state = editor.state;
                    var $from = state.selection ? state.selection.$from : null;
                    if (!$from || !$from.parent) return false;

                    var textBefore = $from.parent.textBetween(0, $from.parentOffset);
                    var m = textBefore.match(MENTION_RE);
                    if (!m) return false;

                    var matchLength = m[1].length + 1;
                    var from = state.selection.from - matchLength;
                    var to = state.selection.from;

                    if (from < 0 || to < from) return false;

                    var tr = state.tr;
                    tr.delete(from, to);
                    tr.setStoredMarks([]);
                    var insertText = '@' + name + ' ';
                    tr.insertText(insertText, from);

                    var insertEnd = from + insertText.length;
                    var inlineMarkNames = ['bold', 'italic', 'strike', 'code', 'underline'];
                    if (state.schema && state.schema.marks) {
                        inlineMarkNames.forEach(function (markName) {
                            var markType = state.schema.marks[markName];
                            if (markType) {
                                tr.removeMark(from, insertEnd, markType);
                            }
                        });
                    }

                    tr.setStoredMarks([]);
                    editor.view.dispatch(tr);
                    editor.view.focus();
                    return true;
                } catch (_e) {
                    return false;
                }
            };

            var mentionTimer = null;
            function scheduleMention() {
                if (mentionTimer) return;
                mentionTimer = setTimeout(function () {
                    mentionTimer = null;
                    detectMention();
                }, 120);
            }

            // ---- caret auto-scroll -----------------------------------------
            // Keeps the caret between the top edge and the keyboard+toolbar
            // band. KEYBOARD OCCLUSION IS SELF-CALIBRATED: we remember the
            // viewport height while unfocused (baseVh) and measure the current
            // deficit. This is immune to resize-vs-pan platform differences
            // and to RN-side inset semantics — whatever the keyboard does to
            // the visible area, the measured deficit IS the truth.
            function currentVh() {
                return window.visualViewport ? window.visualViewport.height : window.innerHeight;
            }
            var baseVh = currentVh();

            function editingFocused() {
                var active = document.activeElement;
                return !!active && !!active.classList && (active.classList.contains('ProseMirror') || active.isContentEditable === true);
            }

            function caretOffsetNeeded() {
                var sel = window.getSelection();
                if (!sel || !sel.rangeCount) return 0;
                var r = sel.getRangeAt(0).getBoundingClientRect();
                if (!r || (r.width === 0 && r.height === 0)) return 0;
                var vh = currentVh();
                if (vh > baseVh) baseVh = vh;               // grew back: keyboard closed / layout relaxed
                var kb = Math.max(0, Math.min(baseVh - vh, baseVh * 0.8));
                var topLimit = 12;
                var bottomLimit = vh - 92 - kb;         // 92 ≈ toolbar + comfortable headroom (caret rests higher)
                if (bottomLimit <= topLimit + 40) bottomLimit = vh - 40;
                if (r.top < topLimit) return r.top - topLimit;
                if (r.bottom > bottomLimit) return r.bottom - bottomLimit;
                return 0;
            }

            // Find the element that ACTUALLY scrolls this page. TenTap's page
            // may not scroll at the root: probe the standard scrollingElement
            // first, then walk up from the caret through ancestors that truly
            // have vertical overflow.
            function candidateScrollers() {
                var list = [];
                var se = document.scrollingElement || document.documentElement;
                if (se && se.scrollHeight > se.clientHeight + 2) list.push(se);
                try {
                    var sel = window.getSelection();
                    if (sel && sel.rangeCount) {
                        var el = sel.getRangeAt(0).startContainer;
                        if (el && el.nodeType === 3) el = el.parentElement;
                        while (el && el !== document.body) {
                            if (el.scrollHeight > el.clientHeight + 2) {
                                var ov = '';
                                try { ov = getComputedStyle(el).overflowY; } catch (_e) {}
                                if (ov === 'auto' || ov === 'scroll' || ov === '') list.push(el);
                            }
                            el = el.parentElement;
                        }
                    }
                } catch (_e) {}
                if (!list.length && se) list.push(se); // last resort even if it claims no overflow
                return list;
            }

            function scrollCaretIntoView() {
                try {
                    var dy = caretOffsetNeeded();
                    if (dy > 4 || dy < -4) {
                        dy = Math.ceil(dy);
                        var scrollers = candidateScrollers();
                        for (var i = 0; i < scrollers.length; i++) {
                            var el = scrollers[i];
                            var before = el.scrollTop;
                            el.scrollTop = before + dy;
                            if (el.scrollTop !== before) break;   // this one really scrolls
                        }
                    }
                } catch (_e) {}
            }

            // Baseline upkeep runs on its own light tick so baseVh tracks the
            // unfocused viewport even when no caret logic executes.
            setInterval(function () {
                try {
                    if (!editingFocused()) {
                        var vh = currentVh();
                        if (vh > baseVh) baseVh = vh;
                    }
                } catch (_e) {}
            }, 400);

            var scrollTimer = null;
            function scheduleScroll() {
                if (scrollTimer) return;
                scrollTimer = setTimeout(function () {
                    scrollTimer = null;
                    scrollCaretIntoView();
                }, 140);
            }

            // Viewport geometry changes arrive in WAVES (keyboard resize, then
            // the RN toolbar mounting shrinks the page again, then IME settle).
            // A single correction races them — so re-check a few times; every
            // run is idempotent (scrolls only when the caret is actually out
            // of the safe band).
            function scheduleScrollBurst() {
                setTimeout(scrollCaretIntoView, 80);
                setTimeout(scrollCaretIntoView, 320);
                setTimeout(scrollCaretIntoView, 700);
            }

            // Persistence watchdog: corrects PERSISTENT caret violations while
            // an editable is focused (two consecutive out-of-band ticks).
            //
            // USER-SCROLL RESPECT (Android ignores WebView scrollEnabled, so
            // gestures are real): any touch pauses enforcement for a grace
            // window — reading around while the keyboard is up must never be
            // fought. Editing naturally re-anchors via selectionchange.
            var userScrollUntil = 0;
            function markUserScroll() {
                userScrollUntil = Date.now() + 1400;
            }
            document.addEventListener('touchstart', markUserScroll, { passive: true });
            document.addEventListener('touchmove', markUserScroll, { passive: true });

            var outTicks = 0;
            setInterval(function () {
                try {
                    if (!editingFocused()) { outTicks = 0; return; }
                    if (Date.now() < userScrollUntil) { outTicks = 0; return; }
                    var dy = caretOffsetNeeded();
                    if (dy !== 0) {
                        outTicks++;
                        if (outTicks >= 2) {
                            scrollCaretIntoView();
                            outTicks = 0;
                        }
                    } else {
                        outTicks = 0;
                    }
                } catch (_e) {}
            }, 150);

            document.addEventListener('selectionchange', function () {
                scheduleMention();
                scheduleScroll();
            });
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', scheduleScrollBurst);
            }
            window.addEventListener('resize', scheduleScrollBurst);

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

            // ---- @mention highlight (journal mode) -------------------------
            // Paints @Name tokens in the tint color using the CSS Custom
            // Highlight API — pure paint, ZERO DOM mutation, so ProseMirror's
            // reconciler never notices. Names stream in from RN as
            // window.reloomMentionNames.
            function syncMentionHighlights() {
                try {
                    if (!JOURNAL || !window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;
                    var pm = document.querySelector('.ProseMirror');
                    if (!pm) return;
                    var names = window.reloomMentionEscaped || [];
                    var all = pm.textContent || '';
                    if (!names.length || all.indexOf('@') === -1) {
                        CSS.highlights.delete('reloom-mention');
                        return;
                    }
                    var esc = (window.reloomMentionEscaped || []).slice().sort(function (a, b) { return b.length - a.length; });
                    var re = new RegExp('(@(?:' + esc.join('|') + '))(?=$|[^\\\\w\\u2019-])', 'g');
                    var ranges = [];
                    var walker = document.createTreeWalker(pm, NodeFilter.SHOW_TEXT, null);
                    var node;
                    while ((node = walker.nextNode())) {
                        var t = node.textContent || '';
                        re.lastIndex = 0;
                        var m;
                        while ((m = re.exec(t)) !== null) {
                            if (m[0].length === 0) { re.lastIndex++; continue; }
                            var r = document.createRange();
                            r.setStart(node, m.index);
                            r.setEnd(node, m.index + m[0].length);
                            ranges.push(r);
                        }
                    }
                    CSS.highlights.set('reloom-mention', new (Highlight.bind.apply(Highlight, [null].concat(ranges)))());
                } catch (_e) {}
            }

            function syncAll() {
                var pm = document.querySelector('.ProseMirror');
                if (!pm) return;
                syncDocEmpty(pm);
                syncMentionHighlights();
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
            } else if (msg.type === 'reloom-mention' && onMentionQuery) {
                onMentionQuery(typeof msg.value === 'string' ? msg.value : null);
            }
        } catch (_err) { /* non-JSON messages are not ours */ }
    }, [onTitleChange, onTitleFocusChange, onMentionQuery]);

    // Stream mention patterns for the editor-side @Name highlighter. Names are
    // regex-escaped RN-side (the injected script is a template literal, so the
    // escaping itself must not live there).
    const mentionNamesKey = (mentionNames || []).join('\u0001');
    useEffect(() => {
        if (!editor || !journalMeta) return;
        const escaped = escapedMentionPatterns(mentionNamesKey ? mentionNamesKey.split('\u0001') : []);
        editor.webviewRef.current?.injectJavaScript(`window.reloomMentionEscaped = ${JSON.stringify(escaped)};true;`);
    }, [editor, journalMeta, mentionNamesKey]);

    // Prewarm support (journal): on every sessionToken bump, push the latest
    // title INTO the already-mounted webview. The injected title div is built
    // once at page boot, so without this a discarded/edited title would go
    // stale across sessions. Body text is handled by the expectedDoc sync.
    const journalTitleRef = useRef(journalTitle);
    journalTitleRef.current = journalTitle;
    const lastTitleSyncRef = useRef(sessionToken);
    useEffect(() => {
        if (!editor || !journalMeta) return;
        if (lastTitleSyncRef.current === sessionToken) return;
        lastTitleSyncRef.current = sessionToken;
        const t = JSON.stringify(journalTitleRef.current || '');
        editor.webviewRef.current?.injectJavaScript(`
            (function () {
                var el = document.querySelector('.reloom-journal-title');
                if (!el) return;
                var v = ${t};
                el.textContent = v;
                el.classList.toggle('reloom-filled', String(v || '').trim().length > 0);
            })();
            true;
        `);
    }, [editor, journalMeta, sessionToken]);

    const resolvedCSS = journalMeta ? `${customCSS}\n${journalMetaCSS}` : customCSS;

    // Inject CSS + enhancement JS when the WebView finishes loading.
    // avoidIosKeyboard in useEditorBridge handles keyboard avoidance natively.
    //
    // expectedDoc sync: makes stale-boot content structurally impossible.
    // Whatever document the webview layer presents at session start — a freshly
    // booted page with stale injected content OR a RECYCLED native view whose
    // old DOM never navigated away — it is force-converged to `expectedDoc`
    // (the latest app state) before the user can interact.
    //
    // Readiness gating matters: the web side registers its message handler in
    // a useEffect AFTER tiptap creates the editor (useTenTap.tsx), so a
    // setContent action posted earlier is SILENTLY DROPPED. We therefore probe
    // with getHTML() — it resolves only once the handler is live and never
    // rejects (AsyncMessages promises have no timeout), so each probe races a
    // local timeout and retries until the editor answers.
    //
    // The sync runs from THREE triggers: on component mount, after every real
    // page load (covers iOS's deliberate second navigation), and — forced — on
    // every sessionToken bump (entry into edit mode on a prewarmed editor).
    // An in-flight flag prevents concurrent runs.
    //
    // ANTI-STOMP: appliedDocRef remembers the last document WE pushed. Non-
    // forced syncs skip when the live doc is already authoritative, so a slow
    // boot probe can never land an outdated snapshot mid-typing (random text
    // loss / broken IME composition). Forced session syncs always apply, but
    // they fire the instant edit mode is entered — long before a human can
    // place the caret, let alone compose.
    const expectedDocRef = useRef<string | null | undefined>(expectedDoc);
    expectedDocRef.current = expectedDoc;
    const syncInFlightRef = useRef(false);
    const appliedDocRef = useRef<string | null>(null);

    // Hidden until the authoritative document has been applied, so an
    // existing note never flashes the empty-doc placeholder ("Start
    // writing...") before its real text arrives.
    const [docReady, setDocReady] = useState(expectedDoc == null);

    const syncExpectedDoc = useCallback((force = false) => {
        const doc = expectedDocRef.current;
        if (!editor || doc == null || syncInFlightRef.current) return;
        if (!force && appliedDocRef.current === doc) return;
        syncInFlightRef.current = true;

        const probeOnce = async (): Promise<string | null> => {
            // Skip entirely while the native view isn't attached yet — posting
            // to a null webviewRef only produces warning-spam and a promise
            // that can never settle.
            if (!(editor as any).webviewRef?.current) return null;
            const raced = await Promise.race([
                editor.getHTML().catch(() => null),
                new Promise<null>(resolve => setTimeout(() => resolve(null), 500)),
            ]);
            return typeof raced === 'string' ? raced : null;
        };

        void (async () => {
            // Re-read the latest expectation: the screen may have updated it
            // while we were waiting for the boot probe.
            const target = expectedDocRef.current ?? doc;
            // Wait for a live editor for as long as it takes: slow page loads
            // must never exhaust the wait (a dropped sync means stale content).
            let bootDoc: string | null = null;
            for (let attempt = 0; attempt < 100; attempt++) {
                bootDoc = await probeOnce();
                if (bootDoc !== null) break;
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            if (bootDoc === null) {
                // Never leave the editor permanently blank on pathological
                // boots — reveal whatever the platform managed to load.
                setDocReady(true);
                syncInFlightRef.current = false;
                return;
            }
            editor.setContent(target);
            appliedDocRef.current = target;

            const clearHistoryScript = `
                (function() {
                    if (window.reloomClearHistory) window.reloomClearHistory();
                    else {
                        try {
                            var pm = document.querySelector('.ProseMirror');
                            if (pm && pm.editor && pm.editor.commands && pm.editor.commands.clearHistory) {
                                pm.editor.commands.clearHistory();
                            }
                        } catch(e) {}
                    }
                })();
                true;
            `;
            editor.injectJS(clearHistoryScript);
            setTimeout(() => {
                editor.injectJS(clearHistoryScript);
            }, 60);

            setDocReady(true);
            syncInFlightRef.current = false;
        })();
    }, [editor]);

    useEffect(() => {
        syncExpectedDoc();
    }, [syncExpectedDoc]);

    // Session re-sync: prewarmed (always-mounted) editors don't remount per
    // edit session, so screens bump sessionToken on every entry into edit mode
    // to converge the live document back to the latest app state. The very
    // first value is skipped — the mount effect above owns that run. Forced:
    // after a discard or an external change the live doc may hold uncommitted
    // text that non-forced equality checks would happily keep.
    const lastSessionRef = useRef(sessionToken);
    useEffect(() => {
        if (lastSessionRef.current === sessionToken) return;
        lastSessionRef.current = sessionToken;
        syncExpectedDoc(true);
    }, [sessionToken, syncExpectedDoc]);

    const handleLoad = useCallback(() => {
        if (!editor) return;
        editor.injectCSS(resolvedCSS, 'reloom-theme');
        editor.injectJS(enhanceJS);
        syncExpectedDoc();
    }, [editor, resolvedCSS, enhanceJS, syncExpectedDoc]);

    return (
        <View
            style={[styles.container, style, { opacity: docReady ? 1 : 0 }]}
            pointerEvents={docReady ? 'auto' : 'none'}
        >
            <RichText
                editor={editor}
                textZoom={100}
                style={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                containerStyle={{ flex: 1, width: '100%', backgroundColor: bgColor }}
                showsVerticalScrollIndicator={false}
                onLoad={handleLoad}
                {...(journalMeta && (onTitleChange || onTitleFocusChange || onMentionQuery)
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
