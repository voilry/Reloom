import React, { useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import Animated, { Easing, FadeIn, ZoomIn } from 'react-native-reanimated';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { ThemedText } from '../ui/ThemedText';
import { Input } from '../ui/Input';
import { ScalePressable } from '../ui/ScalePressable';
import { Trash } from '../ui/Icon';
import { getGroupIcon } from '../../constants/GroupIcons';
import type { SampleGroup } from './onboardingData';

const COLORS = [
    '#EAB308',
    '#6366F1',
    '#F43F5E',
    '#10B981',
    '#F59E0B',
    '#64748B',
    '#8B5CF6',
    '#F97316',
    '#EF4444',
    '#06B6D4',
    '#D946EF',
    '#EC4899',
    '#84CC16',
];

const ICONS = [
    'Folder',
    'Star',
    'Briefcase',
    'Heart',
    'Rocket',
    'Coffee',
    'Home',
    'Globe',
    'Plane',
    'Music',
    'Book',
    'Smile',
];

interface OnboardingGroupModalProps {
    visible: boolean;
    group: SampleGroup | null;
    onClose: () => void;
}

export function OnboardingGroupModal({
    visible,
    group,
    onClose,
}: OnboardingGroupModalProps) {
    const { colors } = useAppTheme();
    const [name, setName] = useState(group?.name ?? '');
    const [color, setColor] = useState(group?.color ?? COLORS[0]);
    const [icon, setIcon] = useState(group?.icon ?? 'Folder');

    useEffect(() => {
        if (!visible || !group) return;
        setName(group.name);
        setColor(group.color);
        setIcon(group.icon);
    }, [group, visible]);

    if (!group) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeIn.duration(240).easing(
                        Easing.bezier(0.05, 0.7, 0.1, 1.0)
                    )}
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: 'rgba(0,0,0,0.65)' },
                    ]}
                />

                <Pressable style={styles.overlayPress} onPress={onClose}>
                    <Animated.View
                        entering={ZoomIn.duration(280)
                            .springify()
                            .damping(22)
                            .stiffness(240)
                            .mass(0.85)}
                        style={[
                            styles.card,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.header}>
                            <View>
                                <ThemedText
                                    style={[
                                        styles.title,
                                        { color: colors.text },
                                    ]}
                                >
                                    Edit Group
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    style={styles.memberCount}
                                >
                                    {group.count}{' '}
                                    {group.count === 1 ? 'member' : 'members'}
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.content}>
                            <ThemedText style={styles.label}>
                                Group name
                            </ThemedText>
                            <Input
                                placeholder="..."
                                value={name}
                                onChangeText={setName}
                                maxLength={25}
                                containerStyle={styles.inputContainer}
                                style={styles.input}
                            />

                            <ThemedText style={styles.label}>
                                Update color
                            </ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.selectorScroll}
                                contentContainerStyle={styles.selectorContent}
                            >
                                {COLORS.map((swatch) => (
                                    <ScalePressable
                                        key={swatch}
                                        onPress={() => setColor(swatch)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: swatch },
                                            color === swatch && {
                                                borderWidth: 2.5,
                                                borderColor: colors.text,
                                            },
                                        ]}
                                        innerStyle={{ borderRadius: 15 }}
                                        scale={false}
                                        overlayColor="transparent"
                                        accessibilityRole="button"
                                        accessibilityLabel={`Group color ${swatch}`}
                                    />
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.label}>
                                Update icon
                            </ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.selectorScroll}
                                contentContainerStyle={styles.selectorContent}
                            >
                                {ICONS.map((iconName) => {
                                    const GroupIcon = getGroupIcon(iconName);
                                    const selected = icon === iconName;

                                    return (
                                        <ScalePressable
                                            key={iconName}
                                            onPress={() => setIcon(iconName)}
                                            style={[
                                                styles.iconOption,
                                                {
                                                    backgroundColor: selected
                                                        ? color
                                                        : colors.surface,
                                                },
                                            ]}
                                            innerStyle={{ borderRadius: 18 }}
                                            scale={false}
                                            overlayColor="transparent"
                                            accessibilityRole="button"
                                            accessibilityLabel={`Group icon ${iconName}`}
                                        >
                                            <GroupIcon
                                                size={18}
                                                color={
                                                    selected
                                                        ? '#fff'
                                                        : colors.text
                                                }
                                            />
                                        </ScalePressable>
                                    );
                                })}
                            </ScrollView>

                            <View style={styles.actions}>
                                <View style={styles.actionRow}>
                                    <ScalePressable
                                        onPress={onClose}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor:
                                                    colors.surface,
                                                flex: 1,
                                            },
                                        ]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        <ThemedText
                                            style={[
                                                styles.cancelText,
                                                { color: colors.text },
                                            ]}
                                        >
                                            Cancel
                                        </ThemedText>
                                    </ScalePressable>

                                    <ScalePressable
                                        onPress={onClose}
                                        style={[
                                            styles.actionButton,
                                            {
                                                backgroundColor: color,
                                                flex: 2,
                                            },
                                        ]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        <ThemedText
                                            style={styles.saveText}
                                        >
                                            Save Changes
                                        </ThemedText>
                                    </ScalePressable>
                                </View>

                                <ScalePressable
                                    onPress={onClose}
                                    style={styles.deleteRow}
                                    scaleTo={0.97}
                                    accessibilityRole="button"
                                    accessibilityLabel="Delete Group"
                                >
                                    <Trash
                                        size={16}
                                        color={colors.error}
                                        weight="fill"
                                    />
                                    <ThemedText
                                        style={[
                                            styles.deleteText,
                                            { color: colors.error },
                                        ]}
                                    >
                                        Delete Group
                                    </ThemedText>
                                </ScalePressable>
                            </View>
                        </View>
                    </Animated.View>
                </Pressable>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    overlayPress: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 28,
        borderWidth: 0,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 13,
        paddingBottom: 10,
    },
    title: {
        fontSize: 18,
        fontFamily: Typography.fontFamily.serif,
    },
    memberCount: {
        opacity: 0.55,
        marginTop: -2,
        fontSize: 12,
    },
    content: {
        paddingHorizontal: 14,
        paddingTop: 0,
        paddingBottom: 12,
    },
    label: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.semibold,
        marginTop: 10,
        marginBottom: 4,
        opacity: 0.5,
        letterSpacing: 0.2,
    },
    inputContainer: {
        marginBottom: 0,
    },
    input: {
        minHeight: 50,
    },
    selectorScroll: {
        marginTop: 0,
        marginBottom: 8,
        maxHeight: 40,
    },
    selectorContent: {
        alignItems: 'center',
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    iconOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    actions: {
        gap: 10,
        marginTop: 12,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionButton: {
        height: 46,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    cancelText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
    },
    saveText: {
        color: '#fff',
        fontSize: 15,
        fontFamily: Typography.fontFamily.bold,
    },
    deleteRow: {
        height: 44,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 14,
        gap: 7,
    },
    deleteText: {
        fontFamily: Typography.fontFamily.semibold,
        fontSize: 13.5,
    },
});
