import { View, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions, Alert } from 'react-native';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { Card } from '../../components/ui/Card';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { JournalRepository, Journal } from '../../db/repositories/JournalRepository';
import { ReminderRepository, Reminder } from '../../db/repositories/ReminderRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { CaretLeft, CaretRight, Calendar, MapPin, Cake, ClockCounterClockwise as History, Book, Plus, Target, X, Bell, Trash, CheckCircle, RadioButton, Graph as Network } from 'phosphor-react-native';
import { AddReminderModal } from '../../components/calendar/AddReminderModal';
import { ReminderDetailModal } from '../../components/calendar/ReminderDetailModal';
import { DesignSystem } from '../../constants/DesignSystem';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';
import { Avatar } from '../../components/ui/Avatar';
import * as Haptics from 'expo-haptics';
import { Modal, Pressable } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout, SlideInDown, useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { Typography } from '../../constants/Typography';
import { QuickScrollButton } from '../../components/ui/QuickScrollButton';
import { AlertModal } from '../../components/ui/AlertModal';
import { useRef } from 'react';

const { width } = Dimensions.get('window');
const DAY_SIZE = 42; // Fixed smaller size for clean proportion

type Event = {
    type: 'birthday' | 'met' | 'journal' | 'reminder';
    id: number;
    title: string;
    subtitle?: string;
    person?: Person;
    journal?: Journal;
    reminder?: Reminder;
    completed?: boolean;
};

