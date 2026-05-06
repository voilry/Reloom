import { View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, ScrollView, Platform, Alert, Animated as RNAnimated } from 'react-native';
import Animated, { FadeIn, FadeInDown, Layout, useSharedValue, useAnimatedStyle, useAnimatedScrollHandler, interpolate, Extrapolate, runOnJS } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { JournalRepository, Journal } from '../../db/repositories/JournalRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Book, Plus, X, MagnifyingGlass as Search, Tag, User, Trash, Calendar, CaretRight as ChevronRight, Pencil as PenTool } from 'phosphor-react-native';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { Swipeable } from 'react-native-gesture-handler';

import { QuickScrollButton } from '../../components/ui/QuickScrollButton';

const renderRightActions = (id: number, dragX: RNAnimated.AnimatedInterpolation<number>, colors: any, onDelete: (id: number) => void) => {
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
                borderRadius: 20,
                height: '100%',
                marginLeft: 12,
            }}
            innerStyle={{ borderRadius: 20 }}
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

const JournalItem = memo(({ item, index, colors, router, hapticsEnabled, onDelete, shouldAnimate }: any) => (
    <Animated.View
        entering={shouldAnimate ? FadeInDown.delay(Math.min(index, 5) * 60).duration(400) : undefined}

        style={styles.journalItem}
    >
        <Swipeable
            renderRightActions={(_progress, dragX) => renderRightActions(item.id, dragX, colors, onDelete)}
            overshootRight={false}
            friction={3}
            overshootFriction={8}
            rightThreshold={60}
        >
            <ScalePressable
                onPress={() => {
                    router.push({ pathname: '/journal/[id]', params: { id: item.id } });
                }}
                style={{ width: '100%' }}
                innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                scale={true}
                scaleTo={0.96}
            >
            <Card style={[{ backgroundColor: colors.surface, borderColor: colors.text + '10' }]} padding="lg">
                <View style={styles.cardHeader}>
                    <Badge variant="tint" icon={<Calendar size={12} color={colors.tint} weight="bold" />}>
                        {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Badge>
                </View>

                {item.title ? (
                    <ThemedText type="sectionHeader" style={styles.journalTitle}>{item.title}</ThemedText>
                ) : null}
                <ThemedText style={styles.journalContent} numberOfLines={3}>{item.content}</ThemedText>

                {item.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                        {item.tags.map((t: any, idx: number) => (
                            <View key={`journal-${item.id}-tag-${t.person.id}-${idx}`} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Avatar name={t.person.name} uri={t.person.avatarUri} size={18} />
                                <ThemedText type="tiny" style={styles.tagName}>{t.person.name.split(' ')[0]}</ThemedText>
                            </View>
                        ))}
                    </View>
                )}
            </Card>
        </ScalePressable>
        </Swipeable>
    </Animated.View>
));

