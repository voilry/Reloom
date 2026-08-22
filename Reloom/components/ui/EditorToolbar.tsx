import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { X, Quotes as Quote, Code, Undo, Redo } from '@/components/ui/Icon';
import type { EditorBridge } from '@10play/tentap-editor';
import { useBridgeState } from '@10play/tentap-editor';
import * as Haptics from 'expo-haptics';

interface EditorToolbarProps {
    editor: EditorBridge;
    /**
     * Journal edit mode hides H1/H2 — converting the leading title <h1> into
     * another node type would break the protected title field.
     */
    showHeadingControls?: boolean;
}

export function EditorToolbar({
    editor,
    showHeadingControls = true,
}: EditorToolbarProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    // Hook is called unconditionally (rules of hooks); editor is required.
    const bridgeState = useBridgeState(editor);

    const triggerHaptic = () => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const isBoldActive = bridgeState?.isBoldActive;
    const isItalicActive = bridgeState?.isItalicActive;
    const isStrikeActive = bridgeState?.isStrikeActive;
    const headingLevel = bridgeState?.headingLevel;
    const isBulletActive = bridgeState?.isBulletListActive;
    const isTaskActive = bridgeState?.isTaskListActive;
    const isBlockquoteActive = bridgeState?.isBlockquoteActive;
    const isCodeActive = bridgeState?.isCodeActive;

    const canUndo = bridgeState?.canUndo ?? false;
    const canRedo = bridgeState?.canRedo ?? false;

    const handleAction = (action: () => void) => {
        triggerHaptic();
        action();
    };

    return (
        <View style={[styles.toolbar, { borderTopColor: colors.border + '30', backgroundColor: colors.background }]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.toolbarScroll}
                keyboardShouldPersistTaps="always"
            >
                <TouchableOpacity 
                    onPress={() => {
                        triggerHaptic();
                        if (editor) editor.undo();
                    }} 
                    disabled={!canUndo} 
                    style={[styles.toolbarButton, { opacity: canUndo ? 1 : 0.3 }]}
                >
                    <Undo size={18} color={colors.text} />
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={() => {
                        triggerHaptic();
                        if (editor) editor.redo();
                    }} 
                    disabled={!canRedo} 
                    style={[styles.toolbarButton, { opacity: canRedo ? 1 : 0.3 }]}
                >
                    <Redo size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />

                {/* Bold */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleBold())} 
                    style={[styles.toolbarButton, isBoldActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <ThemedText style={[styles.toolbarTextBold, { color: isBoldActive ? colors.tint : colors.text }]}>B</ThemedText>
                </TouchableOpacity>

                {/* Italic */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleItalic())} 
                    style={[styles.toolbarButton, isItalicActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <ThemedText style={[styles.toolbarTextItalic, { color: isItalicActive ? colors.tint : colors.text }]}>I</ThemedText>
                </TouchableOpacity>

                {/* Strike */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleStrike())} 
                    style={[styles.toolbarButton, isStrikeActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <ThemedText style={[styles.toolbarText, { textDecorationLine: 'line-through', color: isStrikeActive ? colors.tint : colors.text }]}>S</ThemedText>
                </TouchableOpacity>

                {!showHeadingControls ? null : (
                    <>
                        <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />

                        {/* H1 */}
                        <TouchableOpacity
                            onPress={() => handleAction(() => editor?.toggleHeading(1))}
                            style={[styles.toolbarButton, headingLevel === 1 && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                        >
                            <ThemedText style={[styles.toolbarText, { color: headingLevel === 1 ? colors.tint : colors.text, fontFamily: Typography.fontFamily.bold }]}>H1</ThemedText>
                        </TouchableOpacity>

                        {/* H2 */}
                        <TouchableOpacity
                            onPress={() => handleAction(() => editor?.toggleHeading(2))}
                            style={[styles.toolbarButton, headingLevel === 2 && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                        >
                            <ThemedText style={[styles.toolbarText, { color: headingLevel === 2 ? colors.tint : colors.text, fontFamily: Typography.fontFamily.bold }]}>H2</ThemedText>
                        </TouchableOpacity>
                    </>
                )}

                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />

                {/* Quote */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleBlockquote())} 
                    style={[styles.toolbarButton, isBlockquoteActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <Quote size={18} color={isBlockquoteActive ? colors.tint : colors.text} />
                </TouchableOpacity>

                {/* Bullet List */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleBulletList())} 
                    style={[styles.toolbarButton, isBulletActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <View style={[styles.bulletIcon, { borderColor: isBulletActive ? colors.tint : colors.text }]} />
                </TouchableOpacity>

                {/* Task List / Checklist */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleTaskList())} 
                    style={[styles.toolbarButton, isTaskActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <View style={[styles.checkboxIcon, { borderColor: isTaskActive ? colors.tint : colors.text }]} />
                </TouchableOpacity>

                <View style={[styles.toolbarDivider, { backgroundColor: colors.border + '40' }]} />

                {/* Code */}
                <TouchableOpacity 
                    onPress={() => handleAction(() => editor?.toggleCode())} 
                    style={[styles.toolbarButton, isCodeActive && { backgroundColor: colors.tint + '20', borderRadius: 8 }]}
                >
                    <Code size={18} color={isCodeActive ? colors.tint : colors.text} />
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
        marginBottom: Platform.OS === 'android' ? 12 : 6,
    },
    toolbarScroll: {
        alignItems: 'center',
        paddingRight: 20,
    },
    toolbarButton: {
        width: 36,
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 1,
    },
    toolbarText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.medium,
    },
    toolbarTextBold: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.bold,
    },
    toolbarTextItalic: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.italic,
    },
    toolbarDivider: {
        width: 1,
        height: 20,
        marginHorizontal: 6,
    },
    bulletIcon: {
        width: 14,
        height: 14,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        opacity: 0.85,
    },
    checkboxIcon: {
        width: 15,
        height: 15,
        borderWidth: 1.8,
        borderRadius: 3,
        opacity: 0.85,
    },
});
