
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { DesignSystem } from '../../constants/DesignSystem';
import { Colors } from '../../constants/Colors';
import { PencilSimple as Edit, Clock } from '@/components/ui/Icon';
import type { Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';

import Animated, { interpolate, useAnimatedStyle, Extrapolation, SharedValue } from 'react-native-reanimated';
import { ScalePressable } from '../ui/ScalePressable';

interface PersonHeaderProps {
    person: Person;
    onEdit: () => void;
    scrollY?: SharedValue<number>;
}

export function PersonHeader({ person, onEdit, scrollY }: PersonHeaderProps) {
    const { colors, theme } = useAppTheme();

    const avatarStyle = useAnimatedStyle(() => {
        if (!scrollY) return {};
        const scale = interpolate(
            scrollY.value,
            [-100, 0, 100],
            [1.5, 1, 0.8],
            Extrapolation.CLAMP
        );
        const translateY = interpolate(
            scrollY.value,
            [-100, 0],
            [50, 0], // Move down when pulling
            Extrapolation.CLAMP
        );
        return {
            transform: [{ scale }, { translateY }]
        };
    });

    return (
        <View style={styles.header}>
            <Animated.View style={[styles.avatarWrapper, avatarStyle]}>
                <Avatar
                    name={person.name}
                    uri={person.avatarUri}
                    size={120}
                />
            </Animated.View>

            <ThemedText type="display" style={styles.name}>{person.name}</ThemedText>
            {
                person.elevatorPitch ? (
                    <ThemedText style={[styles.pitch, { fontSize: 16, color: colors.secondary }]}>
                        {person.elevatorPitch}
                    </ThemedText>
                ) : (
                    <ScalePressable
                        onPress={onEdit}
                        scale={false}
                        style={{ paddingVertical: 4 }}
                    >
                        <ThemedText style={{ color: colors.tint, fontSize: 16, fontWeight: '600' }}>+ Add headline</ThemedText>
                    </ScalePressable>
                )
            }

            <View style={styles.headerMeta}>
                <View style={[styles.metaItem, { backgroundColor: colors.surface + '80', marginTop: -11 }]}>
                    <Clock size={12} color={colors.secondary} />
                    <ThemedText type="tiny" style={{ color: colors.secondary, marginLeft: 6, fontWeight: '600' }}>
                        Joined {new Date(person.createdAt).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                    </ThemedText>
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    header: {
        alignItems: 'center',
        marginTop: 120,
        marginBottom: 40,
        paddingHorizontal: 24,
    },
    avatarWrapper: {
        position: 'relative',
    },
    editBadge: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    name: {
        marginTop: 16,
        textAlign: 'center',
    },
    pitch: {
        fontSize: 18,
        textAlign: 'center',
        marginTop: 8,
        opacity: 0.7,
        fontWeight: '500',
        lineHeight: 24,
    },
    headerMeta: {
        flexDirection: 'row',
        marginTop: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
});
