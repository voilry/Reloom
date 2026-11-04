import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Modal, Pressable, FlatList, DimensionValue, Keyboard, Animated as RNAnimated } from 'react-native';
import Animated, { SlideInDown, FadeIn } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Clock, Check, X } from '@/components/ui/Icon';
import { BlurView } from 'expo-blur';
import { DesignSystem } from '../../constants/DesignSystem';
import { ScalePressable } from './ScalePressable';
import * as Haptics from 'expo-haptics';

interface TimePickerProps {
    value: string; // "HH:MM" (24h) or "hh:mm A" based on format
    onChange: (time: string) => void;
    label?: string;
    placeholder?: string;
}

const ITEM_HEIGHT = 44;

function WheelPicker({ items, value, onChange, width }: { items: { label: string, value: any }[], value: any, onChange: (value: any) => void, width: DimensionValue }) {
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
    const renderWheelItem = React.useCallback(({ item, index }: { item: { label: string, value: any }, index: number }) => {
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
        if (items[safeIndex] && items[safeIndex].value !== value) {
            onChange(items[safeIndex].value);
        }
    }, [items, value, onChange]);

    // Re-sync position when the value changes from OUTSIDE a gesture
    // (modal reopen resets the temps). Our own commits already match
    // committedRef, so this never fights the finger. Without it the wheel
    // keeps its old scroll position while showing a new value.
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

export function TimePicker({ value, onChange, label, placeholder = 'Select Time' }: TimePickerProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [show, setShow] = useState(false);

    // Parse "HH:MM" 24h into 12h format
    const parseTime = (timeStr: string) => {
        if (!timeStr) return { h: 9, m: 0, ap: 'AM' };
        let [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h)) h = 9;
        if (isNaN(m)) m = 0;
        const ap = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return { h: h12, m, ap };
    };

    const initialTime = parseTime(value);

    const [tempHour, setTempHour] = useState(initialTime.h);
    const [tempMinute, setTempMinute] = useState(initialTime.m);
    const [tempAmpm, setTempAmpm] = useState(initialTime.ap);

    useEffect(() => {
        if (show) {
            Keyboard.dismiss();
            const current = parseTime(value);
            setTempHour(current.h);
            setTempMinute(current.m);
            setTempAmpm(current.ap);
        }
    }, [show, value]);

    const handleSave = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShow(false);
        // Convert back to 24h for saving
        let h24 = tempHour;
        if (tempAmpm === 'PM' && tempHour !== 12) h24 += 12;
        if (tempAmpm === 'AM' && tempHour === 12) h24 = 0;

        const hStr = String(h24).padStart(2, '0');
        const mStr = String(tempMinute).padStart(2, '0');
        onChange(`${hStr}:${mStr}`);
    };

    const displayTime = () => {
        if (!value) return '';
        const { h, m, ap } = parseTime(value);
        return `${h}:${String(m).padStart(2, '0')} ${ap}`;
    };

    const hoursText = React.useMemo(() => Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), value: i + 1 })), []);
    const minutesText = React.useMemo(() => Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, '0'), value: i })), []);
    const ampmText = React.useMemo(() => [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }], []);

    return (
        <View style={styles.container}>
            {label && <ThemedText style={[styles.label, { color: colors.text, opacity: 0.5 }]}>{label}</ThemedText>}

            <ScalePressable
                onPress={() => setShow(true)}
                style={[styles.input, { backgroundColor: colors.surface }]}
                innerStyle={{ borderRadius: 16 }}
                scaleTo={0.97}
            >
                <ThemedText style={[styles.valueText, !value && { color: colors.text, opacity: 0.3 }]}>
                    {displayTime() || placeholder}
                </ThemedText>
                <Clock size={18} color={colors.text} style={{ opacity: 0.5 }} />
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
                                        <ThemedText type="sectionHeader" style={{ fontSize: 14, textAlign: 'center', opacity: 0.8 }}>{label || 'Select Time'}</ThemedText>
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
                                    <WheelPicker items={hoursText} value={tempHour} onChange={setTempHour} width="25%" />
                                    <ThemedText style={{ fontSize: 24, fontWeight: '800', marginHorizontal: 4 }}>:</ThemedText>
                                    <WheelPicker items={minutesText} value={tempMinute} onChange={setTempMinute} width="25%" />
                                    <View style={{ width: 16 }} />
                                    <WheelPicker items={ampmText} value={tempAmpm} onChange={setTempAmpm} width="30%" />

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
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        lineHeight: 16,
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
