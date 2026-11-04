import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated as RNAnimated,
    Dimensions,
    FlatList,
    Keyboard,
    Modal,
    Platform,
    StyleSheet,
    View,
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { KeyboardAvoidingView, useKeyboardState } from 'react-native-keyboard-controller';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
    Easing,
    Extrapolation,
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    LinearTransition,
    cancelAnimation,
    interpolate,
    runOnJS,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { ScalePressable } from '../ui/ScalePressable';
import { SearchBar } from '../ui/SearchBar';
import { Button } from '../ui/Button';
import { ScreenHeader } from '../ui/ScreenHeader';
import { CaretLeft, Check, Plus, Trash, Users, X } from '../ui/Icon';
import { Person } from '../../db/repositories/PersonRepository';
import { Group } from '../../db/repositories/GroupRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { getGroupIcon } from '../../constants/GroupIcons';

interface ManageGroupMembersModalProps {
    visible: boolean;
    onClose: () => void;
    group: Group | null;
    members: Person[];
    allPeople: Person[];
    onAddMembers: (ids: number[]) => void | Promise<void>;
    onRemoveMembers: (ids: number[]) => void | Promise<void>;
    colors: any;
    theme: string;
    hapticsEnabled: boolean;
    initialAddingMode?: boolean;
}

interface UndoEntry {
    key: number;
    message: string;
    onUndo: () => void;
}

/* ------------------------------------------------------------------ */
/* Motion — the app's Material 3 Expressive tokens, timing only.        */
/* Springs overshoot; the design system curves do not.                 */
/* ------------------------------------------------------------------ */

const CURVES = DesignSystem.animation.easing.emphasized;
const EASE_ENTER = Easing.bezier(
    CURVES.decelerate[0],
    CURVES.decelerate[1],
    CURVES.decelerate[2],
    CURVES.decelerate[3]
);
const EASE_EXIT = Easing.bezier(
    CURVES.accelerate[0],
    CURVES.accelerate[1],
    CURVES.accelerate[2],
    CURVES.accelerate[3]
);
const EASE_MOVE = Easing.bezier(
    CURVES.default[0],
    CURVES.default[1],
    CURVES.default[2],
    CURVES.default[3]
);

const ENTER_MS = 420;
const EXIT_MS = 260;

const SCREEN_WIDTH = Dimensions.get('screen').width;
const REMOVE_ACTION_WIDTH = 74;

/** Staggered entrance offset, capped so late rows never feel slow. */
const stagger = (index: number, base = 0) => base + Math.min(index, 10) * 26;

function withAlpha(color: string | null | undefined, alpha: number): string {
    const value = color || '#B45309';
    const safeAlpha = Math.max(0, Math.min(1, alpha));
    const six = /^#([0-9a-f]{6})$/i.exec(value);
    if (six) {
        return `${value}${Math.round(safeAlpha * 255).toString(16).padStart(2, '0')}`;
    }
    const three = /^#([0-9a-f]{3})$/i.exec(value);
    if (three) {
        const [r, g, b] = three[1].split('');
        const suffix = Math.round(safeAlpha * 255).toString(16).padStart(2, '0');
        return `#${r}${r}${g}${g}${b}${b}${suffix}`;
    }
    return value;
}

function firstName(name: string): string {
    return name.trim().split(/\s+/)[0] || name;
}

/* ------------------------------------------------------------------ */
/* Member row                                                          */
/* ------------------------------------------------------------------ */

interface MemberRowProps {
    person: Person;
    index: number;
    colors: any;
    onRemove: (person: Person, index: number) => void;
    onSwipeOpen: (row: Swipeable | null) => void;
    onSwipeClose: (row: Swipeable | null) => void;
}

