import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    SharedValue
} from 'react-native-reanimated';
import { CaretUp, CaretDown } from '@/components/ui/Icon';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ScalePressable } from './ScalePressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NEAR_TOP_PX = 200;
const NEAR_BOTTOM_PX = 200;

interface QuickScrollButtonProps {
    isScrolling: SharedValue<boolean>;
    direction: SharedValue<'up' | 'down'>;
    // Optional: when provided, arrows also hide near the list edges.
    scrollY?: SharedValue<number>;
    contentHeight?: SharedValue<number>;
    layoutHeight?: SharedValue<number>;
    onPress: () => void;
}

export const QuickScrollButton = memo(({ isScrolling, direction, scrollY, contentHeight, layoutHeight, onPress }: QuickScrollButtonProps) => {
    const { colors, theme } = useAppTheme();
    const insets = useSafeAreaInsets();

    const upButtonStyle = useAnimatedStyle(() => {
        // Hide when near the top: no point offering "go to top" at the top.
        const farFromTop = scrollY ? scrollY.value > NEAR_TOP_PX : true;
        const active = isScrolling.value && direction.value === 'up' && farFromTop;
        return {
            opacity: withTiming(active ? 1 : 0, { duration: 250 }),
            transform: [
                { scale: withTiming(active ? 1 : 0.9, { duration: 250 }) },
                { translateY: withTiming(active ? 0 : -10, { duration: 250 }) }
            ],
            pointerEvents: active ? 'auto' : 'none',
        };
    });

    const downButtonStyle = useAnimatedStyle(() => {
        // Hide when near the bottom: no point offering "go to bottom" at the bottom.
        // Without metrics (or until both heights are measured), assume far from the end.
        const y = scrollY ? scrollY.value : 0;
        const ch = contentHeight ? contentHeight.value : 0;
        const lh = layoutHeight ? layoutHeight.value : 0;
        const distToBottom = ch > 0 && lh > 0 ? ch - (y + lh) : Number.MAX_SAFE_INTEGER;
        const active = isScrolling.value && direction.value === 'down' && distToBottom > NEAR_BOTTOM_PX;
        return {
            opacity: withTiming(active ? 1 : 0, { duration: 250 }),
            transform: [
                { scale: withTiming(active ? 1 : 0.9, { duration: 250 }) },
                { translateY: withTiming(active ? 0 : 10, { duration: 250 }) }
            ],
            pointerEvents: active ? 'auto' : 'none',
        };
    });

    // Haptics intentionally left to ScalePressable, which already honors the
    // user's haptics setting (a manual buzz here would bypass that toggle).
    const handlePress = () => {
        onPress();
    };

    return (
        <>
            {/* Up Button - Positioned Above Side of Screen */}
            <Animated.View style={[
                styles.container, 
                { 
                    top: insets.top + 120,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                }, 
                upButtonStyle
            ]}>
                <ScalePressable
                    onPress={handlePress}
                    style={[styles.button, { backgroundColor: colors.tint }]}
                    innerStyle={{ borderRadius: 18 }}
                    scaleTo={0.9}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Scroll to top"
                >
                    <CaretUp size={16} color={colors.tintContrast} weight={theme === 'dark' ? 'bold' : 'regular'} />
                </ScalePressable>
            </Animated.View>

            {/* Down Button - Positioned Below */}
            <Animated.View style={[
                styles.container, 
                styles.downPosition, 
                {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                },
                downButtonStyle
            ]}>
                <ScalePressable
                    onPress={handlePress}
                    style={[styles.button, { backgroundColor: colors.tint }]}
                    innerStyle={{ borderRadius: 18 }}
                    scaleTo={0.9}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Scroll to bottom"
                >
                    <CaretDown size={16} color={colors.tintContrast} weight={theme === 'dark' ? 'bold' : 'regular'} />
                </ScalePressable>
            </Animated.View>
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        right: 16,
        zIndex: 9999,
    },
    downPosition: {
        bottom: 95, // Below
    },
    button: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
