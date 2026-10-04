import { View, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../ui/ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Input } from '../ui/Input';
import { ReminderRepository, Reminder } from '../../db/repositories/ReminderRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import {
    Bell, Calendar, Clock, Cake, Gift, Heart, Briefcase, Coffee, Star, Target,
    Sliders, X, MagnifyingGlass, Check, CaretRight,
} from '@/components/ui/Icon';
import { DatePicker } from '../ui/DatePicker';
import { TimePicker } from '../ui/TimePicker';
import { ScalePressable } from '../ui/ScalePressable';
import { NotificationSlider, SLIDER_COLUMN_HEIGHT } from '../ui/NotificationSlider';
import { Avatar } from '../ui/Avatar';
import * as Notifications from 'expo-notifications';
import { Typography } from '../../constants/Typography';

/** The notification ladder, weakest to strongest. Order drives the slider positions. */
const NUDGE_STEPS = [
    { value: 'off', label: 'None', helper: 'No notifications will be sent.' },
    { value: 'on_time', label: 'On Time', helper: '1 ping exactly at the selected time.' },
    { value: 'nudge', label: 'Light', helper: '2 pings: 30m before and at event time.' },
    { value: 'deep', label: 'Medium', helper: '3 pings: 2h and 30m before, and at event time.' },
    { value: 'extreme', label: 'Heavy', helper: '5 pings: 1d, 2h, 30m, 10m before, and at event time.' },
];
const NUDGE_LABELS = NUDGE_STEPS.map((s) => s.label);
const DEFAULT_NUDGE = 'on_time';

// The Custom button and the stepper stand beside the slider COLUMN, not just
// its track: the track plus the None/On Time label strip is the taller block
// they sit against. Matching only the track left them reading as small pills,
// so these match the whole column and stay a touch slimmer than the track is wide.
const CONTROL_HEIGHT = 45;

const REMINDER_ICONS: Record<string, React.ComponentType<any>> = {
    Bell, Calendar, Clock, Cake, Gift, Heart, Briefcase, Coffee, Star, Target,
};
const REMINDER_ICON_KEYS = Object.keys(REMINDER_ICONS);

// All swatches stay dark enough for a white glyph on top of them (WCAG AA).
const REMINDER_COLORS = [
    { name: 'Amber', value: '#B45309' },
    { name: 'Red', value: '#DC2626' },
    { name: 'Pink', value: '#DB2777' },
    { name: 'Violet', value: '#7C3AED' },
    { name: 'Blue', value: '#2563EB' },
    { name: 'Teal', value: '#0F766E' },
    { name: 'Lime', value: '#4D7C0F' },
    { name: 'Slate', value: '#475569' },
];

interface AddReminderModalProps {
    visible: boolean;
    onClose: () => void;
    date?: Date;
    onSuccess: () => void;
    editingReminder?: Reminder | null;
}