export default function JournalScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [journals, setJournals] = useState<any[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldAnimate, setShouldAnimate] = useState(true);
    const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
    // Remove inline new journal state since we use the /journal/[id] route

    const { colors, theme, hapticsEnabled } = useAppTheme();

    useFocusEffect(
        useCallback(() => {
            setShouldAnimate(true);
            loadData();
            // Disable animations after initial load to prevent scroll-triggered animations
            const timer = setTimeout(() => setShouldAnimate(false), 1500);
            return () => clearTimeout(timer);
        }, [])
    );

    const loadData = async () => {
        try {
            const [journalData, peopleData] = await Promise.all([
                JournalRepository.getAll(),
                PersonRepository.getAll()
            ]);

            setJournals(journalData);
            setPeople(peopleData);
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to load journals:', error);
        }
    };



    const handleAddPress = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push({ pathname: '/journal/[id]', params: { id: 'new', edit: 'true' } });
    };

    const handleDelete = (id: number) => {
        setEntryToDelete(id);
    };

    const confirmDelete = async () => {
        if (entryToDelete !== null) {
            await JournalRepository.delete(entryToDelete);
            loadData();
            setEntryToDelete(null);
        }
    };

    const renderJournalItem = useCallback(({ item, index }: { item: any, index: number }) => (
        <JournalItem
            item={item}
            index={index}
            colors={colors}
            router={router}
            hapticsEnabled={hapticsEnabled}
            onDelete={handleDelete}
            shouldAnimate={shouldAnimate}
        />
    ), [colors, router, hapticsEnabled, shouldAnimate]);

    const [searchQuery, setSearchQuery] = useState('');

    const scrollY = useSharedValue(0);
    const scrollDirection = useSharedValue<'up' | 'down'>('up');
    const isScrolling = useSharedValue(false);
    const hideTimeout = useRef<any>(null);
    const journalListRef = useRef<FlatList>(null);

    const startHideTimer = useCallback(() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
            isScrolling.value = false;
        }, 800);
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - scrollY.value;
            
            if (Math.abs(diff) > 5) {
                scrollDirection.value = diff > 0 ? 'down' : 'up';
                isScrolling.value = currentY > 400;
            }
            scrollY.value = currentY;
            
            runOnJS(startHideTimer)();
        },
    });

    const handleQuickScroll = () => {
        if (scrollDirection.value === 'up') {
            journalListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } else {
            journalListRef.current?.scrollToEnd({ animated: true });
        }
    };

    const headerAnimatedStyle = useAnimatedStyle(() => {
        // Steeper interpolation for better responsiveness to scroll speed
        const opacity = interpolate(scrollY.value, [-50, 0, 60, 100], [1, 1, 1, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [-50, 0, 60, 100], [0, 0, 0, -30], Extrapolate.CLAMP);
        return {
            opacity,
            transform: [{ translateY }],
            height: 80,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
        };
    });

    const searchAnimatedStyle = useAnimatedStyle(() => {
        const scale = interpolate(scrollY.value, [-50, 0, 30, 80], [1, 1, 1, 0.95], Extrapolate.CLAMP);
        const opacity = interpolate(scrollY.value, [-50, 0, 30, 80], [1, 1, 1, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [-50, 0, 80], [80, 80, 0], Extrapolate.CLAMP);
        return {
            transform: [{ scale }, { translateY }],
            position: 'absolute',
            opacity,
            left: 0,
            right: 0,
            height: 52,
            zIndex: 9,
        };
    });

    const headerHeight = 80 + 52 + 10; // combined max height with optimized padding

    const filteredJournals = useMemo(() => {
        return journals.filter(j => {
            const q = searchQuery.toLowerCase().trim();
            if (!q) return true;
            const contentMatch = (j.title && j.title.toLowerCase().includes(q)) || (j.content && j.content.toLowerCase().includes(q));
            const tagMatch = j.tags && j.tags.some((t: any) => t.person.name.toLowerCase().includes(q));

            // Comprehensive Date Match
            let dateMatch = false;
            if (j.date) {
                const d = new Date(j.date);
                if (!isNaN(d.getTime())) {
                    const formats = [
                        d.toLocaleDateString('default', { month: 'long', day: 'numeric' }).toLowerCase(),
                        d.toLocaleDateString('default', { month: 'short', day: 'numeric' }).toLowerCase(),
                        d.toLocaleDateString('default', { month: 'long', year: 'numeric' }).toLowerCase(),
                        d.toLocaleDateString('default', { month: 'short', year: 'numeric' }).toLowerCase(),
                        j.date.toLowerCase()
                    ];
                    // Check if any part matches or if the combined parts match
                    dateMatch = formats.some(f => f.includes(q));
                    if (!dateMatch && q.includes(' ')) {
                        const qParts = q.split(/\s+/);
                        dateMatch = qParts.every(part => formats.some(f => f.includes(part)));
                    }
                }
            }
            return contentMatch || tagMatch || dateMatch;
        });
    }, [journals, searchQuery]);

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={{ position: 'relative', zIndex: 110 }}>
                <Animated.View style={headerAnimatedStyle}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleContainer}>
                            <ThemedText type="display" style={styles.title}>Journal</ThemedText>
                        </View>
                        <ScalePressable
                            onPress={handleAddPress}
                            style={[
                                styles.headerAction,
                                { backgroundColor: colors.tint + '1A', borderColor: colors.tint + '30', borderWidth: 1 }
                            ]}
                            innerStyle={{ borderRadius: 22 }}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        >
                            <PenTool size={22} color={colors.tint} weight="duotone" />
                        </ScalePressable>
                    </View>
                </Animated.View>

                <Animated.View style={[searchAnimatedStyle, { paddingHorizontal: 20 }]}>
                    <SearchBar
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        placeholder="Search memories..."
                        style={{ height: 52, borderRadius: DesignSystem.radius.md }}
                        backgroundColor={colors.card}
                        borderColor={colors.text + '15'}
                    />
                </Animated.View>
            </View>

            <Animated.FlatList
                ref={journalListRef}
                data={filteredJournals}
                keyExtractor={(item, index) => `journal-${item.id}-${index}`}
                renderItem={renderJournalItem}
                ListHeaderComponent={<View style={{ height: headerHeight }} />}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: insets.bottom + 100 },
                    filteredJournals.length === 0 && { flexGrow: 1 }
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    isLoading ? null : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                                {searchQuery ? <Search size={32} color={colors.icon} weight="bold" /> : <PenTool size={32} color={colors.icon} weight="duotone" />}
                            </View>
                            <ThemedText type="sectionHeader" style={styles.emptyTitle}>
                                {searchQuery ? 'No results' : 'Journal'}
                            </ThemedText>
                            <ThemedText style={[styles.emptySubtitle, { color: colors.secondary }]}>
                                {searchQuery
                                    ? `No matches for "${searchQuery}"`
                                    : 'Start logging memories.'}
                            </ThemedText>
                            {!searchQuery && (
                                <Button
                                    title="Write First Journal"
                                    onPress={handleAddPress}
                                    style={styles.emptyButton}
                                />
                            )}
                        </View>
                    )
                }
            />


            <DeleteModal
                visible={entryToDelete !== null}
                title="Delete Entry"
                description="Are you sure you want to remove this journal entry?"
                onCancel={() => setEntryToDelete(null)}
                onDelete={confirmDelete}
            />

            <QuickScrollButton 
                isScrolling={isScrolling} 
                direction={scrollDirection} 
                onPress={handleQuickScroll} 
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: DesignSystem.spacing.md,
        marginTop: DesignSystem.spacing.md,
        marginBottom: DesignSystem.spacing.lg,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {},
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...DesignSystem.shadows.sm,
    },
    list: {
        paddingHorizontal: DesignSystem.spacing.md,
        paddingTop: DesignSystem.spacing.xs,
    },
    journalItem: { marginBottom: DesignSystem.spacing.md },
    journalCard: {
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    journalTitle: { fontSize: 18, marginBottom: 8 },
    journalContent: { fontSize: 16, lineHeight: 24, marginBottom: 16, fontWeight: '500' },
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 10,
    },
    tagName: { marginLeft: 6, fontWeight: '600', opacity: 0.8 },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        marginBottom: 2,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.6,
        marginBottom: 20,
    },
    emptyButton: {
        width: '100%',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { flex: 1, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 10,
    },
    titleInput: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    journalInput: {
        fontSize: 19,
        minHeight: 180,
        textAlignVertical: 'top',
        paddingTop: 10,
        fontWeight: '500',
        lineHeight: 28,
    },
    tagSection: { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(128,128,128,0.1)', paddingTop: 24 },
    label: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0,
        lineHeight: 16,
    },
    tagSearchBAR: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 20,
    },
    tagSearchInput: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '500' },
    peopleList: { marginBottom: 20 },
    personTagItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: 'transparent',
    },
    personTagName: { marginLeft: 8, fontSize: 14, fontWeight: '600' },
    modalPage: {
        flex: 1,
    },
    sheetIndicator: {
        width: '100%',
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    handleIndicator: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        opacity: 0.5,
    },
    modalHeaderFullScreen: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    modalAction: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitleFullScreen: {
        fontSize: 18,
        fontWeight: '800',
    },
});

