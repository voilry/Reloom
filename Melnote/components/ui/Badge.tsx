import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ThemedText } from './ThemedText';

interface BadgeProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    color?: string;
    backgroundColor?: string;
    borderColor?: string;
    variant?: 'default' | 'solid' | 'outline' | 'tint';
    icon?: React.ReactNode;
}

export function Badge({ 
    children, 
    style, 
    color, 
    backgroundColor,
    borderColor,
    variant = 'default',
    icon
}: BadgeProps) {
    const { colors } = useAppTheme();
    
    let bg = backgroundColor || colors.surface;
    let border = borderColor || 'transparent'; // default to no border
    let contentColor = color || colors.secondary;
    
    if (variant === 'tint') {
        bg = colors.tint + '15';
        border = 'transparent';
        contentColor = colors.tint;
    } else if (variant === 'solid') {
        bg = colors.tint;
        border = 'transparent';
        contentColor = '#ffffff';
    } else if (variant === 'outline') {
        bg = 'transparent';
        border = colors.border;
        contentColor = colors.secondary;
    }

    return (
        <View style={[styles.badge, { backgroundColor: bg, borderColor: border, borderWidth: border !== 'transparent' ? 1 : 0 }, style]}>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            {typeof children === 'string' || typeof children === 'number' ? (
                <ThemedText type="tiny" style={[styles.text, { color: contentColor }]}>
                    {children}
                </ThemedText>
            ) : (
                children
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 24, // Fixed height for consistency
        minWidth: 28, // Ensure it's never too small for single digits
        justifyContent: 'center',
        borderRadius: 8,
        alignSelf: 'center',
    },
    iconContainer: {
        marginRight: 4,
    },
    text: {
        fontWeight: '800',
        fontSize: 12, // Slightly larger for better readability
        textAlign: 'center',
    }
});
