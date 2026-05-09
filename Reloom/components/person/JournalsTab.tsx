
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated as RNAnimated, Platform } from 'react-native';
import { ScalePressable } from '../ui/ScalePressable';
import { Swipeable } from 'react-native-gesture-handler';
import { ThemedText } from '../ui/ThemedText';
import { Card } from '../ui/Card';
import { Colors } from '../../constants/Colors';
import { BookOpen, Trash } from '@/components/ui/Icon';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';

interface JournalsTabProps {
    journals: any[];
    personName: string;
    onDelete: (id: number) => void;
    isAcrylic?: boolean;
}

export function JournalsTab({ journals, personName, onDelete, isAcrylic }: JournalsTabProps) {
    const router = useRouter();
    const { colors, hapticsEnabled, theme } = useAppTheme();

    const acrylicBg = isAcrylic ? (theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(248,242,232,0.85)') : undefined;

    const renderRightActions = (id: number, dragX: RNAnimated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-80, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <ScalePressable
                style={{
                    backgroundColor: colors.error,
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: 75,
                    borderRadius: 16,
                    marginBottom: 16,
                    marginLeft: 12,
                }}
                innerStyle={{ borderRadius: 16 }}
                scale={true}
                overlayColor="rgba(0,0,0,0.15)"
                onPress={() => onDelete(id)}
            >
                <RNAnimated.View style={{ transform: [{ scale: trans }] }}>
                    <Trash size={24} color="#FFF" weight="fill" />
                </RNAnimated.View>
            </ScalePressable>
        );
    };

    return (
        <View style={styles.entriesSection}>
            {journals.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyCircle, { backgroundColor: colors.surface }]}>
                        <BookOpen size={32} color={colors.icon} />
                    </View>
                    <ThemedText type="sectionHeader" style={{ marginTop: 16 }}>No Mentions</ThemedText>
                    <ThemedText style={{ color: colors.secondary, marginTop: 2, fontSize: 12, textAlign: 'center' }}>
                        Tag {personName.split(' ')[0]} in your daily journal to see them here.
                    </ThemedText>
                </View>
            ) : (
                journals.map((item, index) => (
                    <Swipeable
                        key={index}
                        renderRightActions={(_progress, dragX) => renderRightActions(item.journal.id, dragX)}
                        overshootRight={false}
                        friction={3}
                        overshootFriction={8}
                        rightThreshold={60}
                    >
                        <ScalePressable
                            onPress={() => router.push(`/journal/${item.journal.id}`)}
                            style={{ marginBottom: 16 }}
                            innerStyle={{ borderRadius: 16 }}
                        >
                            <Card style={[{ borderRadius: 16, backgroundColor: acrylicBg ?? colors.surface }]} padding="md">
                                <View style={styles.entryHeader}>
                                    <View style={[styles.journalDateBadge, { backgroundColor: colors.tint + '15' }]}>
                                        <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '800' }}>
                                            {new Date(item.journal.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </ThemedText>
                                    </View>
                                </View>
                                {item.journal.title ? (
                                    <ThemedText type="sectionHeader" style={styles.journalTitle}>{item.journal.title}</ThemedText>
                                ) : null}
                                <ThemedText style={styles.journalContent} numberOfLines={4}>{item.journal.content}</ThemedText>
                            </Card>
                        </ScalePressable>
                    </Swipeable>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    entriesSection: {
        paddingTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        opacity: 0.8,
    },
    emptyCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    entryCard: {
    },
    entryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    journalDateBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    journalTitle: {
        fontSize: 18,
        marginBottom: 8,
    },
    journalContent: {
        lineHeight: 20,
        fontSize: 14,
        opacity: 0.9,
    }
});
