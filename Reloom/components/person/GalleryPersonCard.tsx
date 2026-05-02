import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { LinearGradient } from 'expo-linear-gradient';
import { ScalePressable } from '../ui/ScalePressable';
import { Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { PushPin } from 'phosphor-react-native';

interface GalleryPersonCardProps {
    person: Person;
    colors: any;
    onPress: () => void;
    onLongPress?: () => void;
}

export const GalleryPersonCard = memo(({ person, colors, onPress, onLongPress }: GalleryPersonCardProps) => {
    const { theme } = useAppTheme();
    const initials = (person.name || '?').substring(0, 1).toUpperCase();

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
                // No avatar: use a tinted fallback with large initial + name below
                <View style={[styles.fallbackContainer, { backgroundColor: colors.card }]}>
                    <View style={[styles.fallbackInitialBox, { backgroundColor: colors.tint + '18' }]}>
                        <ThemedText style={[styles.fallbackInitial, { color: colors.tint }]}>
                            {initials}
                        </ThemedText>
                    </View>
                    <View style={styles.textContainer}>
                        <ThemedText style={[styles.nameFallback, { color: colors.text }]} numberOfLines={1}>
                            {person.name}
                        </ThemedText>
                        {!!person.elevatorPitch && (
                            <ThemedText style={[styles.pitchFallback, { color: colors.secondary }]} numberOfLines={1}>
                                {person.elevatorPitch}
                            </ThemedText>
                        )}
                    </View>
                    {person.isPinned && (
                        <View style={[styles.pinBadge, { backgroundColor: colors.tint + '20' }]}>
                            <PushPin size={14} color={colors.tint} weight="fill" />
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
        fontSize: 17,
        fontWeight: '800',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    pitchOverlay: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 3,
    },
    fallbackContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
    },
    fallbackInitialBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 44, // push up so text at bottom has room
    },
    fallbackInitial: {
        fontSize: 30,
        fontWeight: '900',
    },
    nameFallback: {
        fontSize: 16,
        fontWeight: '800',
    },
    pitchFallback: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 3,
    },
    pinBadge: {
        position: 'absolute',
        top: 10,
        right: 10,
        padding: 6,
        borderRadius: 12,
    },
});
