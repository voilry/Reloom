
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, TextInput, Animated as RNAnimated } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { ScalePressable } from '../ui/ScalePressable';
import { Swipeable } from 'react-native-gesture-handler';
import { ThemedText } from '../ui/ThemedText';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Colors } from '../../constants/Colors';
import { DesignSystem } from '../../constants/DesignSystem';
import { Plus, FileText, MagnifyingGlass as Search, Sparkle as Sparkles, Coffee, House as Home, Briefcase, Airplane as Plane, Gift, Target, Tag, Trash } from 'phosphor-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';

interface EntriesTabProps {
    entries: any[];
    onAdd: () => void;
    onDelete: (id: number) => void;
    theme: 'light' | 'dark';
    isAcrylic?: boolean;
}

export function EntriesTab({ entries, onAdd, onDelete, theme, isAcrylic }: EntriesTabProps) {
    const router = useRouter();
    const { colors, hapticsEnabled } = useAppTheme();
    const [search, setSearch] = useState('');

    const acrylicBg = isAcrylic ? (theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(248,242,232,0.85)') : undefined;

    const filteredEntries = entries.filter(e => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        const contentMatch = (e.content && e.content.toLowerCase().includes(q)) || (e.type && e.type.toLowerCase().includes(q));

        // Comprehensive Date Match
        let dateMatch = false;
        if (e.createdAt) {
            const d = new Date(e.createdAt);
            if (!isNaN(d.getTime())) {
                const formats = [
                    d.toLocaleDateString('default', { month: 'long', day: 'numeric' }).toLowerCase(),
                    d.toLocaleDateString('default', { month: 'short', day: 'numeric' }).toLowerCase(),
                    d.toLocaleDateString('default', { month: 'long', year: 'numeric' }).toLowerCase(),
                    d.toLocaleDateString('default', { month: 'short', year: 'numeric' }).toLowerCase()
                ];
                dateMatch = formats.some(f => f.includes(q));
                if (!dateMatch && q.includes(' ')) {
                    const qParts = q.split(/\s+/);
                    dateMatch = qParts.every(part => formats.some(f => f.includes(part)));
                }
            }
        }
        return contentMatch || dateMatch;
    });

    const getCategoryIcon = (type: string) => {
        const size = 14;
        const color = colors.tint;
        switch (type) {
            case 'Memory': return <Sparkles size={size} color={color} />;
            case 'Food & Drink': return <Coffee size={size} color={color} />;
            case 'Family': return <Home size={size} color={color} />;
            case 'Work': return <Briefcase size={size} color={color} />;
            case 'Travel': return <Plane size={size} color={color} />;
            case 'Gift Idea': return <Gift size={size} color={color} />;
            case 'Goal': return <Target size={size} color={color} />;
            case 'Note': return <FileText size={size} color={color} />;
            default: return <Tag size={size} color={color} />;
        }
    };

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
            <View style={styles.searchRow}>
                <View style={[styles.searchContainer, { backgroundColor: acrylicBg ?? colors.card, borderColor: isAcrylic ? 'transparent' : colors.border }]}>
                    <Search size={16} color={colors.icon} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search notes..."
                        placeholderTextColor={colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                        style={[styles.searchInput, { color: colors.text }]}
                    />
                </View>
                <ScalePressable
                    onPress={onAdd}
                    overlayColor="rgba(0,0,0,0.15)"
                    style={[styles.addButton, { backgroundColor: colors.tint, ...DesignSystem.shadows.sm }]}
                    innerStyle={{ borderRadius: 14 }}
                >
                    <Plus size={24} color={theme === 'light' ? '#fff' : '#000'} weight="bold" />
                </ScalePressable>
            </View>

            {filteredEntries.length === 0 ? (
                <View style={styles.emptyState}>
                    <View style={[styles.emptyCircle, { backgroundColor: colors.surface }]}>
                        <FileText size={32} color={colors.icon} />
                    </View>
                    <ThemedText type="sectionHeader" style={{ marginTop: 1 }}>{search ? 'No notes found' : 'No Notes Yet'}</ThemedText>
                    <ThemedText style={{ color: colors.secondary, marginTop: 2, fontSize: 12, textAlign: 'center' }}>
                        {search ? 'Try a different search term.' : 'Keep track of specific details here.'}
                    </ThemedText>
                </View>
            ) : (
                filteredEntries.map((entry, index) => (
                    <Animated.View
                        key={entry.id}
                        entering={FadeInDown.delay(Math.min(index, 5) * 50).duration(400)}
                        layout={Layout.springify()}
                    >
                        <Swipeable
                            renderRightActions={(_progress, dragX) => renderRightActions(entry.id, dragX)}
                            overshootRight={false}
                            friction={3}
                            overshootFriction={8}
                            rightThreshold={60}
                        >
                        <ScalePressable
                            onPress={() => router.push({
                                pathname: '/editor',
                                params: { id: entry.id, type: 'entry' }
                            })}
                            style={{ marginBottom: 16 }}
                            innerStyle={{ borderRadius: 16 }}
                        >
                                <Card style={[{ backgroundColor: acrylicBg ?? colors.surface, borderRadius: 16 }]} padding="md">
                                    <View style={styles.entryHeader}>
                                        <View style={[styles.categoryBadge, { backgroundColor: colors.tint + '15' }]}>
                                            {getCategoryIcon(entry.type)}
                                            <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '800', textTransform: 'uppercase', marginLeft: 6 }}>{entry.type}</ThemedText>
                                        </View>
                                        <ThemedText type="tiny" style={{ color: colors.secondary, fontWeight: '700' }}>
                                            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </ThemedText>
                                    </View>
                                    <ThemedText numberOfLines={4} style={[styles.entryContent, { color: colors.text }]}>
                                        {entry.content
                                            .split('\n')
                                            .filter((l: string) => !/^(-{3,}|\*{3,}|_{3,})$/.test(l.trim()))
                                            .map((l: string) =>
                                                l.replace(/#{1,6}\s/, '')
                                                 .replace(/\*\*(.+?)\*\*/g, '$1')
                                                 .replace(/\*(.+?)\*/g, '$1')
                                                 .replace(/~~(.+?)~~/g, '$1')
                                                 .replace(/^[-*]\s/, '')
                                                 .replace(/^\[[ xX]\]\s/, '')
                                            )
                                            .join(' ')
                                            .trim()
                                        }
                                    </ThemedText>
                                </Card>
                        </ScalePressable>
                        </Swipeable>
                    </Animated.View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    entriesSection: {
        paddingTop: 8,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
        borderRadius: 12,
        borderWidth: 1,
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    addButton: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 8,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    entryContent: {
        lineHeight: 20,
        fontSize: 14,
        opacity: 0.9,
    },
});