export function AddReminderModal({ visible, onClose, date, onSuccess, editingReminder }: AddReminderModalProps) {
    const { colors, hapticsEnabled } = useAppTheme();
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
    // Prototype only: icon and colour have no columns in the reminders table
    // yet, so they stay local to this modal and reset on close.
    const [styleIcon, setStyleIcon] = useState<string>('Bell');
    const [styleColor, setStyleColor] = useState<string>(colors.tint);
    const lastPresetRef = useRef(DEFAULT_NUDGE);
    const searchInputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; };
    }, []);

    // Initial State logic
    useEffect(() => {
        if (visible) {
            setStyleColor(colors.tint);
            if (editingReminder) {
                setTitle(editingReminder.title);
                setDescription(editingReminder.description || '');
                setTime(editingReminder.time || '09:00');
                setSelectedDate(editingReminder.date);
                setPersonId(editingReminder.personId || null);
                setNudgeType(editingReminder.nudgeType || DEFAULT_NUDGE);
                setCustomCount(editingReminder.customNudgesCount || 0);
                lastPresetRef.current = NUDGE_STEPS.some((s) => s.value === editingReminder.nudgeType)
                    ? editingReminder.nudgeType!
                    : DEFAULT_NUDGE;
            } else {
                setTitle('');
                setDescription('');
                setTime('09:00');
                setPersonId(null);
                setNudgeType(DEFAULT_NUDGE);
                setCustomCount(0);
                lastPresetRef.current = DEFAULT_NUDGE;

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
            setNudgeType(DEFAULT_NUDGE);
            setCustomCount(0);
            setStyleIcon('Bell');
            lastPresetRef.current = DEFAULT_NUDGE;
        }
    // colors.tint is read inside for the style swatch default, so a theme switch
    // has to re-run this or the palette keeps the previous theme's tint.
}, [visible, editingReminder, date, colors.tint]);

    const loadPeople = async () => {
        // Guarded: an unguarded rejection here becomes an unhandled promise
        // rejection, and resolving after unmount sets state on a dead component.
        try {
            const data = await PersonRepository.getPeopleSortedByActivity();
            if (mountedRef.current) setPeople(data);
        } catch (error) {
            console.error('Failed to load people:', error);
        }
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

    const isCustomNudge = nudgeType === 'custom';

    // 'custom' is not a slider position, so it falls back to the default rung.
    const nudgeStepIndex = useMemo(() => {
        const i = NUDGE_STEPS.findIndex(s => s.value === nudgeType);
        return i === -1 ? 1 : i;
    }, [nudgeType]);

    const nudgeHelper = isCustomNudge
        ? `Spaced out ${customCount} alerts leading up to the event.`
        : NUDGE_STEPS[nudgeStepIndex].helper;

    const handleNudgeStep = (i: number) => {
        const next = NUDGE_STEPS[i];
        if (!next || next.value === nudgeType) return;
        lastPresetRef.current = next.value;
        setNudgeType(next.value);
        if (customCount !== 0) setCustomCount(0);
    };

    // Leaving Custom returns to whatever rung was last picked, so the slider
    // never silently rewinds to On Time.
    const handleToggleCustom = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        if (isCustomNudge) {
            setNudgeType(lastPresetRef.current);
            return;
        }
        lastPresetRef.current = nudgeType;
        setNudgeType('custom');
        if (customCount < 1) setCustomCount(2);
    };

    const handleCustomCount = (delta: number) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        setCustomCount(prev => Math.max(1, Math.min(10, prev + delta)));
    };

    const isDirty = useMemo(() => {
        if (!editingReminder) return false;
        return (
            title !== (editingReminder.title || '') ||
            description !== (editingReminder.description || '') ||
            time !== (editingReminder.time || '09:00') ||
            selectedDate !== (editingReminder.date || '') ||
            personId !== (editingReminder.personId || null) ||
            nudgeType !== (editingReminder.nudgeType || 'on_time') ||
            customCount !== (editingReminder.customNudgesCount || 0)
        );
    }, [editingReminder, title, description, time, selectedDate, personId, nudgeType, customCount]);

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
                        style={styles.saveBtn}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        scaleTo={0.9}
                    >
                        <Check size={22} color={title.trim() && (isDirty || !editingReminder) ? colors.tint : colors.text} weight="bold" />
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
                                    maxLength={30}
                                    onChangeText={setTitle}
                                    placeholder="What's the plan?"
                                    style={styles.titleInput}
                                    containerStyle={{ marginBottom: 12 }}
                                    autoFocus={!editingReminder}
                                />
                            </View>
                            <View style={{ position: 'relative' }}>
                                <Input
                                    value={description}
                                    maxLength={300}
                                    onChangeText={setDescription}
                                    placeholder="Add notes or details..."
                                    multiline
                                    style={styles.descInput}
                                    containerStyle={{ marginBottom: 0 }}
                                />
                            </View>
                        </View>

                        <View style={[styles.timeSection, { marginTop: 18 }]}>
                            <View style={styles.pickersRow}>
                                {/* Both pickers ship their own marginBottom: 16, which
                                    stacked on this modal's spacing into a 44px hole. Cancel
                                    it here and let marginTop own the gap instead. */}
                                <View style={styles.pickerSlot}>
                                    <TimePicker value={time} onChange={setTime} />
                                </View>
                                <View style={styles.pickerSlot}>
                                    <DatePicker value={selectedDate} onChange={setSelectedDate} minDate={new Date()} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.styleSection}>
                            <ThemedText style={[styles.inputLabel, { marginBottom: 10 }]}>Style</ThemedText>

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.iconStrip}
                            >
                                {REMINDER_ICON_KEYS.map((key) => {
                                    const Glyph = REMINDER_ICONS[key];
                                    const active = key === styleIcon;
                                    return (
                                        <ScalePressable
                                            key={key}
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                                                setStyleIcon(key);
                                            }}
                                            style={[styles.iconTile, { backgroundColor: active ? styleColor : colors.surface }]}
                                            innerStyle={{ borderRadius: 20 }}
                                            scaleTo={0.9}
                                            hitSlop={{ top: 8, bottom: 8, left: 5, right: 5 }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${key} icon`}
                                        >
                                            <Glyph size={19} color={active ? '#fff' : colors.icon} />
                                        </ScalePressable>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.colorStrip}>
                                {REMINDER_COLORS.map(({ name, value }) => {
                                    const active = value === styleColor;
                                    return (
                                        <ScalePressable
                                            key={value}
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
                                                setStyleColor(value);
                                            }}
                                            style={[
                                                styles.colorDot,
                                                { backgroundColor: value },
                                                active && { borderWidth: 2.5, borderColor: colors.text },
                                            ]}
                                            innerStyle={{ borderRadius: 16 }}
                                            scale={false}
                                            overlayColor="transparent"
                                            hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
                                            accessibilityRole="button"
                                            accessibilityLabel={`${name} colour`}
                                        />
                                    );
                                })}
                            </View>
                        </View>

                        <View style={styles.nudgeSection}>
                            <ThemedText style={[styles.inputLabel, { marginBottom: 10 }]}>Notifications</ThemedText>

                            <View style={styles.nudgeRow}>
                                {/* Persistent stage. It must outlive both children: when the
                                    branch that owns the animation is itself unmounted, the exit
                                    never plays, which is why activating animated but
                                    deactivating did not. Fixed height means no resize on swap. */}
                                <Animated.View style={[styles.nudgeStage, { height: SLIDER_COLUMN_HEIGHT }]}>
                                    {isCustomNudge ? (
                                    <Animated.View
                                        key="stepper"
                                        entering={FadeIn.delay(80).duration(180)}
                                        exiting={FadeOut.duration(160)}
                                        style={[styles.stepper, { backgroundColor: colors.surface }]}
                                    >
                                        <ScalePressable
                                            onPress={() => handleCustomCount(-1)}
                                            disabled={customCount <= 1}
                                            style={styles.stepperControlBtn}
                                            innerStyle={{ borderRadius: 16 }}
                                            accessibilityRole="button"
                                            accessibilityLabel="Fewer alerts"
                                        >
                                            <ThemedText style={[styles.stepGlyph, { color: customCount > 1 ? colors.text : colors.textTertiary }]}>-</ThemedText>
                                        </ScalePressable>

                                        <View style={styles.stepperValueBox} accessible accessibilityLabel={`${customCount} alerts`}>
                                            <ThemedText style={styles.stepperValue}>{customCount}</ThemedText>
                                        </View>

                                        <ScalePressable
                                            onPress={() => handleCustomCount(1)}
                                            disabled={customCount >= 10}
                                            style={styles.stepperControlBtn}
                                            innerStyle={{ borderRadius: 16 }}
                                            accessibilityRole="button"
                                            accessibilityLabel="More alerts"
                                        >
                                            <ThemedText style={[styles.stepGlyph, { color: customCount < 10 ? colors.text : colors.textTertiary }]}>+</ThemedText>
                                        </ScalePressable>
                                    </Animated.View>
                                    ) : (
                                    <Animated.View
                                        key="slider"
                                        entering={FadeIn.delay(80).duration(180)}
                                        exiting={FadeOut.duration(160)}
                                        style={styles.sliderSlot}
                                    >
                                        <NotificationSlider
                                            labels={NUDGE_LABELS}
                                            index={nudgeStepIndex}
                                            onChange={handleNudgeStep}
                                        />
                                    </Animated.View>
                                    )}
                                </Animated.View>

                                <ScalePressable
                                    onPress={handleToggleCustom}
                                    style={[
                                        styles.customToggle,
                                        !isCustomNudge && styles.customToggleAlign,
                                        { backgroundColor: isCustomNudge ? colors.tint : colors.surface },
                                    ]}
                                    innerStyle={{ borderRadius: CONTROL_HEIGHT / 2 }}
                                    scaleTo={0.94}
                                    accessibilityRole="button"
                                    accessibilityLabel="Custom alert count"
                                >
                                    <Sliders size={13} color={isCustomNudge ? colors.tintContrast : colors.secondary} />
                                    <ThemedText style={[styles.customToggleText, { color: isCustomNudge ? colors.tintContrast : colors.secondary }]}>
                                        Custom
                                    </ThemedText>
                                </ScalePressable>
                            </View>

                            <ThemedText
                                type="tiny"
                                style={{
                                    color: colors.secondary,
                                    marginTop: 8,
                                    fontStyle: 'italic',
                                    fontSize: 12,
                                    opacity: 0.8,
                                }}
                                numberOfLines={1}
                                adjustsFontSizeToFit
                            >
                                {nudgeHelper}
                            </ThemedText>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.mentionSection}>
                            <ThemedText style={[styles.inputLabel, { marginBottom: 10 }]}>Mention Someone</ThemedText>

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
        letterSpacing: 0.5,
        opacity: 0.5,
        marginBottom: 8,
        fontFamily: Typography.fontFamily.bold,
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
        marginVertical: 10,
    },
    timeSection: { marginBottom: 0 },
    pickersRow: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'flex-start',
    },
    pickerSlot: {
        flex: 1,
        marginBottom: -16,
    },
    styleSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    iconStrip: {
        gap: 8,
        paddingRight: 8,
    },
    iconTile: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 14,
    },
    colorDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    mentionSection: { marginBottom: 0 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: 16,
        marginBottom: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontFamily: Typography.fontFamily.medium,
    },
    // Empty-state floor only: it never clips, it just keeps the page from
    // collapsing when there is nobody to list yet.
    peopleList: {
        gap: 8,
        minHeight: 264,
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
    // flex-start pins the top of both side controls to the top of the track, so
    // they sit level with it. Centering them against the whole slider column
    // (track + label strip) dropped them below the track by the label height.
    // In the active state both children are CONTROL_HEIGHT tall, so top and
    // center alignment are identical there and the swap stays aligned.
    nudgeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    // Custom and the stepper both stand in for the track, so all three read
    // from one height constant instead of three hardcoded 34s.
    // Fixed width so the pill keeps the same footprint when it flips between
    // the muted and active states. Sizing it from its own content made the
    // active yellow pill read noticeably wider than everything beside it.
    customToggle: {
        width: 88,
        height: CONTROL_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderRadius: CONTROL_HEIGHT / 2,
    },
    // Optical alignment, not layout: nudged up a point only to sit level with
    // the track when the slider is showing. Against the stepper it would
    // leave the button hanging a point high, so the active state drops it back.
    customToggleAlign: {
        marginTop: -1,
    },
    customToggleText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
    },
    sliderSlot: {
        flex: 1,
    },
    // Outlives the swap so both children can run their own enter/exit.
    nudgeStage: {
        flex: 1,
        justifyContent: 'flex-start',
    },
    // alignSelf stretch (not flex: 1) fills the stage WIDTH while height stays
    // authoritative. As a column child, flex: 1 set flexBasis 0 and stretched the
    // pill to the full 61px stage, so CONTROL_HEIGHT only ever moved the corner
    // radius and the height changes were invisible.
    stepper: {
        alignSelf: 'stretch',
        flexDirection: 'row',
        alignItems: 'center',
        height: CONTROL_HEIGHT,
        // Independent optical nudge. The stage reserves a fixed height, so this
        // moves only the pill and cannot drag the helper text or anything below.
        marginTop: 2,
        paddingHorizontal: 14,
        // Deliberately under half the height, which reads as a rounded square
        // rather than the pill the Custom button and track use.
        borderRadius: 16,
    },
    // Fat enough to read as a real target next to the pill, while still
    // clearing the track edge inside it.
    stepperControlBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(128,128,128,0.16)',
    },
    stepperValueBox: {
        flex: 1,
        alignItems: 'center',
    },
    stepGlyph: {
        fontSize: 18,
        lineHeight: 21,
        fontFamily: Typography.fontFamily.bold,
    },
    stepperValue: {
        fontSize: 17,
        fontFamily: Typography.fontFamily.bold,
        textAlign: 'center',
    }
});
