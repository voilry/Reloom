import { View, StyleSheet, Modal, ScrollView, Platform, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '../ui/ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Calendar, Clock, X, CheckCircle, CheckCircleDash, RadioButton, Trash, PencilSimple as Pencil } from '@/components/ui/Icon';
import { Reminder } from '../../db/repositories/ReminderRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import Animated, { FadeIn, SlideInDown, FadeInDown } from 'react-native-reanimated';
import { Avatar } from '../ui/Avatar';
import { Typography } from '../../constants/Typography';
import { useRouter } from 'expo-router';
import { ScalePressable } from '../ui/ScalePressable';

interface ReminderDetailModalProps {
    visible: boolean;
    reminder: any | null; // Using any because Repository returns joined person
    onClose: () => void;
    onToggle: (reminder: Reminder) => void;
    onDelete: (reminder: Reminder) => void;
    onEdit: (reminder: Reminder) => void;
}

export function ReminderDetailModal({ visible, reminder, onClose, onToggle, onDelete, onEdit }: ReminderDetailModalProps) {
    const { colors, hapticsEnabled, theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    if (!visible || !reminder) return null;

    const parseReminderDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        const parts = dateStr.split('-').map(Number);
        if (parts.length >= 3 && !parts.some(isNaN)) {
            return new Date(parts[0], parts[1] - 1, parts[2]);
        }
        return new Date(dateStr);
    };

    const formattedDate = parseReminderDate(reminder.date).toLocaleDateString('default', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={styles.modalBackdrop} onPress={onClose}>
                    <Animated.View
                        entering={SlideInDown.duration(300).springify()}
                        style={[
                            styles.modalContent,
                            { backgroundColor: colors.card, paddingBottom: 100 + insets.bottom + 24 }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.handle} />
                        
                        <View style={styles.header}>
                            <View style={styles.titleWrap}>
                                <ThemedText type="display" numberOfLines={2} style={[styles.title, reminder.completed && { textDecorationLine: 'line-through', opacity: 0.6 }]}>
                                    {reminder.title}
                                </ThemedText>
                            </View>
                            <View style={styles.headerActions}>
                                <ScalePressable 
                                    onPress={() => onEdit(reminder)}
                                    style={[styles.circleBtn, { backgroundColor: colors.surface }]}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    scaleTo={0.9}
                                    innerStyle={{ borderRadius: 22 }}
                                >
                                    <Pencil size={20} color={colors.text} />
                                </ScalePressable>
                                <ScalePressable 
                                    onPress={onClose} 
                                    style={[styles.circleBtn, { backgroundColor: colors.surface }]}
                                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                    scaleTo={0.9}
                                    innerStyle={{ borderRadius: 22 }}
                                >
                                    <X size={20} color={colors.text} />
                                </ScalePressable>
                            </View>
                        </View>

                        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 4 }}>
                            {reminder.description ? (
                                <ThemedText style={[styles.description, { color: colors.secondary }]}>
                                    {reminder.description}
                                </ThemedText>
                            ) : null}

                            <View style={[styles.metaGrid, { borderColor: colors.border + '40' }]}>
                                <View style={styles.metaItem}>
                                    <View style={styles.metaIconWrapper}>
                                        <Calendar size={20} color={colors.icon} weight="duotone" />
                                    </View>
                                    <View style={styles.metaText}>
                                        <ThemedText type="tiny" style={styles.metaLabel}>Date</ThemedText>
                                        <ThemedText style={styles.metaValue}>{formattedDate}</ThemedText>
                                    </View>
                                </View>
                                <View style={styles.metaItem}>
                                    <View style={styles.metaIconWrapper}>
                                        <Clock size={20} color={colors.icon} weight="duotone" />
                                    </View>
                                    <View style={styles.metaText}>
                                        <ThemedText type="tiny" style={styles.metaLabel}>Time</ThemedText>
                                        <ThemedText style={styles.metaValue}>{formatTime(reminder.time)}</ThemedText>
                                    </View>
                                </View>
                            </View>

                            {reminder.person && reminder.person.name && (
                                <ScalePressable 
                                    onPress={() => {
                                        onClose();
                                        router.push(`/person/${reminder.person.id}`);
                                    }}
                                    style={{ marginTop: 8 }}
                                    scaleTo={0.96}
                                    innerStyle={{ borderRadius: 24 }}
                                >
                                    <Animated.View entering={FadeInDown.delay(100)} style={[styles.personCard, { backgroundColor: colors.surface }]}>
                                        <Avatar name={reminder.person.name} uri={reminder.person.avatarUri} size={44} />
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <ThemedText type="defaultSemiBold">{reminder.person.name}</ThemedText>
                                            <ThemedText type="tiny" style={{ color: colors.secondary }}>Mentioned in this reminder</ThemedText>
                                        </View>
                                    </Animated.View>
                                </ScalePressable>
                            )}
                        </ScrollView>

                        <View style={styles.actionsContainer}>
                            <ScalePressable
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onToggle(reminder);
                                }}
                                style={{ flex: 1 }}
                                scaleTo={0.95}
                                innerStyle={{ borderRadius: 20 }}
                            >
                                <View style={[
                                    styles.mainAction, 
                                    { 
                                        backgroundColor: reminder.completed ? (theme === 'light' ? '#16A34A' : '#10B981') : colors.tint,
                                        borderWidth: 0,
                                    }
                                ]}>
                                    {reminder.completed ? (
                                        <>
                                            <CheckCircle size={22} color={theme === 'light' ? '#fff' : '#000'} weight="fill" />
                                            <ThemedText style={{ color: theme === 'light' ? '#fff' : '#000', fontWeight: '700', marginLeft: 10 }}>Completed</ThemedText>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleDash size={22} color={theme === 'light' ? '#fff' : '#000'} weight="line" />
                                            <ThemedText style={{ color: theme === 'light' ? '#fff' : '#000', fontWeight: '700', marginLeft: 10 }}>Mark as Done</ThemedText>
                                        </>
                                    )}
                                </View>
                            </ScalePressable>

                            <ScalePressable
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    onDelete(reminder);
                                    onClose();
                                }}
                                style={{ width: 64 }}
                                scaleTo={0.9}
                                innerStyle={{ borderRadius: 20 }}
                            >
                                <View style={[styles.deleteAction, { backgroundColor: theme === 'light' ? '#C2410C' : '#F87171' }]}>
                                    <Trash size={22} color={theme === 'light' ? '#fff' : '#000'} weight="fill" />
                                </View>
                            </ScalePressable>
                        </View>
                    </Animated.View>
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1 },
    modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        padding: 24,
        maxHeight: '85%',
        ...DesignSystem.shadows.xl,
        marginBottom: -100,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 24,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
        marginLeft: 12,
    },
    titleWrap: {
        flex: 1,
        marginRight: 4,
        minHeight: 44,
        justifyContent: 'center',
    },
    circleBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    contentScroll: {
        marginBottom: 32,
    },
    title: {
        fontSize: 26,
        lineHeight: 30,
        fontFamily: Typography.fontFamily.bold,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 24,
        opacity: 0.8,
    },
    metaGrid: {
        flexDirection: 'row',
        gap: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        marginBottom: 24,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    metaIconWrapper: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metaText: {
        justifyContent: 'center',
    },
    metaLabel: {
        textTransform: 'uppercase',
        opacity: 0.4,
        letterSpacing: 0.5,
        fontSize: 10,
        marginBottom: 0,
    },
    metaValue: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.semibold,
        lineHeight: 18,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 24,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    mainAction: {
        flex: 1,
        flexDirection: 'row',
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteAction: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
