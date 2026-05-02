import React from 'react';
import {
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    StyleProp,
    View,
    Platform
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedText } from './ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'error' | 'surface';
    size?: 'sm' | 'md' | 'lg' | 'xl';
    loading?: boolean;
    disabled?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    activeOpacity?: number;
}

import { ScalePressable } from './ScalePressable';

export function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    leftIcon,
    rightIcon,
    style,
    textStyle,
}: ButtonProps) {
    const { colors, theme } = useAppTheme();

    const getVariantStyles = () => {
        // ... same as before
        switch (variant) {
            case 'primary':
                return {
                    container: { backgroundColor: colors.tint, borderWidth: 0 },
                    text: { color: colors.tintContrast }
                };
            case 'secondary':
                return {
                    container: { backgroundColor: theme === 'light' ? '#F3F4F6' : '#27272A', borderWidth: 0 },
                    text: { color: colors.text }
                };
            case 'surface':
                return {
                    container: { backgroundColor: colors.surface, borderWidth: 0 },
                    text: { color: colors.text }
                };
            case 'outline':
                return {
                    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.border },
                    text: { color: colors.text }
                };
            case 'ghost':
                return {
                    container: { backgroundColor: 'transparent' },
                    text: { color: colors.tint }
                };
            case 'error':
                return {
                    container: { backgroundColor: colors.error },
                    text: { color: '#fff' }
                };
            default:
                return {
                    container: { backgroundColor: colors.tint },
                    text: { color: '#fff' }
                };
        }
    };

    const getSizeStyles = () => {
        // ... same as before
        switch (size) {
            case 'sm':
                return {
                    container: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: DesignSystem.radius.sm },
                    text: { fontSize: 13, fontFamily: Typography.fontFamily.semibold }
                };
            case 'lg':
                return {
                    container: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: DesignSystem.radius.lg },
                    text: { fontSize: 17, fontFamily: Typography.fontFamily.bold }
                };
            case 'xl':
                return {
                    container: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: DesignSystem.radius.xl },
                    text: { fontSize: 19, fontFamily: Typography.fontFamily.bold }
                };
            default:
                return {
                    container: { paddingVertical: 11, paddingHorizontal: 18, borderRadius: DesignSystem.radius.md },
                    text: { fontSize: 15, fontFamily: Typography.fontFamily.semibold }
                };
        }
    };

    const vStyles = getVariantStyles();
    const sStyles = getSizeStyles();

    return (
        <ScalePressable
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                styles.container,
                sStyles.container,
                vStyles.container,
                (disabled || loading) && { opacity: 0.5 },
                style
            ]}
            innerStyle={{ borderRadius: (sStyles.container.borderRadius || DesignSystem.radius.md) }}
        >
            {loading ? (
                <ActivityIndicator color={vStyles.text.color as string} size="small" />
            ) : (
                <View style={styles.content}>
                    {leftIcon && <View style={[styles.iconLeft, !title && { marginRight: 0 }]}>{leftIcon}</View>}
                    {title ? (
                        <ThemedText style={[styles.text, sStyles.text, vStyles.text, textStyle]}>
                            {title}
                        </ThemedText>
                    ) : null}
                    {rightIcon && <View style={[styles.iconRight, !title && { marginLeft: 0 }]}>{rightIcon}</View>}
                </View>
            )}
        </ScalePressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
});
