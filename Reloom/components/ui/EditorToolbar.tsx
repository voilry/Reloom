import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { X, Quotes as Quote, Code, Minus, Undo, Redo } from '@/components/ui/Icon';

interface EditorToolbarProps {
    onInsertFormatting: (prefix: string, suffix?: string) => void;
    onUndo?: () => void;
    onRedo?: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
}

export function EditorToolbar({ 
    onInsertFormatting,
    onUndo,
    onRedo,
    canUndo = false,
    canRedo = false,
}: EditorToolbarProps) {
    const { colors } = useAppTheme();

    return (
        <View style={[styles.toolbar, { borderTopColor: colors.border + '30', backgroundColor: colors.background }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolbarScroll}
                keyboardShouldPersistTaps="always"
            >
                {onUndo && (
                    <TouchableOpacity 
                        onPress={onUndo} 
                        disabled={!canUndo} 
                        style={[styles.toolbarButton, { opacity: canUndo ? 1 : 0.4 }]}
                    >
                        <Undo size={18} color={colors.text} />
                    </TouchableOpacity>
                )}
                {onRedo && (
                    <TouchableOpacity 
                        onPress={onRedo} 
                        disabled={!canRedo} 
                        style={[styles.toolbarButton, { opacity: canRedo ? 1 : 0.4 }]}
                    >
                        <Redo size={18} color={colors.text} />
                    </TouchableOpacity>
                )}
                {(onUndo || onRedo) && (
                    <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                )}
                <TouchableOpacity onPress={() => onInsertFormatting('**', '**')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarTextBold}>B</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('*', '*')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarTextItalic}>I</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('~~', '~~')} style={styles.toolbarButton}>
                    <ThemedText style={[styles.toolbarText, { textDecorationLine: 'line-through' }]}>S</ThemedText>
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                <TouchableOpacity onPress={() => onInsertFormatting('# ')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarText}>H1</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('## ')} style={styles.toolbarButton}>
                    <ThemedText style={styles.toolbarText}>H2</ThemedText>
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                <TouchableOpacity onPress={() => onInsertFormatting('> ')} style={styles.toolbarButton}>
                    <Quote size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('- ')} style={styles.toolbarButton}>
                    <View style={styles.bulletIcon} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('[ ] ')} style={styles.toolbarButton}>
                    <View style={styles.checkboxIcon} />
                </TouchableOpacity>
                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />
                <TouchableOpacity onPress={() => onInsertFormatting('`', '`')} style={styles.toolbarButton}>
                    <Code size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onInsertFormatting('---')} style={styles.toolbarButton}>
                    <Minus size={18} color={colors.text} />
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
        width: 36,
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
        marginHorizontal: 8,
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
