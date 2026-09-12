import React from 'react';
import { Pressable, StyleProp, ViewStyle, Insets, StyleSheet, Platform, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    Easing,
    WithSpringConfig,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ScalePressableProps {
    children?: React.ReactNode;
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
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'link' | 'none';
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
    accessibilityLabel,
    accessibilityRole,
}: ScalePressableProps) {
    const { hapticsEnabled, theme } = useAppTheme();
    const scaleValue = useSharedValue(1);
    const highlightOpacity = useSharedValue(0);

    const flatStyle = StyleSheet.flatten(style) as ViewStyle | undefined;
    const flatInnerStyle = StyleSheet.flatten(innerStyle) as ViewStyle | undefined;
    const rawRadius = flatInnerStyle?.borderRadius ?? flatStyle?.borderRadius ?? 0;
    const borderRadius = typeof rawRadius === 'number' && !isNaN(rawRadius) ? rawRadius : 0;

    const containerAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scaleValue.value }],
    }));

    const highlightAnimatedStyle = useAnimatedStyle(() => ({
        opacity: highlightOpacity.value,
    }));

    const handlePressIn = () => {
        if (disabled) return;
        if (scale) {
            // iOS-style press-down: quick timing with ease-out cubic.
            // Reaches scaleTo in ~110ms so fast taps still fully shrink,
            // but lands softly instead of hitting linearly (robotic feel).
            if (springConfig) {
                scaleValue.value = withSpring(scaleTo, springConfig);
            } else {
                scaleValue.value = withTiming(scaleTo, {
                    duration: 110,
                    easing: Easing.out(Easing.cubic),
                });
            }
        }
        highlightOpacity.value = withTiming(1, {
            duration: 90,
            easing: Easing.out(Easing.quad),
        });
    };

    const handlePressOut = () => {
        if (disabled) return;
        if (scale) {
            // Fast iOS-style release: ~0.7 damping ratio, settles in ~200ms.
            // Previous 22/550/0.6 took ~400ms+ which read as "lag" vs the
            // quick 110ms shrink. Higher stiffness = snaps back in sync
            // with the finger lift instead of trailing behind it.
            scaleValue.value = withSpring(
                1,
                springConfig || {
                    damping: 28,
                    stiffness: 800,
                    mass: 0.5,
                    overshootClamping: false,
                }
            );
        }
        // Short fade so it clears with the scale, not after it.
        highlightOpacity.value = withTiming(0, {
            duration: 150,
            easing: Easing.out(Easing.quad),
        });
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
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            style={[styles.container, style, containerAnimatedStyle]}
        >
            {children}
            {/* Smooth animated overlay for all platforms (avoids Android foreground ripple bug) */}
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
        // Re-enforcing Rule 2: NEVER add overflow: 'hidden' here on Android.
        // Even with font icons, it causes rendering glitches in complex layouts like the Profile Tabs.
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
});
