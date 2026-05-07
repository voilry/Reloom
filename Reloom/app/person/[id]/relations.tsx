import React, { useState, useEffect } from 'react';
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Modal,
    TextInput, Platform, KeyboardAvoidingView, Pressable,
    Animated as RNAnimated
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedView } from '../../../components/ui/ThemedView';
import { ThemedText } from '../../../components/ui/ThemedText';
import { PersonRepository, Person } from '../../../db/repositories/PersonRepository';
import { RelationshipRepository, Relationship } from '../../../db/repositories/RelationshipRepository';
import { DesignSystem } from '../../../constants/DesignSystem';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';
import {
    Trash, Plus, Link, CaretRight, MagnifyingGlass as Search,
    ArrowsLeftRight, X, Check
} from 'phosphor-react-native';
import { useAppTheme } from '../../../hooks/useAppTheme';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { ScalePressable } from '../../../components/ui/ScalePressable';
import { StatusBar } from 'expo-status-bar';
import { Typography } from '../../../constants/Typography';

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

    // Step control
    const [step, setStep] = useState<Step>('list');
    const [selectedTarget, setSelectedTarget] = useState<Person | null>(null);
    const [relationType, setRelationType] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        const p = await PersonRepository.getById(personId);
        if (!p) return;
        setPerson(p);

        const [rels, people] = await Promise.all([
            RelationshipRepository.getForPerson(personId),
            PersonRepository.getAll()
        ]);

        setRelationships(rels);
        setAllPeople(people.filter(x => x.id !== personId));
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const getOtherPerson = (rel: Relationship): Person | undefined => {
        const otherId = rel.sourcePersonId === personId ? rel.targetPersonId : rel.sourcePersonId;
        return allPeople.find(p => p.id === otherId);
    };

    const alreadyLinkedIds = relationships.map(r =>
        r.sourcePersonId === personId ? r.targetPersonId : r.sourcePersonId
    );
    const availablePeople = allPeople.filter(p => !alreadyLinkedIds.includes(p.id));
    const filteredPeople = availablePeople.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ─── Actions ─────────────────────────────────────────────────────────────
    const handleSelectTarget = (target: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        setSelectedTarget(target);
        setRelationType('');
        setStep('label');
    };

    const handleConfirmLink = async () => {
        if (!selectedTarget || !person) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await RelationshipRepository.add(person.id, selectedTarget.id, relationType.trim() || 'Connection');
        resetModal();
        loadData();
    };

    const handleDelete = async (relId: number) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await RelationshipRepository.delete(relId);
        loadData();
    };

    const resetModal = () => {
        setStep('list');
        setSelectedTarget(null);
        setRelationType('');
        setSearchQuery('');
    };

    const openPicker = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setStep('pick');
    };

    // ─── Swipe-to-delete (matches EntriesTab pattern) ────────────────────────
    const renderRightActions = (relId: number, dragX: RNAnimated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
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
                    <Trash size={22} color="#fff" weight="fill" />
                </RNAnimated.View>
            </ScalePressable>
        );
    };

    if (!person) return <ThemedView style={{ flex: 1 }} />;

    const isModalVisible = step === 'pick' || step === 'label';

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="auto" />

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <ScreenHeader
                onBack={() => router.back()}
                style={styles.header}
                alignCenter={false}
                centerContent={
                    <View style={{ flex: 1, alignItems: 'flex-start', paddingLeft: 0 }}>
                        <ThemedText type="display" style={{ fontSize: 28, lineHeight: 32, color: colors.text }}>
                            Social Web
                        </ThemedText>
                        <ThemedText style={{ fontSize: 10, color: colors.secondary, marginTop: -6, fontFamily: Typography.fontFamily.medium }}>
                            {person.name}'s circle
                        </ThemedText>
                    </View>
                }
                rightContent={
                    <ScalePressable
                        onPress={openPicker}
                        style={[styles.linkCapsule, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}
                        innerStyle={{ borderRadius: 20 }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Plus size={14} color={colors.tint} weight="bold" />
                        <ThemedText style={[styles.linkCapsuleText, { color: colors.tint }]}>Link</ThemedText>
                    </ScalePressable>
                }
            />

            {/* ─── Connections Count ─────────────────────────────────────────── */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 13, marginTop: 12 }}>
                <ThemedText type="sectionHeader" style={{ color: colors.secondary, fontSize: 13 }}>
                    ({relationships.length}) CONNECTIONS
                </ThemedText>
            </View>

            {/* ─── Connections List ─────────────────────────────────────────── */}
            <ScrollView
                contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {relationships.length === 0 ? (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
                        <View style={[styles.emptyCircle, { backgroundColor: colors.surface }]}>
                            <ArrowsLeftRight size={28} color={colors.icon} />
                        </View>
                        <ThemedText type="sectionHeader" style={{ marginTop: 16, opacity: 0.9 }}>No Connections</ThemedText>
                        <ThemedText style={{ fontSize: 13, color: colors.secondary, marginTop: 2, textAlign: 'center', lineHeight: 17 }}>
                            Tap Link to start building{'\n'}{person.name}'s social web.
                        </ThemedText>
                    </Animated.View>
                ) : (
                    relationships.map((rel, index) => {
                        const other = getOtherPerson(rel);
                        if (!other) return null;
                        return (
                            <Animated.View
                                key={rel.id}
                                entering={FadeInDown.delay(index * 40).duration(350)}
                                layout={Layout.springify()}
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
                                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                                    >
                                        <Card style={styles.relCard}>
                                            <Avatar name={other.name} uri={other.avatarUri} size={48} />
                                            <View style={styles.relInfo}>
                                                <ThemedText style={styles.relName}>{other.name}</ThemedText>
                                                {rel.relationType ? (
                                                    <View style={[styles.roleBadge, { backgroundColor: theme === 'dark' ? colors.tint + '20' : colors.tint + '10' }]}>
                                                        <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '800', fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                                                            {rel.relationType}
                                                        </ThemedText>
                                                    </View>
                                                ) : null}
                                            </View>
                                            <CaretRight size={16} color={colors.icon} style={{ opacity: 0.4 }} />
                                        </Card>
                                    </ScalePressable>
                                </Swipeable>
                            </Animated.View>
                        );
                    })
                )}
            </ScrollView>

            {/* ─── Full Screen Picker/Label Modal ──────────────────────── */}
            <Modal
                visible={isModalVisible}
                animationType="slide"
                transparent={false}
                presentationStyle="fullScreen"
                onRequestClose={resetModal}
                statusBarTranslucent={true}
            >
                <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                    <StatusBar style="auto" />
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1, paddingTop: insets.top + 8 }}
                    >
                        {step === 'pick' && (
                            <>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <ScalePressable
                                        onPress={resetModal}
                                        style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                                        innerStyle={{ borderRadius: 20 }}
                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                    >
                                        <X size={20} color={colors.text} />
                                    </ScalePressable>
                                    <View style={{ flex: 1, alignItems: 'center', marginRight: 40, marginTop: 12 }}>
                                        <ThemedText style={{ fontSize: 22, color: colors.text, fontFamily: Typography.fontFamily.display }}>
                                            Add Connection
                                        </ThemedText>
                                        <ThemedText type="small" style={{ color: colors.secondary, marginTop: -4 }}>
                                            Who is {person.name} connected to?
                                        </ThemedText>
                                    </View>
                                </View>

                                {/* Search */}
                                <View style={styles.modalContent}>
                                    <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                                        <Search size={16} color={colors.icon} style={{ marginRight: 8 }} />
                                        <TextInput
                                            placeholder="Search people..."
                                            placeholderTextColor={colors.secondary}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            style={[styles.searchInput, { color: colors.text }]}
                                            autoFocus
                                        />
                                    </View>

                                    {/* People List */}
                                    <ScrollView
                                        style={{ marginTop: 16 }}
                                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                                        showsVerticalScrollIndicator={false}
                                        keyboardShouldPersistTaps="handled"
                                    >
                                        {filteredPeople.map(p => (
                                            <ScalePressable
                                                key={p.id}
                                                style={[styles.personPickerItem, { borderColor: colors.border }]}
                                                innerStyle={{ borderRadius: 12 }}
                                                onPress={() => handleSelectTarget(p)}
                                            >
                                                <Avatar name={p.name} uri={p.avatarUri} size={42} />
                                                <View style={styles.personPickerInfo}>
                                                    <ThemedText style={styles.personPickerName}>{p.name}</ThemedText>
                                                    {p.elevatorPitch ? (
                                                        <ThemedText type="tiny" style={{ color: colors.secondary }} numberOfLines={1}>
                                                            {p.elevatorPitch}
                                                        </ThemedText>
                                                    ) : null}
                                                </View>
                                                <CaretRight size={20} color={colors.icon} style={{ opacity: 0.4 }} />
                                            </ScalePressable>
                                        ))}
                                        {filteredPeople.length === 0 && (
                                            <View style={styles.noResults}>
                                                <ThemedText style={{ color: colors.secondary }}>
                                                    {availablePeople.length === 0
                                                        ? 'Everyone is already connected.'
                                                        : 'No people found.'}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>
                            </>
                        )}

                        {step === 'label' && selectedTarget && (
                            <>
                                {/* Modal Header */}
                                <View style={styles.modalHeader}>
                                    <ScalePressable
                                        onPress={resetModal}
                                        style={[styles.closeBtn, { backgroundColor: colors.surface }]}
                                        innerStyle={{ borderRadius: 20 }}
                                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                                    >
                                        <X size={20} color={colors.text} />
                                    </ScalePressable>
                                    <View style={{ flex: 1, alignItems: 'center', marginRight: 40, marginTop: 12 }}>
                                        <ThemedText style={{ fontSize: 22, color: colors.text, fontFamily: Typography.fontFamily.display }}>
                                            Define Link
                                        </ThemedText>
                                        <ThemedText type="small" style={{ color: colors.secondary, marginTop: -4 }}>
                                            Label this connection
                                        </ThemedText>
                                    </View>
                                </View>

                                <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
                                    {/* Both people + connector visual */}
                                    <View style={styles.connectionVisual}>
                                        {/* Person A */}
                                        <View style={styles.connectionPerson}>
                                            <Avatar name={person.name} uri={person.avatarUri} size={72} />
                                            <ThemedText style={styles.connectionPersonName} numberOfLines={1}>
                                                {person.name}
                                            </ThemedText>
                                        </View>

                                        {/* Connector */}
                                        <View style={styles.connectorBridge}>
                                            <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                                            <View style={[styles.connectorIcon, { backgroundColor: colors.tint + '15', borderColor: colors.tint + '30' }]}>
                                                <Link size={20} color={colors.tint} weight="bold" />
                                            </View>
                                            <View style={[styles.connectorLine, { backgroundColor: colors.border }]} />
                                        </View>

                                        {/* Person B */}
                                        <View style={styles.connectionPerson}>
                                            <Avatar name={selectedTarget.name} uri={selectedTarget.avatarUri} size={72} />
                                            <ThemedText style={styles.connectionPersonName} numberOfLines={1}>
                                                {selectedTarget.name}
                                            </ThemedText>
                                        </View>
                                    </View>

                                    {/* Relation Label */}
                                    <ThemedText style={styles.sectionLabel}>HOW ARE THEY CONNECTED?</ThemedText>

                                    {/* Quick Chips */}
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.chipScroll}
                                    >
                                        {['Friend', 'Family', 'Coworker', 'Mentor', 'Colleague', 'Partner'].map(chip => (
                                            <ScalePressable
                                                key={chip}
                                                onPress={() => {
                                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                    setRelationType(chip);
                                                }}
                                                style={[
                                                    styles.chip,
                                                    {
                                                        backgroundColor: relationType === chip ? colors.tint : colors.surface,
                                                    }
                                                ]}
                                                innerStyle={{ borderRadius: 20 }}
                                                scale={true}
                                                overlayColor={relationType === chip ? "rgba(0,0,0,0.15)" : undefined}
                                            >
                                                <ThemedText style={[
                                                    styles.chipText,
                                                    { color: relationType === chip ? (theme === 'light' ? '#fff' : '#000') : colors.text }
                                                ]}>
                                                    {chip}
                                                </ThemedText>
                                            </ScalePressable>
                                        ))}
                                    </ScrollView>

                                    <View style={{ height: 24 }} />

                                    <Input
                                        placeholder="Or describe the connection..."
                                        value={relationType}
                                        onChangeText={setRelationType}
                                    />

                                    {/* Confirm */}
                                    <ScalePressable
                                        onPress={handleConfirmLink}
                                        style={[
                                            styles.confirmBtn,
                                            { backgroundColor: colors.tint, ...DesignSystem.shadows.md }
                                        ]}
                                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                                    >
                                        <Check size={20} color={theme === 'light' ? '#fff' : '#000'} weight="bold" />
                                        <ThemedText style={{ color: theme === 'light' ? '#fff' : '#000', fontSize: 14, fontFamily: Typography.fontFamily.display, marginLeft: 4 }}>
                                            Confirm
                                        </ThemedText>
                                    </ScalePressable>

                                    <ScalePressable
                                        onPress={() => setStep('pick')}
                                        style={styles.backLink}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        scaleTo={0.96}
                                        overlayColor="transparent"
                                    >
                                        <ThemedText style={{ color: colors.secondary, fontSize: 15 }}>
                                            ← Change person
                                        </ThemedText>
                                    </ScalePressable>
                                </ScrollView>
                            </>
                        )}
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    // Header
    header: { paddingBottom: 12 },
    linkCapsule: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    linkCapsuleText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // List
    listContent: {
        paddingHorizontal: 20,
    },

    // Connection cards
    relCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: DesignSystem.radius.lg,
        gap: 14,
        marginBottom: 10,
    },
    relInfo: { 
        flex: 1,
        marginTop: 2, // Shift names down slightly
    },
    relName: { 
        fontSize: 16, 
        fontWeight: '700', 
        marginBottom: 0, // Tighten gap to tag
    },

    // Swipe delete
    swipeDelete: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 72,
        borderRadius: DesignSystem.radius.lg,
        marginLeft: 10,
        marginBottom: 0,
    },

    // Empty
    emptyState: {
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
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
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        padding: 24,
    },

    // Person picker
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: DesignSystem.radius.md,
        paddingHorizontal: 14,
        height: 52,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    personPickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    personPickerInfo: { flex: 1 },
    personPickerName: { fontSize: 16, fontWeight: '700' },
    roleBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: DesignSystem.radius.full,
        marginTop: 1, // Tucked closer to name
    },
    noResults: {
        alignItems: 'center',
        paddingVertical: 40,
    },

    // Label step: connection visual
    connectionVisual: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 36,
        marginTop: 12,
        gap: 0,
    },
    connectionPerson: {
        alignItems: 'center',
        width: 100,
    },
    connectionPersonName: {
        marginTop: 10,
        fontSize: 15,
        fontWeight: '700',
        textAlign: 'center',
    },
    connectorBridge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    connectorLine: {
        flex: 1,
        height: 2,
    },
    connectorIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        marginHorizontal: 4,
    },

    // Label step: chips
    sectionLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        opacity: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    chipScroll: {
        gap: 8,
        paddingRight: 12,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Confirm button
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        padding: 14,
        borderRadius: DesignSystem.radius.lg,
        marginTop: 24,
    },
    backLink: {
        alignItems: 'center',
        marginTop: 20,
    },
});
