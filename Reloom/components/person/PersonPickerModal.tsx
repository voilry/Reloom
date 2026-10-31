import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, FlatList, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MagnifyingGlass as Search, Users } from '@/components/ui/Icon';
import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { Person } from '../../db/repositories/PersonRepository';
import * as Haptics from 'expo-haptics';
import { Typography } from '../../constants/Typography';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ScalePressable } from '../ui/ScalePressable';
import Animated, { Easing, FadeInDown } from 'react-native-reanimated';

interface PersonPickerModalProps {
    visible: boolean;
    people: Person[];
    onSelect: (person: Person) => void;
    onClose: () => void;
    title?: string;
    titleFontSize?: number;
}

const EASE_ENTER = Easing.bezier(0.05, 0.7, 0.1, 1.0);

export function PersonPickerModal({
    visible,
    people,
    onSelect,
    onClose,
    title = "Select Person",
    titleFontSize = 18,
}: PersonPickerModalProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');

    // Clear stale filter on close — otherwise reopening shows the old
    // search and people look missing.
    useEffect(() => {
        if (!visible) setSearch('');
    }, [visible]);

    const filtered = people.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

    const handleSelect = (p: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        onSelect(p);
        setSearch('');
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScreenHeader
                    onBack={onClose}
                    bottomPadding={8}
                    backButtonIcon={<X size={22} color={colors.text} />}
                    backButtonStyle={{ backgroundColor: 'transparent' }}
                    centerContent={
                        <ThemedText
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.75}
                            style={{
                                fontSize: titleFontSize,
                                letterSpacing: titleFontSize > 18 ? -0.4 : 0,
                                color: colors.text,
                                fontFamily: Typography.fontFamily.serif,
                                textAlign: 'center',
                            }}
                        >
                            {title}
                        </ThemedText>
                    }
                />

                <View style={styles.searchWrap}>
                    <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
                        <Search size={18} color={colors.textTertiary} />
                        <TextInput
                            placeholder="Search people"
                            placeholderTextColor={colors.textTertiary}
                            value={search}
                            onChangeText={setSearch}
                            style={[styles.searchInput, { color: colors.text }]}
                            selectionColor={colors.tint}
                        />
                        {search.length > 0 && (
                            <ScalePressable
                                onPress={() => setSearch('')}
                                style={styles.clearButton}
                                innerStyle={{ borderRadius: 10 }}
                                overlayColor="transparent"
                                haptic={false}
                                accessibilityRole="button"
                                accessibilityLabel="Clear search"
                            >
                                <X size={14} color={colors.textTertiary} />
                            </ScalePressable>
                        )}
                    </View>
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: 20 + insets.bottom },
                        filtered.length === 0 && styles.listEmpty,
                    ]}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item, index }) => (
                        <Animated.View
                            entering={FadeInDown.delay(Math.min(index, 10) * 24)
                                .duration(300)
                                .easing(EASE_ENTER)}
                        >
                            <ScalePressable
                                onPress={() => handleSelect(item)}
                                style={styles.item}
                                innerStyle={{ borderRadius: 18 }}
                                scaleTo={0.985}
                            >
                                <Avatar name={item.name} uri={item.avatarUri} size={46} />
                                <View style={styles.itemInfo}>
                                    <ThemedText numberOfLines={1} style={styles.itemName}>
                                        {item.name}
                                    </ThemedText>
                                    {item.elevatorPitch ? (
                                        <ThemedText
                                            numberOfLines={1}
                                            style={[styles.itemPitch, { color: colors.textSecondary }]}
                                        >
                                            {item.elevatorPitch}
                                        </ThemedText>
                                    ) : null}
                                </View>
                            </ScalePressable>
                        </Animated.View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Users size={30} color={colors.textTertiary} weight="fill" />
                            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                                {people.length === 0 ? 'No people yet.' : 'No person found.'}
                            </ThemedText>
                            <ThemedText style={[styles.emptyBody, { color: colors.textSecondary }]}>
                                {people.length === 0
                                    ? 'Add someone to your circle first.'
                                    : 'Try a different name.'}
                            </ThemedText>
                        </View>
                    }
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchWrap: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 16,
        paddingHorizontal: 14,
    },
    searchInput: {
        flex: 1,
        marginLeft: 8,
        fontSize: 15,
        fontFamily: Typography.fontFamily.regular,
        paddingVertical: 0,
    },
    clearButton: {
        padding: 4,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingTop: 4,
    },
    listEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    item: {
        minHeight: 62,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 8,
        borderRadius: 18,
    },
    itemInfo: {
        flex: 1,
        marginLeft: 14,
        justifyContent: 'center',
    },
    itemName: {
        fontSize: 15.5,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.15,
    },
    itemPitch: {
        fontSize: 12.5,
        lineHeight: 17,
        marginTop: 2,
        fontFamily: Typography.fontFamily.regular,
    },
    empty: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    emptyTitle: {
        marginTop: 14,
        fontSize: 20,
        lineHeight: 26,
        letterSpacing: -0.4,
        textAlign: 'center',
        fontFamily: Typography.fontFamily.serif,
    },
    emptyBody: {
        marginTop: 6,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        fontFamily: Typography.fontFamily.regular,
    },
});
