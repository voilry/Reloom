import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Modal, Pressable, FlatList, DimensionValue, Keyboard, Animated as RNAnimated } from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Calendar, Check } from '@/components/ui/Icon';
import { BlurView } from 'expo-blur';
import { DesignSystem } from '../../constants/DesignSystem';
import { ScalePressable } from './ScalePressable';
import * as Haptics from 'expo-haptics';

interface DatePickerProps {
    value: string; // ISO date YYYY-MM-DD
    onChange: (date: string) => void;
    label?: string;
    placeholder?: string;
    maxDate?: Date; // Optional: restrict selection up to this date
    minDate?: Date; // Optional: restrict selection from this date
}

const ITEM_HEIGHT = 44;

// Stable array identity: the months/days memos below rebuild on every temp
// change even when content is identical (Jan has 31 days in every year).
// A fresh identity makes FlatList re-render all rows during the settle
// snap = visible hitch/flash on the neighboring wheels. Keep the previous
// ref whenever labels + values match.
function useStableItems<T extends { label: string; value: any }>(items: T[]): T[] {
    const ref = useRef<T[]>(items);
    const prev = ref.current;
    if (prev.length === items.length && prev.every((p, i) => p.label === items[i].label && p.value === items[i].value)) {
        return prev;
    }
    ref.current = items;
    return items;
}

function WheelPicker({ items, value, onChange, width }: { items: { label: string, value: number }[], value: number, onChange: (value: number) => void, width: DimensionValue }) {
    const { colors, hapticsEnabled } = useAppTheme();
    const listRef = useRef<FlatList>(null);
    const initialIndex = React.useMemo(() => {
        const idx = items.findIndex(i => i.value === value);
        return idx !== -1 ? idx : 0;
    }, [items, value]);
    // Native-driven scroll position. Row highlight (scale/opacity) is
    // interpolated on the native thread every frame — zero setState while
    // scrolling, so the list holds 60fps even on fast flings.
    const scrollY = useRef(new RNAnimated.Value(initialIndex * ITEM_HEIGHT)).current;
    const lastTick = useRef(-1);
    const lastHapticAt = useRef(0);
    // Last settled index — onScrollEndDrag + onMomentumScrollEnd both fire
    // for a single flick, so guard against committing twice.
    // Initialized to the mount position so the sync effect below no-ops
    // until a genuinely external change arrives.
    const committedRef = useRef<number | null>(initialIndex);
    // Haptics flag via ref so the stable scroll event below never goes stale.
    const hapticsRef = useRef(hapticsEnabled);
    hapticsRef.current = hapticsEnabled;

    // Created ONCE. Re-creating the Animated.event mapping on every parent
    // render (i.e. on every commit) re-attached the native listener
    // mid-settle and dropped in-flight updates for a frame — that was the
    // old-highlight flash. Listener only tracks detents for throttled
    // clicks: no setState and no onChange here, so the JS thread stays free.
    const scrollEvent = React.useMemo(() => RNAnimated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        {
            useNativeDriver: true,
            listener: (e: any) => {
                const tick = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
                if (tick !== lastTick.current) {
                    lastTick.current = tick;
                    const now = Date.now();
                    // iOS-style detent clicks, throttled so a fast fling ticks
                    // instead of flooding the haptic engine (old code fired an
                    // unthrottled haptic per row = stutter).
                    if (hapticsRef.current && Platform.OS !== 'web' && now - lastHapticAt.current > 70) {
                        lastHapticAt.current = now;
                        Haptics.selectionAsync().catch(() => {});
                    }
                }
            },
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    ), []);

    // Stable identity: a fresh renderItem closure on every commit made
    // FlatList rebuild visible rows mid-settle — same flash family as the
    // event re-attach. Rows now only re-render on theme change.
    const renderWheelItem = React.useCallback(({ item, index }: { item: { label: string, value: number }, index: number }) => {
        // Row is centered exactly when scrollY = index * H
        // (2H header spacer, 5H viewport) — matches snap rests,
        // so highlight and snap always agree.
        const inputRange = [
            (index - 2) * ITEM_HEIGHT,
            (index - 1) * ITEM_HEIGHT,
            index * ITEM_HEIGHT,
            (index + 1) * ITEM_HEIGHT,
            (index + 2) * ITEM_HEIGHT,
        ];
        const scale = scrollY.interpolate({
            inputRange,
            outputRange: [0.85, 0.93, 1.08, 0.93, 0.85],
            extrapolate: 'clamp',
        });
        const opacity = scrollY.interpolate({
            inputRange,
            outputRange: [0.3, 0.5, 1, 0.5, 0.3],
            extrapolate: 'clamp',
        });
        return (
            <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <RNAnimated.Text style={{
                    fontSize: 19,
                    fontWeight: '700',
                    color: colors.text,
                    opacity,
                    transform: [{ scale }],
                }}>
                    {item.label}
                </RNAnimated.Text>
            </View>
        );
    }, [scrollY, colors.text]);

    const handleScrollEnd = React.useCallback((e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const safeIndex = Math.max(0, Math.min(items.length - 1, Math.round(y / ITEM_HEIGHT)));
        lastTick.current = safeIndex;
        if (safeIndex === committedRef.current) return;
        committedRef.current = safeIndex;
        if (items[safeIndex]) {
            onChange(items[safeIndex].value);
        }
    }, [items, onChange]);

    // Re-sync position when the value changes from OUTSIDE a gesture:
    // modal reopen resets the temps, and month/year picks clamp the day
    // (e.g. 31 -> 28 in Feb). Our own commits already match committedRef,
    // so this never fights the finger. Without it the wheel keeps its old
    // scroll position while showing a new value — highlight lies.
    useEffect(() => {
        if (items.length === 0) return;
        const idx = items.findIndex(i => i.value === value);
        const target = idx !== -1 ? idx : items.length - 1;
        if (target === committedRef.current) return;
        committedRef.current = target;
        lastTick.current = target;
        // Mute ticks caused by this programmatic jump (not a user gesture).
        lastHapticAt.current = Date.now();
        listRef.current?.scrollToOffset({ offset: target * ITEM_HEIGHT, animated: false });
    }, [value, items]);

    return (
        <View style={{ height: ITEM_HEIGHT * 5, width, position: 'relative' }}>
            <RNAnimated.FlatList
                ref={listRef}
                data={items}
                keyExtractor={(item) => String(item.value)}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.985}
                onScroll={scrollEvent}
                onMomentumScrollEnd={handleScrollEnd}
                onScrollEndDrag={handleScrollEnd}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                overScrollMode="never"
                removeClippedSubviews={Platform.OS === 'android'}
                maxToRenderPerBatch={10}
                windowSize={5}
                getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                initialScrollIndex={items.length > 0 ? initialIndex : undefined}
                ListHeaderComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
                ListFooterComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
                renderItem={renderWheelItem}
            />
        </View>
    );
}

