import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { Avatar } from '../ui/Avatar';
import { ThemedText } from '../ui/ThemedText';
import { GalleryPersonCard } from '../person/GalleryPersonCard';
import { SAMPLE_PEOPLE, type CardStyle } from './onboardingData';

interface OnboardingPreviewProps {
    cardStyle: CardStyle;
}

/**
 * Card-only preview for the appearance step. The full People screen chrome is
 * deliberately omitted so the visual stays focused on the two card designs.
 */
export function OnboardingPreview({ cardStyle }: OnboardingPreviewProps) {
    const { colors } = useAppTheme();

    return (
        <View pointerEvents="none" style={styles.preview}>
            <Animated.View
                key={cardStyle}
                entering={FadeIn.duration(120)}
                style={styles.cards}
            >
                {cardStyle === 'gallery' ? (
                    <View style={styles.galleryRow}>
                        {SAMPLE_PEOPLE.slice(0, 2).map((person) => (
                            <View key={person.id} style={styles.galleryItem}>
                                <GalleryPersonCard
                                    person={person}
                                    colors={colors}
                                    onPress={() => {}}
                                />
                            </View>
                        ))}
                    </View>
                ) : (
                    <View style={styles.list}>
                        {SAMPLE_PEOPLE.slice(0, 2).map((person) => (
                            <View
                                key={person.id}
                                style={[
                                    styles.personCard,
                                    { backgroundColor: colors.card },
                                ]}
                            >
                                <Avatar
                                    name={person.name}
                                    uri={person.avatarUri}
                                    size={52}
                                />
                                <View style={styles.personInfo}>
                                    <ThemedText
                                        type="defaultSemiBold"
                                        style={styles.personName}
                                        numberOfLines={1}
                                    >
                                        {person.name}
                                    </ThemedText>
                                    <ThemedText
                                        type="small"
                                        style={[
                                            styles.personPitch,
                                            { color: colors.secondary },
                                        ]}
                                        numberOfLines={1}
                                    >
                                        {person.pitch}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    preview: {
        flex: 1,
        width: '100%',
        maxWidth: 342,
        alignSelf: 'center',
        justifyContent: 'center',
    },
    cards: {
        width: '100%',
    },
    list: {
        paddingHorizontal: 16,
        gap: 4,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
    },
    personInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    personName: {
        fontSize: 17,
        marginBottom: -1,
        letterSpacing: -0.2,
        fontFamily: Typography.fontFamily.medium,
    },
    personPitch: {
        opacity: 0.7,
        fontSize: 12,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.regular,
    },
    galleryRow: {
        paddingHorizontal: 16,
        flexDirection: 'row',
        gap: 12,
    },
    galleryItem: {
        flex: 1,
    },
});
