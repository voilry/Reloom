import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { MagnifyingGlass as Search, X } from 'phosphor-react-native';
import { ScalePressable } from './ScalePressable';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: StyleProp<ViewStyle>;
    backgroundColor?: string;
    borderColor?: string;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style, backgroundColor, borderColor }: SearchBarProps) {
    const { colors, theme } = useAppTheme();

    return (
        <View style={[
            styles.searchBar, 
            { 
                backgroundColor: backgroundColor || colors.surface, 
                borderColor: borderColor || (theme === 'light' ? colors.border : 'transparent'),
                borderWidth: theme === 'light' ? 1 : 0,
            }, 
            style
        ]}>
            <Search size={18} color={colors.icon} style={styles.searchIcon} />
            <TextInput
                placeholder={placeholder}
                placeholderTextColor={colors.textTertiary}
                value={value}
                onChangeText={onChangeText}
                style={[styles.searchInput, { color: colors.text }]}
                selectionColor={colors.tint}
            />
            {value.length > 0 ? (
                <ScalePressable 
                    onPress={() => onChangeText('')} 
                    scale={true} 
                    style={styles.clearButton} 
                    overlayColor="transparent"
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                >
                    <View style={styles.clearIcon}>
                        <X size={14} color={colors.icon} />
                    </View>
                </ScalePressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 14,
        borderWidth: 0,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    clearButton: {
        padding: 4,
    },
    clearIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
