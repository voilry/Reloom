import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { ScalePressable } from './ScalePressable';

interface DeleteModalProps {
    visible: boolean;
    title: string;
    description: string;
    onCancel: () => void;
    onDelete: () => void;
    actionLabel?: string;
    actionColor?: string;
}

export function DeleteModal({
    visible,
    title,
    description,
    onCancel,
    onDelete,
    actionLabel = 'Delete',
    actionColor = '#ef4444',
    actionTextColor = '#fff'
}: DeleteModalProps & { actionTextColor?: string }) {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(250)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={styles.modalBackdrop} onPress={onCancel}>
                    <Animated.View
                        entering={SlideInDown.duration(320).springify().damping(24).stiffness(240).mass(0.9)}
                        style={[
                            styles.modalContent,
                            {
                                backgroundColor: colors.card,
                                paddingBottom: 100 + insets.bottom + 24
                            }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        <ThemedText type="sectionHeader" style={styles.title}>{title}</ThemedText>
                        <ThemedText style={[styles.description, { color: colors.textSecondary }]}>{description}</ThemedText>

                        <View style={styles.actions}>
                            <ScalePressable
                                style={[styles.button, { backgroundColor: actionColor, flex: 1, marginRight: 8 }]}
                                innerStyle={{ borderRadius: 16 }}
                                onPress={onDelete}
                            >
                                <ThemedText style={[styles.buttonLabel, { color: actionTextColor }]}>{actionLabel}</ThemedText>
                            </ScalePressable>
                            <ScalePressable
                                style={[styles.button, { backgroundColor: colors.surface, flex: 1, marginLeft: 8 }]}
                                innerStyle={{ borderRadius: 16 }}
                                onPress={onCancel}
                            >
                                <ThemedText style={styles.buttonLabel}>Cancel</ThemedText>
                            </ScalePressable>
                        </View>
                    </Animated.View>
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 14,
        marginBottom: -100,
        ...DesignSystem.shadows.xl,
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 18,
    },
    title: {
        marginBottom: 8,
        textAlign: 'center',
    },
    description: {
        fontSize: 14.5,
        lineHeight: 21,
        textAlign: 'center',
        marginBottom: 26,
        paddingHorizontal: 8,
        fontFamily: Typography.fontFamily.regular,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonLabel: {
        fontSize: 15.5,
        fontFamily: Typography.fontFamily.semibold,
        textAlign: 'center',
    },
});
