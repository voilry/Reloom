import { View, StyleSheet, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ScrollView, FlatList } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../ui/ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ReminderRepository, Reminder } from '../../db/repositories/ReminderRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { Bell, Calendar, Clock, X, User, MagnifyingGlass, Check, CaretRight } from '@/components/ui/Icon';
import { DesignSystem } from '../../constants/DesignSystem';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { ScalePressable } from '../ui/ScalePressable';
import { Avatar } from '../ui/Avatar';
import * as Notifications from 'expo-notifications';
import { Typography } from '../../constants/Typography';

interface AddReminderModalProps {
    visible: boolean;
    onClose: () => void;
    date?: Date;
    onSuccess: () => void;
    editingReminder?: Reminder | null;
}

export function AddReminderModal({ visible, onClose, date, onSuccess, editingReminder }: AddReminderModalProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [time, setTime] = useState('09:00');
    const [selectedDate, setSelectedDate] = useState('');
    const [personId, setPersonId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [people, setPeople] = useState<Person[]>([]);
    const [loading, setLoading] = useState(false);
    const [nudgeType, setNudgeType] = useState('on_time');
    const [customCount, setCustomCount] = useState(0);
    const searchInputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    // Initial State logic
    useEffect(() => {
        if (visible) {
            if (editingReminder) {
                setTitle(editingReminder.title);
                setDescription(editingReminder.description || '');
                setTime(editingReminder.time || '09:00');
                setSelectedDate(editingReminder.date);
                setPersonId(editingReminder.personId || null);
                setNudgeType(editingReminder.nudgeType || 'on_time');
                setCustomCount(editingReminder.customNudgesCount || 0);
            } else {
                setTitle('');
                setDescription('');
                setTime('09:00');
                setPersonId(null);
                setNudgeType('on_time');
                setCustomCount(0);

                const d = date || new Date();
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                setSelectedDate(`${y}-${m}-${day}`);
            }
            loadPeople();
        } else {
            // Reset state immediately when closed to prevent "blinking" on next open
            setTitle('');
            setDescription('');
            setPersonId(null);
            setSearchQuery('');
            setNudgeType('on_time');
            setCustomCount(0);
        }
    }, [visible, editingReminder, date]);

    const loadPeople = async () => {
        const data = await PersonRepository.getPeopleSortedByActivity();
        setPeople(data);
    };

    const filteredPeople = useMemo(() => {
        if (!searchQuery.trim()) return people.slice(0, 5);
        return people.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        ).slice(0, 10);
    }, [people, searchQuery]);

    const selectedPerson = useMemo(() =>
        people.find(p => p.id === personId),
        [people, personId]);

    const handleSave = async () => {
        if (!title.trim()) return;
        setLoading(true);

        try {
            // Trigger permission check/request in background without blocking DB write
            Notifications.getPermissionsAsync().then(({ status }) => {
                if (status !== 'granted') {
                    Notifications.requestPermissionsAsync().catch(() => {});
                }
            }).catch(() => {});

            if (editingReminder) {
                await ReminderRepository.update(editingReminder.id, {
                    title,
                    description,
                    date: selectedDate,
                    time: time,
                    personId: personId,
                    nudgeType: nudgeType,
                    customNudgesCount: customCount,
                });
            } else {
                await ReminderRepository.create({
                    title,
                    description,
                    date: selectedDate,
                    time: time,
                    personId: personId,
                    completed: false,
                    nudgeType: nudgeType,
                    customNudgesCount: customCount,
                });
            }

            if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to save reminder:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <View style={[styles.modalPage, { backgroundColor: colors.background }]}>
                <StatusBar style="auto" />

                <View style={[styles.modalHeaderFullScreen, { paddingTop: insets.top + 8 }]}>
                    <ScalePressable
                        onPress={onClose}
                        style={styles.modalHeaderAction}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        overlayColor="transparent"
                        scaleTo={0.9}
                    >
                        <X size={24} color={colors.text} />
                    </ScalePressable>
                    <ThemedText type="display" style={{ fontSize: 22 }}>
                        {editingReminder ? 'Edit Reminder' : 'Add Reminder'}
                    </ThemedText>
                    <ScalePressable
                        onPress={handleSave}
                        disabled={!title.trim() || loading}
                        style={[styles.saveBtn, { backgroundColor: title.trim() ? colors.tint : colors.surface }]}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        scaleTo={0.9}
                    >
                        <Check size={22} color={title.trim() ? (theme === 'light' ? '#fff' : '#000') : colors.secondary} weight="bold" />
                    </ScalePressable>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: insets.bottom + 40 }}
                    >
                        <View style={[styles.inputSection, { marginTop: 8 }]}>
                            <View style={{ position: 'relative' }}>
                                <Input
                                    value={title}
                                    maxLength={(title.trim().split(/\s+/).filter(Boolean).length >= 10 && /\s$/.test(title)) ? title.length : undefined}
                                    onChangeText={(text) => {
                                        const parts = text.split(/(\s+)/);
                                        let wCount = 0;
                                        let res = '';
                                        for (let i = 0; i < parts.length; i++) {
                                            if (parts[i].trim().length > 0) wCount++;
                                            if (wCount > 10) break;
                                            res += parts[i];
                                        }
                                        setTitle(res);
                                    }}
                                    placeholder="What's the plan?"
                                    style={styles.titleInput}
                                    containerStyle={{ marginBottom: 12 }}
                                    autoFocus={!editingReminder}
                                />
                                <ThemedText type="tiny" style={[styles.wordCount, { color: colors.secondary }]}>
                                    {title.trim() ? title.trim().split(/\s+/).filter(Boolean).length : 0}/10
                                </ThemedText>
                            </View>
                            <View style={{ position: 'relative' }}>
                                <Input
                                    value={description}
                                    maxLength={(description.trim().split(/\s+/).filter(Boolean).length >= 40 && /\s$/.test(description)) ? description.length : undefined}
                                    onChangeText={(text) => {
                                        const parts = text.split(/(\s+)/);
                                        let wCount = 0;
                                        let res = '';
                                        for (let i = 0; i < parts.length; i++) {
                                            if (parts[i].trim().length > 0) wCount++;
                                            if (wCount > 40) break;
                                            res += parts[i];
                                        }
                                        setDescription(res);
                                    }}
                                    placeholder="Add notes or details..."
                                    multiline
                                    style={styles.descInput}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                                <ThemedText type="tiny" style={[styles.wordCount, { color: colors.secondary, bottom: 16 }]}>
                                    {description.trim() ? description.trim().split(/\s+/).filter(Boolean).length : 0}/40
                                </ThemedText>
                            </View>
                        </View>

                        <View style={[styles.timeSection, { marginTop: 24 }]}>
                            <View style={styles.pickersRow}>
                                <View style={{ flex: 1 }}>
                                    <TimePicker value={time} onChange={setTime} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <DatePicker value={selectedDate} onChange={setSelectedDate} minDate={new Date()} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.nudgeSection}>
                            <ThemedText type="sectionHeader" style={[styles.inputLabel, { marginBottom: 10 }]}>Notifications</ThemedText>
                            <View style={styles.chipsContainer}>
                                {[
                                    { label: 'None', value: 'off' },
                                    { label: 'On Time', value: 'on_time' },
                                    { label: 'Light', value: 'nudge' },
                                    { label: 'Medium', value: 'deep' },
                                    { label: 'Heavy', value: 'extreme' },
                                    { label: 'Custom', value: 'custom' },
                                ].map((n) => (
                                    <ScalePressable
                                        key={n.value}
                                        onPress={() => {
                                            setNudgeType(n.value);
                                            if (n.value !== 'custom') {
                                                setCustomCount(0);
                                            } else {
                                                setCustomCount(2); // default to 2 pings
                                            }
                                        }}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: nudgeType === n.value ? colors.tint : colors.surface, marginBottom: 4 }
                                        ]}
                                        innerStyle={{ borderRadius: 20 }}
                                        scaleTo={0.93}
                                    >
                                        <ThemedText style={[
                                            styles.chipText,
                                            { color: nudgeType === n.value ? (theme === 'light' ? '#fff' : '#000') : colors.secondary }
                                        ]}>
                                            {n.label}
                                        </ThemedText>
                                    </ScalePressable>
                                ))}
                            </View>

                            {nudgeType === 'custom' && (
                                <Animated.View entering={FadeInDown} style={[styles.customNudgeCard, { backgroundColor: colors.surface }]}>
                                    <View style={{ flex: 1, paddingRight: 16, justifyContent: 'center' }}>
                                        <ThemedText style={{ fontFamily: Typography.fontFamily.bold, fontSize: 16 }}>Custom Alerts</ThemedText>
                                    </View>
                                    <View style={[styles.stepperContainer, { backgroundColor: colors.background }]}>
                                        <ScalePressable
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                setCustomCount(Math.max(1, customCount - 1));
                                            }}
                                            style={styles.stepperControlBtn}
                                            scaleTo={0.85}
                                        >
                                            <ThemedText style={{ fontSize: 20, color: colors.text, opacity: 0.8 }}>-</ThemedText>
                                        </ScalePressable>
                                        
                                        <View style={{ minWidth: 24, alignItems: 'center' }}>
                                            <ThemedText style={[styles.stepperValue, { color: colors.text }]}>{customCount}</ThemedText>
                                        </View>
                                        
                                        <ScalePressable
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                setCustomCount(Math.min(10, customCount + 1));
                                            }}
                                            style={styles.stepperControlBtn}
                                            scaleTo={0.85}
                                        >
                                            <ThemedText style={{ fontSize: 20, color: colors.text, opacity: 0.8 }}>+</ThemedText>
                                        </ScalePressable>
                                    </View>
                                </Animated.View>
                            )}

                            <ThemedText 
                                type="tiny" 
                                style={{ color: colors.secondary, marginTop: 12, fontStyle: 'italic', fontSize: 12, opacity: 0.5 }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                minimumScaleFactor={0.7}
                            >
                                {nudgeType === 'off' && "No notifications will be sent."}
                                {nudgeType === 'on_time' && "1 ping exactly at the selected time."}
                                {nudgeType === 'nudge' && "2 pings: 30m before and at event time."}
                                {nudgeType === 'deep' && "3 pings: 2h and 30m before, and at event time."}
                                {nudgeType === 'extreme' && "5 pings: 1d, 2h, 30m, 10m before, and at event time."}
                                {nudgeType === 'custom' && `Spaced out ${customCount} alerts leading up to the event.`}
                            </ThemedText>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.mentionSection}>
                            <ThemedText type="sectionHeader" style={[styles.inputLabel, { marginBottom: 10 }]}>Mention Someone</ThemedText>

                            {selectedPerson ? (
                                <Animated.View entering={FadeInDown} style={[styles.selectedPersonCard, { backgroundColor: colors.surface }]}>
                                    <View style={styles.selectedPersonInfo}>
                                        <Avatar name={selectedPerson.name} uri={selectedPerson.avatarUri} size={40} />
                                        <View style={{ marginLeft: 12 }}>
                                            <ThemedText type="defaultSemiBold">{selectedPerson.name}</ThemedText>
                                            <ThemedText type="tiny" style={{ color: colors.secondary }}>Linked to reminder</ThemedText>
                                        </View>
                                    </View>
                                    <ScalePressable onPress={() => setPersonId(null)} style={styles.removeBtn}>
                                        <X size={18} color={colors.error} />
                                    </ScalePressable>
                                </Animated.View>
                            ) : (
                                <>
                                    <ScalePressable 
                                        onPress={() => searchInputRef.current?.focus()}
                                        style={[styles.searchBox, { backgroundColor: colors.surface }]}
                                        scaleTo={0.98}
                                        overlayColor="transparent"
                                    >
                                        <MagnifyingGlass size={18} color={colors.icon} />
                                        <TextInput
                                            ref={searchInputRef}
                                            value={searchQuery}
                                            onChangeText={setSearchQuery}
                                            placeholder="Search people..."
                                            placeholderTextColor={colors.icon}
                                            style={[styles.searchInput, { color: colors.text }]}
                                            onFocus={() => {
                                                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
                                            }}
                                        />
                                    </ScalePressable>

                                    <View style={styles.peopleList}>
                                        {filteredPeople.map((p) => (
                                            <ScalePressable
                                                key={p.id}
                                                onPress={() => {
                                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                    setPersonId(p.id);
                                                    setSearchQuery('');
                                                }}
                                                style={styles.personItem}
                                                innerStyle={{ borderRadius: 12 }}
                                            >
                                                <Avatar name={p.name} uri={p.avatarUri} size={36} />
                                                <ThemedText style={styles.personName} numberOfLines={1}>{p.name}</ThemedText>
                                                <CaretRight size={14} color={colors.icon} />
                                            </ScalePressable>
                                        ))}
                                        {people.length > 0 && filteredPeople.length === 0 && (
                                            <ThemedText style={styles.noResults}>No matches found</ThemedText>
                                        )}
                                        {people.length === 0 && (
                                            <ThemedText style={styles.noResults}>Add people to link them</ThemedText>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalPage: { flex: 1 },
    modalHeaderFullScreen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingBottom: 16,
    },
    modalHeaderAction: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inputSection: { marginBottom: 0 },
    inputLabel: {
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.5,
        marginBottom: 8,
    },
    titleInput: {
        fontSize: 20,
        fontFamily: Typography.fontFamily.bold,
        marginBottom: 0,
    },
    descInput: {
        minHeight: 160,
        textAlignVertical: 'top',
        fontSize: 15,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(128,128,128,0.1)',
        marginVertical: 12,
    },
    wordCount: {
        position: 'absolute',
        right: 12,
        bottom: 24,
        fontSize: 10,
        fontWeight: '600',
    },
    timeSection: { marginBottom: 0 },
    pickersRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    mentionSection: { marginBottom: 12 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        marginBottom: 16,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontFamily: Typography.fontFamily.medium,
    },
    peopleList: {
        gap: 8,
        minHeight: 340,
    },
    personItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
    },
    personName: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        fontFamily: Typography.fontFamily.medium,
    },
    noResults: {
        textAlign: 'center',
        padding: 20,
        opacity: 0.5,
        fontSize: 14,
    },
    selectedPersonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderRadius: 20,
    },
    selectedPersonInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    removeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    nudgeSection: {
        marginBottom: 0,
    },
    customNudgeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 24,
        marginTop: 12,
    },
    stepperContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        padding: 4,
        gap: 4,
    },
    stepperControlBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(128,128,128,0.1)',
    },
    stepperValue: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.bold,
        textAlign: 'center',
    }
});
