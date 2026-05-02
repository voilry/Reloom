import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { DesignSystem } from '../../constants/DesignSystem';
import { useAppTheme } from '../../hooks/useAppTheme';

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'outline' | 'flat';
    padding?: keyof typeof DesignSystem.spacing;
}

export function Card({ children, style, variant = 'default', padding = 'md' }: CardProps) {
    const { colors, theme } = useAppTheme();

    const getVariantStyle = () => {
        switch (variant) {
            case 'outline':
                return {
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    borderColor: colors.border,
                    ...DesignSystem.shadows.none,
                };
            case 'flat':
                return {
                    backgroundColor: colors.surface,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    ...DesignSystem.shadows.none,
                };
            default:
                return {
                    backgroundColor: colors.card,
                    borderWidth: theme === 'light' ? 1 : 0,
                    borderColor: colors.border,
                    ...DesignSystem.shadows.none,
                };
        }
    };

    return (
        <View style={[
            styles.card,
            { padding: DesignSystem.spacing[padding] },
            getVariantStyle(),
            style
        ]}>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: DesignSystem.radius.lg,
    },
});
