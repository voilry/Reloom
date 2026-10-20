import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    useWindowDimensions,
    View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInDown,
    SlideOutDown,
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ScalePressable } from '../ui/ScalePressable';
import { DeleteModal } from '../ui/DeleteModal';
import { useAppTheme } from '../../hooks/useAppTheme';
import { EntryRepository } from '../../db/repositories/EntryRepository';
import { Typography } from '../../constants/Typography';
import { DesignSystem } from '../../constants/DesignSystem';
import {
    Add,
    Airplane,
    ArrowUp,
    Briefcase,
    CaretDown,
    Check,
    Coffee,
    FileText,
    Gift,
    House,
    MagnifyingGlass as Search,
    PlusCircle,
    Sparkle,
    Tag,
    Target,
    X,
} from '@/components/ui/Icon';

const STARTER_NOTES = ['Note', 'Memory', 'Food & Drink', 'Family', 'Work', 'Travel', 'Gift Idea', 'Goal'];
const SHEET_SPRING = DesignSystem.animation.springs.expressive;
const SHEET_BOTTOM_OVERHANG = 100;

interface QuickNotePerson {
    id: number;
    name: string;
    avatarUri?: string | null;
}

interface QuickNoteModalProps {
    visible: boolean;
    person: QuickNotePerson | null;
    onClose: () => void;
    onSave: (noteType: string, content: string) => Promise<void>;
}

function draftFileFor(personId?: number) {
    return ((FileSystem as any).cacheDirectory || '') + `quick_note_draft_${personId ?? 'unknown'}.json`;
}

function cleanNoteLines(raw?: string) {
    if (!raw) return [];
    return raw
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0 && !/^[-*_]{3,}$/.test(line) && !/^\*Added:/.test(line))
        .map(line =>
            line
                .replace(/^#{1,6}\s+/, '')
                .replace(/\*\*(.+?)\*\*/g, '$1')
                .replace(/[*_~]/g, '')
                .trim()
        )
        .filter(Boolean);
}

function getRowSnippet(raw?: string) {
    const lines = cleanNoteLines(raw);
    const text = lines[lines.length - 1] || '';
    return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

function CategoryGlyph({ label, size = 18, color }: { label: string; size?: number; color: string }) {
    switch (label.toLowerCase()) {
        case 'note':
            return <FileText size={size} color={color} weight="fill" />;
        case 'memory':
            return <Sparkle size={size} color={color} weight="fill" />;
        case 'food & drink':
            return <Coffee size={size} color={color} weight="fill" />;
        case 'family':
            return <House size={size} color={color} weight="fill" />;
        case 'work':
            return <Briefcase size={size} color={color} weight="fill" />;
        case 'travel':
            return <Airplane size={size} color={color} weight="fill" />;
        case 'gift idea':
            return <Gift size={size} color={color} weight="fill" />;
        case 'goal':
            return <Target size={size} color={color} weight="fill" />;
        default:
            return <Tag size={size} color={color} weight="fill" />;
    }
}

function NoteRow({
    label,
    snippet,
    selected,
    onPress,
    icon,
    trailing,
    accessibilityLabel,
}: {
    label: string;
    snippet?: string;
    selected?: boolean;
    onPress: () => void;
    icon: React.ReactNode;
    trailing?: React.ReactNode;
    accessibilityLabel?: string;
}) {
    const { colors } = useAppTheme();

    return (
        <ScalePressable
            onPress={onPress}
            scaleTo={0.985}
            style={[styles.noteRow, selected && { backgroundColor: colors.tint + '14' }]}
            innerStyle={{ borderRadius: 14 }}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? `Add to ${label}`}
        >
            <View style={[styles.noteRowIcon, { backgroundColor: selected ? colors.tint + '1A' : colors.surface }]}>
                {icon}
            </View>
            <View style={styles.noteRowInfo}>
                <ThemedText
                    numberOfLines={1}
                    style={[styles.noteRowLabel, { color: selected ? colors.tint : colors.text }]}
                >
                    {label}
                </ThemedText>
                {snippet ? (
                    <ThemedText numberOfLines={1} style={[styles.noteRowSnippet, { color: colors.secondary }]}>
                        {snippet}
                    </ThemedText>
                ) : null}
            </View>
            {trailing}
        </ScalePressable>
    );
}

