import React from 'react';
import { View, StyleSheet, Modal, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { CheckCircle, XCircle, Info, WarningCircle } from '@/components/ui/Icon';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScalePressable } from './ScalePressable';

interface AlertModalProps {
    visible: boolean;
    title: string;
    description: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    buttonLabel?: string;
}

export function AlertModal({ visible, title, description, type = 'info', onClose, buttonLabel = 'Done' }: AlertModalProps) {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    const Icon = {
        success: <CheckCircle size={44} color={colors.tint} weight="fill" />,
        error: <XCircle size={44} color={colors.error} weight="fill" />,
        info: <Info size={44} color={colors.textSecondary} weight="fill" />,
        warning: <WarningCircle size={44} color={colors.warning} weight="fill" />
    }[type];

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(250)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={styles.modalBackdrop} onPress={onClose}>
                    <Animated.View
                        entering={SlideInDown.duration(320).springify().damping(24).stiffness(240).mass(0.9)}
                        style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: 100 + insets.bottom + 28 }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                        <View style={styles.iconContainer}>
                            {Icon}
                        </View>
                        <ThemedText type="sectionHeader" style={styles.title}>{title}</ThemedText>
                        <ThemedText style={[styles.description, { color: colors.textSecondary }]}>{description}</ThemedText>

                        <ScalePressable
                            style={[styles.button, { backgroundColor: colors.tint }]}
                            innerStyle={{ borderRadius: 16 }}
                            onPress={onClose}
                        >
                            <ThemedText style={[styles.buttonLabel, { color: colors.tintContrast }]}>{buttonLabel}</ThemedText>
                        </ScalePressable>
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
    iconContainer: {
        alignItems: 'center',
        marginBottom: 14,
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
    button: {
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    buttonLabel: {
        color: '#fff',
        fontSize: 15.5,
        fontFamily: Typography.fontFamily.semibold,
        textAlign: 'center',
    },
});
