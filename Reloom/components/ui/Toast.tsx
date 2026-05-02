import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, DeviceEventEmitter, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface ToastOptions {
    message: string;
    duration?: number;
}

export function Toast() {
    const [toast, setToast] = useState<ToastOptions | null>(null);
    const { colors, theme } = useAppTheme();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('showToast', (options: ToastOptions) => {
            setToast(options);
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, toast.duration || 3500);

            return () => clearTimeout(timer);
        }
    }, [toast]);

    if (!toast) return null;

    return (
        <View style={[styles.container, { top: insets.top + 24 }]}>
            <Animated.View
                entering={FadeInUp.springify().mass(0.8).damping(12)}
                exiting={FadeOutUp.duration(200)}
                style={[
                    styles.pill,
                    {
                        backgroundColor: theme === 'dark' ? '#2A2A2A' : '#FFFFFF',
                        borderColor: colors.border,
                        borderWidth: theme === 'light' ? 1 : 0,
                        ...DesignSystem.shadows.md,
                    }
                ]}
            >
                <ThemedText style={styles.message}>{toast.message}</ThemedText>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'none',
    },
    pill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        maxWidth: '85%',
    },
    message: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.medium,
        textAlign: 'center',
    },
});

export const showToast = (message: string, duration = 3500) => {
    DeviceEventEmitter.emit('showToast', { message, duration });
};
