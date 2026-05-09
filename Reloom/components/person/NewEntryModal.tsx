import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, Animated as RNAnimated, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../ui/ThemedText';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Check } from '@/components/ui/Icon';
import { useAppTheme } from '../../hooks/useAppTheme';
import Reanimated, { FadeInDown } from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';
import { DeleteModal } from '../ui/DeleteModal';
import { EntryRepository, EntryType } from '../../db/repositories/EntryRepository';
import { useSettings } from '../../store/SettingsContext';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Typography } from '../../constants/Typography';
import { LinearGradient } from 'expo-linear-gradient';
import { ScalePressable } from '../ui/ScalePressable';
import { opacity } from 'react-native-reanimated/lib/typescript/Colors';

const DRAFT_FILE = ((FileSystem as any).cacheDirectory || '') + 'entry_draft.json';

interface NewEntryModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (title: string, content: string) => Promise<void>;
    personId?: number;
}

export function NewEntryModal({ visible, onClose, onSave, personId }: NewEntryModalProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();
    const insets = useSafeAreaInsets();
    const [category, setCategory] = useState('Note');
    const [customCategory, setCustomCategory] = useState('');
    const [customCategories, setCustomCategories] = useState<EntryType[]>([]);
    const [content, setContent] = useState('');
    const [isCustom, setIsCustom] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    const fadeAnim = useRef(new RNAnimated.Value(0)).current;

    // Draft Logic
    const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (visible) {
            setCategory('Note');
            setIsCustom(false);
            setCustomCategory('');
            checkDraft();
            loadCategories();
            RNAnimated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [visible, personId]);

    const loadCategories = async () => {
        try {
            if (personId) {
                const types = await EntryRepository.getCustomTypesForPerson(personId);
                setCustomCategories(types);
            } else {
                const types = await EntryRepository.getCustomTypes();
                setCustomCategories(types);
            }
        } catch (e) {
            console.error("Error loading categories", e);
        }
    };

    const checkDraft = async () => {
        try {
            const info = await FileSystem.getInfoAsync(DRAFT_FILE);
            if (info.exists) {
                const contentStr = await FileSystem.readAsStringAsync(DRAFT_FILE);
                const draft = JSON.parse(contentStr);
                if (draft.content) {
                    setContent(draft.content);
                }
            }
        } catch (e) {
            console.log("Error reading draft", e);
        }
    };

    const saveDraft = async (cat: string, customCat: string, text: string) => {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveTimeout.current = setTimeout(async () => {
            try {
                await FileSystem.writeAsStringAsync(DRAFT_FILE, JSON.stringify({
                    category: cat,
                    customCategory: customCat,
                    content: text
                }));
            } catch (e) {
                // ignore
            }
        }, 500);
    };

    useEffect(() => {
        if (visible) {
            saveDraft(category, customCategory, content);
        }
    }, [category, customCategory, content, visible]);

    const clearDraft = async () => {
        try {
            await FileSystem.deleteAsync(DRAFT_FILE, { idempotent: true });
        } catch (e) { }
    };

    // Semantic Categories
    const CATEGORIES = ['Note', 'Memory', 'Food & Drink', 'Family', 'Work', 'Travel', 'Gift Idea', 'Goal'];

    const handleSave = async () => {
        if (!content.trim()) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const finalCategory = isCustom ? (customCategory.trim() || 'Note') : category;
        await onSave(finalCategory, content);
        await clearDraft();

        // Reset
        setCategory('Note');
        setCustomCategory('');
        setContent('');
        setIsCustom(false);
    };

    const handleClose = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (content.trim().length > 0) {
            setShowDiscardModal(true);
        } else {
            clearDraft(); // Just in case
            onClose();
        }
    };

    const confirmDiscard = async () => {
        await clearDraft();
        setCategory('Note');
        setCustomCategory('');
        setContent('');
        setIsCustom(false);
        setShowDiscardModal(false);
        onClose();
    };

    const selectCategory = (cat: string) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        setCategory(cat);
        setIsCustom(false);
    };

    const enableCustom = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        if (isCustom) {
            setIsCustom(false);
            setCategory('Note');
        } else {
            setIsCustom(true);
            setCategory('');
        }
    };

    const CategoryChip = ({
        label,
        isSelected,
        onPress,
        isPlus = false
    }: {
        label: string;
        isSelected: boolean;
        onPress: () => void;
        isPlus?: boolean;
    }) => (
        <ScalePressable
            onPress={onPress}
            style={styles.chipWrapper}
        >
            <LinearGradient
                colors={
                    isSelected
                        ? [colors.tint + '40', colors.tint + '20']
                        : ['transparent', 'transparent']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    styles.chip,
                    !isSelected && { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.11)' : 'rgba(0,0,0,0.08)' }
                ]}
            >
                <ThemedText style={[
                    styles.chipText,
                    { color: isSelected ? colors.tint : isPlus ? colors.secondary : colors.text }
                ]}>
                    {isPlus ? '+ ' + label : label}
                </ThemedText>
            </LinearGradient>
        </ScalePressable>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style="auto" />
                <ScreenHeader
                    onBack={handleClose}
                    backButtonIcon={<X size={22} color={colors.text} />}
                    backButtonStyle={{ backgroundColor: 'transparent' }}
                    centerContent={
                        <ThemedText style={{ fontSize: 18, color: colors.text, fontFamily: Typography.fontFamily.serif }}>
                            New Note
                        </ThemedText>
                    }
                    rightContent={
                        <ScalePressable
                            onPress={handleSave}
                            disabled={!content.trim()}
                            style={styles.headerAction}
                            scaleTo={0.9}
                            overlayColor="transparent"
                        >
                            <Check size={24} color={content.trim() ? colors.tint : colors.secondary} weight="bold" />
                        </ScalePressable>
                    }
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.form}>
                            <ThemedText type="sectionHeader" style={[styles.sectionLabel, { opacity: 0.9 }]}>Category</ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryScroll}
                            >
                                <CategoryChip
                                    label="Custom"
                                    isPlus
                                    isSelected={isCustom}
                                    onPress={enableCustom}
                                />

                                {customCategories.map(cat => (
                                    <CategoryChip
                                        key={cat.id}
                                        label={cat.label}
                                        isSelected={category === cat.label}
                                        onPress={() => selectCategory(cat.label)}
                                    />
                                ))}
                            </ScrollView>

                            {isCustom && (
                                <Reanimated.View entering={FadeInDown.duration(200)}>
                                    <View style={{ height: 16 }} />
                                    <Input
                                        placeholder="Enter custom category..."
                                        value={customCategory}
                                        onChangeText={setCustomCategory}
                                        autoFocus
                                    />
                                </Reanimated.View>
                            )}

                            {!isCustom && (
                                <Reanimated.View entering={FadeInDown.duration(200).springify()}>
                                    <View style={{ height: 16 }} />
                                    <ThemedText type="small" style={[styles.recommendedLabel, { color: colors.secondary }]}>Recommended</ThemedText>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.categoryScroll}
                                    >
                                        {CATEGORIES.map(cat => (
                                            <CategoryChip
                                                key={cat}
                                                label={cat}
                                                isSelected={category === cat}
                                                onPress={() => selectCategory(cat)}
                                            />
                                        ))}
                                    </ScrollView>
                                </Reanimated.View>
                            )}

                            <View style={{ height: 24 }} />

                            <ThemedText type="sectionHeader" style={[styles.sectionLabel, { opacity: 0.9 }]}>Content</ThemedText>
                            <Input
                                placeholder="What's on your mind?"
                                value={content}
                                onChangeText={setContent}
                                multiline
                                style={styles.textArea}
                                textAlignVertical="top"
                            />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>

            <DeleteModal
                visible={showDiscardModal}
                title="Discard Draft?"
                description="You have unsaved changes. Are you sure you want to discard them?"
                onCancel={() => setShowDiscardModal(false)}
                onDelete={confirmDiscard}
                actionLabel="Discard"
            />
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        zIndex: 10,
    },
    headerTitle: {
        fontSize: 20,
        letterSpacing: -0.5,
    },
    headerAction: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    form: {
        padding: 20,
    },
    sectionLabel: {
        marginBottom: 10,
    },
    recommendedLabel: {
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    categoryScroll: {
        gap: 8,
        paddingRight: 20,
        marginBottom: 8,
    },
    chipWrapper: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 10,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    textArea: {
        minHeight: 250,
        fontSize: 17,
        lineHeight: 24,
        paddingTop: 16,
    },
});
