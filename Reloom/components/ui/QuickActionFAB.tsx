import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, Extrapolation, runOnJS } from 'react-native-reanimated';
import { Plus, UserPlus, FileText, Bell, X } from '@/components/ui/Icon';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { ScalePressable } from './ScalePressable';

interface QuickActionFABProps {
    onNewPerson: () => void;
    onNewNote: () => void;
    onNewReminder: () => void;
}

const FAB_SIZE = 56;
const ACTION_SIZE = 48;

export function QuickActionFAB({ onNewPerson, onNewNote, onNewReminder }: QuickActionFABProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [isOpen, setIsOpen] = useState(false);

    const animation = useSharedValue(0);

    const toggle = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const nextState = !isOpen;
        setIsOpen(nextState);
        animation.value = withSpring(nextState ? 1 : 0, { damping: 12, stiffness: 100 });
    };

    const mainButtonStyle = useAnimatedStyle(() => {
        const rotation = interpolate(animation.value, [0, 1], [0, 45]);
        return {
            transform: [{ rotate: `${rotation}deg` }]
        };
    });

    const getActionStyle = (index: number) => {
        return useAnimatedStyle(() => {
            const translateY = interpolate(
                animation.value,
                [0, 1],
                [0, -((index + 1) * (ACTION_SIZE + 16))], // Move up
                Extrapolation.CLAMP
            );
            const scale = interpolate(animation.value, [0, 1], [0, 1], Extrapolation.CLAMP);
            const opacity = interpolate(animation.value, [0, 0.5, 1], [0, 0, 1], Extrapolation.CLAMP);
            return {
                transform: [{ translateY }, { scale }],
                opacity
            };
        });
    };


    const ActionButton = ({ icon: Icon, label, onPress, index, color = colors.tint }: any) => (
        <Animated.View style={[styles.actionWrapper, getActionStyle(index)]} pointerEvents={isOpen ? 'auto' : 'none'}>
            <View style={[styles.labelWrapper, { backgroundColor: colors.card, borderColor: 'transparent' }]}>
                <Text style={[styles.labelText, { color: colors.text }]}>{label}</Text>
            </View>
            <ScalePressable
                onPress={() => {
                    toggle();
                    setTimeout(onPress, 100);
                }}
                style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: 'transparent' }]}
                innerStyle={{ borderRadius: ACTION_SIZE / 2 }}
                scaleTo={0.88}
            >
                <Icon size={20} color={color} />
            </ScalePressable>
        </Animated.View>
    );

    return (
        <View style={styles.container} pointerEvents="box-none">
            {/* Overlay when open to close on tap outside - Optional but good UX */}
            {isOpen && (
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={toggle}
                >
                    <BlurView intensity={20} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
                </TouchableOpacity>
            )}

            <View style={styles.fabContainer} pointerEvents="box-none">
                <ActionButton icon={Bell} label="Reminder" onPress={onNewReminder} index={2} />
                <ActionButton icon={FileText} label="Note" onPress={onNewNote} index={1} />
                <ActionButton icon={UserPlus} label="Person" onPress={onNewPerson} index={0} />

                <ScalePressable
                    onPress={toggle}
                    style={[styles.fab, { backgroundColor: colors.tint }]}
                    innerStyle={{ borderRadius: FAB_SIZE / 2 }}
                    scaleTo={0.88}
                    hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                >
                    <Animated.View style={mainButtonStyle}>
                        <Plus size={28} color={colors.tintContrast} weight="bold" />
                    </Animated.View>
                </ScalePressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
    },
    fabContainer: {
        alignItems: 'center',
        paddingBottom: 90, // Above tab bar usually
        paddingRight: 24,
    },
    fab: {
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
    },
    actionWrapper: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: 200, // Wide enough for label
        paddingRight: 4, // Align center of circle with FAB
    },
    actionButton: {
        width: ACTION_SIZE,
        height: ACTION_SIZE,
        borderRadius: ACTION_SIZE / 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0,
    },
    labelWrapper: {
        marginRight: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 0,
    },
    labelText: {
        fontSize: 14,
        fontWeight: '600',
    }
});
