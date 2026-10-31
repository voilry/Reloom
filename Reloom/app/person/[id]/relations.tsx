import React, { useState, useEffect, useMemo } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, Platform, Pressable,
    Animated as RNAnimated, DeviceEventEmitter
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedView } from '../../../components/ui/ThemedView';
import { ThemedText } from '../../../components/ui/ThemedText';
import { PersonRepository, Person } from '../../../db/repositories/PersonRepository';
import { RelationshipRepository, Relationship } from '../../../db/repositories/RelationshipRepository';
import { DesignSystem } from '../../../constants/DesignSystem';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';
import { PersonPickerModal } from '../../../components/person/PersonPickerModal';
import {
    Trash, Plus, AddIcon, Link,
    ArrowsLeftRight, X, Check, UserRemove, Graph, List,
    Heart, Briefcase, Compass, Sparkle, Filter, CaretDown
} from '@/components/ui/Icon';
import { SocialWebCanvas, getRelationColor } from '../../../components/person/SocialWebCanvas';
import { useAppTheme } from '../../../hooks/useAppTheme';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, Layout, Easing } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { ScalePressable } from '../../../components/ui/ScalePressable';
import { StatusBar } from 'expo-status-bar';
import { Typography } from '../../../constants/Typography';

const EASE_ENTER = Easing.bezier(0.05, 0.7, 0.1, 1.0);

// ─── Step tracking ───────────────────────────────────────────────────────────
type Step = 'list' | 'pick' | 'label';

