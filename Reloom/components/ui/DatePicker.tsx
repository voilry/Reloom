import React, { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, FlatList, DimensionValue } from 'react-native';
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

function WheelPicker({ items, value, onChange, width }: { items: { label: string, value: number }[], value: number, onChange: (value: number) => void, width: DimensionValue }) {
    const { colors, hapticsEnabled } = useAppTheme();
    const listRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(() => items.findIndex(i => i.value === value));

    // Sync activeIndex if value changes externally
    useEffect(() => {
        const index = items.findIndex(i => i.value === value);
        if (index !== -1 && index !== activeIndex) {
            setActiveIndex(index);
        }
    }, [value, items]);

    // Initial scroll setup
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

export function DatePicker({ value, onChange, label, placeholder = 'Select Date', maxDate, minDate }: DatePickerProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [show, setShow] = useState(false);

    const currentDate = value ? new Date(value) : new Date();
    const safeDate = isNaN(currentDate.getTime()) ? new Date() : currentDate;

    const [tempYear, setTempYear] = useState(safeDate.getFullYear());
    const [tempMonth, setTempMonth] = useState(safeDate.getMonth() + 1);
    const [tempDay, setTempDay] = useState(safeDate.getDate());

    useEffect(() => {
        if (show) {
            const d = value ? new Date(value) : new Date();
            const s = isNaN(d.getTime()) ? new Date() : d;
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

    const displayDate = value ? new Date(value).toLocaleDateString('en-US', {
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
        if (days.length > 0 && !days.find(d => d.value === tempDay)) {
            setTempDay(days[0].value);
        } else if (tempDay > daysInMonth) {
            setTempDay(daysInMonth);
        }
    }, [days, daysInMonth]);

    return (
        <View style={styles.container}>
            {label && <ThemedText type="sectionHeader" style={[styles.label, { color: colors.text, opacity: 0.5 }]}>{label}</ThemedText>}

            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShow(true)}
                style={[styles.input, { backgroundColor: colors.surface, borderColor: 'transparent', borderWidth: 0 }]}
            >
                <ThemedText style={[styles.valueText, !value && { color: colors.text, opacity: 0.3 }]}>
                    {displayDate || placeholder}
                </ThemedText>
                <Calendar size={18} color={colors.text} style={{ opacity: 0.5 }} />
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
                                            <ThemedText type="sectionHeader" style={{ fontSize: 14, textAlign: 'center', opacity: 0.8 }}>{label || 'Select Date'}</ThemedText>
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
                                        <WheelPicker items={months} value={tempMonth} onChange={setTempMonth} width="35%" />
                                        <WheelPicker items={days} value={tempDay} onChange={setTempDay} width="25%" />
                                        <WheelPicker items={years} value={tempYear} onChange={setTempYear} width="40%" />
                                        
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
        fontSize: 14,
        marginBottom: 8,
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