export function DatePicker({ value, onChange, label, placeholder = 'Select Date', maxDate, minDate }: DatePickerProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [show, setShow] = useState(false);

    const parseLocalDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-');
        if (parts.length !== 3) return new Date();
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dateObj = new Date(y, m, d);
        return isNaN(dateObj.getTime()) ? new Date() : dateObj;
    };

    const safeDate = parseLocalDate(value);

    const [tempYear, setTempYear] = useState(safeDate.getFullYear());
    const [tempMonth, setTempMonth] = useState(safeDate.getMonth() + 1);
    const [tempDay, setTempDay] = useState(safeDate.getDate());

    useEffect(() => {
        if (show) {
            Keyboard.dismiss();
            const s = parseLocalDate(value);
            setTempYear(s.getFullYear());
            setTempMonth(s.getMonth() + 1);
            setTempDay(s.getDate());
        }
    }, [show, value]);

    const handleSave = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShow(false);
        const y = tempYear;
        const m = String(tempMonth).padStart(2, '0');
        const d = String(tempDay).padStart(2, '0');
        onChange(`${y}-${m}-${d}`);
    };

    const displayDate = value ? parseLocalDate(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }) : ''; // Matches app standard "Dec 18, 2006"

    const years = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        const minYear = minDate ? minDate.getFullYear() : currentYear - 100;
        const maxYear = maxDate ? maxDate.getFullYear() : currentYear + 50;
        const count = Math.max(1, maxYear - minYear + 1);
        return Array.from({ length: count }, (_, i) => ({ label: String(minYear + i), value: minYear + i }));
    }, [maxDate, minDate]);

    const months = React.useMemo(() => {
        const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return allMonths.map((m, i) => {
            const monthVal = i + 1;
            let disabled = false;
            
            if (minDate && tempYear === minDate.getFullYear() && monthVal < (minDate.getMonth() + 1)) {
                disabled = true;
            }
            if (maxDate && tempYear === maxDate.getFullYear() && monthVal > (maxDate.getMonth() + 1)) {
                disabled = true;
            }
            
            return { label: m, value: monthVal, disabled };
        }).filter(m => !m.disabled);
    }, [minDate, maxDate, tempYear]);

    const daysInMonth = new Date(tempYear, tempMonth, 0).getDate();
    const days = React.useMemo(() => {
        return Array.from({ length: daysInMonth }, (_, i) => {
            const dayVal = i + 1;
            let disabled = false;

            if (minDate && tempYear === minDate.getFullYear() && tempMonth === (minDate.getMonth() + 1) && dayVal < minDate.getDate()) {
                disabled = true;
            }
            if (maxDate && tempYear === maxDate.getFullYear() && tempMonth === (maxDate.getMonth() + 1) && dayVal > maxDate.getDate()) {
                disabled = true;
            }

            return { label: String(dayVal), value: dayVal, disabled };
        }).filter(d => !d.disabled);
    }, [daysInMonth, minDate, maxDate, tempYear, tempMonth]);

    // Auto-adjust if selection becomes invalid due to range change
    useEffect(() => {
        if (months.length > 0 && !months.find(m => m.value === tempMonth)) {
            setTempMonth(months[0].value);
        }
    }, [months]);

    useEffect(() => {
        if (days.length > 0) {
            const maxDay = days[days.length - 1].value;
            if (tempDay > maxDay) {
                setTempDay(maxDay);
            } else if (!days.find(d => d.value === tempDay)) {
                setTempDay(days[0].value);
            }
        }
    }, [days]);

    return (
        <View style={styles.container}>
            {label && <ThemedText type="defaultSemiBold" style={[styles.label, { color: colors.text, opacity: 0.5 }]}>{label}</ThemedText>}

            <ScalePressable
                onPress={() => setShow(true)}
                style={[styles.input, { backgroundColor: colors.surface }]}
                innerStyle={{ borderRadius: 16 }}
                scaleTo={0.97}
            >
                <ThemedText style={[styles.valueText, !value && { color: colors.text, opacity: 0.3 }]}>
                    {displayDate || placeholder}
                </ThemedText>
                <Calendar size={18} color={colors.text} style={{ opacity: 0.5 }} />
            </ScalePressable>

            {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                <Modal visible={show} transparent animationType="none" statusBarTranslucent onRequestClose={() => setShow(false)}>
                    <View style={styles.modalOverlay}>
                        <Animated.View entering={FadeIn.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                            {Platform.OS === 'ios' && (
                                <BlurView intensity={20} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                            )}
                        </Animated.View>
                        <View style={styles.modalOverlay}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} />
                            <Animated.View
                                entering={SlideInDown.duration(250).springify().damping(20).stiffness(180).mass(0.8)}
                                style={[styles.pickerContainer, { backgroundColor: colors.card }]}
                            >
                                    <View style={styles.header}>
                                        <View style={[styles.headerSide, { alignItems: 'flex-start' }]}>
                                            <ScalePressable
                                                onPress={() => setShow(false)}
                                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                scaleTo={0.93}
                                                overlayColor="transparent"
                                            >
                                                <ThemedText style={{ color: colors.secondary, fontWeight: '600', fontSize: 16 }}>Cancel</ThemedText>
                                            </ScalePressable>
                                        </View>
                                        <View style={{ flex: 1, alignItems: 'center' }}>
                                            <ThemedText type="sectionHeader" style={{ fontSize: 14, textAlign: 'center', opacity: 0.8 }}>{label || 'Select Date'}</ThemedText>
                                        </View>
                                        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
                                            <ScalePressable
                                                onPress={handleSave}
                                                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                                scaleTo={0.93}
                                                overlayColor="transparent"
                                            >
                                                <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 16 }}>Done</ThemedText>
                                            </ScalePressable>
                                        </View>
                                    </View>

                                    <View style={styles.pickerWrapper}>
                                        <WheelPicker items={useStableItems(months)} value={tempMonth} onChange={setTempMonth} width="35%" />
                                        <WheelPicker items={useStableItems(days)} value={tempDay} onChange={setTempDay} width="25%" />
                                        <WheelPicker items={useStableItems(years)} value={tempYear} onChange={setTempYear} width="40%" />
                                        
                                        <View style={[styles.selectionOverlay, { borderColor: colors.border, backgroundColor: colors.tint + '10' }]} pointerEvents="none" />
                                    </View>
                            </Animated.View>
                        </View>
                    </View>
                </Modal>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
        letterSpacing: 0.1,
        lineHeight: 20,
    },
    input: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 16,
    },
    valueText: {
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBlur: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    pickerContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: 100,
        marginBottom: -60,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 4,
    },
    // Equal-width side slots: "Cancel" is wider than "Done", so without
    // this the middle title drifts right. Fixed slots keep it truly centered.
    headerSide: {
        width: 70,
        justifyContent: 'center',
    },

    pickerWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: ITEM_HEIGHT * 5,
    },
    selectionOverlay: {
        position: 'absolute',
        top: ITEM_HEIGHT * 2,
        height: ITEM_HEIGHT,
        width: '100%',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderRadius: 8,
    }
});
