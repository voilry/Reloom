import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, FlatList, DimensionValue } from 'react-native';
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
    const [activeIndex, setActiveIndex] = useState(() => items.findIndex(i => i.value === value));

    useEffect(() => {
        const index = items.findIndex(i => i.value === value);
        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
        }
    }, [value, items]);

    useEffect(() => {
        const index = Math.max(0, items.findIndex(i => i.value === value));
        if (listRef.current) {
            setTimeout(() => {
                listRef.current?.scrollToOffset({ offset: index * ITEM_HEIGHT, animated: false });
            }, 50);
        }
    }, [items]);

    const handleScroll = (e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        const safeIndex = Math.max(0, Math.min(items.length - 1, index));
        if (safeIndex !== activeIndex) {
            setActiveIndex(safeIndex);
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        }
    };

    const handleScrollEnd = React.useCallback((e: any) => {
        const y = e.nativeEvent.contentOffset.y;
        const index = Math.round(y / ITEM_HEIGHT);
        const safeIndex = Math.max(0, Math.min(items.length - 1, index));
        if (items[safeIndex] && items[safeIndex].value !== value) {
            onChange(items[safeIndex].value);
        }
    }, [items, value, onChange]);

    return (
        <View style={{ height: ITEM_HEIGHT * 5, width, position: 'relative' }}>
            <FlatList
                ref={listRef}
                data={items}
                keyExtractor={(item) => String(item.value)}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate={Platform.OS === 'ios' ? 'fast' : 0.985}
                onScroll={handleScroll}
                onMomentumScrollEnd={handleScrollEnd}
                onScrollEndDrag={handleScrollEnd}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                overScrollMode="never"
                removeClippedSubviews={false}
                getItemLayout={(data, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                ListHeaderComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
                ListFooterComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
                renderItem={({ item, index }) => {
                    const isSelected = index === activeIndex;
                    return (
                        <View style={{ height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                            <ThemedText style={{
                                fontSize: isSelected ? 20 : 16,
                                fontWeight: isSelected ? '800' : '500',
                                opacity: isSelected ? 1 : 0.4,
                                color: colors.text
                            }}>
                                {item.label}
                            </ThemedText>
                        </View>
                    );
                }}
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

            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShow(true)}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: 'transparent', borderWidth: 0 }]}
            >
                <ThemedText style={[styles.valueText, !value && { color: colors.text, opacity: 0.3 }]}>
                    {displayTime() || placeholder}
                </ThemedText>
                <Clock size={18} color={colors.text} style={{ opacity: 0.5 }} />
            </TouchableOpacity>

            {Platform.OS === 'ios' || Platform.OS === 'android' ? (
                <Modal visible={show} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShow(false)}>
                    <View style={styles.modalOverlay}>
                        <BlurView intensity={20} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <View style={styles.modalOverlay}>
                            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShow(false)} />
                            <View
                                style={[styles.pickerContainer, { backgroundColor: colors.card }]}
                            >
                                <View style={styles.header}>
                                    <ScalePressable
                                        onPress={() => setShow(false)}
                                        style={[styles.cancelButton, { backgroundColor: colors.surface }]}
                                    >
                                        <ThemedText style={{ color: colors.secondary, fontWeight: '700', fontSize: 13 }}>Cancel</ThemedText>
                                    </ScalePressable>
                                    <View style={{ flex: 1, alignItems: 'center' }}>
                                        <ThemedText type="sectionHeader" style={{ fontSize: 16, right: 10, opacity: 0.8 }}>{label || 'Select Time'}</ThemedText>
                                    </View>
                                    <ScalePressable
                                        onPress={handleSave}
                                        style={[styles.doneButton, { backgroundColor: colors.tint + '15' }]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        <Check size={20} color={colors.tint} weight="bold" />
                                    </ScalePressable>
                                </View>

                                <View style={styles.pickerWrapper}>
                                    <WheelPicker items={hoursText} value={tempHour} onChange={setTempHour} width="25%" />
                                    <ThemedText style={{ fontSize: 24, fontWeight: '800', marginHorizontal: 4 }}>:</ThemedText>
                                    <WheelPicker items={minutesText} value={tempMinute} onChange={setTempMinute} width="25%" />
                                    <View style={{ width: 16 }} />
                                    <WheelPicker items={ampmText} value={tempAmpm} onChange={setTempAmpm} width="30%" />

                                    <View style={[styles.selectionOverlay, { borderColor: colors.border, backgroundColor: colors.tint + '10' }]} pointerEvents="none" />
                                </View>
                            </View>
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
        paddingBottom: 40,
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 24,
        marginBottom: 8,
    },
    cancelButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    doneButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
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