const MemberRow = memo(function MemberRow({
    person,
    index,
    colors,
    onRemove,
    onSwipeOpen,
    onSwipeClose,
}: MemberRowProps) {
    const swipeRef = useRef<Swipeable>(null);

    const renderRightActions = (progress: RNAnimated.AnimatedInterpolation<number>) => {
        const scale = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.6, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={styles.removeActionSlot}>
                <RNAnimated.View style={{ opacity: progress, transform: [{ scale }] }}>
                    <ScalePressable
                        onPress={() => onRemove(person, index)}
                        style={[styles.removeAction, { backgroundColor: colors.error }]}
                        innerStyle={{ borderRadius: 23 }}
                        scaleTo={0.9}
                        haptic={false}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${person.name} from group`}
                    >
                        <Trash size={19} color="#FFFFFF" weight="fill" />
                    </ScalePressable>
                </RNAnimated.View>
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeRef}
            friction={2}
            rightThreshold={36}
            overshootRight={false}
            renderRightActions={renderRightActions}
            onSwipeableWillOpen={() => onSwipeOpen(swipeRef.current)}
            onSwipeableClose={() => onSwipeClose(swipeRef.current)}
            containerStyle={styles.swipeContainer}
        >
            <View
                accessible
                accessibilityLabel={
                    person.elevatorPitch
                        ? `${person.name}, ${person.elevatorPitch}`
                        : `${person.name}, member`
                }
                accessibilityActions={[{ name: 'remove', label: 'Remove from group' }]}
                onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'remove') {
                        onRemove(person, index);
                    }
                }}
                style={[styles.memberRow, { backgroundColor: colors.background }]}
            >
                <Avatar name={person.name} uri={person.avatarUri} size={46} />
                <View style={styles.memberInfo}>
                    <ThemedText numberOfLines={1} style={[styles.memberName, { color: colors.text }]}>
                        {person.name}
                    </ThemedText>
                    {person.elevatorPitch ? (
                        <ThemedText
                            numberOfLines={1}
                            style={[styles.memberPitch, { color: colors.textSecondary }]}
                        >
                            {person.elevatorPitch}
                        </ThemedText>
                    ) : null}
                </View>
            </View>
        </Swipeable>
    );
});

/* ------------------------------------------------------------------ */
/* Modal                                                               */
/* ------------------------------------------------------------------ */

export const ManageGroupMembersModal = ({
    visible,
    onClose,
    group,
    members,
    allPeople,
    onAddMembers,
    onRemoveMembers,
    colors,
    theme,
    hapticsEnabled,
    initialAddingMode = false,
}: ManageGroupMembersModalProps) => {
    const insets = useSafeAreaInsets();
    const keyboardVisible = useKeyboardState((state) => state.isVisible);

    const [mounted, setMounted] = useState(visible);
    const [pageGroup, setPageGroup] = useState<Group | null>(group);
    const [roster, setRoster] = useState<Person[]>(members);
    const [undo, setUndo] = useState<UndoEntry | null>(null);
    const [hasSwiped, setHasSwiped] = useState(false);

    const [adding, setAdding] = useState(false);
    const [addSession, setAddSession] = useState(0);
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState<Set<number>>(new Set());

    const listRef = useRef<FlatList>(null);
    const openRowRef = useRef<Swipeable | null>(null);
    const mountedRef = useRef(visible);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoAddTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scrollY = useSharedValue(0);
    const pageOpacity = useSharedValue(0);
    const translateY = useSharedValue(56);

    // Add page slides in over the group; the group itself eases back and dims
    // so the two read as one surface changing layers, not two screens.
    const addX = useSharedValue(SCREEN_WIDTH);
    const rosterX = useSharedValue(0);
    const dim = useSharedValue(0);

    const groupColor = pageGroup?.color || colors.tint;
    const GroupIcon = useMemo(() => getGroupIcon(pageGroup?.icon), [pageGroup?.icon]);

    /* -------------------------------------------------------------- */
    /* Haptics                                                        */
    /* -------------------------------------------------------------- */

    const haptic = useCallback(
        (style: Haptics.ImpactFeedbackStyle, notification = false) => {
            if (!hapticsEnabled || Platform.OS === 'web') return;
            if (notification) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            } else {
                Haptics.impactAsync(style).catch(() => {});
            }
        },
        [hapticsEnabled]
    );

    /* -------------------------------------------------------------- */
    /* Undo bar                                                       */
    /* -------------------------------------------------------------- */

    const showUndo = useCallback((message: string, onUndo: () => void) => {
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndo({ key: Date.now(), message, onUndo });
        undoTimer.current = setTimeout(() => setUndo(null), 4200);
    }, []);

    const handleUndo = useCallback(() => {
        if (!undo) return;
        if (undoTimer.current) clearTimeout(undoTimer.current);
        const action = undo.onUndo;
        setUndo(null);
        haptic(Haptics.ImpactFeedbackStyle.Light);
        action();
    }, [undo, haptic]);

    const clearUndo = useCallback(() => {
        if (undoTimer.current) clearTimeout(undoTimer.current);
        setUndo(null);
    }, []);

    /* -------------------------------------------------------------- */
    /* Roster mutations                                               */
    /* -------------------------------------------------------------- */

    const handleRemoveMember = useCallback(
        (person: Person, index: number) => {
            if (openRowRef.current) {
                openRowRef.current.close();
                openRowRef.current = null;
            }
            setRoster((prev) => prev.filter((p) => p.id !== person.id));
            void onRemoveMembers([person.id]);
            haptic(Haptics.ImpactFeedbackStyle.Medium);
            showUndo(`${firstName(person.name)} removed`, () => {
                setRoster((prev) => {
                    if (prev.some((p) => p.id === person.id)) return prev;
                    const next = [...prev];
                    next.splice(Math.min(index, next.length), 0, person);
                    return next;
                });
                void onAddMembers([person.id]);
            });
        },
        [onAddMembers, onRemoveMembers, haptic, showUndo]
    );

    const handleSwipeOpen = useCallback((row: Swipeable | null) => {
        if (!row) return;
        if (openRowRef.current && openRowRef.current !== row) {
            openRowRef.current.close();
        }
        openRowRef.current = row;
        setHasSwiped(true);
    }, []);

    const handleSwipeClose = useCallback((row: Swipeable | null) => {
        if (openRowRef.current === row) openRowRef.current = null;
    }, []);

    /* -------------------------------------------------------------- */
    /* Add layer                                                      */
    /* -------------------------------------------------------------- */

    const openAdd = useCallback(() => {
        if (!pageGroup) return;

        clearUndo();
        setQuery('');
        setDraft(new Set());
        setAddSession((session) => session + 1);
        setAdding(true);

        addX.value = withTiming(0, { duration: ENTER_MS, easing: EASE_ENTER });
        rosterX.value = withTiming(-SCREEN_WIDTH * 0.16, {
            duration: ENTER_MS,
            easing: EASE_ENTER,
        });
        dim.value = withTiming(1, { duration: ENTER_MS, easing: EASE_MOVE });

        haptic(Haptics.ImpactFeedbackStyle.Light);
    }, [pageGroup, clearUndo, haptic, addX, rosterX, dim]);

    const openAddRef = useRef(openAdd);
    useEffect(() => {
        openAddRef.current = openAdd;
    }, [openAdd]);

    const closeAdd = useCallback(() => {
        Keyboard.dismiss();
        setAdding(false);

        addX.value = withTiming(SCREEN_WIDTH, { duration: EXIT_MS, easing: EASE_EXIT });
        rosterX.value = withTiming(0, { duration: ENTER_MS, easing: EASE_MOVE });
        dim.value = withTiming(0, { duration: EXIT_MS, easing: EASE_EXIT });
    }, [addX, rosterX, dim]);

    /* -------------------------------------------------------------- */
    /* Derived data                                                   */
    /* -------------------------------------------------------------- */

    const memberIds = useMemo(() => new Set(roster.map((p) => p.id)), [roster]);

    const candidates = useMemo(
        () => allPeople.filter((p) => !memberIds.has(p.id)),
        [allPeople, memberIds]
    );

    const filteredCandidates = useMemo(() => {
        const needle = query.trim().toLowerCase();
        if (!needle) return candidates;
        return candidates.filter((p) => {
            const name = p.name.toLowerCase();
            const pitch = (p.elevatorPitch || '').toLowerCase();
            return name.includes(needle) || pitch.includes(needle);
        });
    }, [candidates, query]);

    const faces = roster.slice(0, 4);
    const extraFaces = Math.max(0, roster.length - faces.length);
    const draftCount = draft.size;

    const sinceLabel = useMemo(() => {
        if (!pageGroup?.createdAt) return null;
        const created = new Date(pageGroup.createdAt);
        if (Number.isNaN(created.getTime())) return null;
        return `Since ${created.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`;
    }, [pageGroup?.createdAt]);

    const countLabel =
        roster.length === 0
            ? 'No one yet'
            : roster.length === 1
              ? '1 person'
              : `${roster.length} people`;

    const confirmAdd = useCallback(() => {
        if (!pageGroup) return;

        const peopleToAdd = allPeople.filter((p) => draft.has(p.id));
        if (peopleToAdd.length === 0) return;

        const ids = peopleToAdd.map((p) => p.id);
        const idSet = new Set(ids);

        setRoster((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            return [...prev, ...peopleToAdd.filter((p) => !existing.has(p.id))];
        });
        void onAddMembers(ids);

        haptic(Haptics.ImpactFeedbackStyle.Medium, true);
        closeAdd();
        showUndo(
            ids.length === 1
                ? `${firstName(peopleToAdd[0].name)} added`
                : `${ids.length} people added`,
            () => {
                setRoster((prev) => prev.filter((p) => !idSet.has(p.id)));
                void onRemoveMembers(ids);
            }
        );
    }, [
        pageGroup,
        allPeople,
        draft,
        onAddMembers,
        onRemoveMembers,
        closeAdd,
        haptic,
        showUndo,
    ]);

    const toggleDraft = useCallback((person: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => {});
        }
        setDraft((prev) => {
            const next = new Set(prev);
            if (next.has(person.id)) next.delete(person.id);
            else next.add(person.id);
            return next;
        });
    }, [hapticsEnabled]);

    /* -------------------------------------------------------------- */
    /* Lifecycle                                                      */
    /* -------------------------------------------------------------- */

    useEffect(() => {
        mountedRef.current = mounted;
    }, [mounted]);

    // Hydrate a fresh snapshot of the group every time the page opens. The
    // parent clears its member array the moment the modal closes, so rendering
    // straight from props would empty the page mid-exit.
    useEffect(() => {
        if (!visible) return;

        if (group) setPageGroup(group);
        setRoster(members);
        setHasSwiped(false);
        setAdding(false);
        addX.value = SCREEN_WIDTH;
        rosterX.value = 0;
        dim.value = 0;
        scrollY.value = 0;
        setQuery('');
        setDraft(new Set());
        clearUndo();
        openRowRef.current = null;

        const scrollTimer = setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: false });
        }, 32);

        if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
        if (initialAddingMode) {
            autoAddTimer.current = setTimeout(() => openAddRef.current(), 460);
        }

        return () => {
            clearTimeout(scrollTimer);
            if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
        };
        // members is intentionally snapshotted only when the page opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible, group?.id, initialAddingMode]);

    useEffect(() => {
        if (visible) {
            mountedRef.current = true;
            setMounted(true);

            // Material 3 Expressive entrance: a short rise, not a full-screen
            // throw. Opacity lands first so the page settles, then the shift
            // finishes — long, decelerating, no overshoot.
            pageOpacity.value = 0;
            translateY.value = 56;
            pageOpacity.value = withTiming(1, { duration: 300, easing: EASE_ENTER });
            translateY.value = withTiming(0, { duration: 520, easing: EASE_ENTER });

            return () => {
                cancelAnimation(pageOpacity);
                cancelAnimation(translateY);
            };
        }

        if (!mountedRef.current) return;

        Keyboard.dismiss();
        setAdding(false);
        addX.value = SCREEN_WIDTH;
        rosterX.value = 0;
        dim.value = 0;
        clearUndo();

        pageOpacity.value = withTiming(0, { duration: 200, easing: EASE_EXIT });
        translateY.value = withTiming(
            24,
            { duration: 280, easing: EASE_EXIT },
            (finished) => {
                if (finished) runOnJS(setMounted)(false);
            }
        );

        return () => {
            cancelAnimation(pageOpacity);
            cancelAnimation(translateY);
        };
    }, [visible, clearUndo, addX, rosterX, dim, translateY, pageOpacity]);

    useEffect(() => {
        return () => {
            if (undoTimer.current) clearTimeout(undoTimer.current);
            if (autoAddTimer.current) clearTimeout(autoAddTimer.current);
        };
    }, []);

    /* -------------------------------------------------------------- */
    /* Scroll / header                                                */
    /* -------------------------------------------------------------- */

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    // Header arrives as the hero scrolls away — no threshold, no pop. The
    // backdrop, the group identity and the action all ride the same scroll.
    const backdropStyle = useAnimatedStyle(() => ({
        opacity: interpolate(scrollY.value, [2, 72], [0, 1], Extrapolation.CLAMP),
    }));

    const identityStyle = useAnimatedStyle(() => {
        const progress = interpolate(scrollY.value, [26, 84], [0, 1], Extrapolation.CLAMP);
        return {
            opacity: progress,
            transform: [{ translateY: interpolate(progress, [0, 1], [9, 0]) }],
        };
    });

    const pageStyle = useAnimatedStyle(() => ({
        opacity: pageOpacity.value,
        transform: [{ translateY: translateY.value }, { translateX: rosterX.value }],
    }));

    const addPageStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: addX.value }],
    }));

    const dimStyle = useAnimatedStyle(() => ({
        opacity: dim.value * 0.32,
    }));

    /* -------------------------------------------------------------- */
    /* Close handling                                                 */
    /* -------------------------------------------------------------- */

    const handleRequestClose = useCallback(() => {
        if (adding) {
            closeAdd();
            return;
        }
        onClose();
    }, [adding, closeAdd, onClose]);

    if (!mounted || !pageGroup) return null;

    /* -------------------------------------------------------------- */
    /* Render                                                         */
    /* -------------------------------------------------------------- */

    return (
        <Modal
            visible={mounted}
            animationType="none"
            transparent
            statusBarTranslucent
            onRequestClose={handleRequestClose}
        >
            <GestureHandlerRootView style={styles.root}>
                <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />

                {/* -------------------- Group page -------------------- */}
                <Animated.View
                    style={[styles.page, { backgroundColor: colors.background }, pageStyle]}
                >
                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            withAlpha(groupColor, theme === 'dark' ? 0.15 : 0.12),
                            withAlpha(groupColor, theme === 'dark' ? 0.04 : 0.03),
                            withAlpha(colors.background, 0),
                        ]}
                        locations={[0, 0.46, 1]}
                        style={styles.ambientWash}
                    />

                    <Animated.FlatList
                        ref={listRef}
                        data={roster}
                        keyExtractor={(person) => String(person.id)}
                        renderItem={({ item, index }) => (
                            <Animated.View
                                entering={FadeInDown.delay(stagger(index, 230))
                                    .duration(340)
                                    .easing(EASE_ENTER)}
                                exiting={FadeOut.duration(140).easing(EASE_EXIT)}
                            >
                                <MemberRow
                                    person={item}
                                    index={index}
                                    colors={colors}
                                    onRemove={handleRemoveMember}
                                    onSwipeOpen={handleSwipeOpen}
                                    onSwipeClose={handleSwipeClose}
                                />
                            </Animated.View>
                        )}
                        itemLayoutAnimation={LinearTransition.duration(260).easing(EASE_MOVE)}
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                        onScrollBeginDrag={() => openRowRef.current?.close()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={[
                            styles.listContent,
                            {
                                paddingTop: insets.top + 74,
                                paddingBottom: insets.bottom + 110,
                            },
                        ]}
                        ListHeaderComponent={
                            <View>
                                <View style={styles.hero}>
                                    <Animated.View
                                        entering={FadeInDown.delay(20)
                                            .duration(440)
                                            .easing(EASE_ENTER)}
                                        style={styles.heroMark}
                                    >
                                        <GroupIcon size={42} color={groupColor} weight="fill" />
                                    </Animated.View>

                                    <Animated.View
                                        entering={FadeInDown.delay(80)
                                            .duration(440)
                                            .easing(EASE_ENTER)}
                                    >
                                        <ThemedText
                                            numberOfLines={2}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.72}
                                            style={[styles.groupName, { color: colors.text }]}
                                        >
                                            {pageGroup.name}
                                        </ThemedText>
                                        <View style={styles.metaRow}>
                                            <ThemedText
                                                style={[
                                                    styles.metaPrimary,
                                                    { color: colors.textSecondary },
                                                ]}
                                            >
                                                {countLabel}
                                            </ThemedText>
                                            {sinceLabel ? (
                                                <>
                                                    <View
                                                        style={[
                                                            styles.metaDot,
                                                            {
                                                                backgroundColor: withAlpha(
                                                                    colors.textTertiary,
                                                                    0.55
                                                                ),
                                                            },
                                                        ]}
                                                    />
                                                    <ThemedText
                                                        style={[
                                                            styles.metaSecondary,
                                                            { color: colors.textTertiary },
                                                        ]}
                                                    >
                                                        {sinceLabel}
                                                    </ThemedText>
                                                </>
                                            ) : null}
                                        </View>
                                    </Animated.View>

                                    <Animated.View
                                        entering={FadeInDown.delay(140)
                                            .duration(440)
                                            .easing(EASE_ENTER)}
                                        style={styles.pileRow}
                                    >
                                        {faces.length > 0 ? (
                                            <View style={styles.facePile}>
                                                {faces.map((person, index) => (
                                                    <View
                                                        key={person.id}
                                                        style={[
                                                            styles.faceRing,
                                                            {
                                                                backgroundColor: colors.background,
                                                                marginLeft: index === 0 ? 0 : -9,
                                                                zIndex: 10 - index,
                                                            },
                                                        ]}
                                                    >
                                                        <Avatar
                                                            name={person.name}
                                                            uri={person.avatarUri}
                                                            size={28}
                                                        />
                                                    </View>
                                                ))}
                                                {extraFaces > 0 ? (
                                                    <View
                                                        style={[
                                                            styles.moreFaces,
                                                            {
                                                                backgroundColor: colors.surface,
                                                                marginLeft: -9,
                                                            },
                                                        ]}
                                                    >
                                                        <ThemedText
                                                            style={[
                                                                styles.moreFacesText,
                                                                { color: colors.textSecondary },
                                                            ]}
                                                        >
                                                            +{extraFaces}
                                                        </ThemedText>
                                                    </View>
                                                ) : null}
                                            </View>
                                        ) : (
                                            <ThemedText
                                                style={[
                                                    styles.noFaces,
                                                    { color: colors.textTertiary },
                                                ]}
                                            >
                                                No one yet
                                            </ThemedText>
                                        )}

                                        <View style={{ flex: 1 }} />

                                        <ScalePressable
                                            onPress={openAdd}
                                            style={[
                                                styles.addPeoplePill,
                                                { backgroundColor: colors.tint },
                                            ]}
                                            innerStyle={{ borderRadius: 21 }}
                                            scaleTo={0.95}
                                            overlayColor="rgba(255,255,255,0.12)"
                                            haptic={false}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Add people to ${pageGroup.name}`}
                                        >
                                            <Plus
                                                size={16}
                                                color={colors.tintContrast}
                                                weight="fill"
                                            />
                                            <ThemedText
                                                style={[
                                                    styles.addPeopleText,
                                                    { color: colors.tintContrast },
                                                ]}
                                            >
                                                Add people
                                            </ThemedText>
                                        </ScalePressable>
                                    </Animated.View>
                                </View>

                                <Animated.View
                                    entering={FadeInDown.delay(190)
                                        .duration(360)
                                        .easing(EASE_ENTER)}
                                    style={styles.sectionRow}
                                >
                                    <ThemedText
                                        style={[
                                            styles.sectionTitle,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        Members
                                    </ThemedText>
                                    <ThemedText
                                        style={[styles.sectionCount, { color: colors.textTertiary }]}
                                    >
                                        {roster.length}
                                    </ThemedText>
                                    <View style={{ flex: 1 }} />
                                    {roster.length > 0 && !hasSwiped ? (
                                        <Animated.View
                                            entering={FadeIn.delay(900).duration(280)}
                                            exiting={FadeOut.duration(140)}
                                        >
                                            <ThemedText
                                                style={[
                                                    styles.swipeHint,
                                                    { color: colors.textTertiary },
                                                ]}
                                            >
                                                Swipe left to remove
                                            </ThemedText>
                                        </Animated.View>
                                    ) : null}
                                </Animated.View>
                            </View>
                        }
                        ListEmptyComponent={
                            <Animated.View
                                entering={FadeInDown.delay(180)
                                    .duration(420)
                                    .easing(EASE_ENTER)}
                                style={styles.emptyMembers}
                            >
                                <GroupIcon size={34} color={groupColor} weight="fill" />
                                <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                                    {pageGroup.name} is waiting for its people.
                                </ThemedText>
                                <ThemedText
                                    style={[styles.emptyBody, { color: colors.textSecondary }]}
                                >
                                    Add the first person and this group starts to feel like one.
                                </ThemedText>
                            </Animated.View>
                        }
                    />

                    {/* -------------------- Top bar -------------------- */}
                    <View pointerEvents="box-none" style={styles.topBarWrapper}>
                        <Animated.View
                            pointerEvents="none"
                            style={[StyleSheet.absoluteFill, styles.topBarBackdrop, backdropStyle]}
                        >
                            <BlurView
                                intensity={theme === 'dark' ? 60 : 40}
                                tint={theme === 'dark' ? 'dark' : 'default'}
                                style={StyleSheet.absoluteFill}
                            />
                            <View
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor:
                                            theme === 'dark'
                                                ? `${colors.background}D9`
                                                : `${colors.background}E6`,
                                    },
                                ]}
                            />
                        </Animated.View>

                        <View style={[styles.topBarContent, { paddingTop: insets.top + 8 }]}>
                            <ScalePressable
                                style={styles.headerButton}
                                onPress={handleRequestClose}
                                innerStyle={{ borderRadius: 21 }}
                                scaleTo={0.88}
                                overlayColor="transparent"
                                hitSlop={{ top: 24, bottom: 24, left: 20, right: 20 }}
                                accessibilityRole="button"
                                accessibilityLabel="Close group"
                            >
                                <CaretLeft size={26} color={colors.text} />
                            </ScalePressable>

                            <View style={{ flex: 1 }} />

                            <ScalePressable
                                style={styles.headerButton}
                                onPress={openAdd}
                                innerStyle={{ borderRadius: 21 }}
                                scaleTo={0.88}
                                overlayColor={withAlpha(colors.tint, 0.08)}
                                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                                accessibilityRole="button"
                                accessibilityLabel={`Add people to ${pageGroup.name}`}
                            >
                                <Plus size={24} color={colors.text} weight="fill" />
                            </ScalePressable>
                        </View>

                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.identity,
                                { top: insets.top + 8, height: 42 },
                                identityStyle,
                            ]}
                        >
                            <GroupIcon size={15} color={groupColor} weight="fill" />
                            <ThemedText
                                numberOfLines={1}
                                style={[styles.identityName, { color: colors.text }]}
                            >
                                {pageGroup.name}
                            </ThemedText>
                        </Animated.View>
                    </View>

                    {/* -------------------- Undo -------------------- */}
                    {undo ? (
                        <Animated.View
                            key={undo.key}
                            entering={FadeInUp.duration(260).easing(EASE_ENTER)}
                            exiting={FadeOut.duration(140).easing(EASE_EXIT)}
                            style={[
                                styles.undoBar,
                                {
                                    backgroundColor: theme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                                    bottom: insets.bottom + 16,
                                    ...DesignSystem.shadows.md,
                                },
                            ]}
                        >
                            <ThemedText
                                numberOfLines={1}
                                style={[styles.undoText, { color: colors.text }]}
                            >
                                {undo.message}
                            </ThemedText>
                            <ScalePressable
                                onPress={handleUndo}
                                style={styles.undoAction}
                                innerStyle={{ borderRadius: 16 }}
                                scaleTo={0.92}
                                haptic={false}
                                accessibilityRole="button"
                                accessibilityLabel="Undo"
                            >
                                <ThemedText
                                    style={[styles.undoActionText, { color: colors.tint }]}
                                >
                                    Undo
                                </ThemedText>
                            </ScalePressable>
                        </Animated.View>
                    ) : null}

                    {/* Dims the group while the add layer is on top of it. */}
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, styles.dim, dimStyle]}
                    />
                </Animated.View>

                {/* -------------------- Add people page -------------------- */}
                <Animated.View
                    pointerEvents={adding ? 'auto' : 'none'}
                    accessibilityElementsHidden={!adding}
                    importantForAccessibility={adding ? 'auto' : 'no-hide-descendants'}
                    style={[
                        styles.addPage,
                        { backgroundColor: colors.background },
                        addPageStyle,
                    ]}
                >
                    <LinearGradient
                        pointerEvents="none"
                        colors={[
                            withAlpha(groupColor, theme === 'dark' ? 0.13 : 0.1),
                            withAlpha(colors.background, 0),
                        ]}
                        style={styles.addWash}
                    />

                    <KeyboardAvoidingView behavior="padding" style={styles.addBody}>
                        <ScreenHeader
                            onBack={closeAdd}
                            bottomPadding={6}
                            backButtonIcon={<X size={22} color={colors.text} />}
                            backButtonStyle={{ backgroundColor: 'transparent' }}
                            centerContent={
                                <ThemedText
                                    numberOfLines={1}
                                    style={[styles.addTitle, { color: colors.text }]}
                                >
                                    Add people
                                </ThemedText>
                            }
                        />

                        <View style={styles.addSearchRow}>
                            <SearchBar
                                value={query}
                                onChangeText={setQuery}
                                placeholder="Search people"
                                backgroundColor={colors.surface}
                                style={styles.addSearch}
                            />
                        </View>

                        <FlatList
                            key={`add-${addSession}`}
                            data={filteredCandidates}
                            extraData={draft}
                            keyExtractor={(person) => String(person.id)}
                            style={styles.addList}
                            contentContainerStyle={[
                                styles.addListContent,
                                filteredCandidates.length === 0 && styles.addListEmpty,
                            ]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                            renderItem={({ item, index }) => {
                                const selected = draft.has(item.id);
                                return (
                                    <Animated.View
                                        entering={FadeInDown.delay(stagger(index, 40))
                                            .duration(300)
                                            .easing(EASE_ENTER)}
                                    >
                                        <ScalePressable
                                            onPress={() => toggleDraft(item)}
                                            style={[
                                                styles.candidateRow,
                                                selected && {
                                                    backgroundColor: withAlpha(
                                                        colors.tint,
                                                        theme === 'dark' ? 0.16 : 0.08
                                                    ),
                                                },
                                            ]}
                                            innerStyle={{ borderRadius: 18 }}
                                            scaleTo={0.985}
                                            overlayColor={withAlpha(colors.tint, 0.07)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${item.name}${
                                                selected ? ', selected' : ''
                                            }`}
                                        >
                                            <Avatar
                                                name={item.name}
                                                uri={item.avatarUri}
                                                size={44}
                                            />
                                            <View style={styles.candidateInfo}>
                                                <ThemedText
                                                    numberOfLines={1}
                                                    style={[
                                                        styles.candidateName,
                                                        { color: colors.text },
                                                    ]}
                                                >
                                                    {item.name}
                                                </ThemedText>
                                                {item.elevatorPitch ? (
                                                    <ThemedText
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.candidatePitch,
                                                            { color: colors.textSecondary },
                                                        ]}
                                                    >
                                                        {item.elevatorPitch}
                                                    </ThemedText>
                                                ) : null}
                                            </View>
                                            <View
                                                style={[
                                                    styles.selectCircle,
                                                    {
                                                        backgroundColor: selected
                                                            ? colors.tint
                                                            : colors.surface,
                                                    },
                                                ]}
                                            >
                                                {selected ? (
                                                    <Animated.View
                                                        entering={FadeIn.duration(140)}
                                                    >
                                                        <Check
                                                            size={15}
                                                            color={colors.tintContrast}
                                                            weight="fill"
                                                        />
                                                    </Animated.View>
                                                ) : null}
                                            </View>
                                        </ScalePressable>
                                    </Animated.View>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.addEmpty}>
                                    <Users size={30} color={colors.textTertiary} weight="fill" />
                                    <ThemedText
                                        style={[styles.addEmptyTitle, { color: colors.text }]}
                                    >
                                        {query.trim()
                                            ? 'No one matches that search.'
                                            : "Everyone's already here."}
                                    </ThemedText>
                                    <ThemedText
                                        style={[
                                            styles.addEmptyBody,
                                            { color: colors.textSecondary },
                                        ]}
                                    >
                                        {query.trim()
                                            ? 'Try a different name or role.'
                                            : `All of your people are already in ${pageGroup.name}.`}
                                    </ThemedText>
                                </View>
                            }
                        />

                        <View
                            style={[
                                styles.addFooter,
                                {
                                    paddingBottom: keyboardVisible
                                        ? 10
                                        : Math.max(insets.bottom, 12) + 6,
                                },
                            ]}
                        >
                            <Button
                                title={
                                    draftCount === 0
                                        ? 'Select people'
                                        : draftCount === 1
                                          ? 'Add 1 person'
                                          : `Add ${draftCount} people`
                                }
                                onPress={confirmAdd}
                                disabled={draftCount === 0}
                                variant={draftCount === 0 ? 'secondary' : 'primary'}
                                size="lg"
                                style={styles.addCta}
                            />
                        </View>
                    </KeyboardAvoidingView>
                </Animated.View>
            </GestureHandlerRootView>
        </Modal>
    );
};

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    page: {
        flex: 1,
    },
    ambientWash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 430,
    },
    dim: {
        backgroundColor: '#000000',
        opacity: 0,
        zIndex: 50,
    },
    listContent: {
        paddingHorizontal: 20,
    },

    /* Hero ---------------------------------------------------------- */
    hero: {
        paddingTop: 6,
    },
    heroMark: {
        paddingTop: 2,
        paddingBottom: 2,
    },
    groupName: {
        marginTop: 12,
        fontSize: 36,
        lineHeight: 41,
        letterSpacing: -1.2,
        fontFamily: Typography.fontFamily.serif,
        paddingRight: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 5,
    },
    metaPrimary: {
        fontSize: 13,
        lineHeight: 18,
        fontFamily: Typography.fontFamily.semibold,
    },
    metaDot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        marginHorizontal: 8,
    },
    metaSecondary: {
        fontSize: 12,
        lineHeight: 18,
        fontFamily: Typography.fontFamily.medium,
    },
    pileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
    },
    facePile: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    faceRing: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreFaces: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreFacesText: {
        fontSize: 10.5,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: -0.2,
    },
    noFaces: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.semibold,
    },
    addPeoplePill: {
        height: 42,
        borderRadius: 21,
        paddingHorizontal: 17,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    addPeopleText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.1,
    },

    /* Section ------------------------------------------------------- */
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 4,
        height: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: 0.2,
    },
    sectionCount: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
        marginLeft: 8,
    },
    swipeHint: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.medium,
        letterSpacing: 0.1,
    },

    /* Member rows --------------------------------------------------- */
    swipeContainer: {
        marginBottom: 2,
    },
    memberRow: {
        minHeight: 64,
        paddingVertical: 9,
        paddingHorizontal: 2,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    memberName: {
        fontSize: 15.5,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.15,
    },
    memberPitch: {
        fontSize: 12.5,
        lineHeight: 17,
        marginTop: 2,
        fontFamily: Typography.fontFamily.regular,
    },
    removeActionSlot: {
        width: REMOVE_ACTION_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingLeft: 10,
        paddingRight: 2,
    },
    removeAction: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },

    /* Empty roster -------------------------------------------------- */
    emptyMembers: {
        alignItems: 'center',
        paddingTop: 36,
        paddingBottom: 48,
        paddingHorizontal: 16,
    },
    emptyTitle: {
        marginTop: 16,
        fontSize: 22,
        lineHeight: 29,
        letterSpacing: -0.5,
        textAlign: 'center',
        maxWidth: 300,
        fontFamily: Typography.fontFamily.serif,
    },
    emptyBody: {
        marginTop: 8,
        fontSize: 13.5,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 280,
        fontFamily: Typography.fontFamily.regular,
    },

    /* Top bar ------------------------------------------------------- */
    topBarWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 30,
    },
    topBarBackdrop: {
        overflow: 'hidden',
    },
    topBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 14,
    },
    headerButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    identity: {
        position: 'absolute',
        left: 62,
        right: 62,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    identityName: {
        marginLeft: 7,
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.2,
        flexShrink: 1,
    },

    /* Undo ---------------------------------------------------------- */
    undoBar: {
        position: 'absolute',
        left: 16,
        right: 16,
        height: 52,
        borderRadius: 26,
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 18,
        paddingRight: 6,
        zIndex: 40,
    },
    undoText: {
        flex: 1,
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.medium,
        letterSpacing: -0.1,
    },
    undoAction: {
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    undoActionText: {
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.bold,
    },

    /* Add page ------------------------------------------------------ */
    addPage: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    addWash: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 280,
    },
    addBody: {
        flex: 1,
    },
    addTitle: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.serif,
        letterSpacing: -0.3,
        textAlign: 'center',
    },
    addSearchRow: {
        paddingHorizontal: 20,
        paddingTop: 2,
        paddingBottom: 6,
    },
    addSearch: {
        flex: 0,
        height: 46,
        borderRadius: 16,
    },
    addList: {
        flex: 1,
        marginTop: 2,
    },
    addListContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    addListEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    candidateRow: {
        minHeight: 60,
        borderRadius: 18,
        paddingVertical: 8,
        paddingHorizontal: 8,
        marginBottom: 2,
        flexDirection: 'row',
        alignItems: 'center',
    },
    candidateInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    candidateName: {
        fontSize: 15,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.1,
    },
    candidatePitch: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 1,
        fontFamily: Typography.fontFamily.regular,
    },
    selectCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    addEmpty: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    addEmptyTitle: {
        marginTop: 14,
        fontSize: 20,
        lineHeight: 26,
        letterSpacing: -0.4,
        textAlign: 'center',
        fontFamily: Typography.fontFamily.serif,
    },
    addEmptyBody: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 260,
        fontFamily: Typography.fontFamily.regular,
    },
    addFooter: {
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    addCta: {
        borderRadius: 27,
    },
});
