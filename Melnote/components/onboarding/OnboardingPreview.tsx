import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { Avatar } from '../ui/Avatar';
import { ThemedText } from '../ui/ThemedText';
import { SearchBar } from '../ui/SearchBar';
import { GalleryPersonCard } from '../person/GalleryPersonCard';
import { Filter, Gear, Users } from '../ui/Icon';
import { getGroupIcon } from '../../constants/GroupIcons';
import {
    SAMPLE_GROUPS,
    SAMPLE_PEOPLE,
    type CardStyle,
} from './onboardingData';

interface OnboardingPreviewProps {
    cardStyle: CardStyle;
}

export function OnboardingPreview({ cardStyle }: OnboardingPreviewProps) {
    const { colors, theme } = useAppTheme();

    return (
        <View pointerEvents="none" style={styles.preview}>
            <View style={styles.header}>
                <ThemedText type="display">People</ThemedText>
                <View
                    style={[
                        styles.headerAction,
                        { backgroundColor: colors.surface },
                    ]}
                >
                    <Gear size={22} color={colors.text} />
                </View>
            </View>

            <View style={styles.searchRow}>
                <SearchBar
                    value=""
                    onChangeText={() => {}}
                    placeholder="Search..."
                    style={styles.searchBar}
                />
                <View
                    style={[
                        styles.filterButton,
                        { backgroundColor: colors.card },
                    ]}
                >
                    <Filter size={20} color={colors.text} />
                </View>
            </View>

            <View style={styles.groupRow}>
                <View
                    style={[styles.groupChip, { backgroundColor: colors.tint }]}
                >
                    <Users
                        size={16}
                        color={theme === 'light' ? '#fff' : '#000'}
                    />
                    <ThemedText
                        style={[
                            styles.groupChipText,
                            {
                                color:
                                    theme === 'light' ? '#fff' : '#000',
                            },
                        ]}
                    >
                        All
                    </ThemedText>
                </View>

                {SAMPLE_GROUPS.slice(0, 2).map((group) => {
                    const GroupIcon = getGroupIcon(group.icon);

                    return (
                        <View
                            key={group.name}
                            style={[
                                styles.groupChip,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <GroupIcon size={16} color={group.color} />
                            <ThemedText
                                style={[
                                    styles.groupChipText,
                                    { color: colors.text },
                                ]}
                            >
                                {group.name}
                            </ThemedText>
                        </View>
                    );
                })}
            </View>

            <Animated.View
                key={cardStyle}
                entering={FadeIn.duration(180)}
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
                                style={styles.itemContainer}
                            >
                                <View
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
        width: '100%',
        maxWidth: 342,
    },
    header: {
        height: 44,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchRow: {
        height: 52,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
    },
    searchBar: {
        height: 52,
        borderRadius: 28,
        marginRight: 10,
    },
    filterButton: {
        width: 52,
        height: 52,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupRow: {
        height: 40,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        overflow: 'hidden',
    },
    groupChip: {
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    groupChipText: {
        fontSize: 14,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.semibold,
    },
    cards: {
        width: '100%',
    },
    list: {
        paddingHorizontal: 16,
    },
    itemContainer: {
        marginBottom: 4,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 20,
        borderWidth: 0,
    },
    personInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    personName: {
        fontSize: 17,
        fontWeight: '600',
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
