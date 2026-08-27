import { View, StyleSheet, ScrollView, Platform, Modal, Pressable, Keyboard, BackHandler, Share, LayoutAnimation } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { JournalRepository, Journal } from '../../db/repositories/JournalRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';
import { CaretLeft as ChevronLeft, Pencil as Edit3, Check, UserPlus, Trash as Trash2, DotsThreeVertical as MoreVertical, ShareNetwork as ShareIcon, X } from '@/components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { MarkdownText } from '../../components/ui/MarkdownText';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { EditorToolbar } from '../../components/ui/EditorToolbar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { RichEditor } from '../../components/ui/RichEditor';
import { MentionSuggestionBar, type MentionPerson } from '../../components/ui/MentionSuggestionBar';
import { PersonRepository } from '../../db/repositories/PersonRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEditorBridge, TenTapStartKit } from '@10play/tentap-editor';
import { htmlToMarkdown, markdownToHtml } from '../../utils/markdownConverter';
import { extractMentionedIds } from '../../utils/mentions';
import * as Haptics from 'expo-haptics';

const bridgeExtensions = TenTapStartKit.filter(ext => ext.name !== 'placeholder');

const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-').map(Number);
    if (parts.length >= 3 && !parts.some(isNaN)) {
        return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    }
    return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
};

