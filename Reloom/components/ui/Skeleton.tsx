import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../hooks/useAppTheme';

interface SkeletonProps {
    width?: DimensionValue;
    height?: DimensionValue;
    borderRadius?: number;
    style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
    const { theme } = useAppTheme();
    const opacity = useSharedValue(0.3);

    useEffect(() => {
        opacity.value = withRepeat(
            withSequence(
                withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    const baseColor = theme === 'dark' ? '#2A2A2A' : '#E0E0E0';
    const highlightColor = theme === 'dark' ? '#3A3A3A' : '#F0F0F0';

    return (
        <Animated.View style={[styles.container, { width, height, borderRadius, backgroundColor: baseColor }, style, animatedStyle]}>
            {/* Optional: Linear Gradient for more advanced shimmer, but opacity pulse is often cleaner for "Apple-like" feel */}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        overflow: 'hidden',
    },
});
