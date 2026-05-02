import { Text, type TextProps, StyleSheet } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Typography } from '../../constants/Typography';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from 'react-native';

export type ThemedTextProps = TextProps & {
    lightColor?: string;
    darkColor?: string;
    type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'small' | 'tiny' | 'secondary' | 'display' | 'sectionHeader';
};

export function ThemedText({
    style,
    lightColor,
    darkColor,
    type = 'default',
    ...rest
}: ThemedTextProps) {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
    const theme = useColorScheme() ?? 'light';
    const secondaryColor = Colors[theme].textSecondary;

    return (
        <Text
            style={[
                { color },
                type === 'default' ? styles.default : undefined,
                type === 'title' ? styles.title : undefined,
                type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
                type === 'subtitle' ? styles.subtitle : undefined,
                type === 'link' ? styles.link : undefined,
                type === 'small' ? styles.small : undefined,
                type === 'tiny' ? styles.tiny : undefined,
                type === 'secondary' ? { ...styles.default, color: secondaryColor } : undefined,
                type === 'display' ? styles.display : undefined,
                type === 'sectionHeader' ? styles.sectionHeader : undefined,
                style,
            ]}
            {...rest}
        />
    );
}

const styles = StyleSheet.create({
    default: {
        fontSize: Typography.size.base,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.regular,
    },
    defaultSemiBold: {
        fontSize: Typography.size.base,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.semibold,
    },
    title: {
        fontSize: Typography.size['3xl'],
        lineHeight: 32,
        letterSpacing: -0.5,
        fontFamily: Typography.fontFamily.bold,
    },
    subtitle: {
        fontSize: Typography.size.xl,
        fontFamily: Typography.fontFamily.semibold,
    },
    link: {
        lineHeight: 30,
        fontSize: Typography.size.base,
        color: '#0a7ea4',
        fontFamily: Typography.fontFamily.regular,
    },
    small: {
        fontSize: Typography.size.sm,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.regular,
    },
    tiny: {
        fontSize: Typography.size.xs,
        lineHeight: 16,
        fontFamily: Typography.fontFamily.regular,
    },
    display: {
        fontSize: 32,
        lineHeight: 40,
        letterSpacing: -1.0,
        fontFamily: Typography.fontFamily.display,
    },
    sectionHeader: {
        fontSize: 22,
        lineHeight: 28,
        letterSpacing: -0.3,
        fontFamily: Typography.fontFamily.serif,
    },
});
