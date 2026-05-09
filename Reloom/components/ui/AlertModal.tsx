import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import * as Haptics from 'expo-haptics';
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
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    const Icon = {
        success: <CheckCircle size={48} color={colors.tint} weight="fill" />,
        error: <XCircle size={48} color={colors.error} weight="fill" />,
        info: <Info size={48} color={colors.secondary} weight="fill" />,
        warning: <WarningCircle size={48} color={"#f59e0b"} weight="fill" />
    }[type];

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={styles.modalBackdrop} onPress={onClose}>
                    <Animated.View
                        entering={SlideInDown.duration(300).springify()}
                        style={[styles.modalContent, { backgroundColor: colors.card, paddingBottom: 100 + insets.bottom + 32 }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.handle} />
                        <View style={styles.iconContainer}>
                            {Icon}
                        </View>
                        <ThemedText type="sectionHeader" style={styles.title}>{title}</ThemedText>
                        <ThemedText style={[styles.description, { color: colors.secondary }]}>{description}</ThemedText>

                        <ScalePressable
                            style={[styles.button, { backgroundColor: colors.tint }]}
                            innerStyle={{ borderRadius: 16 }}
                            onPress={() => {
                                onClose();
                            }}
                        >
                            <ThemedText style={{ color: colors.tintContrast, fontWeight: '800', textAlign: 'center' }}>{buttonLabel}</ThemedText>
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
        padding: 24,
        marginBottom: -100,
        ...DesignSystem.shadows.xl,
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 2.5,
        alignSelf: 'center',
        marginBottom: 20,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    button: {
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    }
});
