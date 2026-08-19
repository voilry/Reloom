import { View, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform, Keyboard, BackHandler, LayoutAnimation } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { MarkdownText } from '../components/ui/MarkdownText';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PersonRepository } from '../db/repositories/PersonRepository';
import { EntryRepository } from '../db/repositories/EntryRepository';
import { Typography } from '../constants/Typography';
import { CaretLeft as ChevronLeft, Check, Pencil as Edit3, X } from '@/components/ui/Icon';
import { DeleteModal } from '../components/ui/DeleteModal';
import { AlertModal } from '../components/ui/AlertModal';
import { EditorToolbar } from '../components/ui/EditorToolbar';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScalePressable } from '../components/ui/ScalePressable';
import { RichEditor } from '../components/ui/RichEditor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEditorBridge, TenTapStartKit } from '@10play/tentap-editor';
import { markdownToHtml, htmlToMarkdown } from '../utils/markdownConverter';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '../hooks/useAppTheme';
import { useSettings } from '../store/SettingsContext';

const bridgeExtensions = TenTapStartKit.filter(ext => ext.name !== 'placeholder');

export default function EditorScreen() {
    const { id, type, edit } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [originalContent, setOriginalContent] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [editingTitle, setEditingTitle] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(edit === 'true');
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);

    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const isDataLoadedRef = useRef(false);

    // editorHtml is null until SQLite data loads. The WebView is gated on this so
    // initialContent is always the real content when the WebView first boots.
    const [editorHtml, setEditorHtml] = useState<string | null>(null);

    const editor = useEditorBridge({
        autofocus: edit === 'true',
        initialContent: editorHtml ?? '<p></p>',
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
    }, [id, type]);

    const loadData = async () => {
        if (!id) return;

        if (type === 'description') {
            const p = await PersonRepository.getById(Number(id));
            if (p) {
                const desc = p.description || '';
                setContent(desc);
                setOriginalContent(desc);
                setTitle(p.name);
                setOriginalTitle(p.name);
                setLastUpdated(p.updatedAt);
                setEditorHtml(markdownToHtml(desc));
                isDataLoadedRef.current = true;
            }
        } else if (type === 'entry') {
            const e = await EntryRepository.getById(Number(id));
            if (e) {
                setContent(e.content);
                setOriginalContent(e.content);
                setTitle(e.type);
                setOriginalTitle(e.type);
                setLastUpdated(e.createdAt);
                setEditorHtml(markdownToHtml(e.content));
                isDataLoadedRef.current = true;
            }
        }
    };

    const handleSave = async () => {
        if (!id) return;
        setIsSaving(true);
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        try {
            const html = await editor.getHTML();
            const markdown = htmlToMarkdown(html);

            if (type === 'description') {
                await PersonRepository.update(Number(id), { description: markdown });
            } else if (type === 'entry') {
                await EntryRepository.updateWithType(Number(id), markdown, title.trim() || originalTitle);
            }
            setContent(markdown);
            setOriginalContent(markdown);
            setOriginalTitle(title.trim() || originalTitle);
            setHasChanges(false);
            setIsEditing(false);
            setLastUpdated(new Date());
            Keyboard.dismiss();
        } catch (error) {
            console.error('Failed to save:', error);
            showAlert('Error', 'Failed to save changes', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleBack = () => {
        if (hasChanges) {
            setShowDiscardModal(true);
        } else {
            router.back();
        }
    };

    const confirmDiscard = () => {
        setContent(originalContent);
        setTitle(originalTitle);
        setHasChanges(false);
        setShowDiscardModal(false);
        setIsEditing(false);
        Keyboard.dismiss();
    };

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (hasChanges) {
                    setShowDiscardModal(true);
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [hasChanges])
    );



    const renderHeader = () => (
        <ScreenHeader
            onBack={handleBack}
            backButtonIcon={isEditing ? <X size={20} color={colors.text} /> : <ChevronLeft size={22} color={colors.text} />}
            backButtonStyle={{ backgroundColor: colors.border + '20' }}
            title={undefined}
            borderBottom={false}
            bottomPadding={2}
            centerContent={
                <View style={styles.headerInfo}>
                    {isEditing && type === 'entry' && !editingTitle ? (
                        <TouchableOpacity onPress={() => {
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                            setEditingTitle(true);
                        }} style={styles.titleEditRow}>
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
                        <ThemedText type="sectionHeader" numberOfLines={1} style={{ fontSize: 16, letterSpacing: -0.3, textAlign: 'center', alignSelf: 'stretch' }}>{title}</ThemedText>
                    )}
                    <ThemedText type="small" style={{ color: colors.secondary, fontSize: 10, opacity: 0.6, textAlign: 'center', marginTop: -10 }}>
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
                        innerStyle={{ borderRadius: 18 }}
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
        <ThemedView style={[styles.container, { paddingBottom: isEditing && isKeyboardVisible ? keyboardHeight : insets.bottom }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {renderHeader()}

            <View style={{ flex: 1 }}>
                {isEditing && editorHtml !== null && (
                    <RichEditor
                        editor={editor}
                        fontSize={settings.editorFontSize || 15}
                        lineHeight={Math.round((settings.editorFontSize || 15) * 1.5)}
                        horizontalPadding={20}
                        topPadding={32}
                        placeholder="Start writing..."
                    />
                )}

                {!isEditing && (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={[styles.scrollContent, { paddingTop: 32 }]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.viewContent}>
                            <MarkdownText
                                content={content}
                                style={{
                                    fontSize: settings.editorFontSize || 15,
                                    lineHeight: Math.round((settings.editorFontSize || 15) * 1.5)
                                }}
                            />
                        </View>
                    </ScrollView>
                )}

                {isEditing && isKeyboardVisible && (
                    <EditorToolbar editor={editor} />
                )}
            </View>

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
        paddingBottom: 80,
    },
    viewContent: {
        paddingBottom: 40,
    },
});