export default function RelationsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    const personId = Number(id);

    const [person, setPerson] = useState<Person | null>(null);
    const [relationships, setRelationships] = useState<Relationship[]>([]);
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [allRelationships, setAllRelationships] = useState<Relationship[]>([]);
    const [viewMode, setViewMode] = useState<'web' | 'list'>('web');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [isListFilterOpen, setIsListFilterOpen] = useState(false);

    // Step control
    const [step, setStep] = useState<Step>('list');
    const [selectedTarget, setSelectedTarget] = useState<Person | null>(null);
    const [relationType, setRelationType] = useState('');

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        const p = await PersonRepository.getById(personId);
        if (!p) return;
        setPerson(p);

        const [rels, people, allRels] = await Promise.all([
            RelationshipRepository.getForPerson(personId),
            PersonRepository.getAll(),
            RelationshipRepository.getAll()
        ]);

        setRelationships(rels);
        setAllPeople(people.filter(x => x.id !== personId));
        setAllRelationships(allRels);
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const categories = useMemo(() => {
        const set = new Set<string>();
        relationships.forEach(r => {
            if (r.relationType) set.add(r.relationType.trim());
        });
        return Array.from(set);
    }, [relationships]);

    const displayedRelationships = useMemo(() => {
        if (selectedCategory === 'all') return relationships;
        return relationships.filter(r => r.relationType?.trim().toLowerCase() === selectedCategory.toLowerCase());
    }, [relationships, selectedCategory]);

    const getOtherPerson = (rel: Relationship): Person | undefined => {
        const otherId = rel.sourcePersonId === personId ? rel.targetPersonId : rel.sourcePersonId;
        return allPeople.find(p => p.id === otherId);
    };

    const alreadyLinkedIds = relationships.map(r =>
        r.sourcePersonId === personId ? r.targetPersonId : r.sourcePersonId
    );
    const availablePeople = allPeople.filter(p => !alreadyLinkedIds.includes(p.id));

    // ─── Actions ─────────────────────────────────────────────────────────────
    const handleSelectTarget = (target: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        setSelectedTarget(target);
        setRelationType('');
        setStep('label');
    };

    const handleConfirmLink = async () => {
        if (!selectedTarget || !person || !relationType.trim()) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await RelationshipRepository.add(person.id, selectedTarget.id, relationType.trim());
        DeviceEventEmitter.emit('showToast', { message: 'Connection linked', type: 'info' });
        resetModal();
        loadData();
    };

    const handleDelete = async (relId: number) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await RelationshipRepository.delete(relId);
        DeviceEventEmitter.emit('showToast', { message: 'Connection unlinked', type: 'info' });
        loadData();
    };

    const resetModal = () => {
        setStep('list');
        setSelectedTarget(null);
        setRelationType('');
    };

    const openPicker = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStep('pick');
    };

    // ─── Swipe-to-delete (matches EntriesTab pattern) ────────────────────────
    const renderRightActions = (relId: number, dragX: RNAnimated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-64, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        return (
            <ScalePressable
                style={[styles.swipeDelete, { backgroundColor: colors.error }]}
                innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                onPress={() => handleDelete(relId)}
                scale={true}
                overlayColor="rgba(0,0,0,0.15)"
            >
                <RNAnimated.View style={{ transform: [{ scale: trans }] }}>
                    <UserRemove size={22} color="#fff" weight="fill" />
                </RNAnimated.View>
            </ScalePressable>
        );
    };

    if (!person) return <ThemedView style={{ flex: 1 }} />;

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="auto" />

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <ScreenHeader
                onBack={() => router.back()}
                style={styles.header}
                bottomPadding={viewMode === 'web' ? 8 : 16}
                alignCenter={false}
                centerContent={
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 0 }}>
                        <ThemedText type="display" style={{ fontSize: 25, lineHeight: 30, color: colors.text }}>
                            Social Web
                        </ThemedText>
                        <ThemedText style={{ fontSize: 10, color: colors.secondary, marginTop: -7, fontFamily: Typography.fontFamily.medium }}>
                            {person.name}'s circle
                        </ThemedText>
                    </View>
                }
                rightContent={
                    <View style={styles.headerRightActions}>
                        {relationships.length > 0 && (
                            <ScalePressable
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                    setViewMode(prev => (prev === 'web' ? 'list' : 'web'));
                                }}
                                style={[styles.viewToggleBtn, { backgroundColor: colors.surface }]}
                                innerStyle={{ borderRadius: 18 }}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                scaleTo={0.92}
                                overlayColor="transparent"
                            >
                                {viewMode === 'web' ? (
                                    <List size={18} color={colors.text} />
                                ) : (
                                    <Graph size={18} color={colors.text} weight="fill" />
                                )}
                            </ScalePressable>
                        )}

                        <ScalePressable
                            onPress={openPicker}
                            style={[styles.linkCapsule, { backgroundColor: colors.tint }]}
                            innerStyle={{ borderRadius: 20 }}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            scaleTo={0.92}
                        >
                            <AddIcon size={15} color={theme === 'light' ? '#fff' : '#000'} weight="fill" />
                            <ThemedText style={[styles.linkCapsuleText, { color: theme === 'light' ? '#fff' : '#000' }]}>Link</ThemedText>
                        </ScalePressable>
                    </View>
                }
            />

            {/* ─── Social Web View, List View, or Empty State ──────────────── */}
            {relationships.length === 0 ? (
                <View style={[styles.emptyContainer, { paddingBottom: insets.bottom + 80 }]}>
                    <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
                        <ArrowsLeftRight size={48} color={colors.tint} weight="fill" />
                        <ThemedText style={{ marginTop: 16, opacity: 0.9, fontSize: 18, fontFamily: Typography.fontFamily.bold }}>
                            No Connections
                        </ThemedText>
                        <ThemedText style={{ fontSize: 11, color: colors.secondary, marginTop: -1, textAlign: 'center', lineHeight: 17, fontWeight: '800' }}>
                            tap link to add
                        </ThemedText>
                    </Animated.View>
                </View>
            ) : viewMode === 'web' ? (
                <SocialWebCanvas
                    centerPerson={person}
                    relationships={relationships}
                    allPeople={allPeople}
                    allRelationships={allRelationships}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    categories={categories}
                    onSelectPerson={(target) => router.push(`/person/${target.id}`)}
                    onDeleteRelationship={handleDelete}
                    onAddLink={openPicker}
                />
            ) : (
                <View style={{ flex: 1 }}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.listContent,
                            displayedRelationships.length === 0 && { flexGrow: 1, justifyContent: 'center', paddingBottom: insets.bottom + 120 },
                            displayedRelationships.length > 0 && { paddingBottom: insets.bottom + 40 }
                        ]}
                        showsVerticalScrollIndicator={false}
                    >
                        {displayedRelationships.length > 0 && (
                            <View style={styles.listHeaderRow}>
                                <View style={styles.listHeaderLeft}>
                                    <ThemedText style={[styles.listHeaderTitle, { color: colors.secondary }]}>
                                        {selectedCategory !== 'all' ? selectedCategory : 'All connections'}
                                    </ThemedText>
                                    <ThemedText style={[styles.listCountInline, { color: colors.tint }]}>
                                        {displayedRelationships.length}
                                    </ThemedText>
                                </View>

                                {categories.length > 1 && (
                                    <ScalePressable
                                        onPress={() => {
                                            if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                            setIsListFilterOpen(prev => !prev);
                                        }}
                                        style={[
                                            styles.filterChipButton,
                                            {
                                                backgroundColor: selectedCategory !== 'all' ? (theme === 'dark' ? colors.tint + '28' : colors.tint + '18') : colors.surface
                                            }
                                        ]}
                                        innerStyle={{ borderRadius: 14 }}
                                        scaleTo={0.93}
                                    >
                                        <Filter size={13} color={selectedCategory !== 'all' ? colors.tint : colors.icon} weight={selectedCategory !== 'all' ? 'fill' : 'regular'} />
                                        <ThemedText style={[styles.filterChipButtonText, { color: selectedCategory !== 'all' ? colors.tint : colors.text }]}>
                                            {selectedCategory !== 'all' ? selectedCategory : 'Filter'}
                                        </ThemedText>
                                        <CaretDown size={12} color={selectedCategory !== 'all' ? colors.tint : colors.icon} />
                                    </ScalePressable>
                                )}
                            </View>
                        )}

                        {displayedRelationships.length === 0 ? (
                            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
                                <ArrowsLeftRight size={48} color={colors.tint} weight="fill" />
                                <ThemedText style={{ marginTop: 16, opacity: 0.9, fontSize: 18, fontFamily: Typography.fontFamily.bold }}>
                                    {selectedCategory !== 'all' ? `No ${selectedCategory} Connections` : 'No Connections'}
                                </ThemedText>
                                <ThemedText style={{ fontSize: 11, color: colors.secondary, marginTop: -1, textAlign: 'center', lineHeight: 17, fontWeight: '800' }}>
                                    tap link to add
                                </ThemedText>
                            </Animated.View>
                        ) : (
                            displayedRelationships.map((rel: Relationship, index: number) => {
                                const other = getOtherPerson(rel);
                                if (!other) return null;
                                const roleColor = getRelationColor(rel.relationType, colors.tint);

                                return (
                                    <Animated.View
                                        key={rel.id}
                                        layout={Layout.springify()}
                                        style={{ marginBottom: 4 }}
                                    >
                                        <Animated.View
                                            entering={FadeInDown.delay(index * 25).duration(260)}
                                        >
                                            <Swipeable
                                                renderRightActions={(_prog, dragX) => renderRightActions(rel.id, dragX)}
                                                overshootRight={false}
                                                friction={3}
                                                overshootFriction={8}
                                                rightThreshold={60}
                                            >
                                                <ScalePressable
                                                    onPress={() => router.push(`/person/${other.id}`)}
                                                    style={styles.connectionRow}
                                                    innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                                                    scaleTo={0.98}
                                                >
                                                    <Avatar name={other.name} uri={other.avatarUri} size={46} />

                                                    <View style={styles.connectionMeta}>
                                                        <View style={styles.connectionTopLine}>
                                                            <ThemedText style={styles.connectionName} numberOfLines={1}>
                                                                {other.name}
                                                            </ThemedText>
                                                            {rel.relationType ? (
                                                                <ThemedText style={[styles.connectionRoleLabel, { color: roleColor }]}>
                                                                    {rel.relationType}
                                                                </ThemedText>
                                                            ) : null}
                                                        </View>

                                                        {other.elevatorPitch ? (
                                                            <ThemedText
                                                                numberOfLines={1}
                                                                style={[styles.connectionPitch, { color: colors.textSecondary }]}
                                                            >
                                                                {other.elevatorPitch}
                                                            </ThemedText>
                                                        ) : null}
                                                    </View>
                                                </ScalePressable>
                                            </Swipeable>
                                        </Animated.View>
                                    </Animated.View>
                                );
                            })
                        )}
                    </ScrollView>

                    {/* Filter Popup Menu */}
                    {isListFilterOpen && categories.length > 1 && (
                        <>
                            <Pressable
                                style={StyleSheet.absoluteFill}
                                onPress={() => setIsListFilterOpen(false)}
                            />
                            <Animated.View
                                entering={FadeIn.duration(150)}
                                style={[
                                    styles.listFilterDropdown,
                                    { backgroundColor: colors.surface }
                                ]}
                            >
                                <ScalePressable
                                    onPress={() => {
                                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                        setSelectedCategory('all');
                                        setIsListFilterOpen(false);
                                    }}
                                    style={[
                                        styles.listFilterItem,
                                        selectedCategory === 'all' && { backgroundColor: colors.tint + '18' }
                                    ]}
                                    innerStyle={{ borderRadius: 8 }}
                                    scaleTo={0.96}
                                >
                                    <View style={styles.listFilterItemLeft}>
                                        <View style={[styles.listFilterDot, { backgroundColor: colors.tint }]} />
                                        <ThemedText style={[
                                            styles.listFilterItemText,
                                            selectedCategory === 'all' && { color: colors.tint, fontFamily: Typography.fontFamily.bold }
                                        ]}>
                                            All
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={[styles.listFilterItemCount, { color: colors.secondary }]}>
                                        {relationships.length}
                                    </ThemedText>
                                </ScalePressable>

                                {categories.map((cat: string) => {
                                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                                    const catColor = getRelationColor(cat, colors.tint);
                                    const count = relationships.filter(r => r.relationType?.trim().toLowerCase() === cat.toLowerCase()).length;
                                    return (
                                        <ScalePressable
                                            key={cat}
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                setSelectedCategory(isSelected ? 'all' : cat);
                                                setIsListFilterOpen(false);
                                            }}
                                            style={[
                                                styles.listFilterItem,
                                                isSelected && { backgroundColor: catColor + '18' }
                                            ]}
                                            innerStyle={{ borderRadius: 8 }}
                                            scaleTo={0.96}
                                        >
                                            <View style={styles.listFilterItemLeft}>
                                                <View style={[styles.listFilterDot, { backgroundColor: catColor }]} />
                                                <ThemedText style={[
                                                    styles.listFilterItemText,
                                                    isSelected && { color: catColor, fontFamily: Typography.fontFamily.bold }
                                                ]}>
                                                    {cat}
                                                </ThemedText>
                                            </View>
                                            <ThemedText style={[styles.listFilterItemCount, { color: colors.secondary }]}>
                                                {count}
                                            </ThemedText>
                                        </ScalePressable>
                                    );
                                })}
                            </Animated.View>
                        </>
                    )}
                </View>
            )}

            {/* ─── Person Picker Modal ────────────────────────────────────── */}
            <PersonPickerModal
                visible={step === 'pick'}
                people={availablePeople}
                onSelect={handleSelectTarget}
                onClose={resetModal}
                title="Who are they connected to?"
                titleFontSize={22}
            />

            {/* ─── Label Modal ─────────────────────────────────────────────── */}
            <Modal
                visible={step === 'label' && !!selectedTarget}
                animationType="slide"
                transparent={false}
                presentationStyle="fullScreen"
                onRequestClose={resetModal}
                statusBarTranslucent={true}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <StatusBar style="auto" />
                    {selectedTarget && (
                        <View style={{ flex: 1 }}>
                            {/* Screen Header */}
                            <ScreenHeader
                                onBack={resetModal}
                                bottomPadding={8}
                                backButtonIcon={<X size={22} color={colors.text} />}
                                backButtonStyle={{ backgroundColor: 'transparent' }}
                                centerContent={
                                    <ThemedText
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                        minimumFontScale={0.8}
                                        style={{ fontSize: 24, color: colors.text, fontFamily: Typography.fontFamily.serif, textAlign: 'center' }}
                                    >
                                        Define Link
                                    </ThemedText>
                                }
                            />

                            <KeyboardAwareScrollView
                                contentContainerStyle={[
                                    styles.modalContent,
                                    { paddingHorizontal: 24, paddingBottom: insets.bottom + 24 }
                                ]}
                                keyboardShouldPersistTaps="handled"
                                bottomOffset={24}
                            >
                                {/* Living Connection Bridge */}
                                {(() => {
                                    const activeColor = relationType.trim()
                                        ? getRelationColor(relationType, colors.tint)
                                        : colors.border;
                                    const isConnected = relationType.trim().length > 0;

                                    return (
                                        <Animated.View entering={FadeInDown.duration(280).easing(EASE_ENTER)} style={styles.connectionVisual}>
                                            <View style={styles.defineConnectionRow}>
                                                <View style={styles.personCol}>
                                                    <Avatar name={person.name} uri={person.avatarUri} size={76} />
                                                    <ThemedText style={styles.connectionPersonName} numberOfLines={1}>
                                                        {person.name}
                                                    </ThemedText>
                                                </View>

                                                <View style={styles.connectorBridge}>
                                                    <View style={[styles.connectorLine, { backgroundColor: colors.surface }]} />
                                                    <View
                                                        style={[
                                                            styles.connectorIcon,
                                                            { backgroundColor: colors.surface }
                                                        ]}
                                                    >
                                                        <Link size={18} color={isConnected ? activeColor : colors.icon} weight={isConnected ? "bold" : "regular"} />
                                                    </View>
                                                    <View style={[styles.connectorLine, { backgroundColor: colors.surface }]} />
                                                </View>

                                                <View style={styles.personCol}>
                                                    <Avatar name={selectedTarget.name} uri={selectedTarget.avatarUri} size={76} />
                                                    <ThemedText style={styles.connectionPersonName} numberOfLines={1}>
                                                        {selectedTarget.name}
                                                    </ThemedText>
                                                </View>
                                            </View>
                                        </Animated.View>
                                    );
                                })()}

                                {/* Tags horizontal scroll list (placed above input) */}
                                <Animated.View entering={FadeInDown.delay(50).duration(280).easing(EASE_ENTER)} style={styles.tagScrollContainer}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.tagScroll}
                                    >
                                        {[
                                            'Friend',
                                            'Family',
                                            'Coworker',
                                            'Mentor',
                                            'Partner',
                                            'Colleague',
                                        ].map(tag => {
                                            const isSelected = relationType.trim().toLowerCase() === tag.toLowerCase();
                                            const tagColor = getRelationColor(tag, colors.tint);

                                            return (
                                                <ScalePressable
                                                    key={tag}
                                                    onPress={() => {
                                                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                        setRelationType(isSelected ? '' : tag);
                                                    }}
                                                    style={[
                                                        styles.cloudChip,
                                                        {
                                                            backgroundColor: isSelected ? tagColor : colors.surface,
                                                        }
                                                    ]}
                                                    innerStyle={{ borderRadius: 10 }}
                                                    scaleTo={0.92}
                                                    springConfig={DesignSystem.animation.springs.expressive}
                                                    overlayColor="transparent"
                                                >
                                                    <ThemedText style={[
                                                        styles.cloudChipText,
                                                        {
                                                            color: isSelected ? '#ffffff' : colors.textSecondary,
                                                            fontFamily: isSelected ? Typography.fontFamily.bold : Typography.fontFamily.medium,
                                                        }
                                                    ]}>
                                                        {tag}
                                                    </ThemedText>
                                                </ScalePressable>
                                            );
                                        })}
                                    </ScrollView>
                                </Animated.View>

                                {/* Custom relation input (placed directly below tags) */}
                                <Animated.View entering={FadeInDown.delay(100).duration(280).easing(EASE_ENTER)} style={styles.inputWrap}>
                                    <Input
                                        placeholder="or type custom connection..."
                                        value={relationType}
                                        onChangeText={setRelationType}
                                        maxLength={25}
                                    />
                                </Animated.View>

                                {/* Confirm Button */}
                                {(() => {
                                    const canConfirm = relationType.trim().length > 0;
                                    const bondColor = canConfirm ? getRelationColor(relationType, colors.tint) : colors.tint;

                                    return (
                                        <Animated.View entering={FadeInDown.delay(140).duration(280).easing(EASE_ENTER)}>
                                            <ScalePressable
                                                disabled={!canConfirm}
                                                onPress={canConfirm ? handleConfirmLink : undefined}
                                                style={[
                                                    styles.confirmBtn,
                                                    { 
                                                        backgroundColor: bondColor,
                                                        opacity: canConfirm ? 1 : 0.38,
                                                    }
                                                ]}
                                                innerStyle={{ borderRadius: DesignSystem.radius.full }}
                                                scaleTo={0.96}
                                                springConfig={DesignSystem.animation.springs.expressive}
                                            >
                                                <ThemedText style={[
                                                    styles.confirmBtnText,
                                                    { color: theme === 'light' ? '#fff' : '#000' }
                                                ]}>
                                                    Confirm Connection
                                                </ThemedText>
                                            </ScalePressable>
                                        </Animated.View>
                                    );
                                })()}

                                <Animated.View entering={FadeInDown.delay(180).duration(280).easing(EASE_ENTER)}>
                                    <ScalePressable
                                        onPress={() => setStep('pick')}
                                        style={styles.backLink}
                                        hitSlop={{ top: 16, bottom: 16, left: 20, right: 20 }}
                                        scaleTo={0.93}
                                        springConfig={DesignSystem.animation.springs.expressive}
                                        overlayColor="transparent"
                                    >
                                        <ThemedText style={[styles.backLinkText, { color: colors.secondary }]}>
                                            Change person
                                        </ThemedText>
                                    </ScalePressable>
                                </Animated.View>
                            </KeyboardAwareScrollView>
                        </View>
                    )}
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: { paddingBottom: 0 },
    headerRightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    viewToggleBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    linkCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
    },
    linkCapsuleText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
    },

    // List
    listContent: {
        paddingHorizontal: 20,
    },
    listHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        marginBottom: 6,
    },
    listHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listHeaderTitle: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
        textTransform: 'capitalize',
        letterSpacing: -0.2,
    },
    listCountInline: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
    },
    filterChipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 11,
        paddingVertical: 5.5,
        borderRadius: 14,
    },
    filterChipButtonText: {
        fontSize: 12.5,
        fontFamily: Typography.fontFamily.semibold,
        textTransform: 'capitalize',
    },

    // Filter dropdown
    listFilterDropdown: {
        position: 'absolute',
        top: 50,
        right: 20,
        borderRadius: 14,
        minWidth: 150,
        padding: 5,
        zIndex: 40,
        ...DesignSystem.shadows.md,
    },
    listFilterItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    listFilterItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listFilterDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    listFilterItemText: {
        fontSize: 12.5,
        fontFamily: Typography.fontFamily.medium,
    },
    listFilterItemCount: {
        fontSize: 11.5,
        fontFamily: Typography.fontFamily.semibold,
        marginLeft: 12,
    },

    // Connection rows (borderless, hierarchy-first)
    connectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
        borderRadius: DesignSystem.radius.lg,
    },
    connectionMeta: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    connectionTopLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    connectionName: {
        fontSize: 15.5,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.15,
        flex: 1,
        marginRight: 8,
    },
    connectionRoleLabel: {
        fontSize: 12.5,
        fontFamily: Typography.fontFamily.bold,
        textTransform: 'capitalize',
        letterSpacing: 0.1,
    },
    connectionPitch: {
        fontSize: 13,
        lineHeight: 17,
        fontFamily: Typography.fontFamily.regular,
        marginTop: 1,
    },

    // Swipe delete
    swipeDelete: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        borderRadius: DesignSystem.radius.lg,
        marginLeft: 10,
    },

    // Empty
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
    },
    emptyCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },

    // Full Screen Modal
    modalContainer: {
        flex: 1,
    },
    modalContent: {
        flexGrow: 1,
        paddingTop: 84,
        paddingBottom: 24,
    },
    // Label step: connection visual
    connectionVisual: {
        marginBottom: 26,
    },
    defineConnectionRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    personCol: {
        alignItems: 'center',
        width: 92,
    },
    connectionPersonName: {
        marginTop: 8,
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.semibold,
        textAlign: 'center',
    },
    connectorBridge: {
        width: 96,
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 19,
    },
    connectorLine: {
        flex: 1,
        height: 1.5,
        borderRadius: 1,
    },
    connectorIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tagScrollContainer: {
        marginBottom: 12,
    },
    tagScroll: {
        gap: 8,
        paddingVertical: 2,
    },
    cloudChip: {
        paddingHorizontal: 13,
        paddingVertical: 7,
        borderRadius: 10,
    },
    cloudChipText: {
        fontSize: 12.5,
        letterSpacing: -0.1,
    },
    inputWrap: {
        marginBottom: 12,
    },

    // Confirm button
    confirmBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: DesignSystem.radius.full,
        marginTop: 4,
    },
    confirmBtnText: {
        fontSize: 14.5,
        fontFamily: Typography.fontFamily.bold,
        letterSpacing: 0.1,
    },
    backLink: {
        alignItems: 'center',
        marginTop: 10,
        paddingVertical: 4,
    },
    backLinkText: {
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.medium,
    },
});
