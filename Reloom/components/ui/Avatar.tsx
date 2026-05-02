import React, { memo } from 'react';
import { View, Image, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
    uri?: string | null;
    name: string;
    size?: number;
    style?: StyleProp<ViewStyle>;
}

export const Avatar = memo(({ uri, name, size = 40, style }: AvatarProps) => {
    const { colors, theme } = useAppTheme();

    const initial = name ? name.charAt(0).toUpperCase() : '?';

    // Generate a consistent gradient based on the name
    const getGradientColors = (str: string) => {
        const palettes = [
            ['#dc2626', '#991b1b'], // Red 600-800
            ['#ea580c', '#9a3412'], // Orange 600-800
            ['#d97706', '#92400e'], // Amber 600-800
            ['#65a30d', '#3f6212'], // Lime 600-800
            ['#059669', '#065f46'], // Emerald 600-800
            ['#0891b2', '#155e75'], // Cyan 600-800
            ['#2563eb', '#1e40af'], // Blue 600-800
            ['#4f46e5', '#3730a3'], // Indigo 600-800
            ['#7c3aed', '#5b21b6'], // Violet 600-800
            ['#c026d3', '#86198f'], // Fuchsia 600-800
            ['#e11d48', '#9f1239'], // Rose 600-800
            ['#475569', '#1e293b'], // Slate 600-800
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return palettes[Math.abs(hash) % palettes.length];
    };

    const gradientColors = getGradientColors(name || '?');

    if (uri) {
        return (
            <View style={[
                { width: size, height: size, borderRadius: size / 2, overflow: 'hidden' },
                style
            ]}>
                <Image
                    source={{ uri }}
                    style={[
                        styles.image,
                        { width: size, height: size }
                    ]}
                />
            </View>
        );
    }

    return (
        <LinearGradient
            colors={gradientColors as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
                styles.placeholder,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
                style
            ]}
        >
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ThemedText style={[styles.initial, { fontSize: size * 0.45, lineHeight: size * 0.45, color: '#ffffff', textAlign: 'center', includeFontPadding: false, textAlignVertical: 'center' }]}>
                    {initial}
                </ThemedText>
            </View>
        </LinearGradient>
    );
});

const styles = StyleSheet.create({
    image: {
        resizeMode: 'cover',
    },
    placeholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    initial: {
        fontWeight: '700',
    },
});
