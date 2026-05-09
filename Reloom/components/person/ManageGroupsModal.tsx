import { View, StyleSheet, Modal, ScrollView, Pressable, Platform } from 'react-native';
import { ScalePressable } from '../ui/ScalePressable';
import { ThemedText } from '../ui/ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Check, Folder } from '@/components/ui/Icon';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
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

export function ManageGroupsModal({ visible, onClose, personName, allGroups, personGroups, onToggleGroup }: ManageGroupsModalProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    const triggerHaptic = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    entering={FadeIn.duration(250)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                />
                <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
                    <Animated.View
                        entering={SlideInDown.duration(400).springify()}
                        style={[
                            styles.bottomSheet,
                            {
                                backgroundColor: colors.card,
                                paddingBottom: 100 + insets.bottom + 32,
                                minHeight: 500,
                            }
                        ]}
                    >
                        <Pressable onPress={(e) => e.stopPropagation()}>
                            <View style={styles.handle} />
                            <View style={styles.sheetHeader}>
                                <ThemedText style={{ fontSize: 18, color: colors.text, fontFamily: Typography.fontFamily.serif }}>Manage Groups</ThemedText>
                                <ThemedText type="small" style={{ color: colors.secondary, marginTop: 4 }}>
                                    Add or remove {personName} from groups
                                </ThemedText>
                            </View>

                            <ScrollView
                                style={{ maxHeight: 500 }}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                {allGroups.length > 0 ? (
                                    allGroups.map(g => {
                                        const isSelected = personGroups.some(pg => pg.id === g.id);
                                        const groupColor = g.color || colors.tint;
                                        const IconComponent = getGroupIcon(g.icon);

                                        return (
                                            <ScalePressable
                                                key={g.id}
                                                style={[
                                                    styles.groupOption,
                                                    {
                                                        backgroundColor: colors.surface,
                                                        borderColor: isSelected ? groupColor + '40' : colors.border,
                                                        borderWidth: 1
                                                    }
                                                ]}
                                                onPress={() => {
                                                    triggerHaptic();
                                                    onToggleGroup(g.id);
                                                }}
                                                innerStyle={{ borderRadius: 0 }} // Keep full row pressable feel
                                                scaleTo={0.96}
                                            >
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                                    <View style={[
                                                        styles.groupIconBox,
                                                        {
                                                            backgroundColor: isSelected ? groupColor + '15' : colors.surface,
                                                            borderColor: isSelected ? groupColor + '30' : 'transparent',
                                                            borderWidth: 1,
                                                        }
                                                    ]}>
                                                        <IconComponent
                                                            size={22}
                                                            color={isSelected ? groupColor : colors.secondary}
                                                            weight={isSelected ? 'fill' : 'regular'}
                                                        />
                                                    </View>
                                                    <ThemedText style={{
                                                        color: isSelected ? colors.text : colors.secondary,
                                                        fontWeight: isSelected ? '700' : '500',
                                                        fontSize: 17,
                                                    }}>
                                                        {g.name}
                                                    </ThemedText>
                                                </View>
                                                <View style={[
                                                    styles.checkCircle,
                                                    {
                                                        backgroundColor: isSelected ? groupColor : 'transparent',
                                                        borderColor: isSelected ? groupColor : colors.border,
                                                    }
                                                ]}>
                                                    {isSelected && <Check size={12} color="#fff" weight="bold" />}
                                                </View>
                                            </ScalePressable>
                                        );
                                    })
                                ) : (
                                    <View style={{ paddingTop: 60, alignItems: 'center' }}>
                                        <Folder size={64} color={colors.secondary + '4D'} />
                                        <ThemedText style={{ color: colors.secondary, marginTop: 16, textAlign: 'center', fontSize: 16 }}>
                                            No groups created yet
                                        </ThemedText>
                                    </View>
                                )}
                            </ScrollView>
                        </Pressable>
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
        padding: 24,
        marginBottom: -100,
        paddingBottom: 100 + 24,
        ...DesignSystem.shadows.xl,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 24,
    },
    sheetHeader: {
        marginBottom: 24,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: DesignSystem.radius.lg,
        marginBottom: 10,
    },
    groupIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