export function QuickNoteModal({ visible, person, onClose, onSave }: QuickNoteModalProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();
    const { height: windowHeight } = useWindowDimensions();
    const collapsedSheetHeight = Math.max(320, Math.round(windowHeight * 0.58));
    const expandedSheetHeight = Math.max(
        collapsedSheetHeight,
        Math.round(windowHeight - insets.top - 16)
    );
    const [category, setCategory] = useState('Note');
    const [content, setContent] = useState('');
    const [usedNotes, setUsedNotes] = useState<string[]>([]);
    const [entryContents, setEntryContents] = useState<Record<string, string>>({});
    const [showSheet, setShowSheet] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showDiscard, setShowDiscard] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [scrollBottomPadding, setScrollBottomPadding] = useState(0);

    const inputRef = useRef<TextInput>(null);
    const sheetScrollRef = useRef<ScrollView>(null);
    const savingRef = useRef(false);
    const keyboardPadding = useSharedValue(Math.max(insets.bottom, 8));
    const sheetHeight = useSharedValue(collapsedSheetHeight);
    const sheetStartHeight = useSharedValue(collapsedSheetHeight);

    useEffect(() => {
        if (!visible) {
            savingRef.current = false;
            setContent('');
            setCategory('Note');
            setSearchQuery('');
            setShowSheet(false);
            setShowDiscard(false);
            setSaving(false);
            setSaved(false);
            setDraftLoaded(false);
            setUsedNotes([]);
            setEntryContents({});
            return;
        }

        savingRef.current = false;
        setContent('');
        setCategory('Note');
        setSearchQuery('');
        setShowSheet(false);
        setShowDiscard(false);
        setSaving(false);
        setSaved(false);
        setDraftLoaded(false);
        setUsedNotes([]);
        setEntryContents({});

        let cancelled = false;
        let focusTimer: ReturnType<typeof setTimeout> | undefined;
        const activePersonId = person?.id;

        (async () => {
            if (activePersonId) {
                try {
                    const entries = await EntryRepository.getForPerson(activePersonId);
                    if (cancelled) return;

                    const contents: Record<string, string> = {};
                    const labels: string[] = [];
                    for (const entry of entries) {
                        if (contents[entry.type] === undefined) {
                            contents[entry.type] = entry.content;
                            labels.push(entry.type);
                        }
                    }

                    labels.sort((a, b) => {
                        if (a === 'Note') return -1;
                        if (b === 'Note') return 1;
                        return a.localeCompare(b);
                    });

                    setUsedNotes(labels);
                    setEntryContents(contents);
                } catch (e) {
                    console.error('Failed to load notes for quick entry', e);
                }
            }

            try {
                const file = draftFileFor(activePersonId);
                const info = await FileSystem.getInfoAsync(file);
                if (!cancelled && info.exists) {
                    const raw = await FileSystem.readAsStringAsync(file);
                    const draft = JSON.parse(raw);
                    if (typeof draft?.content === 'string') {
                        setContent(draft.content);
                    }
                    if (typeof draft?.category === 'string' && draft.category.trim()) {
                        setCategory(draft.category.trim());
                    }
                }
            } catch (e) {
                // Drafts are best-effort only.
            }

            if (!cancelled) {
                setDraftLoaded(true);
                focusTimer = setTimeout(() => inputRef.current?.focus(), 120);
            }
        })();

        return () => {
            cancelled = true;
            if (focusTimer) clearTimeout(focusTimer);
        };
    }, [visible, person?.id]);

    useEffect(() => {
        if (!visible || !draftLoaded) return;

        const file = draftFileFor(person?.id);
        const timer = setTimeout(() => {
            FileSystem.writeAsStringAsync(file, JSON.stringify({ category, content })).catch(() => { });
        }, 500);

        return () => clearTimeout(timer);
    }, [visible, draftLoaded, category, content, person?.id]);

    useEffect(() => {
        keyboardPadding.value = Math.max(insets.bottom, 8);

        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
        const showSub = Keyboard.addListener(showEvent, () => {
            keyboardPadding.value = withTiming(6, { duration: 180 });
        });
        const hideSub = Keyboard.addListener(hideEvent, () => {
            keyboardPadding.value = withTiming(Math.max(insets.bottom, 8), { duration: 220 });
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, [insets.bottom]);

    useEffect(() => {
        if (!showSheet) {
            setScrollBottomPadding(0);
            return;
        }

        // The sheet extends below the screen, so the ScrollView's layout bottom
        // does too. Add that overflow as scroll-content padding (not visible
        // sheet padding) so the last row can still scroll above the screen.
        const timer = setTimeout(() => {
            sheetScrollRef.current
                ?.getNativeScrollRef()
                ?.measureInWindow((_x, y, _width, height) => {
                    const screenHeight = Dimensions.get('screen').height;
                    const overflow = Math.max(0, y + height - screenHeight);
                    setScrollBottomPadding(overflow + 1);
                });
        }, 320);

        return () => clearTimeout(timer);
    }, [showSheet]);

    const bottomBarStyle = useAnimatedStyle(() => ({
        paddingBottom: keyboardPadding.value,
    }));

    const sheetHeightStyle = useAnimatedStyle(() => ({
        height: sheetHeight.value + SHEET_BOTTOM_OVERHANG,
    }));

    const sheetPanResponder = useMemo(() => {
        const settleSheet = (projectedHeight: number) => {
            const midpoint = (collapsedSheetHeight + expandedSheetHeight) / 2;
            sheetHeight.value = withSpring(
                projectedHeight > midpoint ? expandedSheetHeight : collapsedSheetHeight,
                SHEET_SPRING
            );
        };

        return PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) =>
                Math.abs(gesture.dy) > 3 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => {
                sheetStartHeight.value = sheetHeight.value;
                Keyboard.dismiss();
            },
            onPanResponderMove: (_, gesture) => {
                const nextHeight = sheetStartHeight.value - gesture.dy;
                sheetHeight.value = Math.max(
                    collapsedSheetHeight,
                    Math.min(expandedSheetHeight, nextHeight)
                );
            },
            onPanResponderRelease: (_, gesture) => {
                // PanResponder velocity is px/ms; project 150ms in the drag direction.
                settleSheet(sheetHeight.value - gesture.vy * 150);
            },
            onPanResponderTerminate: () => {
                settleSheet(sheetHeight.value);
            },
        });
    }, [collapsedSheetHeight, expandedSheetHeight, sheetHeight, sheetStartHeight]);

    const noteSnippets = useMemo(() => {
        const next: Record<string, string> = {};
        for (const [label, raw] of Object.entries(entryContents)) {
            next[label] = getRowSnippet(raw);
        }
        return next;
    }, [entryContents]);

    const noteExists = Boolean(entryContents[category]);
    const hasText = content.trim().length > 0;
    const canSave = hasText && !saving && !saved;

    const placeholder = noteExists
        ? `Add to your ${category === 'Note' ? 'note' : `${category} note`}…`
        : category === 'Note'
            ? `Start a note about ${person?.name || 'them'}…`
            : `Start a new ${category} note…`;

    const query = searchQuery.trim();
    const normalizedQuery = query.toLowerCase();
    const usedSet = useMemo(() => new Set(usedNotes.map(label => label.toLowerCase())), [usedNotes]);
    const filteredUsed = usedNotes.filter(label => label.toLowerCase().includes(normalizedQuery));
    const filteredStarters = STARTER_NOTES.filter(
        label => !usedSet.has(label.toLowerCase()) && label.toLowerCase().includes(normalizedQuery)
    );
    const currentIsListed =
        usedSet.has(category.toLowerCase()) ||
        STARTER_NOTES.some(label => label.toLowerCase() === category.toLowerCase());
    const showCurrentRow = !currentIsListed && category.toLowerCase().includes(normalizedQuery);
    const exactMatch = [...usedNotes, ...STARTER_NOTES, ...(currentIsListed ? [] : [category])].some(
        label => label.toLowerCase() === normalizedQuery
    );
    const showCreate = normalizedQuery.length > 0 && !exactMatch;
    const exactUsedNote = usedNotes.find(label => label.toLowerCase() === normalizedQuery);
    const exactStarterNote = filteredStarters.find(label => label.toLowerCase() === normalizedQuery);

    const clearDraft = async () => {
        try {
            await FileSystem.deleteAsync(draftFileFor(person?.id), { idempotent: true });
        } catch (e) {
            // Ignore a missing draft.
        }
    };

    const openSheet = () => {
        Keyboard.dismiss();
        sheetHeight.value = collapsedSheetHeight;
        setSearchQuery('');
        setShowSheet(true);
    };

    const closeSheet = () => {
        setShowSheet(false);
        setSearchQuery('');
        setTimeout(() => inputRef.current?.focus(), 220);
    };

    const chooseNote = (label: string) => {
        const next = label.trim();
        if (!next) return;

        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => { });
        }
        setCategory(next);
        setShowSheet(false);
        setSearchQuery('');
        setTimeout(() => inputRef.current?.focus(), 220);
    };

    const handleClose = () => {
        if (savingRef.current || saved) return;
        if (showSheet) {
            closeSheet();
            return;
        }
        if (hasText) {
            Keyboard.dismiss();
            setShowDiscard(true);
            return;
        }
        Keyboard.dismiss();
        setDraftLoaded(false);
        clearDraft();
        onClose();
    };

    const confirmDiscard = async () => {
        setDraftLoaded(false);
        await clearDraft();
        setShowDiscard(false);
        onClose();
    };

    const handleSave = async () => {
        if (!canSave || !person || savingRef.current) return;

        savingRef.current = true;
        setSaving(true);
        setDraftLoaded(false);

        try {
            await onSave(category, content.trim());
            await clearDraft();
            setSaved(true);
            setSaving(false);
            Keyboard.dismiss();
            setTimeout(onClose, 180);
        } catch (e) {
            console.error('Failed to save quick entry', e);
            savingRef.current = false;
            setDraftLoaded(true);
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            transparent={false}
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

                <ScreenHeader
                    onBack={handleClose}
                    backButtonIcon={<X size={22} color={colors.text} />}
                    backButtonStyle={{ backgroundColor: 'transparent' }}
                    bottomPadding={0}
                />

                <View style={styles.personRow}>
                    <Avatar name={person?.name || '?'} uri={person?.avatarUri} size={38} />
                    <View style={styles.personInfo}>
                        <ThemedText numberOfLines={1} style={[styles.personName, { color: colors.text }]}>
                            {person?.name || 'Quick Note'}
                        </ThemedText>
                        <ThemedText style={[styles.personLabel, { color: colors.secondary }]}>
                            Quick Note
                        </ThemedText>
                    </View>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardArea}
                    keyboardVerticalOffset={0}
                >
                    <View style={styles.composerArea}>
                        <TextInput
                            ref={inputRef}
                            value={content}
                            onChangeText={setContent}
                            editable={!saving && !saved}
                            placeholder={placeholder}
                            placeholderTextColor={colors.textTertiary}
                            multiline
                            textAlignVertical="top"
                            scrollEnabled
                            selectionColor={colors.tint}
                            style={[styles.composer, { color: colors.text }]}
                        />
                    </View>

                    <Animated.View style={[styles.bottomBar, bottomBarStyle]}>
                        <ScalePressable
                            onPress={openSheet}
                            disabled={saving || saved}
                            style={[styles.destPill, { backgroundColor: colors.surface }]}
                            innerStyle={{ borderRadius: 23 }}
                            scaleTo={0.96}
                            accessibilityRole="button"
                            accessibilityLabel={`Choose note. Currently ${category}`}
                        >
                            <Animated.View
                                key={category}
                                entering={FadeIn.duration(140)}
                                style={styles.destPillContent}
                            >
                                <CategoryGlyph label={category} size={17} color={colors.tint} />
                                <ThemedText
                                    numberOfLines={1}
                                    style={[styles.destPillText, { color: colors.text }]}
                                >
                                    {category}
                                </ThemedText>
                            </Animated.View>
                            <CaretDown size={15} color={colors.secondary} />
                        </ScalePressable>

                        <ScalePressable
                            onPress={handleSave}
                            disabled={!canSave}
                            style={[
                                styles.saveButton,
                                { backgroundColor: hasText ? colors.tint : colors.surface },
                            ]}
                            innerStyle={{ borderRadius: 27 }}
                            scaleTo={0.9}
                            accessibilityRole="button"
                            accessibilityLabel="Add note"
                        >
                            {saving ? (
                                <ActivityIndicator size="small" color={colors.tintContrast} />
                            ) : saved ? (
                                <Animated.View entering={ZoomIn.duration(160).springify()}>
                                    <Check size={22} color={colors.tintContrast} weight="bold" />
                                </Animated.View>
                            ) : (
                                <ArrowUp
                                    size={22}
                                    color={hasText ? colors.tintContrast : colors.textTertiary}
                                    weight="bold"
                                />
                            )}
                        </ScalePressable>
                    </Animated.View>
                </KeyboardAvoidingView>

                {showSheet ? (
                    <Modal
                        visible
                        transparent
                        animationType="none"
                        statusBarTranslucent
                        onRequestClose={closeSheet}
                    >
                    <View style={styles.sheetOverlay}>
                        <Animated.View
                            entering={FadeIn.duration(180)}
                            exiting={FadeOut.duration(150)}
                            style={styles.sheetBackdrop}
                        >
                            <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                        </Animated.View>

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.sheetKeyboard}
                            pointerEvents="box-none"
                        >
                            <View style={styles.sheetAnchor} pointerEvents="box-none">
                                <Animated.View
                                    entering={SlideInDown.duration(300).springify().damping(24).stiffness(240).mass(0.9)}
                                    exiting={SlideOutDown.duration(180)}
                                    style={[
                                        styles.sheet,
                                        { backgroundColor: colors.card },
                                        sheetHeightStyle,
                                    ]}
                                >
                                <View {...sheetPanResponder.panHandlers}>
                                    <View style={[styles.grabber, { backgroundColor: colors.border }]} />
                                    <ThemedText style={[styles.sheetTitle, { color: colors.text }]}>
                                        Add To
                                    </ThemedText>
                                </View>

                                <View style={[styles.searchBox, { backgroundColor: colors.surface }]}>
                                    <Search size={16} color={colors.icon} />
                                    <TextInput
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                        onFocus={() => {
                                            if (sheetHeight.value > collapsedSheetHeight + 2) {
                                                sheetHeight.value = withSpring(
                                                    collapsedSheetHeight,
                                                    SHEET_SPRING
                                                );
                                            }
                                        }}
                                        placeholder="Search or create a note…"
                                        placeholderTextColor={colors.textTertiary}
                                        style={[styles.searchInput, { color: colors.text }]}
                                        autoCapitalize="words"
                                        autoCorrect={false}
                                        returnKeyType="done"
                                        onSubmitEditing={() => {
                                            if (!query) {
                                                closeSheet();
                                            } else if (showCreate) {
                                                chooseNote(query);
                                            } else if (exactUsedNote) {
                                                chooseNote(exactUsedNote);
                                            } else if (exactStarterNote) {
                                                chooseNote(exactStarterNote);
                                            } else if (
                                                showCurrentRow &&
                                                category.toLowerCase() === normalizedQuery
                                            ) {
                                                chooseNote(category);
                                            } else if (filteredUsed.length > 0) {
                                                chooseNote(filteredUsed[0]);
                                            } else if (filteredStarters.length > 0) {
                                                chooseNote(filteredStarters[0]);
                                            } else if (showCurrentRow) {
                                                chooseNote(category);
                                            }
                                        }}
                                    />
                                    {searchQuery.length > 0 ? (
                                        <ScalePressable
                                            onPress={() => setSearchQuery('')}
                                            haptic={false}
                                            hitSlop={10}
                                            style={styles.clearSearch}
                                            innerStyle={{ borderRadius: 12 }}
                                        >
                                            <X size={15} color={colors.icon} />
                                        </ScalePressable>
                                    ) : null}
                                </View>

                                <ScrollView
                                    ref={sheetScrollRef}
                                    style={styles.sheetList}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={[
                                        styles.sheetScroll,
                                        scrollBottomPadding > 0
                                            ? { paddingBottom: scrollBottomPadding }
                                            : null,
                                    ]}
                                >
                                    {showCreate ? (
                                        <NoteRow
                                            label={`Create "${query}"`}
                                            accessibilityLabel={`Create note "${query}"`}
                                            onPress={() => chooseNote(query)}
                                            icon={<PlusCircle size={18} color={colors.tint} weight="fill" />}
                                        />
                                    ) : null}

                                    {showCurrentRow ? (
                                        <>
                                            <ThemedText style={[styles.sectionLabel, { color: colors.secondary }]}>
                                                Current Note
                                            </ThemedText>
                                            <NoteRow
                                                label={category}
                                                selected
                                                onPress={() => chooseNote(category)}
                                                icon={<CategoryGlyph label={category} color={colors.tint} />}
                                                trailing={
                                                    <Animated.View entering={ZoomIn.duration(150)}>
                                                        <Check size={18} color={colors.tint} weight="bold" />
                                                    </Animated.View>
                                                }
                                            />
                                        </>
                                    ) : null}

                                    {filteredUsed.length > 0 ? (
                                        <ThemedText style={[styles.sectionLabel, { color: colors.secondary }]}>
                                            Your Notes
                                        </ThemedText>
                                    ) : null}

                                    {filteredUsed.map(label => (
                                        <NoteRow
                                            key={label}
                                            label={label}
                                            snippet={noteSnippets[label]}
                                            selected={category === label}
                                            onPress={() => chooseNote(label)}
                                            icon={<CategoryGlyph label={label} color={colors.tint} />}
                                            trailing={
                                                category === label ? (
                                                    <Animated.View entering={ZoomIn.duration(150)}>
                                                        <Check size={18} color={colors.tint} weight="bold" />
                                                    </Animated.View>
                                                ) : null
                                            }
                                        />
                                    ))}

                                    {filteredStarters.length > 0 ? (
                                        <ThemedText style={[styles.sectionLabel, { color: colors.secondary }]}>
                                            Start a New Note
                                        </ThemedText>
                                    ) : null}

                                    {filteredStarters.map(label => (
                                        <NoteRow
                                            key={label}
                                            label={label}
                                            selected={category === label}
                                            onPress={() => chooseNote(label)}
                                            icon={<CategoryGlyph label={label} color={colors.tint} />}
                                            trailing={
                                                category === label ? (
                                                    <Animated.View entering={ZoomIn.duration(150)}>
                                                        <Check size={18} color={colors.tint} weight="bold" />
                                                    </Animated.View>
                                                ) : (
                                                    <Add size={18} color={colors.secondary} weight="fill" />
                                                )
                                            }
                                        />
                                    ))}

                                    {!showCreate &&
                                    !showCurrentRow &&
                                    filteredUsed.length === 0 &&
                                    filteredStarters.length === 0 ? (
                                        <ThemedText style={[styles.sheetEmpty, { color: colors.secondary }]}>
                                            No notes found.
                                        </ThemedText>
                                    ) : null}
                                </ScrollView>
                                </Animated.View>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                    </Modal>
                ) : null}

                <DeleteModal
                    visible={showDiscard}
                    title="Discard note?"
                    description="You've written something. Close without adding it?"
                    onCancel={() => {
                        setShowDiscard(false);
                        setTimeout(() => inputRef.current?.focus(), 220);
                    }}
                    onDelete={confirmDiscard}
                    actionLabel="Discard"
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    personRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 20,
    },
    personInfo: {
        flex: 1,
        marginLeft: 12,
    },
    personName: {
        fontSize: 23,
        letterSpacing: -0.4,
        fontFamily: Typography.fontFamily.serif,
    },
    personLabel: {
        fontSize: 13,
        letterSpacing: 0.2,
        fontFamily: Typography.fontFamily.semibold,
        marginTop: 2,
        opacity: 0.7,
    },
    keyboardArea: {
        flex: 1,
    },
    composerArea: {
        flex: 1,
        paddingHorizontal: 24,
    },
    composer: {
        flex: 1,
        padding: 0,
        paddingTop: 2,
        fontSize: 18,
        lineHeight: 27,
        fontFamily: Typography.fontFamily.regular,
    },
    bottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    destPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 23,
        paddingLeft: 16,
        paddingRight: 12,
        maxWidth: '72%',
        flexShrink: 1,
        marginRight: 12,
    },
    destPillContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 6,
    },
    destPillText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
        marginLeft: 8,
        flexShrink: 1,
    },
    saveButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetOverlay: {
        flex: 1,
    },
    sheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.48)',
    },
    sheetKeyboard: {
        flex: 1,
    },
    // Full-height anchor so the sheet's bottom stays pinned while its height
    // animates. The negative bottom lets it extend past the modal's bottom
    // edge, covering the system inset like the app's other bottom sheets.
    sheetAnchor: {
        flex: 1,
    },
    sheet: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: -SHEET_BOTTOM_OVERHANG,
        minHeight: 320,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 10,
        paddingHorizontal: 18,
    },
    sheetList: {
        flex: 1,
    },
    grabber: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 14,
        opacity: 0.7,
    },
    sheetTitle: {
        fontSize: 21,
        letterSpacing: -0.3,
        fontFamily: Typography.fontFamily.bold,
        marginBottom: 14,
        marginLeft: 4,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 14,
        paddingHorizontal: 13,
        marginBottom: 6,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontFamily: Typography.fontFamily.medium,
        paddingVertical: 0,
        marginLeft: 8,
    },
    clearSearch: {
        width: 26,
        height: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetScroll: {
        paddingTop: 2,
    },
    sectionLabel: {
        fontSize: 13,
        letterSpacing: 0.2,
        fontFamily: Typography.fontFamily.bold,
        opacity: 0.6,
        marginTop: 16,
        marginBottom: 6,
        marginLeft: 6,
    },
    noteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 54,
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 2,
    },
    noteRowIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 11,
    },
    noteRowInfo: {
        flex: 1,
        marginRight: 10,
    },
    noteRowLabel: {
        fontSize: 15.5,
        fontFamily: Typography.fontFamily.semibold,
    },
    noteRowSnippet: {
        fontSize: 11.5,
        lineHeight: 16,
        fontFamily: Typography.fontFamily.regular,
        marginTop: 2,
        opacity: 0.75,
    },
    sheetEmpty: {
        paddingVertical: 28,
        textAlign: 'center',
        fontSize: 13,
        opacity: 0.7,
    },
});
