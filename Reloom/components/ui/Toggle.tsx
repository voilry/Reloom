import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const translateX = useSharedValue(value ? 20 : 0);

    const handlePress = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            import('expo-haptics').then(Haptics => Haptics.selectionAsync().catch(() => {}));
        }
        onValueChange(!value);
    };

    useEffect(() => {
        translateX.value = withTiming(value ? 20 : 0, { duration: 200 });
    }, [value]);

    const animatedThumbStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
        backgroundColor: '#fff',
    }));

    const animatedTrackStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            translateX.value,
            [0, 20],
            [colors.border, colors.tint]
        );
        return { 
            backgroundColor,
        };
    });

    return (
        <Pressable onPress={handlePress}>
            <Animated.View style={[styles.toggleTrack, animatedTrackStyle]}>
                <Animated.View style={[styles.toggleThumb, animatedThumbStyle]} />
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    toggleTrack: {
        width: 44,
        height: 24,
        borderRadius: 12,
        padding: 2,
    },
    toggleThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
    },
});