export default function CalendarScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { settings } = useSettings();
    const { colors, theme, hapticsEnabled } = useAppTheme();

    // Scroll Logic
    const scrollY = useSharedValue(0);
    const scrollDirection = useSharedValue<'up' | 'down'>('up');
    const isScrolling = useSharedValue(false);
    const hideTimeout = useRef<any>(null);
    const scrollRef = useRef<any>(null);
    const startHideTimer = useCallback(() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
            isScrolling.value = false;
        }, 800);
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - scrollY.value;
            
            if (Math.abs(diff) > 5) {
                scrollDirection.value = diff > 0 ? 'down' : 'up';
                isScrolling.value = currentY > 400;
            }
            scrollY.value = currentY;
            
            runOnJS(startHideTimer)();
        },
    });

    const handleQuickScroll = () => {
        if (scrollDirection.value === 'up') {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            scrollRef.current?.scrollToEnd({ animated: true });
        }
    };

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [people, setPeople] = useState<Person[]>([]);
    const [journals, setJournals] = useState<Journal[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [showAddReminder, setShowAddReminder] = useState(false);
    const [showPastDateAlert, setShowPastDateAlert] = useState(false);
    const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [eventToDelete, setEventToDelete] = useState<any>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        const [ppl, jrnls, rmds] = await Promise.all([
            PersonRepository.getAll(),
            JournalRepository.getAll(),
            ReminderRepository.getAll()
        ]);

        const validJournals = (jrnls || []).filter(j => j && j.id && (j.content?.trim() || j.title?.trim()));

        setPeople(ppl);
        setJournals(validJournals);
        setReminders(rmds || []);
    };

    const handleReminderSuccess = async () => {
        await loadData();
        const { showToast } = require('../../components/ui/Toast');
        showToast(editingReminder ? 'Reminder updated' : 'Reminder set');
        setEditingReminder(null);
    };

    const handleEditReminder = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setSelectedReminder(null);
        setShowAddReminder(true);
    };

    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // Map Sunday (0) to 6, Monday (1) to 0 etc.
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);

        const grid = [];
        for (let i = 0; i < firstDay; i++) {
            grid.push({ day: null, date: null });
        }
        for (let i = 1; i <= days; i++) {
            grid.push({ day: i, date: new Date(year, month, i) });
        }
        return grid;
    }, [currentDate]);

    const eventMap = useMemo(() => {
        const map: Record<string, { birthday: boolean; met: boolean; journal: boolean; reminder: boolean }> = {};

        people.forEach(p => {
            if (p.firstMet) {
                if (!map[p.firstMet]) map[p.firstMet] = { birthday: false, met: false, journal: false, reminder: false };
                map[p.firstMet].met = true;
            }
        });

        journals.forEach(j => {
            if (j.date && (j.content?.trim() || j.title?.trim())) {
                if (!map[j.date]) map[j.date] = { birthday: false, met: false, journal: false, reminder: false };
                map[j.date].journal = true;
            }
        });

        reminders.forEach(r => {
            if (r.date) {
                if (!map[r.date]) map[r.date] = { birthday: false, met: false, journal: false, reminder: false };
                map[r.date].reminder = true;
            }
        });

        return map;
    }, [people, journals, reminders]);

    const getEventsForDate = (date: Date | null) => {
        if (!date) return [];
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const monthDay = `${m}-${d}`;

        const events: Event[] = [];

        people.forEach(p => {
            if (p.birthdate && p.birthdate.endsWith(monthDay)) {
                events.push({ type: 'birthday', id: p.id, title: `${p.name}'s Birthday`, person: p });
            }
            if (p.firstMet === dateStr) {
                events.push({ type: 'met', id: p.id, title: `Met ${p.name}`, person: p });
            }
        });

        journals.forEach(j => {
            if (j.date === dateStr && (j.content?.trim() || j.title?.trim())) {
                events.push({ type: 'journal', id: j.id, title: j.title || 'Journal Entry', subtitle: j.content?.substring(0, 50), journal: j });
            }
        });

        reminders.forEach(r => {
            if (r.date === dateStr) {
                events.push({ 
                    type: 'reminder', 
                    id: r.id, 
                    title: r.title, 
                    subtitle: r.description || '', 
                    reminder: r, 
                    completed: !!r.completed,
                    person: (r as any).person?.name ? (r as any).person : undefined
                });
            }
        });

        return events;
    };

    const hasEvents = (date: Date | null) => {
        if (!date) return { birthday: false, met: false, journal: false, reminder: false };
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const monthDay = `${m}-${d}`;

        const base = eventMap[dateStr] || { birthday: false, met: false, journal: false, reminder: false };
        const birthday = people.some(p => p.birthdate && p.birthdate.endsWith(monthDay));

        return {
            ...base,
            birthday
        };
    };

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const handleGoToToday = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
        
        if (!settings.showJournalTab) {
            setShowAddReminder(true);
        } else {
            const selStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const existingJournal = journals.find(j => j.date === selStr);
            if (existingJournal) {
                router.push(`/journal/${existingJournal.id}`);
            } else {
                router.push({
                    pathname: '/journal/[id]',
                    params: {
                        id: 'new',
                        date: selStr,
                        edit: 'true'
                    }
                });
            }
        }
    };

    const handleQuickAddJournal = () => {
        if (!selectedDate) return;
        const today = new Date();
        const selStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        if (!settings.showJournalTab) {
            if (selStr < todayStr) {
                if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                setShowPastDateAlert(true);
                return;
            }
            setShowAddReminder(true);
        } else if (selStr > todayStr) {
            setShowAddReminder(true);
        } else {
            router.push({
                pathname: '/journal/[id]',
                params: {
                    id: 'new',
                    date: selStr,
                    edit: 'true'
                }
            });
            setShowDetailModal(false);
        }
    };

    const handleDeleteEvent = async (event: any) => {
        setEventToDelete(event);
    };

    const confirmDeleteEvent = async () => {
        if (eventToDelete) {
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
                if (eventToDelete.type === 'journal') {
                    await JournalRepository.delete(eventToDelete.id);
                } else if (eventToDelete.type === 'reminder') {
                    await ReminderRepository.delete(eventToDelete.id);
                }
                loadData();
            } catch (error) {
                console.error('Failed to delete event:', error);
            }
            setEventToDelete(null);
        }
    };

    const handleToggleReminder = async (reminder: any) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        try {
            await ReminderRepository.update(reminder.id, { completed: !reminder.completed });
            loadData();
        } catch (error) {
            console.error('Failed to toggle reminder:', error);
        }
    };

    const isSelected = (date: Date | null) => {
        if (!date || !selectedDate) return false;
        return date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate();
    };

    const isToday = (date: Date | null) => {
        if (!date) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate();
    };

    const selectedEvents = useMemo(() => getEventsForDate(selectedDate), [selectedDate, people, journals, reminders]);

    const upcomingEvents = useMemo(() => {
        const events: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysFromNow = new Date(today);
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        people.forEach(p => {
            if (p.birthdate) {
                const parts = p.birthdate.split('-');
                if (parts.length < 3) return;
                const month = parseInt(parts[1], 10);
                const day = parseInt(parts[2], 10);

                let bday = new Date(today.getFullYear(), month - 1, day);
                if (bday < today) {
                    bday.setFullYear(today.getFullYear() + 1);
                }

                if (bday <= thirtyDaysFromNow) {
                    events.push({
                        type: 'birthday',
                        date: bday,
                        title: `${p.name}'s Birthday`,
                        person: p,
                        daysUntil: Math.ceil((bday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    });
                }
            }
        });

        reminders.forEach(r => {
            if (r.date && !r.completed) {
                const rDate = new Date(r.date + 'T00:00:00');
                if (rDate >= today && rDate <= thirtyDaysFromNow) {
                    events.push({
                        type: 'reminder',
                        date: rDate,
                        title: r.title,
                        reminder: r,
                        person: (r as any).person?.name ? (r as any).person : undefined,
                        daysUntil: Math.ceil((rDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    });
                }
            }
        });

        return events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [people, reminders]);

    const renderDay = (item: { day: number | null, date: Date | null }, index: number) => {
        const markers = hasEvents(item.date) || { birthday: false, met: false, journal: false, reminder: false };
        const selected = isSelected(item.date);
        const today = isToday(item.date);

        return (
            <TouchableOpacity
                key={index}
                activeOpacity={0.7}
                onPress={() => {
                    if (item.date) {
                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                        setSelectedDate(item.date);
                        setShowDetailModal(true);
                    }
                }}
                style={[
                    styles.dayCell,
                    isSelected(item.date) && { backgroundColor: colors.tint + '15', borderRadius: 16 }
                ]}
            >
                {item.day && (
                    <View style={styles.dayContent}>
                        <ThemedText style={[
                            styles.dayText,
                            today && { color: colors.tint, fontWeight: '900' },
                            selected && { color: colors.tint }
                        ]}>
                            {item.day}
                        </ThemedText>
                        <View style={styles.markerRow}>
                            {markers.birthday && <View style={[styles.marker, { backgroundColor: '#FF6B6B' }]} />}
                            {markers.met && <View style={[styles.marker, { backgroundColor: '#4DABF7' }]} />}
                            {markers.journal && settings.showJournalTab && <View style={[styles.marker, { backgroundColor: '#51CF66' }]} />}
                            {markers.reminder && <View style={[styles.marker, { backgroundColor: colors.tint }]} />}
                        </View>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (!settings.showCalendarTab) return null;

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <Animated.ScrollView 
                ref={scrollRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <ThemedText type="display" style={styles.title}>Calendar</ThemedText>
                        <ScalePressable 
                            onPress={handleGoToToday} 
                            style={[styles.todayBtn, { backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border }]}
                            scaleTo={0.92}
                        >
                            <Target size={18} color={colors.tint} />
                            <ThemedText style={[styles.todayBtnText, { color: colors.tint }]}>Today</ThemedText>
                        </ScalePressable>
                    </View>
                    <View style={[styles.monthNav, { backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border }]}>
                        <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
                            <CaretLeft size={22} color={colors.text} />
                        </TouchableOpacity>
                        <ThemedText type="defaultSemiBold" style={styles.monthLabel}>
                            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                        </ThemedText>
                        <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
                            <CaretRight size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.calendarCardContainer}>
                    <View style={[styles.calendarCard, { backgroundColor: colors.card, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border }]}>
                        <View style={styles.calendarGrid}>
                            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((d, i) => (
                                <View key={i} style={styles.dayCell}>
                                    <ThemedText style={styles.weekdayText}>{d}</ThemedText>
                                </View>
                            ))}
                            {calendarData.map(renderDay)}
                        </View>
                    </View>
                </View>

                <View style={styles.upcomingSection}>
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="sectionHeader" style={styles.upcomingTitle}>Upcoming</ThemedText>
                        <ThemedText style={{ color: colors.secondary, fontSize: 13 }}>Next 30 days</ThemedText>
                    </View>

                    {upcomingEvents.length === 0 ? (
                        <View style={[styles.emptyUpcoming, { backgroundColor: colors.surface }]}>
                            <ThemedText style={{ opacity: 0.5 }}>No events coming up soon</ThemedText>
                        </View>
                    ) : (
                        upcomingEvents.map((event, idx) => (
                            <ScalePressable
                                key={idx}
                                onPress={() => {
                                    if (event.type === 'birthday' && event.person) {
                                        router.push(`/person/${event.person.id}`);
                                    } else if (event.reminder) {
                                        setSelectedReminder(event.reminder);
                                    }
                                }}
                                style={styles.upcomingItem}
                                scaleTo={0.98}
                                innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                            >
                                <Card style={styles.upcomingCard}>
                                    <View style={[styles.upcomingIcon, { backgroundColor: event.type === 'birthday' ? '#FF6B6B15' : colors.tint + '15' }]}>
                                        {event.type === 'birthday' ? <Cake size={20} color="#FF6B6B" /> : <Bell size={20} color={colors.tint} />}
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 16, marginTop: 4 }}>{event.title}</ThemedText>
                                        <ThemedText style={{ fontSize: 12, color: colors.secondary, marginTop: -4, fontFamily: Typography.fontFamily.medium }}>
                                            {event.date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                                            {event.reminder?.time ? ` • ${formatTime(event.reminder.time)}` : ''}
                                            {` • ${event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `In ${event.daysUntil} days`}`}
                                        </ThemedText>
                                    </View>
                                    {event.person && (
                                        <Avatar name={event.person.name} uri={event.person.avatarUri} size={36} />
                                    )}
                                    <CaretRight size={18} color={colors.icon} style={{ marginLeft: 8 }} />
                                </Card>
                            </ScalePressable>
                        ))
                    )}
                </View>
            </Animated.ScrollView>

            <Modal
                visible={showDetailModal}
                transparent
                animationType="none"
                onRequestClose={() => setShowDetailModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                    />
                    <Pressable
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                        onPress={() => setShowDetailModal(false)}
                    >
                        <Animated.View
                            entering={SlideInDown.duration(300).springify()}
                            style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: 100 + insets.bottom + 16 }]}
                            onStartShouldSetResponder={() => true}
                        >
                            <View style={styles.modalHandle} />
                            <View style={styles.modalHeader}>
                                <View>
                                    <ThemedText type="sectionHeader" style={{ fontSize: 24 }}>
                                        {selectedDate?.toLocaleDateString('default', { month: 'long', day: 'numeric' })}
                                    </ThemedText>
                                    <ThemedText style={{ color: colors.secondary, fontSize: 13 }}>
                                        {selectedEvents.length} Records
                                    </ThemedText>
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <ScalePressable
                                        onPress={handleQuickAddJournal}
                                        style={[styles.addEventBtn, { backgroundColor: colors.tint }]}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    >
                                        {(() => {
                                            const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
                                            const sel = selectedDate || new Date();
                                            const selStr = `${sel.getFullYear()}-${String(sel.getMonth() + 1).padStart(2, '0')}-${String(sel.getDate()).padStart(2, '0')}`;
                                            
                                            if (!settings.showJournalTab || selStr > todayStr) {
                                                return <Bell size={24} color={theme === 'light' ? '#fff' : '#000'} />;
                                            }
                                            return <Plus size={24} color={theme === 'light' ? '#fff' : '#000'} weight="bold" />;
                                        })()}
                                    </ScalePressable>
                                    <ScalePressable
                                        onPress={() => setShowDetailModal(false)}
                                        style={[styles.closeModalBtn, { backgroundColor: colors.surface }]}
                                        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    >
                                        <X size={24} color={colors.text} />
                                    </ScalePressable>
                                </View>
                            </View>

                            <ScrollView style={styles.eventList} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
                                {selectedEvents.length === 0 ? (
                                    <View style={styles.emptyEvents}>
                                        <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                                            <Calendar size={28} color={colors.icon} weight="duotone" />
                                        </View>
                                        <ThemedText type="sectionHeader" style={styles.emptyTitle}>No Status</ThemedText>
                                        <ThemedText style={[styles.emptySubtitle, { color: colors.secondary }]}>Everything is quiet.</ThemedText>
                                    </View>
                                ) : (
                                    selectedEvents.map((event, idx) => (
                                        <View
                                            key={idx}
                                            style={styles.eventItemContainer}
                                        >
                                            <TouchableOpacity
                                                style={{ flex: 1 }}
                                                onPress={() => {
                                                    if (event.type === 'journal') {
                                                        setShowDetailModal(false);
                                                        router.push(`/journal/${event.id}`);
                                                    } else if (event.type === 'birthday' || event.type === 'met') {
                                                        setShowDetailModal(false);
                                                        router.push(`/person/${event.id}`);
                                                    } else if (event.type === 'reminder') {
                                                        setSelectedReminder(event.reminder || null);
                                                    }
                                                }}
                                            >
                                                <Card style={[styles.eventCard, event.type === 'reminder' && event.completed && { opacity: 0.5 }]}>
                                                    <View style={[styles.eventIcon, {
                                                        backgroundColor: (event.type === 'reminder' && event.person) ? 'transparent' : 
                                                            (event.type === 'birthday' ? '#FF6B6B20' :
                                                             event.type === 'met' ? '#4DABF720' :
                                                             event.type === 'journal' ? '#51CF6620' : colors.tint + '20')
                                                    }]}>
                                                        {event.type === 'birthday' && <Cake size={22} color="#FF6B6B" />}
                                                        {event.type === 'met' && <History size={22} color="#4DABF7" />}
                                                        {event.type === 'journal' && <Book size={22} color="#51CF66" />}
                                                        {event.type === 'reminder' && (
                                                            event.person ? (
                                                                <View style={{ borderRadius: 21, overflow: 'hidden' }}>
                                                                    <Avatar name={event.person.name} uri={event.person.avatarUri} size={42} />
                                                                </View>
                                                            ) : (
                                                                <Bell size={22} color={colors.tint} />
                                                            )
                                                        )}
                                                    </View>
                                                    <View style={styles.eventInfo}>
                                                        <ThemedText type="defaultSemiBold" style={[{ fontSize: 17 }, event.type === 'reminder' && event.completed && { textDecorationLine: 'line-through' }]}>
                                                            {event.title}
                                                        </ThemedText>
                                                        {event.subtitle && event.type !== 'reminder' && (
                                                            <ThemedText type="small" style={{ color: colors.secondary, marginTop: 4 }} numberOfLines={2}>
                                                                {event.subtitle}
                                                            </ThemedText>
                                                        )}
                                                    </View>
                                                    {event.person && event.type !== 'reminder' && (
                                                        <Avatar name={event.person.name} uri={event.person.avatarUri} size={32} />
                                                    )}
                                                </Card>
                                            </TouchableOpacity>

                                            <View style={styles.eventActions}>
                                                {event.type === 'reminder' && (
                                                    <ScalePressable
                                                        onPress={() => handleToggleReminder(event)}
                                                        style={{ width: 44, height: 44 }}
                                                        scaleTo={0.9}
                                                        innerStyle={{ borderRadius: 14 }}
                                                    >
                                                        <View style={[styles.actionBtn, { backgroundColor: event.completed ? (colors.success + '15') : colors.surface }]}>
                                                            {event.completed ?
                                                                <CheckCircle size={18} color={colors.success} /> :
                                                                <RadioButton size={18} color={colors.icon} />
                                                            }
                                                        </View>
                                                    </ScalePressable>
                                                )}
                                                {(event.type === 'journal' || event.type === 'reminder') && (
                                                    <ScalePressable
                                                        onPress={() => handleDeleteEvent(event)}
                                                        style={{ width: 44, height: 44 }}
                                                        scaleTo={0.9}
                                                        innerStyle={{ borderRadius: 14 }}
                                                    >
                                                        <View style={[styles.actionBtn, { backgroundColor: colors.error + '10' }]}>
                                                            <Trash size={18} color={colors.error} />
                                                        </View>
                                                    </ScalePressable>
                                                )}
                                            </View>
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                        </Animated.View>
                    </Pressable>
                </View>
            </Modal>

            <AddReminderModal
                visible={showAddReminder}
                onClose={() => {
                    setShowAddReminder(false);
                    setEditingReminder(null);
                    loadData(); // Ensure fresh data on close
                }}
                date={selectedDate || undefined}
                onSuccess={handleReminderSuccess}
                editingReminder={editingReminder}
            />

            <ReminderDetailModal
                visible={!!selectedReminder}
                reminder={selectedReminder}
                onClose={() => setSelectedReminder(null)}
                onToggle={(r) => handleToggleReminder(r)}
                onDelete={(r) => handleDeleteEvent({ type: 'reminder', id: r.id })}
                onEdit={handleEditReminder}
            />

            <DeleteModal
                visible={!!eventToDelete}
                title="Delete Entry"
                description={`Are you sure you want to remove this ${eventToDelete?.type}?`}
                onCancel={() => setEventToDelete(null)}
                onDelete={confirmDeleteEvent}
            />
            <AlertModal
                visible={showPastDateAlert}
                title="Action Not Allowed"
                description="Reminders cannot be set for past dates. Please select today or a future date."
                type="warning"
                onClose={() => setShowPastDateAlert(false)}
            />
            <QuickScrollButton 
                isScrolling={isScrolling} 
                direction={scrollDirection} 
                onPress={handleQuickScroll} 
            />
        </ThemedView >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingHorizontal: DesignSystem.spacing.md,
        marginTop: DesignSystem.spacing.md,
        marginBottom: DesignSystem.spacing.lg,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
    },
    todayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    todayBtnText: {
        fontSize: 13,
        fontWeight: '700',
    },
    monthNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 6,
        borderRadius: 20,
    },
    navBtn: {
        padding: 8,
        borderRadius: 14,
    },
    monthLabel: {
        fontSize: 16,
        letterSpacing: 0.2,
    },
    calendarCardContainer: {
        paddingHorizontal: DesignSystem.spacing.lg,
        alignItems: 'center',
    },
    calendarCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 8,
        ...DesignSystem.shadows.sm,
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        width: DAY_SIZE * 7,
        alignSelf: 'center',
    },
    dayCell: {
        width: DAY_SIZE,
        height: DAY_SIZE + 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: DAY_SIZE - 4,
        height: DAY_SIZE - 4,
        borderRadius: (DAY_SIZE - 4) / 2,
    },
    weekdayText: {
        fontSize: 10,
        fontWeight: '800',
        opacity: 0.4,
        letterSpacing: 0.5,
    },
    dayText: {
        fontSize: 15,
        fontWeight: '600',
    },
    markerRow: {
        flexDirection: 'row',
        gap: 3,
        marginTop: 4,
        height: 6,
        justifyContent: 'center',
    },
    marker: {
        width: 4,
        height: 4,
        borderRadius: 2,
    },
    eventList: {
        marginTop: 10,
        flex: 1,
    },
    eventItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    eventCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    eventActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventIcon: {
        width: 42,
        height: 42,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    eventInfo: { flex: 1, marginLeft: 16 },
    emptyEvents: {
        paddingTop: 60,
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        marginBottom: 2,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.6,
    },
    upcomingSection: {
        marginTop: 32,
        paddingHorizontal: DesignSystem.spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 16,
    },
    upcomingTitle: {
        fontSize: 22,
        opacity: 0.9,
    },
    upcomingItem: {
        marginBottom: 12,
    },
    upcomingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    upcomingIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyUpcoming: {
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalOverlay: {
        flex: 1,
    },
    modalContent: {
        height: '82%',
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: DesignSystem.spacing.lg,
        paddingTop: 10,
        // Extend background below screen to eliminate any gap
        marginBottom: -100,
        paddingBottom: 100,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    addEventBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeModalBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
