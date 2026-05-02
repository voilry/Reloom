import React, { memo } from 'react';
import { StyleSheet, Platform } from 'react-native';
import Animated, { 
    useAnimatedStyle, 
    withSpring, 
    withTiming,
    SharedValue
} from 'react-native-reanimated';
import { CaretUp, CaretDown } from 'phosphor-react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ScalePressable } from './ScalePressable';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface QuickScrollButtonProps {
    isScrolling: SharedValue<boolean>;
    direction: SharedValue<'up' | 'down'>;
    onPress: () => void;
}

export const QuickScrollButton = memo(({ isScrolling, direction, onPress }: QuickScrollButtonProps) => {
    const { colors, theme } = useAppTheme();
    const insets = useSafeAreaInsets();

    const upButtonStyle = useAnimatedStyle(() => {
        const active = isScrolling.value && direction.value === 'up';
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
        const active = isScrolling.value && direction.value === 'down';
        return {
            opacity: withTiming(active ? 1 : 0, { duration: 250 }),
            transform: [
                { scale: withTiming(active ? 1 : 0.9, { duration: 250 }) },
                { translateY: withTiming(active ? 0 : 10, { duration: 250 }) }
            ],
            pointerEvents: active ? 'auto' : 'none',
        };
    });

    const handlePress = () => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
