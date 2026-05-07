import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, interpolateColor } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ToggleProps {
    value: boolean;
    onValueChange: (value: boolean) => void;
}

export function Toggle({ value, onValueChange }: ToggleProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const progress = useSharedValue(value ? 1 : 0);

    // Spring configuration for 'buttery' smoothness
    const springConfig = {
        damping: 15,
        stiffness: 150,
        mass: 0.6,
    };

    const handlePress = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            import('expo-haptics').then(Haptics => Haptics.selectionAsync().catch(() => {}));
        }
        onValueChange(!value);
    };

    useEffect(() => {
        progress.value = withSpring(value ? 1 : 0, springConfig);
    }, [value]);

    const animatedThumbStyle = useAnimatedStyle(() => {
        const size = value ? 20 : 12;
        const translateX = value ? 22 : 4;
        
        return {
            width: withSpring(size, springConfig),
            height: withSpring(size, springConfig),
            borderRadius: 999, // Kept here so Reanimated applies it — static StyleSheet gets overridden on Android
            transform: [{ translateX: withSpring(translateX, springConfig) }],
            backgroundColor: value 
                ? (theme === 'dark' ? '#000' : '#fff') 
                : (theme === 'dark' ? colors.textTertiary : colors.secondary),
        };
    });

    const animatedTrackStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            progress.value,
            [0, 1],
            [theme === 'dark' ? colors.surface : colors.border, colors.tint]
        );
        const borderColor = interpolateColor(
            progress.value,
            [0, 1],
            [colors.border, colors.tint]
        );

        return { 
            backgroundColor,
            borderColor,
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
        width: 48,
        height: 28,
        borderRadius: 14,
        borderWidth: 1.5,
        justifyContent: 'center',
    },
    toggleThumb: {
        borderRadius: 999, // Always a circle — never animated, no aliasing
    },
});