export default function JournalEditorScreen() {
    const { id, edit, date: initialDate } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();
    const { journalFontSize, journalPadding } = settings;
    const journalId = Number(id);

    // Title is a header widget ABOVE the editor body (never part of the
    // ProseMirror document). RichEditor streams edits back via onTitleChange;
    // while the title field is focused the formatting toolbar stays hidden so
    // its commands can never apply to the body selection.
    const [titleFocused, setTitleFocused] = useState(false);

    // Title is a plain RN state value; only the BODY lives in the editor doc.
    // For a NEW journal the stub and its empty body document are built
    // synchronously so the very first render is already complete — a blank
    // first frame here leaves the WebView booting without real initialContent
    // (blank, frozen editor).
    const [journal, setJournal] = useState<Journal | null>(() => {
        if (id === 'new') {
            const dateStr = (typeof initialDate === 'string' ? (initialDate as string) : undefined) || new Date().toISOString().split('T')[0];
            return { id: 0, date: dateStr, title: '', content: '', createdAt: new Date() } as Journal;
        }
        return null;
    });
    const [taggedPeople, setTaggedPeople] = useState<any[]>([]);
    // @mention machinery: all connections for query filtering, plus the
    // activity-ranked subset shown for a bare '@' (most-tagged/most-reminded
    // first, via the existing getPeopleSortedByActivity system).
    const [persons, setPersons] = useState<MentionPerson[]>([]);
    const [topPersons, setTopPersons] = useState<MentionPerson[]>([]);
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);

    const [isEditing, setIsEditing] = useState(() => edit === 'true' || id === 'new');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [hasChanges, setHasChanges] = useState(false);
    const isDataLoadedRef = useRef(false);

        // The editor document contains ONLY the body. For a NEW journal it is
    // built synchronously (see journal init) and the WebView is gated on
    // editorHtml !== null, so initialContent is always the real content when
    // the WebView first boots.
    const [editorHtml, setEditorHtml] = useState<string | null>(() => {
        if (id === 'new') return markdownToHtml('');
        return null;
    });

    const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
    // Prewarm + session machinery, mirroring editor.tsx: the editor stays
    // mounted (hidden) while reading so entering edit is instant; the token
    // forces doc/title re-convergence on each entry.
    const [sessionToken, setSessionToken] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [originalTitle, setOriginalTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [originalSelectedPeople, setOriginalSelectedPeople] = useState<number[]>([]);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);

    const editor = useEditorBridge({
        // New journals focus the injected TITLE header instead of the body
        // (RichEditor's journalFocusTitle); editing an existing entry focuses
        // the body directly.
        autofocus: edit === 'true' && id !== 'new',
        // NOTE: intentionally NO initialContent. RichEditor force-applies the
        // exact app-state document (expectedDoc) via setContent once the editor
        // is provably ready — one authoritative content path, no boot race.
        avoidIosKeyboard: true,
        bridgeExtensions,
        onChange: () => {
            if (isDataLoadedRef.current) {
                setHasChanges(true);
            }
        }
    });

    const showAlert = (title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, description, type, onClose });
    };

    const triggerHaptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    const canSave = useMemo(() => {
        if (id === 'new') {
            return true;
        }
        return hasChanges;
    }, [id, hasChanges]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (isEditing && hasChanges) {
                    setShowDiscardModal(true);
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [isEditing, hasChanges])
    );

    useEffect(() => {
        loadData();

        const onKeyboardShow = (e: any) => {
            const height = e?.endCoordinates?.height || 0;
            if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setKeyboardHeight(height);
            setIsKeyboardVisible(true);
        };

        const onKeyboardHide = () => {
            if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setKeyboardHeight(0);
            setIsKeyboardVisible(false);
        };

        const showListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            onKeyboardShow
        );
        const hideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            onKeyboardHide
        );

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, [id]);

    const loadData = async () => {
        // Connections power @mention suggestions + reader highlighting.
        PersonRepository.getAll('name').then(list => {
            setPersons(list.map((p: any) => ({ id: p.id, name: p.name, avatarUri: p.avatarUri })));
        }).catch(() => { /* suggestions degrade gracefully to empty */ });
        // Activity-ranked subset for the bare-'@' suggestion state.
        PersonRepository.getPeopleSortedByActivity().then(list => {
            setTopPersons(list.slice(0, 6).map((p: any) => ({ id: p.id, name: p.name, avatarUri: p.avatarUri })));
        }).catch(() => { /* non-critical */ });

        if (id === 'new') {
            const dateStr = (initialDate as string) || new Date().toISOString().split('T')[0];
            setJournal({
                id: 0,
                date: dateStr,
                title: '',
                content: '',
                createdAt: new Date(),
            } as Journal);
            setTitle('');
            setContent('');
            setOriginalTitle('');
            setOriginalContent('');
            setSelectedPeople([]);
            setOriginalSelectedPeople([]);
            setEditorHtml(markdownToHtml(''));
            isDataLoadedRef.current = true;
            setHasChanges(false);
            return;
        }

        try {
            const j = await JournalRepository.getById(journalId);
            if (j) {
                setJournal(j);
                setTitle(j.title || '');
                setContent(j.content || '');
                setOriginalTitle(j.title || '');
                setOriginalContent(j.content || '');
                setEditorHtml(markdownToHtml(j.content || ''));
                isDataLoadedRef.current = true;
                setHasChanges(false);

                const tags = await JournalRepository.getTaggedPeople(journalId);
                setTaggedPeople(tags);
                const tagIds = tags.map((t: any) => t.person.id);
                setSelectedPeople(tagIds);
                setOriginalSelectedPeople(tagIds);
            }
        } catch (error) {
            console.error('Failed to load journal:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        try {
            const html = await editor.getHTML();
            const markdown = htmlToMarkdown(html);
            const finalTitle = title.trim() || 'Untitled';

            const mentionedIds = extractMentionedIds(markdown, persons);

            let savedId = journalId;
            const dateStr = (initialDate as string) || new Date().toISOString().split('T')[0];

            if (id === 'new') {
                if (!markdown.trim() && !title.trim()) {
                    router.back();
                    return;
                }
                const created = await JournalRepository.create({
                    title: finalTitle,
                    content: markdown,
                    date: dateStr,
                });
                savedId = created.id;
            } else {
                await JournalRepository.update(journalId, markdown, finalTitle);
            }

            await JournalRepository.setTaggedPeople(savedId, mentionedIds);

            setTitle(finalTitle);
            setContent(markdown);
            setOriginalContent(markdown);
            setOriginalTitle(finalTitle);
            setSelectedPeople(mentionedIds);
            setOriginalSelectedPeople(mentionedIds);
            setEditorHtml(markdownToHtml(markdown));
            setHasChanges(false);

            if (id === 'new') {
                router.replace(`/journal/${savedId}` as any);
            } else {
                setIsEditing(false);
                const updated = await JournalRepository.getById(savedId);
                if (updated) {
                    setJournal(updated);
                }
                const tags = await JournalRepository.getTaggedPeople(savedId);
                setTaggedPeople(tags);
            }
        } catch (error) {
            console.error('Failed to save journal:', error);
            showAlert('Error', 'Failed to save journal entry.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (silent = false) => {
        if (id === 'new') {
            router.back();
            return;
        }

        try {
            await JournalRepository.delete(journalId);
            if (!silent && hapticsEnabled && Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            router.back();
        } catch (error) {
            console.error('Failed to delete journal:', error);
            if (!silent) {
                showAlert('Error', 'Failed to delete journal entry.', 'error');
            }
        }
    };

    const handleMenuPress = () => {
        triggerHaptic();
        setShowMoreMenu(true);
    };

    const handleShare = async () => {
        if (!journal) return;
        setTimeout(async () => {
            try {
                triggerHaptic();
                const shareTitle = title.trim() ? `${title.trim()}\n` : '';
                await Share.share({
                    message: `${shareTitle}Date: ${journal.date}\n\n${content}`,
                }, {
                    dialogTitle: `Share: ${title || 'Journal Entry'}`,
                });
            } catch (error) {
                console.log('Share error:', error);
            }
        }, 100);
    };

    if (!journal) {
        return (
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
            </ThemedView>
        );
    }

    const formattedDate = formatDisplayDate(journal.date);

    return (
        <ThemedView style={[styles.container, { paddingBottom: isEditing && isKeyboardVisible ? keyboardHeight : insets.bottom }]}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                onBack={() => {
                    if (isEditing) {
                        if (hasChanges) {
                            setShowDiscardModal(true);
                        } else {
                            if (id === 'new') {
                                router.back();
                            } else {
                                setIsEditing(false);
                                setTitle(journal.title || '');
                                setContent(journal.content || '');
                                setSelectedPeople(taggedPeople.map((t: any) => t.person.id));
                            }
                        }
                    } else if (!content.trim() && !title.trim()) {
                        handleDelete(true);
                    } else {
                        router.back();
                    }
                }}
                backButtonIcon={isEditing ? <X size={20} color={colors.text} /> : <ChevronLeft size={22} color={colors.text} />}
                backButtonStyle={{ backgroundColor: colors.border + '20' }}
                title={undefined}
                borderBottom={false}
                bottomPadding={2}
                rightContent={
                    <View style={[styles.headerActions, { marginRight: -6 }]}>
                        {!isEditing ? (
                            <>
                                <ScalePressable
                                    onPress={() => {
                                        setIsEditing(true);
                                        setSessionToken(t => t + 1);
                                        setHasChanges(false);
                                    }}
                                    style={[styles.headerButton, { backgroundColor: colors.border + '20' }]}
                                    innerStyle={{ borderRadius: 18 }}
                                >
                                    <Edit3 size={18} color={colors.text} />
                                </ScalePressable>
                                <ScalePressable onPress={handleMenuPress} style={[styles.headerButton, { marginLeft: 8, backgroundColor: colors.border + '20' }]} innerStyle={{ borderRadius: 18 }}>
                                    <MoreVertical size={20} color={colors.text} />
                                </ScalePressable>
                            </>
                        ) : (
                            <ScalePressable
                                onPress={handleSave}
                                disabled={isSaving || !canSave}
                                style={[
                                    styles.headerButton,
                                    {
                                        backgroundColor: canSave ? colors.tint : colors.border + '20',
                                        opacity: isSaving ? 0.7 : 1
                                    }
                                ]}
                                innerStyle={{ borderRadius: 18 }}
                            >
                                <Check size={24} color={canSave ? colors.tintContrast : colors.secondary} weight="bold" />
                            </ScalePressable>
                        )}
                    </View>
                }
            />

            <View style={{ flex: 1 }}>
                {/*
                    PREWARM (mirrors editor.tsx): the editor stays mounted and
                    hidden while reading, so tapping Edit is instant — no boot
                    delay, no placeholder flash. sessionToken makes every entry
                    re-converge body (expectedDoc sync) AND the injected title
                    header (RichEditor's title re-sync) to current RN state.
                */}
                {editorHtml !== null && (
                    <View
                        key={String(id)}
                        style={[{ flex: 1, paddingHorizontal: journalPadding }, !isEditing && { display: 'none' }]}
                    >
                        {/* Date + Title are plain header widgets ABOVE the editor body
                            (injected by RichEditor, scrolling together with it). The title
                            is an independent contenteditable field — its value streams back
                            through onTitleChange and can never be structurally deleted. */}
                        <RichEditor
                            editor={editor}
                            fontSize={journalFontSize || 16}
                            lineHeight={Math.round((journalFontSize || 16) * 1.6)}
                            horizontalPadding={0}
                            topPadding={0}
                            placeholder="Pour your thoughts..."
                            journalMeta
                            journalDate={formattedDate}
                            journalTitle={title}
                            expectedDoc={editorHtml ?? undefined}
                            sessionToken={sessionToken}
                            onMentionQuery={setMentionQuery}
                            mentionNames={persons.map(p => p.name)}
                            onTitleChange={(t) => {
                                setTitle(t);
                                if (isDataLoadedRef.current) setHasChanges(true);
                            }}
                            onTitleFocusChange={setTitleFocused}
                            journalFocusTitle={id === 'new'}
                        />
                    </View>
                )}

                {!isEditing && (
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={[
                            styles.content,
                            { paddingHorizontal: journalPadding }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        <ThemedText type="tiny" style={styles.fullDate}>{formattedDate}</ThemedText>

                        {journal.title ? (
                            <ThemedText type="display" style={styles.viewerTitle}>{journal.title}</ThemedText>
                        ) : null}
                        <View style={styles.viewerText}>
                            {/* paddingHorizontal=0 matches RichEditor's horizontalPadding={0};
                                the ScrollView's contentContainerStyle provides the outer padding. */}
                            <MarkdownText
                                content={content}
                                paddingHorizontal={0}
                                mentionNames={persons.map(p => p.name)}
                                style={{
                                    fontSize: journalFontSize || 16,
                                    lineHeight: Math.round((journalFontSize || 16) * 1.6)
                                }}
                            />
                        </View>

                        {/* Tagged People Section */}
                        <View style={styles.tagsContainer}>
                            <View style={styles.sectionHeader}>
                                <UserPlus size={16} color={colors.secondary} weight="fill" />
                                <ThemedText type="sectionHeader" style={styles.sectionTitle}>Connections Mentioned</ThemedText>
                            </View>

                            <View style={styles.tagsFlexGrid}>
                                {taggedPeople.length > 0 ? (
                                    taggedPeople.map((t: any) => (
                                        <ScalePressable
                                            key={t.person.id}
                                            onPress={() => router.push({ pathname: '/person/[id]', params: { id: t.person.id } })}
                                            style={[styles.personTag, { backgroundColor: colors.surface, marginBottom: 12 }]}
                                            innerStyle={{ borderRadius: 14 }}
                                        >
                                            <Avatar name={t.person.name} uri={t.person.avatarUri} size={30} />
                                            <ThemedText style={styles.tagName}>{t.person.name}</ThemedText>
                                        </ScalePressable>
                                    ))
                                ) : (
                                    <View style={styles.emptyTagsContainer}>
                                        <ThemedText type="small" style={{ color: colors.secondary, textAlign: 'center', opacity: 0.6 }}>No connections mentioned</ThemedText>
                                        <ThemedText type="tiny" style={{ color: colors.secondary, textAlign: 'center', opacity: 0.4, marginTop: 4 }}>use @ to mention</ThemedText>
                                    </View>
                                )}
                            </View>
                        </View>
                    </ScrollView>
                )}

                {isEditing && isKeyboardVisible && !titleFocused && mentionQuery !== null && (
                    <MentionSuggestionBar
                        query={mentionQuery}
                        persons={persons}
                        topPersons={topPersons}
                        onPick={(person) => {
                            // Replace the partial '@query' before the caret with
                            // the full '@Name ' token, then record the person in
                            // the existing tagged-people system.
                            //
                            // Hardened against the two known failure modes:
                            //  - selection lost / span mismatch -> ABORT (never
                            //    insert blindly at an unknown caret)
                            //  - Android Fabric can execute injected scripts
                            //    twice -> 400ms same-key debounce
                            const safeName = JSON.stringify(`@${person.name} `);
                            editor.webviewRef.current?.injectJavaScript(`
                                (function () {
                                    var KEY = '_reloomMentionPickAt';
                                    var now = Date.now();
                                    if (window[KEY] && now - window[KEY] < 400) return;
                                    var sel = window.getSelection();
                                    if (!sel || !sel.rangeCount) return;
                                    var range = sel.getRangeAt(0);
                                    var node = range.startContainer;
                                    if (node.nodeType !== 3) return;
                                    var before = String(node.textContent || '').slice(0, range.startOffset);
                                    var m = before.match(/(?:^|\\s)@([^\\s@]{0,24})$/);
                                    if (!m) return;
                                    var r = document.createRange();
                                    r.setStart(node, range.startOffset - m[1].length - 1);
                                    r.setEnd(node, range.startOffset);
                                    if (r.toString() !== '@' + m[1]) return;
                                    sel.removeAllRanges();
                                    sel.addRange(r);
                                    window[KEY] = now;
                                    document.execCommand('insertText', false, ${safeName});
                                })();
                                true;
                            `);
                            setSelectedPeople(prev => (prev.includes(person.id) ? prev : [...prev, person.id]));
                            if (isDataLoadedRef.current) setHasChanges(true);
                            setMentionQuery(null);
                        }}
                    />
                )}
                {isEditing && isKeyboardVisible && !titleFocused && (
                    <EditorToolbar editor={editor} />
                )}
            </View>

            {/* More Options Menu */}
            <Modal visible={showMoreMenu} transparent animationType="fade" statusBarTranslucent>
                <Pressable
                    style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}
                    onPress={() => setShowMoreMenu(false)}
                >
                    <View style={[styles.menuContent, { top: insets.top + 56, backgroundColor: colors.card, ...DesignSystem.shadows.lg }]}>
                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                handleShare();
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <ShareIcon size={18} color={colors.text} weight="fill" />
                            <ThemedText style={styles.menuText}>Share</ThemedText>
                        </ScalePressable>

                        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6, marginHorizontal: 8 }} />

                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                setShowDeleteModal(true);
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Trash2 size={18} color={colors.error} weight="fill" />
                            <ThemedText style={[styles.menuText, { color: colors.error }]}>Delete</ThemedText>
                        </ScalePressable>
                    </View>
                </Pressable>
            </Modal>

            <DeleteModal
                visible={showDeleteModal}
                title="Delete Entry"
                description="This action cannot be undone. Permanent wipe?"
                onCancel={() => setShowDeleteModal(false)}
                onDelete={() => {
                    setShowDeleteModal(false);
                    handleDelete(true);
                }}
            />

            <AlertModal
                visible={alertConfig?.visible || false}
                title={alertConfig?.title || ''}
                description={alertConfig?.description || ''}
                type={alertConfig?.type}
                onClose={() => {
                    const cb = alertConfig?.onClose;
                    setAlertConfig(null);
                    if (cb) cb();
                }}
            />

            <DeleteModal
                visible={showDiscardModal}
                title="Discard Changes"
                description="Are you sure you want to discard your edits?"
                onCancel={() => setShowDiscardModal(false)}
                onDelete={() => {
                    setShowDiscardModal(false);
                    if (id === 'new') {
                        router.back();
                    } else {
                        setContent(originalContent);
                        setTitle(originalTitle);
                        setSelectedPeople(originalSelectedPeople);
                        editor.setContent(markdownToHtml(originalContent));
                        setHasChanges(false);
                        setIsEditing(false);
                    }
                }}
                actionLabel="Discard"
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 28,
        paddingTop: 12,
        paddingBottom: 250,
    },
    fullDate: {
        opacity: 0.4,
        fontFamily: Typography.fontFamily.bold,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    viewerTitle: {
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    viewerText: {
        paddingBottom: 40,
    },
    tagsContainer: {
        marginTop: 64,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128,128,128,0.1)',
        paddingTop: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        marginLeft: 8,
        fontSize: 18,
        opacity: 0.8,
    },
    tagsFlexGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    emptyTagsContainer: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    personTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 14,
        marginRight: 10,
        borderWidth: 0,
        borderColor: 'transparent',
    },
    tagName: {
        marginLeft: 8,
        fontFamily: Typography.fontFamily.semibold,
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    menuContent: {
        position: 'absolute',
        top: 100,
        right: 20,
        minWidth: 180,
        borderRadius: 16,
        padding: 6,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    menuText: {
        marginLeft: 12,
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
    },
});
