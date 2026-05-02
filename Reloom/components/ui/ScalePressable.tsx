import React from 'react';
import { Pressable, StyleProp, ViewStyle, Insets, StyleSheet, Platform, View } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    useSharedValue, 
    withSpring, 
    withTiming,
    WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DesignSystem } from '../../constants/DesignSystem';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ScalePressableProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    innerStyle?: StyleProp<ViewStyle>;
    onPress?: () => void;
    onLongPress?: () => void;
    scaleTo?: number;
    disabled?: boolean;
    haptic?: boolean;
    hitSlop?: Insets | number;
    overlayColor?: string;
    scale?: boolean;
    hapticStyle?: Haptics.ImpactFeedbackStyle;
    springConfig?: WithSpringConfig;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ScalePressable({
    children,
    style,
    innerStyle,
    onPress,
    onLongPress,
    scaleTo = 0.97,
    disabled = false,
    haptic = true,
    hitSlop,
    overlayColor,
    scale = true,
    hapticStyle = Haptics.ImpactFeedbackStyle.Light,
    springConfig,
}: ScalePressableProps) {
    const { hapticsEnabled, theme } = useAppTheme();
    const scaleValue = useSharedValue(1);
    const highlightOpacity = useSharedValue(0);

    const flatStyle = StyleSheet.flatten(style);
    const flatInnerStyle = StyleSheet.flatten(innerStyle);
    const borderRadius = flatInnerStyle?.borderRadius ?? flatStyle?.borderRadius ?? 0;

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }));

    const highlightAnimatedStyle = useAnimatedStyle(() => ({
        opacity: highlightOpacity.value,
    }));

    const handlePressIn = () => {
        if (disabled) return;
        if (scale) {
            scaleValue.value = withSpring(scaleTo, springConfig || DesignSystem.animation.springs.heavy);
        }
        highlightOpacity.value = withTiming(1, { duration: 50 });
    };

    const handlePressOut = () => {
        if (disabled) return;
        if (scale) {
            scaleValue.value = withSpring(1, { damping: 25, stiffness: 200, mass: 1 });
        }
        highlightOpacity.value = withTiming(0, { duration: 250 });
    };

    const handlePress = () => {
        if (disabled) return;
        if (haptic && hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(hapticStyle).catch(() => {});
        }
        onPress?.();
    };

    const defaultOverlayColor = theme === 'dark'
        ? 'rgba(255, 255, 255, 0.08)'
        : 'rgba(0, 0, 0, 0.07)';

    const rippleColor = overlayColor || defaultOverlayColor;

    return (
        <AnimatedPressable
            onPress={handlePress}
            onLongPress={onLongPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled}
            hitSlop={hitSlop}
            style={[styles.container, style, containerAnimatedStyle]}
        >
            {children}
            {/* Custom opacity fade overlay for all platforms */}
            <Animated.View
                pointerEvents="none"
                style={[
                    styles.overlay,
                    { backgroundColor: rippleColor, borderRadius },
                    highlightAnimatedStyle,
                ]}
            />
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    container: {
        // Rule 2 (learnings.md): NEVER add overflow:'hidden' here.
        // It erases nested phosphor SVG icons on Android.
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
});
