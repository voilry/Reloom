import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, FlatList, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MagnifyingGlass as Search } from '@/components/ui/Icon';
import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { useAppTheme } from '../../hooks/useAppTheme';
import type { Person } from '../../db/repositories/PersonRepository';
import * as Haptics from 'expo-haptics';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { ScreenHeader } from '../ui/ScreenHeader';
import { ScalePressable } from '../ui/ScalePressable';

interface PersonPickerModalProps {
    visible: boolean;
    people: Person[];
    onSelect: (person: Person) => void;
    onClose: () => void;
    title?: string;
}

export function PersonPickerModal({ visible, people, onSelect, onClose, title = "Select Person" }: PersonPickerModalProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');

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
         statusBarTranslucent>
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <ScreenHeader
                    onBack={onClose}
                    backButtonIcon={<X size={22} color={colors.text} />}
                    backButtonStyle={{ backgroundColor: 'transparent' }}
                    centerContent={
                        <ThemedText style={{ fontSize: 18, color: colors.text, fontFamily: Typography.fontFamily.serif }}>
                            {title}
                        </ThemedText>
                    }
                />

                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Search size={20} color={colors.icon} style={{ marginRight: 8 }} />
                    <TextInput
                        placeholder="Search..."
                        placeholderTextColor={colors.textTertiary}
                        value={search}
                        onChangeText={setSearch}
                        style={{ flex: 1, color: colors.text, fontSize: 16 }}
                        autoFocus
                    />
                </View>

                <FlatList
                    data={filtered}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={{ padding: 20 }}
                    renderItem={({ item }) => (
                        <ScalePressable
                            onPress={() => handleSelect(item)}
                            style={[styles.item, { borderBottomColor: colors.border }]}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Avatar name={item.name} uri={item.avatarUri} size={44} />
                            <View style={{ marginLeft: 12 }}>
                                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                                {item.elevatorPitch && (
                                    <ThemedText type="tiny" style={{ color: colors.secondary }} numberOfLines={1}>
                                        {item.elevatorPitch}
                                    </ThemedText>
                                )}
                            </View>
                        </ScalePressable>
                    )}
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    closeButton: {
        padding: 4,
    },
    searchBar: {
        marginHorizontal: 20,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
});
