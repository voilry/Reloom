import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, Keyboard, BackHandler, UIManager, LayoutAnimation } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}
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
    const [title, setTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(edit === 'true');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [selection, setSelection] = useState({ start: 0, end: 0 });
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
    }, [id, type, isEditing, settings.editorFontSize]);

    const loadData = async () => {
        if (!id) return;

        if (type === 'description') {
            const p = await PersonRepository.getById(Number(id));
            if (p) {
                setContent(p.description || '');
                contentRef.current = p.description || '';
                setOriginalContent(p.description || '');
                setTitle(p.name);
                setOriginalTitle(p.name);
                setLastUpdated(p.updatedAt);
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

    const insertFormatting = (prefix: string, suffix: string = '') => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const { start, end } = selection;
        const selectedText = content.substring(start, end);
        const newText =
            content.substring(0, start) +
            prefix +
            selectedText +
            suffix +
            content.substring(end);

        setContent(newText);

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
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 16, letterSpacing: -0.3, textAlign: 'center' }}>{title}</ThemedText>
                            <Edit3 size={12} color={colors.secondary} />
                        </TouchableOpacity>
                    ) : isEditing && type === 'entry' && editingTitle ? (
                        <TextInput
                            value={title}
                            onChangeText={setTitle}
                            onBlur={() => setEditingTitle(false)}
                            autoFocus
                            style={[styles.titleInput, { color: colors.text, borderBottomColor: colors.tint, textAlign: 'center' }]}
                            selectionColor={colors.tint}
                            keyboardAppearance={theme === 'dark' ? 'dark' : 'light'}
                        />
                    ) : (
                        <ThemedText type="sectionHeader" style={{ fontSize: 16, letterSpacing: -0.3, marginBottom: -8, textAlign: 'center' }}>{title}</ThemedText>
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                        <View onLayout={(e) => { editorYRef.current = e.nativeEvent.layout.y; }}>
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
                                placeholder="Start writing..."
                                placeholderTextColor={colors.icon + '80'}
                                autoFocus={kavKey === 0}
                                selectionColor={colors.tint}
                                scrollEnabled={false}
                                keyboardType="default"
                                returnKeyType="default"
                                onFocus={() => setIsKeyboardVisible(true)}
                            />
                        </View>
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
                    <EditorToolbar onInsertFormatting={insertFormatting} />
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
        flex: 1,
        alignItems: 'center',
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
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120, // More space for bottom cropping fix
    },
    editor: {
        fontSize: 15,
        lineHeight: 23,
        fontFamily: Typography.fontFamily.regular,
        textAlignVertical: 'top',
        minHeight: 300,
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
