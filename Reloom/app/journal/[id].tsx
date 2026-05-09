import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView, Alert, Modal, Pressable, Keyboard, BackHandler, UIManager, LayoutAnimation } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { JournalRepository, Journal } from '../../db/repositories/JournalRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';
import { CaretLeft as ChevronLeft, Pencil as Edit3, Check, Calendar, UserPlus, Trash as Trash2, DotsThreeVertical as MoreVertical, ShareNetwork as ShareIcon, X, MagnifyingGlass as Search } from '@/components/ui/Icon';
import { Avatar } from '../../components/ui/Avatar';
import { MarkdownText } from '../../components/ui/MarkdownText';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { AlertModal } from '../../components/ui/AlertModal';
import { EditorToolbar } from '../../components/ui/EditorToolbar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { Badge } from '../../components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Share } from 'react-native';

export default function JournalEditorScreen() {
    const { id, edit, date: initialDate } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();
    const { journalFontSize, journalPadding } = settings;
    const journalId = Number(id);

    const [journal, setJournal] = useState<Journal | null>(() => {
        if (id === 'new') {
            const dateStr = (initialDate as string) || new Date().toISOString().split('T')[0];
            return {
                id: 0,
                date: dateStr,
                title: '',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            } as Journal;
        }
        return null;
    });
    const [taggedPeople, setTaggedPeople] = useState<any[]>([]);
    const [allPeople, setAllPeople] = useState<Person[]>([]);

    const [isEditing, setIsEditing] = useState(() => edit === 'true' || id === 'new');
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const contentRef = useRef('');
    const [selectedPeople, setSelectedPeople] = useState<number[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [kavKey, setKavKey] = useState(0);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
    const selectionRef = useRef({ start: 0, end: 0 });
    const [tagSearch, setTagSearch] = useState('');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [originalTitle, setOriginalTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [originalSelectedPeople, setOriginalSelectedPeople] = useState<number[]>([]);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);

    const scrollViewRef = useRef<ScrollView>(null);
    const editorRef = useRef<TextInput>(null);
    const tagSearchRef = useRef<TextInput>(null);
    const contentHeightRef = useRef(0);
    const editorYRef = useRef(0);

    const showAlert = (title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, description, type, onClose });
    };


    const hasChanges = useMemo(() => {
        const textChanged = (content.trim() !== originalContent.trim()) || (title.trim() !== originalTitle.trim());
        const tagsChanged = selectedPeople.length !== originalSelectedPeople.length ||
            !selectedPeople.every(id => originalSelectedPeople.includes(id)) ||
            !originalSelectedPeople.every(id => selectedPeople.includes(id));
        return textChanged || tagsChanged;
    }, [content, originalContent, title, originalTitle, selectedPeople, originalSelectedPeople]);

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

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setIsKeyboardVisible(true);
            // Scroll to cursor position after keyboard opens
            setTimeout(() => {
                const sel = selectionRef.current;
                const totalChars = Math.max(1, contentRef.current.length);
                const cursorRatio = sel.start / totalChars;
                // Offset adjusted to 220px to keep cursor closer to keyboard
                const cursorY = editorYRef.current + (contentHeightRef.current * cursorRatio);
                scrollViewRef.current?.scrollTo({ y: Math.max(0, cursorY - 220), animated: true });
            }, 300);
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setIsKeyboardVisible(false);
            setKavKey(prev => prev + 1);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [id, isEditing, journalFontSize]);

    const loadData = async () => {
        const people = await PersonRepository.getPeopleSortedByActivity();
        setAllPeople(people);

        if (id === 'new') {
            const dateStr = (initialDate as string) || new Date().toISOString().split('T')[0];
            setJournal({
                id: 0,
                date: dateStr,
                title: '',
                content: '',
                createdAt: new Date(),
                updatedAt: new Date()
            } as Journal);
            setTitle('');
            setContent('');
            contentRef.current = '';
            setTaggedPeople([]);
            setSelectedPeople([]);
            return;
        }

        const [j, tags] = await Promise.all([
            JournalRepository.getById(journalId),
            JournalRepository.getTaggedPeople(journalId)
        ]);

        if (j) {
            setJournal(j);
            setTitle(j.title || '');
            setContent(j.content || '');
            contentRef.current = j.content || '';
            setOriginalTitle(j.title || '');
            setOriginalContent(j.content || '');
            const initialTagIds = tags ? tags.map((t: any) => t.person.id) : [];
            setTaggedPeople(tags || []);
            setSelectedPeople(initialTagIds);
            setOriginalSelectedPeople(initialTagIds);
        }
    };

    const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    const handleSave = async () => {
        if (!content.trim()) return;
        setIsSaving(true);
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);

        try {
            let activeId = journalId;

            if (id === 'new') {
                const dateStr = (initialDate as string) || new Date().toISOString().split('T')[0];
                const newJournal = await JournalRepository.create({
                    date: dateStr,
                    content: content.trim(),
                    title: title.trim() || null,
                });
                activeId = newJournal.id;
            } else {
                await JournalRepository.update(journalId, content.trim(), title.trim() || undefined);
            }

            setOriginalContent(content.trim());
            setOriginalTitle(title.trim());
            setIsEditing(false);
            await JournalRepository.removeAllTags(activeId);
            await Promise.all(selectedPeople.map(pId =>
                JournalRepository.tagPerson(activeId, pId)
            ));

            if (id === 'new') {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)/journal');
                }
            } else {
                await loadData();
                setIsEditing(false);
            }
        } catch (error) {
            showAlert("Error", "Failed to save journal entry.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const performDelete = async () => {
        try {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            await JournalRepository.delete(journalId);
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(tabs)/journal');
            }
        } catch (error) {
            showAlert("Error", "Could not delete the journal entry.", "error");
        }
    };

    const handleDelete = (silent = false) => {
        if (silent) {
            performDelete();
            return;
        }
        setShowDeleteModal(true);
    };

    const handleMenuPress = () => {
        triggerHaptic();
        setShowMoreMenu(true);
    };

    const insertFormatting = (prefix: string, suffix: string = '') => {
        triggerHaptic();

        const { start, end } = selection;
        const selectedText = content.substring(start, end);
        const newText =
            content.substring(0, start) +
            prefix +
            selectedText +
            suffix +
            content.substring(end);

        setContent(newText);

        const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 0);

        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.setSelection(newCursorPos, newCursorPos);
            }
        }, 10);
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

    const togglePersonTag = (pId: number) => {
        triggerHaptic();
        setSelectedPeople(prev =>
            prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]
        );
    };

    const wordCount = useMemo(() => {
        return content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    }, [content]);



    if (!journal) {
        return (
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
            </ThemedView>
        );
    }

    const formattedDate = new Date(journal.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
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
                        handleDelete(true); // Silent delete for empty
                    } else {
                        router.back();
                    }
                }}
                backButtonIcon={isEditing ? (
                    <ScalePressable
                        onPress={() => {
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
                        }}
                        overlayColor="transparent"
                        scaleTo={0.9}
                    >
                        <X size={20} color={colors.text} />
                    </ScalePressable>
                ) : <ChevronLeft size={22} color={colors.text} />}
                backButtonStyle={{ backgroundColor: colors.border + '20' }}
                title={undefined}
                borderBottom={false}
                centerContent={
                    <View style={styles.headerTitleCenter}>
                        <Badge variant="default" backgroundColor={colors.surface} icon={<Calendar size={12} color={colors.secondary} weight="bold" />}>
                            {journal.date}
                        </Badge>
                        <ThemedText type="small" style={{ color: colors.secondary, fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                            {wordCount} words
                        </ThemedText>
                    </View>
                }
                rightContent={
                    <View style={[styles.headerActions, { marginRight: -6 }]}>
                        {!isEditing ? (
                            <>
                                <ScalePressable onPress={() => setIsEditing(true)} style={[styles.headerButton, { backgroundColor: colors.border + '20' }]} innerStyle={{ borderRadius: 18 }}>
                                    <Edit3 size={18} color={colors.text} />
                                </ScalePressable>
                                <ScalePressable onPress={handleMenuPress} style={[styles.headerButton, { marginLeft: 8, backgroundColor: colors.border + '20' }]} innerStyle={{ borderRadius: 18 }}>
                                    <MoreVertical size={20} color={colors.text} />
                                </ScalePressable>
                            </>
                        ) : (
                            <ScalePressable
                                onPress={handleSave}
                                disabled={isSaving}
                                style={[styles.headerButton, { backgroundColor: colors.tint }]}
                                innerStyle={{ borderRadius: 18 }}
                                overlayColor="rgba(0,0,0,0.15)"
                                scaleTo={0.9}
                            >
                                <Check size={24} color={colors.tintContrast} weight="bold" />
                            </ScalePressable>
                        )}
                    </View>
                }
            />

            <KeyboardAvoidingView
                key={`kav-${kavKey}`}
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.content,
                        { paddingHorizontal: journalPadding }
                    ]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <ThemedText type="tiny" style={styles.fullDate}>{formattedDate}</ThemedText>

                    {isEditing ? (
                        <>
                            <TextInput
                                value={title}
                                onChangeText={setTitle}
                                placeholder="Untitled"
                                placeholderTextColor={colors.icon + '80'}
                                style={[styles.titleInput, { color: colors.text }]}
                                selectionColor={colors.tint}
                            />
                            <View onLayout={(e) => { editorYRef.current = e.nativeEvent.layout.y; }}>
                                <TextInput
                                    ref={editorRef}
                                    value={content}
                                    onChangeText={(text) => {
                                        setContent(text);
                                        contentRef.current = text;
                                    }}
                                    onSelectionChange={(e) => {
                                        setSelection(e.nativeEvent.selection);
                                        selectionRef.current = e.nativeEvent.selection;
                                    }}
                                    onContentSizeChange={(e) => {
                                        contentHeightRef.current = e.nativeEvent.contentSize.height;
                                    }}
                                    multiline
                                    placeholder="Pour your thoughts..."
                                    placeholderTextColor={colors.secondary}
                                    style={[
                                        styles.editor,
                                        {
                                            color: colors.text,
                                            fontSize: journalFontSize,
                                            lineHeight: Math.round(journalFontSize * 1.6)
                                        }
                                    ]}
                                    selectionColor={colors.tint}
                                    scrollEnabled={false}
                                    autoFocus={kavKey === 0}
                                    keyboardType="default"
                                    returnKeyType="default"
                                    onFocus={() => setIsKeyboardVisible(true)}
                                />
                            </View>
                        </>
                    ) : (
                        <>
                            {journal.title ? (
                                <ThemedText type="display" style={styles.viewerTitle}>{journal.title}</ThemedText>
                            ) : null}
                            <View style={styles.viewerText}>
                                <MarkdownText
                                    content={content}
                                    style={{
                                        fontSize: journalFontSize,
                                        lineHeight: Math.round(journalFontSize * 1.6)
                                    }}
                                />
                            </View>
                        </>
                    )}

                    {/* Tagged People Section */}
                    <View style={styles.tagsContainer}>
                        <View style={styles.sectionHeader}>
                            <UserPlus size={16} color={colors.secondary} />
                            <ThemedText type="sectionHeader" style={styles.sectionTitle}>Connections Mentioned</ThemedText>
                        </View>

                        {isEditing && (
                            <ScalePressable
                                onPress={() => tagSearchRef.current?.focus()}
                                style={[styles.searchBar, { backgroundColor: colors.surface }]}
                                scaleTo={0.98}
                                overlayColor="transparent"
                            >
                                <Search size={16} color={colors.secondary} />
                                <TextInput
                                    ref={tagSearchRef}
                                    value={tagSearch}
                                    onChangeText={setTagSearch}
                                    placeholder="Search people..."
                                    placeholderTextColor={colors.secondary + '80'}
                                    style={[styles.searchInput, { color: colors.text }]}
                                    onFocus={() => {
                                        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
                                    }}
                                />
                            </ScalePressable>
                        )}

                        {isEditing ? (
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsScroll} contentContainerStyle={{ paddingRight: 40 }}>
                                {allPeople
                                    .filter(p => !tagSearch || p.name.toLowerCase().includes(tagSearch.toLowerCase()))
                                    .sort((a, b) => {
                                        const aSelected = selectedPeople.includes(a.id);
                                        const bSelected = selectedPeople.includes(b.id);
                                        if (aSelected !== bSelected) return aSelected ? -1 : 1;
                                        return allPeople.findIndex(p => p.id === a.id) - allPeople.findIndex(p => p.id === b.id);
                                    })
                                    .slice(0, 10)
                                    .map(p => (
                                        <ScalePressable
                                            key={p.id}
                                            onPress={() => togglePersonTag(p.id)}
                                            style={[
                                                styles.personTag,
                                                { backgroundColor: colors.surface },
                                                selectedPeople.includes(p.id) && { borderColor: 'transparent', borderWidth: 0, backgroundColor: colors.tint + '20' }
                                            ]}
                                            innerStyle={{ borderRadius: 14 }}
                                        >
                                            <Avatar name={p.name} uri={p.avatarUri} size={30} />
                                            <ThemedText style={[styles.tagName, selectedPeople.includes(p.id) && { color: colors.tint, fontWeight: '700' }]}>
                                                {p.name.split(' ')[0]}
                                            </ThemedText>
                                        </ScalePressable>
                                    ))}
                            </ScrollView>
                        ) : (
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
                                    <ThemedText type="small" style={{ color: colors.secondary, marginLeft: 4, opacity: 0.5 }}>No connections mentioned</ThemedText>
                                )}
                            </View>
                        )}
                    </View>
                </ScrollView>

                {isEditing && isKeyboardVisible && (
                    <EditorToolbar onInsertFormatting={insertFormatting} />
                )}
            </KeyboardAvoidingView>

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
                            <ShareIcon size={18} color={colors.text} />
                            <ThemedText style={styles.menuText}>Share</ThemedText>
                        </ScalePressable>

                        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6, marginHorizontal: 8 }} />

                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                handleDelete();
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Trash2 size={18} color={colors.error} />
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
                    performDelete();
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
                    setContent(originalContent);
                    setTitle(originalTitle);
                    setIsEditing(false);
                    setShowDiscardModal(false);
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
    headerTitleCenter: {
        alignItems: 'center',
        paddingTop: 4,
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
        paddingBottom: 150, // Added padding for cropping fix
    },
    fullDate: {
        opacity: 0.4,
        fontFamily: Typography.fontFamily.bold,
        marginBottom: 32,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    viewerTitle: {
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    viewerText: {
        paddingBottom: 40,
    },
    viewParagraph: {
        fontSize: 16,
        lineHeight: 26,
        fontWeight: '500',
        marginBottom: 16,
        opacity: 0.85,
    },
    titleInput: {
        fontSize: 32,
        fontFamily: Typography.fontFamily.display,
        letterSpacing: -1,
        marginBottom: 16,
        padding: 0,
    },
    editor: {
        fontSize: 16,
        lineHeight: 26,
        fontFamily: Typography.fontFamily.regular,
        textAlignVertical: 'top',
        minHeight: 400,
    },
    tagsContainer: {
        marginTop: 64,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128,128,128,0.1)',
        paddingTop: 32,
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
    tagsScroll: {
        flexDirection: 'row',
    },
    tagsFlexGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
        fontWeight: '600',
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
        fontWeight: '600',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 40,
        borderRadius: 20,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '500',
    },
});
