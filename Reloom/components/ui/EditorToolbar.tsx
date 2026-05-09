import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { X } from '@/components/ui/Icon';

interface EditorToolbarProps {
    onInsertFormatting: (prefix: string, suffix?: string) => void;
}

export function EditorToolbar({ onInsertFormatting }: EditorToolbarProps) {
    const { colors } = useAppTheme();

    return (
        <View style={[styles.toolbar, { borderTopColor: colors.border + '30', backgroundColor: colors.background }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolbarScroll}
                keyboardShouldPersistTaps="always"
            >
                <TouchableOpacity onPressIn={() => onInsertFormatting('**', '**')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarTextBold}>B</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => onInsertFormatting('*', '*')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarTextItalic}>I</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => onInsertFormatting('~~', '~~')} style={styles.toolbarButton}>
                    <ThemedText style={[styles.toolbarText, { textDecorationLine: 'line-through' }]}>S</ThemedText>
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                <TouchableOpacity onPressIn={() => onInsertFormatting('# ')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarText}>H1</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPressIn={() => onInsertFormatting('## ')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarText}>H2</ThemedText>
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                <TouchableOpacity onPressIn={() => onInsertFormatting('\n- ')} style={styles.toolbarButton}>
                    <View style={styles.bulletIcon} />
                </TouchableOpacity>
                <TouchableOpacity
                    onPressIn={() => onInsertFormatting('\n[ ] ')}
                    style={styles.toolbarButton}
                >
                    <View style={styles.checkboxIcon} />
                </TouchableOpacity>
            </ScrollView>
            <TouchableOpacity onPress={() => Keyboard.dismiss()} style={[styles.toolbarButton, { paddingLeft: 8 }]}>
                <X size={18} color={colors.secondary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    toolbar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        height: 44,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    toolbarScroll: {
        alignItems: 'center',
        paddingRight: 20,
    },
    toolbarButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 0,
    },
    toolbarText: {
        fontSize: 15,
        fontWeight: '500',
    },
    toolbarTextBold: {
        fontSize: 18,
        fontWeight: '800',
    },
    toolbarTextItalic: {
        fontSize: 18,
        fontStyle: 'italic',
        fontFamily: Typography.fontFamily.regular,
    },
    toolbarDivider: {
        width: 1,
        height: 20,
        marginHorizontal: 12,
    },
    bulletIcon: {
        width: 14,
        height: 14,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderColor: '#888',
        opacity: 0.8,
    },
    checkboxIcon: {
        width: 16,
        height: 16,
        borderWidth: 1.5,
        borderColor: '#888',
        borderRadius: 3,
        opacity: 0.8,
    },
});
