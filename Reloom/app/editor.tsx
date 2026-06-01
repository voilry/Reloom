import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { MarkdownText } from '../components/ui/MarkdownText';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PersonRepository } from '../db/repositories/PersonRepository';
import { EntryRepository } from '../db/repositories/EntryRepository';
import { DesignSystem } from '../constants/DesignSystem';
import { Typography } from '../constants/Typography';
import { CaretLeft as ChevronLeft, Check, Trash as Trash2, Pencil as Edit3, TextT as Type, X, FloppyDisk as Save } from '@/components/ui/Icon';
import { Button } from '../components/ui/Button';
import { DeleteModal } from '../components/ui/DeleteModal';
import { AlertModal } from '../components/ui/AlertModal';
import { EditorToolbar } from '../components/ui/EditorToolbar';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScalePressable } from '../components/ui/ScalePressable';
import { Badge } from '../components/ui/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '../hooks/useAppTheme';
import { useSettings } from '../store/SettingsContext';

export default function EditorScreen() {
    const { id, type, edit } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();

    const [content, setContent] = useState('');
    const contentRef = useRef('');
    const [undoStack, setUndoStack] = useState<string[]>([]);
    const [redoStack, setRedoStack] = useState<string[]>([]);
    const isHistoryChange = useRef(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [title, setTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(edit === 'true');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const selectionRef = useRef({ start: 0, end: 0 });
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);

    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const [kavKey, setKavKey] = useState(0);
    const contentHeightRef = useRef(0);
    const editorYRef = useRef(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const editorRef = useRef<TextInput>(null);

    const showAlert = (title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, description, type, onClose });
    };



    const hasChanges = useMemo(() => {
        return content !== originalContent || title !== originalTitle;
    }, [content, originalContent, title, originalTitle]);

    const wordCount = useMemo(() => {
        return content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
    }, [content]);

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
            // Scroll to cursor position after keyboard opens, but only if cursor is not at the top
            if (selectionRef.current.start > 40) {
                setTimeout(() => {
                    const sel = selectionRef.current;
                    const totalChars = Math.max(1, contentRef.current.length);
                    const cursorRatio = sel.start / totalChars;
                    const cursorY = editorYRef.current + (contentHeightRef.current * cursorRatio);
                    
                    // Only scroll if the cursor is significantly down the page
                    if (cursorY > 200) {
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, cursorY - 180), animated: true });
                    }
                }, 100);
            }
        });
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
            setIsKeyboardVisible(false);
            setKavKey(prev => prev + 1);
        });

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, [id, type, isEditing, settings.editorFontSize]);

    const loadData = async () => {
        if (!id) return;

        if (type === 'description') {
            const p = await PersonRepository.getById(Number(id));
            if (p) {
                const desc = p.description || '';
                setContent(desc);
                contentRef.current = desc;
                setOriginalContent(desc);
                setTitle(p.name);
                setOriginalTitle(p.name);
                setLastUpdated(p.updatedAt);
                setUndoStack([desc]);
                setRedoStack([]);
            }
        } else if (type === 'entry') {
            const e = await EntryRepository.getById(Number(id));
            if (e) {
                setContent(e.content);
                contentRef.current = e.content;
                setOriginalContent(e.content);
                setTitle(e.type);
                setOriginalTitle(e.type);
                setLastUpdated(e.createdAt);
                setUndoStack([e.content]);
                setRedoStack([]);
            }
        }
    };

    const handleSave = async () => {
        if (!id) return;
        if (!hasChanges) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            if (type === 'description') {
                await PersonRepository.update(Number(id), { description: content });
            } else if (type === 'entry') {
                await EntryRepository.updateWithType(Number(id), content, title);
            }
            setOriginalContent(content);
            setOriginalTitle(title);
            setIsEditing(false);
        } catch (error) {
            showAlert("Error", "Failed to save changes.", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (hasChanges) {
            setShowDiscardModal(true);
        } else {
            setIsEditing(false);
        }
    };

    const confirmDiscard = () => {
        setContent(originalContent);
        setTitle(originalTitle);
        setIsEditing(false);
        setShowDiscardModal(false);
    };

    const handleBack = useCallback(() => {
        if (isEditing && hasChanges) {
            handleCancel();
        } else {
            router.back();
        }
    }, [isEditing, hasChanges, router]);

    const handleContentChange = (text: string) => {
        setContent(text);
        contentRef.current = text;

        if (isHistoryChange.current) {
            isHistoryChange.current = false;
            return;
        }

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            setUndoStack(prev => {
                if (prev.length > 0 && prev[prev.length - 1] === text) return prev;
                return [...prev, text];
            });
            setRedoStack([]);
        }, 500);
    };

    const handleUndo = () => {
        if (undoStack.length <= 1) return;
        isHistoryChange.current = true;
        const current = content;
        const previous = undoStack[undoStack.length - 2];

        setUndoStack(prev => prev.slice(0, -1));
        setRedoStack(prev => [current, ...prev]);
        setContent(previous);
        contentRef.current = previous;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        isHistoryChange.current = true;
        const next = redoStack[0];

        setUndoStack(prev => [...prev, next]);
        setRedoStack(prev => prev.slice(1));
        setContent(next);
        contentRef.current = next;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const insertFormatting = (prefix: string, suffix: string = '') => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { start, end } = selectionRef.current;
        const selectedText = content.substring(start, end);
        const newText =
            content.substring(0, start) +
            prefix +
            selectedText +
            suffix +
            content.substring(end);

        setContent(newText);
        contentRef.current = newText;

        setUndoStack(prev => [...prev, newText]);
        setRedoStack([]);

        // Calculate new cursor position
        // If we have suffix, we want to be inside it (e.g. inside ****)
        // If we don't have suffix (like # ), we want to be at the end of prefix
        const newCursorPos = start + prefix.length + (selectedText ? selectedText.length : 0);

        // We need a tiny timeout to ensure the TextInput has updated before we set selection
        setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.focus();
                editorRef.current.setSelection(newCursorPos, newCursorPos);
            }
        }, 10);
    };

    const renderHeader = () => (
        <ScreenHeader
            onBack={handleBack}
            backButtonIcon={isEditing ? (
                <ScalePressable 
                    onPress={handleBack}
                    scaleTo={0.9}
                    hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                    overlayColor="transparent"
                >
                    <X size={20} color={colors.text} />
                </ScalePressable>
            ) : <ChevronLeft size={22} color={colors.text} />}
            backButtonStyle={{ backgroundColor: colors.border + '20' }}
            title={undefined}
            borderBottom={false}
            centerContent={
                <View style={[styles.headerInfo, { gap: 0, overflow: 'visible', marginTop: -4 }]}>
                    <ThemedText type="small" style={{ color: colors.secondary, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10, fontWeight: '700', marginBottom: -5, textAlign: 'center' }}>
                        {type === 'description' ? 'Biography' : 'Note'}
                    </ThemedText>
                    {isEditing && type === 'entry' && !editingTitle ? (
                        <TouchableOpacity onPress={() => {
                            setEditingTitle(true);
                            if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }} style={[styles.titleEditRow, { marginBottom: 2 }]}>
                            <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 16, letterSpacing: -0.3, textAlign: 'center', maxWidth: 180 }}>{title}</ThemedText>
                            <Edit3 size={12} color={colors.secondary} />
                        </TouchableOpacity>
                    ) : isEditing && type === 'entry' && editingTitle ? (
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            onBlur={() => setEditingTitle(false)}
                            autoFocus
                            style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.tint, textAlign: 'center', minWidth: 120 }]}
                            selectionColor={colors.tint}
                            keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                            maxLength={20}
                        />
                    ) : (
                        <ThemedText type="sectionHeader" numberOfLines={1} style={{ fontSize: 16, letterSpacing: -0.3, marginBottom: -8, textAlign: 'center', alignSelf: 'stretch' }}>{title}</ThemedText>
                    )}
                    <ThemedText type="small" style={{ color: colors.secondary, fontSize: 10, opacity: 0.6, textAlign: 'center' }}>
                        {isEditing ? `${wordCount} words` : (lastUpdated ? `Last edited ${new Date(lastUpdated).toLocaleDateString()}` : '')}
                    </ThemedText>
                </View>
            }
            rightContent={
                isEditing ? (
                    <ScalePressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={[
                            styles.saveButton,
                            {
                                backgroundColor: hasChanges ? colors.tint : colors.border + '20',
                                opacity: isSaving ? 0.7 : 1
                            }
                        ]}
                        scaleTo={0.9}
                        hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                    >
                        <Check size={20} color={hasChanges ? colors.tintContrast : colors.secondary} weight="bold" />
                    </ScalePressable>
                ) : (
                    <ScalePressable
                        onPress={() => {
                            setIsEditing(true);
                        }}
                        style={[styles.iconButton, { backgroundColor: colors.tint + '10' }]}
                        scaleTo={0.9}
                        hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                    >
                        <Edit3 size={18} color={colors.tint} />
                    </ScalePressable>
                )
            }
        />
    );

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {renderHeader()}

            <KeyboardAvoidingView
                key={`kav-${kavKey}`}
                behavior="padding"
                style={{ flex: 1 }}
                keyboardVerticalOffset={0}
            >
                <ScrollView
                    ref={scrollViewRef}
                    contentContainerStyle={[styles.scrollContent, !isEditing && { paddingTop: 32 }]}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {isEditing ? (
                        <TextInput
                            ref={editorRef}
                            style={[
                                styles.editor,
                                {
                                    color: colors.text,
                                    fontSize: settings.editorFontSize,
                                    lineHeight: Math.round(settings.editorFontSize * 1.5)
                                }
                            ]}
                            multiline
                            value={content}
                            onChangeText={handleContentChange}
                            onSelectionChange={(e) => {
                                selectionRef.current = e.nativeEvent.selection;
                            }}
                            onContentSizeChange={(e) => {
                                contentHeightRef.current = e.nativeEvent.contentSize.height;
                            }}
                            placeholder="Start writing..."
                            placeholderTextColor={colors.icon + '80'}
                            autoFocus={kavKey === 0}
                            selectionColor={colors.tint}
                            scrollEnabled={false}
                            keyboardType="default"
                            returnKeyType="default"
                            onFocus={() => setIsKeyboardVisible(true)}
                        />
                    ) : (
                        <View style={styles.viewContent}>
                            <MarkdownText
                                content={content}
                                style={{
                                    fontSize: settings.editorFontSize,
                                    lineHeight: Math.round(settings.editorFontSize * 1.5)
                                }}
                            />
                        </View>
                    )}
                </ScrollView>

                {isEditing && isKeyboardVisible && (
                    <EditorToolbar 
                        onInsertFormatting={insertFormatting}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={undoStack.length > 1}
                        canRedo={redoStack.length > 0}
                    />
                )}
            </KeyboardAvoidingView>
            <DeleteModal
                visible={showDiscardModal}
                title="Discard Changes"
                description="Are you sure you want to discard your edits?"
                onCancel={() => setShowDiscardModal(false)}
                onDelete={confirmDiscard}
                actionLabel="Discard"
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
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 15,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    headerTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        maxWidth: 200,
        marginBottom: 2,
    },
    titleEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    titleInput: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.semibold,
        borderBottomWidth: 1.5,
        paddingVertical: 0,
        minWidth: 120,
        textAlign: 'center',
    },
    saveButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120,
    },
    editor: {
        fontSize: 15,
        lineHeight: 23,
        fontFamily: Typography.fontFamily.regular,
        textAlignVertical: 'top',
        includeFontPadding: false,
        minHeight: 500,
    },
    viewContent: {
        paddingBottom: 40,
    },
    viewParagraph: {
        fontSize: 16,
        lineHeight: 26,
        marginBottom: 16,
        opacity: 0.85,
    },
});
