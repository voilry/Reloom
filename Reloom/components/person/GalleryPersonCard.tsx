import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { LinearGradient } from 'expo-linear-gradient';
import { ScalePressable } from '../ui/ScalePressable';
import { Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { PushPin } from '@/components/ui/Icon';
import { Typography } from '../../constants/Typography';

interface GalleryPersonCardProps {
    person: Person;
    colors: any;
    onPress: () => void;
    onLongPress?: () => void;
}

export const GalleryPersonCard = memo(({ person, colors, onPress, onLongPress }: GalleryPersonCardProps) => {
    const { theme } = useAppTheme();
    const initials = (person.name || '?').substring(0, 1).toUpperCase();

    // Original gradient logic from Avatar for consistency
    const getGradientColors = (str: string) => {
        const palettes = [
            ['#dc2626', '#991b1b'], ['#ea580c', '#9a3412'], ['#d97706', '#92400e'],
            ['#65a30d', '#3f6212'], ['#059669', '#065f46'], ['#0891b2', '#155e75'],
            ['#2563eb', '#1e40af'], ['#4f46e5', '#3730a3'], ['#7c3aed', '#5b21b6'],
            ['#c026d3', '#86198f'], ['#e11d48', '#9f1239'], ['#475569', '#1e293b'],
        ];
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return palettes[Math.abs(hash) % palettes.length];
    };
    const gradientColors = getGradientColors(person.name || '?');

    return (
        <ScalePressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
                styles.container,
                {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: theme === 'light' ? 1 : 0,
                }
            ]}
            innerStyle={{ borderRadius: 22 }}
        >
            {person.avatarUri ? (
                <>
                    <Image
                        source={{ uri: person.avatarUri }}
                        style={StyleSheet.absoluteFillObject}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
                        style={StyleSheet.absoluteFillObject}
                        locations={[0.4, 0.68, 1]}
                    />
                    <View style={styles.textContainer}>
                        <ThemedText style={styles.nameOverlay} numberOfLines={1}>{person.name}</ThemedText>
                        {!!person.elevatorPitch && (
                            <ThemedText style={styles.pitchOverlay} numberOfLines={1}>
                                {person.elevatorPitch}
                            </ThemedText>
                        )}
                    </View>
                    {person.isPinned && (
                        <View style={[styles.pinBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <PushPin size={14} color="#fff" weight="fill" />
                        </View>
                    )}
                </>
            ) : (
                // No avatar: use full-card colorful gradient
                <View style={styles.fallbackContainer}>
                    <LinearGradient
                        colors={gradientColors as [string, string]}
                        style={StyleSheet.absoluteFillObject}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
                        style={StyleSheet.absoluteFillObject}
                        locations={[0.3, 0.6, 1]}
                    />

                    <View style={styles.fallbackInitialWrapper}>
                        <ThemedText style={styles.fallbackInitial}>
                            {initials}
                        </ThemedText>
                    </View>

                    <View style={styles.textContainer}>
                        <ThemedText style={styles.nameOverlay} numberOfLines={1}>
                            {person.name}
                        </ThemedText>
                        {!!person.elevatorPitch && (
                            <ThemedText style={styles.pitchOverlay} numberOfLines={1}>
                                {person.elevatorPitch}
                            </ThemedText>
                        )}
                    </View>

                    {person.isPinned && (
                        <View style={[styles.pinBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                            <PushPin size={14} color="#fff" weight="fill" />
                        </View>
                    )}
                </View>
            )}
        </ScalePressable>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        aspectRatio: 0.85,
        borderRadius: 22,
        overflow: 'hidden',
        ...DesignSystem.shadows.md,
    },
    textContainer: {
        position: 'absolute',
        bottom: 14,
        left: 14,
        right: 14,
    },
    nameOverlay: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    pitchOverlay: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        fontWeight: '600',
        marginTop: -6,
    },
    fallbackContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
    },
    fallbackInitialWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 40,
    },
    fallbackInitial: {
        fontSize: 40,
        fontFamily: Typography.fontFamily.serif,
        color: '#ffffff',
        opacity: 0.85,
        lineHeight: 60,
        includeFontPadding: false,
    },
    pinBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 6,
        borderRadius: 12,
    },
});
