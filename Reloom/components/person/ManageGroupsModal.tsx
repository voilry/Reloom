import { View, StyleSheet, Modal, ScrollView, Pressable, Platform } from 'react-native';
import { ScalePressable } from '../ui/ScalePressable';
import { ThemedText } from '../ui/ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Check, Folder } from '@/components/ui/Icon';
import * as Haptics from 'expo-haptics';
import Animated, { Easing, FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Group } from '../../db/repositories/GroupRepository';
import { getGroupIcon } from '../../constants/GroupIcons';

interface ManageGroupsModalProps {
    visible: boolean;
    onClose: () => void;
    personName: string;
    allGroups: Group[];
    personGroups: Group[];
    onToggleGroup: (groupId: number) => Promise<void>;
}

const EASE_ENTER = Easing.bezier(0.05, 0.7, 0.1, 1.0);

export function ManageGroupsModal({ visible, onClose, personName, allGroups, personGroups, onToggleGroup }: ManageGroupsModalProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    const triggerHaptic = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => {});
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent={true}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(240).easing(EASE_ENTER)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
                    <Animated.View
                        entering={SlideInDown.duration(360).easing(EASE_ENTER)}
                        onStartShouldSetResponder={() => true}
                        style={[
                            styles.bottomSheet,
                            {
                                backgroundColor: colors.card,
                                paddingBottom: 100 + insets.bottom + 28,
                            }
                        ]}
                    >
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        <View style={styles.sheetHeader}>
                            <ThemedText style={styles.sheetTitle}>Manage Groups</ThemedText>
                            <ThemedText style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                                Add or remove {personName} from groups
                            </ThemedText>
                        </View>

                        <ScrollView
                            style={{ maxHeight: 440 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 8 }}
                        >
                            {allGroups.length > 0 ? (
                                allGroups.map((g, index) => {
                                    const isSelected = personGroups.some(pg => pg.id === g.id);
                                    const groupColor = g.color || colors.tint;
                                    const IconComponent = getGroupIcon(g.icon);

                                    return (
                                        <Animated.View
                                            key={g.id}
                                            entering={FadeInDown.delay(60 + Math.min(index, 8) * 26)
                                                .duration(300)
                                                .easing(EASE_ENTER)}
                                        >
                                            <ScalePressable
                                                style={styles.groupOption}
                                                onPress={() => {
                                                    triggerHaptic();
                                                    onToggleGroup(g.id);
                                                }}
                                                scaleTo={0.985}
                                                haptic={false}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${g.name}, ${isSelected ? 'in group' : 'not in group'}`}
                                            >
                                                <View style={styles.groupIdentity}>
                                                    <IconComponent
                                                        size={22}
                                                        color={isSelected ? groupColor : colors.textTertiary}
                                                        weight="fill"
                                                    />
                                                    <ThemedText
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.groupName,
                                                            {
                                                                color: isSelected ? colors.text : colors.textSecondary,
                                                                fontFamily: isSelected
                                                                    ? Typography.fontFamily.semibold
                                                                    : Typography.fontFamily.medium,
                                                            },
                                                        ]}
                                                    >
                                                        {g.name}
                                                    </ThemedText>
                                                </View>
                                                {isSelected ? (
                                                    <Check size={18} color={groupColor} weight="fill" />
                                                ) : null}
                                            </ScalePressable>
                                        </Animated.View>
                                    );
                                })
                            ) : (
                                <View style={styles.emptyState}>
                                    <Folder size={44} color={colors.textTertiary} weight="fill" />
                                    <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                                        No groups yet
                                    </ThemedText>
                                    <ThemedText style={[styles.emptyBody, { color: colors.textSecondary }]}>
                                        Create a group first, then add {personName} to it.
                                    </ThemedText>
                                </View>
                            )}
                        </ScrollView>
                    </Animated.View>
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 14,
        marginBottom: -100,
        ...DesignSystem.shadows.xl,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    sheetHeader: {
        marginBottom: 12,
    },
    sheetTitle: {
        fontSize: 22,
        lineHeight: 28,
        letterSpacing: -0.3,
        fontFamily: Typography.fontFamily.serif,
    },
    sheetSubtitle: {
        marginTop: 3,
        fontSize: 13,
        lineHeight: 18,
        fontFamily: Typography.fontFamily.regular,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 2,
        minHeight: 50,
    },
    groupIdentity: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 13,
        paddingRight: 12,
    },
    groupName: {
        fontSize: 16,
        lineHeight: 21,
        letterSpacing: -0.1,
        flexShrink: 1,
    },
    emptyState: {
        alignItems: 'center',
        paddingTop: 40,
        paddingBottom: 32,
        paddingHorizontal: 20,
    },
    emptyTitle: {
        marginTop: 14,
        fontSize: 20,
        lineHeight: 26,
        letterSpacing: -0.4,
        textAlign: 'center',
        fontFamily: Typography.fontFamily.serif,
    },
    emptyBody: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        maxWidth: 270,
        fontFamily: Typography.fontFamily.regular,
    },
});
