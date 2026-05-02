import React, { useState, useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal, Pressable, FlatList } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Calendar } from 'phosphor-react-native';
import { BlurView } from 'expo-blur';
import { DesignSystem } from '../../constants/DesignSystem';
import * as Haptics from 'expo-haptics';
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

export function DeleteModal({ visible, title, description, onCancel, onDelete, actionLabel = 'Delete', actionColor = '#ef4444' }: DeleteModalProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}>
            <View style={styles.modalOverlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                />
                <Pressable style={styles.modalBackdrop} onPress={onCancel}>
                    <Animated.View
                        entering={SlideInDown.duration(300).springify()}
                        style={[
                            styles.modalContent, 
                            { 
                                backgroundColor: colors.card,
                                paddingBottom: 100 + insets.bottom + 24
                            }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.handle} />
                        <ThemedText type="sectionHeader" style={styles.title}>{title}</ThemedText>
                        <ThemedText style={[styles.description, { color: colors.secondary }]}>{description}</ThemedText>

                        <View style={styles.actions}>
                            <ScalePressable
                                style={[styles.button, { backgroundColor: actionColor, flex: 1, marginRight: 8 }]}
                                innerStyle={{ borderRadius: 16 }}
                                onPress={() => {
                                    onDelete();
                                }}
                            >
                                <ThemedText style={{ color: '#fff', fontWeight: '800', textAlign: 'center' }}>{actionLabel}</ThemedText>
                            </ScalePressable>
                            <ScalePressable
                                style={[styles.button, { backgroundColor: colors.surface, flex: 1, marginLeft: 8 }]}
                                innerStyle={{ borderRadius: 16 }}
                                onPress={onCancel}
                            >
                                <ThemedText style={{ fontWeight: '700', textAlign: 'center' }}>Cancel</ThemedText>
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
        padding: 24,
        marginBottom: -100,
        paddingBottom: 100 + 20,
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
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
