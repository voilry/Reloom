import { View, ScrollView, StyleSheet, Platform, Modal, TextInput, Pressable } from 'react-native';
import { ScalePressable } from './ui/ScalePressable';
import { ThemedText } from './ui/ThemedText';
import { Colors } from '../constants/Colors';
import { DesignSystem } from '../constants/DesignSystem';
import { useAppTheme } from '../hooks/useAppTheme';
import { Typography } from '../constants/Typography';
import { Plus, Folder, Star, Users, Briefcase, Heart, X, Check, Rocket, Coffee, House as Home, Globe, Airplane as Plane, MusicNote as Music, BookOpen as Book, Smiley as Smile, Trash } from '@/components/ui/Icon';
import * as Haptics from 'expo-haptics';
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import Animated, { FadeIn, Layout, ZoomIn } from 'react-native-reanimated';
import { GroupRepository, Group } from '../db/repositories/GroupRepository';
import { Input } from './ui/Input';

export interface GroupSelectorProps {
    groups: Group[];
    selectedGroupId: number | null; // null = 'All People'
    onSelectGroup: (groupId: number | null) => void;
    onCreateGroup: (name: string, icon: string, color: string) => void;
    onUpdateGroup?: (id: number, name: string, icon: string, color?: string) => void;
    onDeleteGroup: (id: number) => void;
    onManageMembers?: (group: Group) => void;
    hidden?: boolean;
}

export interface GroupSelectorHandle {
    openCreate: () => void;
    openEdit: (group: Group) => void;
}

const ICONS = ['Folder', 'Star', 'Briefcase', 'Heart', 'Rocket', 'Coffee', 'Home', 'Globe', 'Plane', 'Music', 'Book', 'Smile'];

export const GroupSelector = forwardRef<GroupSelectorHandle, GroupSelectorProps>((props, ref) => {
    const { groups, selectedGroupId, onSelectGroup, onCreateGroup, onUpdateGroup, onDeleteGroup, onManageMembers, hidden } = props;
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState('#CA8A04');

    // Edit Group State
    const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<Group | null>(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('Folder');
    const [editColor, setEditColor] = useState('#CA8A04');
    const [memberCount, setMemberCount] = useState<number>(0);

    const COLORS = [
        '#CA8A04', // Yellow 700
        '#4338CA', // Indigo 700
        '#BE123C', // Rose 700
        '#047857', // Emerald 700
        '#B45309', // Amber 700
        '#334155', // Slate 700
        '#6D28D9', // Violet 700
        '#C2410C', // Orange 700
        '#B91C1C', // Red 700
        '#0E7490', // Cyan 700
        '#A21CAF', // Fuchsia 700
        '#BE185D', // Pink 700
        '#65A30D', // Lime 700
    ];

    const handleCreate = () => {
        if (!newGroupName.trim()) return;
        onCreateGroup(newGroupName, selectedIcon, selectedColor);
        setNewGroupName('');
        setShowCreateModal(false);
    };

    const openEditModal = async (group: Group) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedGroupToEdit(group);
        setEditName(group.name);
        setEditIcon(group.icon || 'Folder');
        setEditColor(group.color || '#4338CA');

        // Fetch member count
        const peopleInGroup = await GroupRepository.getPeopleInGroup(group.id);
        setMemberCount(peopleInGroup.length);
    };

    useImperativeHandle(ref, () => ({
        openCreate: () => setShowCreateModal(true),
        openEdit: (group: Group) => openEditModal(group),
    }));

    const handleUpdate = () => {
        if (selectedGroupToEdit && props.onUpdateGroup) {
            props.onUpdateGroup(selectedGroupToEdit.id, editName, editIcon, editColor);
            setSelectedGroupToEdit(null);
        }
    };

    const handleDelete = () => {
        if (selectedGroupToEdit && props.onDeleteGroup) {
            props.onDeleteGroup(selectedGroupToEdit.id);
            setSelectedGroupToEdit(null);
        }
    };

    const getIcon = (name: string | null, color: string, size = 16) => {
        switch (name) {
            case 'Star': return <Star size={size} color={color} />;
            case 'Briefcase': return <Briefcase size={size} color={color} />;
            case 'Heart': return <Heart size={size} color={color} />;
            case 'Users': return <Users size={size} color={color} />;
            case 'Rocket': return <Rocket size={size} color={color} />;
            case 'Coffee': return <Coffee size={size} color={color} />;
            case 'Home': return <Home size={size} color={color} />;
            case 'Globe': return <Globe size={size} color={color} />;
            case 'Plane': return <Plane size={size} color={color} />;
            case 'Music': return <Music size={size} color={color} />;
            case 'Book': return <Book size={size} color={color} />;
            case 'Smile': return <Smile size={size} color={color} />;
            default: return <Folder size={size} color={color} />;
        }
    };

    return (
        <>
            {!hidden && (
                <View style={styles.container}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* All People Tab - Fixed Styling */}
                        <ScalePressable
                            onPress={() => {
                                onSelectGroup(null);
                            }}
                            scale={false}
                            style={[
                                styles.tab,
                                {
                                    backgroundColor: selectedGroupId === null ? colors.tint : colors.surface,
                                    borderWidth: theme === 'light' ? 1 : 0,
                                    borderColor: colors.border,
                                }
                            ]}
                            innerStyle={{ borderRadius: 20 }}
                        >
                            <Users size={16} color={selectedGroupId === null ? (theme === 'light' ? '#fff' : '#000') : colors.text} />
                            <ThemedText style={[
                                styles.tabText,
                                { color: selectedGroupId === null ? (theme === 'light' ? '#fff' : '#000') : colors.text }
                            ]}>
                                All
                            </ThemedText>
                        </ScalePressable>

                        {/* Groups */}
                        {groups.map((group, index) => {
                            const groupColor = group.color || colors.tint;
                            const isSelected = selectedGroupId === group.id;
                            return (
                                <Animated.View key={group.id} entering={FadeIn.delay(Math.min(index, 5) * 50).duration(400)}>
                                    <ScalePressable
                                        onPress={() => {
                                            onSelectGroup(group.id);
                                        }}
                                        onLongPress={() => openEditModal(group)}
                                        scale={false}
                                        style={[
                                            styles.tab,
                                            {
                                                backgroundColor: isSelected ? groupColor : colors.surface,
                                                borderWidth: theme === 'light' ? 1 : 0,
                                                borderColor: isSelected ? groupColor : colors.border,
                                            }
                                        ]}
                                        innerStyle={{ borderRadius: 20 }}
                                    >
                                        {getIcon(group.icon, isSelected ? '#fff' : groupColor)}
                                        <ThemedText style={[
                                            styles.tabText,
                                            { color: isSelected ? '#fff' : colors.text }
                                        ]}>
                                            {group.name}
                                        </ThemedText>
                                    </ScalePressable>
                                </Animated.View>
                            );
                        })}

                        {/* Add Button - Cleaner */}
                        {groups.length < 8 && (
                            <ScalePressable
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowCreateModal(true);
                                }}
                                style={[styles.tab, { backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border, paddingHorizontal: 12 }]}
                                innerStyle={{ borderRadius: 20 }}
                                scaleTo={0.9}
                            >
                                <Plus size={18} color={colors.text} />
                            </ScalePressable>
                        )}
                    </ScrollView>
                </View>
            )}

            {/* Create Group Modal */}
            <Modal
                transparent={true}
                visible={showCreateModal}
                animationType="fade"
                onRequestClose={() => setShowCreateModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={{ fontSize: 18, color: colors.text, fontFamily: Typography.fontFamily.serif }}>New Group</ThemedText>
                        </View>

                        <View style={styles.modalContent}>
                            <View style={{ position: 'relative' }}>
                                <Input
                                    label="Group Name"
                                    placeholder="e.g. Hiking Buddies"
                                    value={newGroupName}
                                    onChangeText={setNewGroupName}
                                    autoFocus
                                    maxLength={25}
                                />
                                <ThemedText style={{ position: 'absolute', right: 0, bottom: -4, fontSize: 10, color: colors.secondary, opacity: 0.6 }}>
                                    {newGroupName.length}/25
                                </ThemedText>
                            </View>

                            <ThemedText style={styles.label}>Select color</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {COLORS.map(c => (
                                    <ScalePressable
                                        key={c}
                                        onPress={() => setSelectedColor(c)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            selectedColor === c && { borderWidth: 2.5, borderColor: colors.text }
                                        ]}
                                        innerStyle={{ borderRadius: 15 }}
                                        scale={false}
                                        overlayColor="transparent"
                                    />
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.label}>Select icon</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {ICONS.map(icon => (
                                    <ScalePressable
                                        key={icon}
                                        onPress={() => setSelectedIcon(icon)}
                                        style={[
                                            styles.iconOption,
                                            selectedIcon === icon && { backgroundColor: selectedColor, borderColor: selectedColor }
                                        ]}
                                        innerStyle={{ borderRadius: 18 }}
                                        scale={false}
                                        overlayColor="transparent"
                                    >
                                        {getIcon(icon, selectedIcon === icon ? '#fff' : colors.text, 18)}
                                    </ScalePressable>
                                ))}
                            </ScrollView>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <ScalePressable
                                    onPress={() => setShowCreateModal(false)}
                                    style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 1 }]}
                                    innerStyle={{ borderRadius: 12 }}
                                >
                                    <ThemedText style={{ color: colors.text, fontWeight: '600' }}>Cancel</ThemedText>
                                </ScalePressable>
                                <ScalePressable
                                    onPress={handleCreate}
                                    disabled={!newGroupName.trim()}
                                    style={[
                                        styles.actionBtn,
                                        { backgroundColor: newGroupName.trim() ? selectedColor : colors.border, flex: 2 }
                                    ]}
                                    innerStyle={{ borderRadius: 12 }}
                                >
                                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Create Group</ThemedText>
                                </ScalePressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal >

            {/* Edit Group Modal */}
            <Modal
                transparent={true}
                visible={!!selectedGroupToEdit}
                animationType="fade"
                onRequestClose={() => setSelectedGroupToEdit(null)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <ThemedText style={{ fontSize: 18, color: colors.text, fontFamily: Typography.fontFamily.serif }}>Edit Group</ThemedText>
                                <ThemedText type="small" style={{ opacity: 0.6, marginTop: -2, fontSize: 12 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</ThemedText>
                            </View>
                            {onManageMembers && (
                                <ScalePressable
                                    onPress={() => {
                                        if (selectedGroupToEdit) {
                                            onManageMembers(selectedGroupToEdit);
                                            setSelectedGroupToEdit(null);
                                        }
                                    }}
                                    style={{ padding: 8 }}
                                    innerStyle={{ borderRadius: 8 }}
                                    scaleTo={0.92}
                                    overlayColor="transparent"
                                >
                                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint, fontSize: 13 }}>Manage Group →</ThemedText>
                                </ScalePressable>
                            )}
                        </View>

                        <View style={styles.modalContent}>
                            <View style={{ position: 'relative' }}>
                                <Input
                                    label="Group Name"
                                    placeholder="..."
                                    value={editName}
                                    onChangeText={setEditName}
                                    maxLength={25}
                                />
                                <ThemedText style={{ position: 'absolute', right: 0, bottom: -4, fontSize: 10, color: colors.secondary, opacity: 0.6 }}>
                                    {editName.length}/25
                                </ThemedText>
                            </View>

                            <ThemedText style={styles.label}>Update color</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {COLORS.map(c => (
                                    <ScalePressable
                                        key={c}
                                        onPress={() => setEditColor(c)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            editColor === c && { borderWidth: 2.5, borderColor: colors.text }
                                        ]}
                                        innerStyle={{ borderRadius: 15 }}
                                        scale={false}
                                        overlayColor="transparent"
                                    />
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.label}>Update icon</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {ICONS.map(icon => (
                                    <ScalePressable
                                        key={icon}
                                        onPress={() => setEditIcon(icon)}
                                        style={[
                                            styles.iconOption,
                                            editIcon === icon && { backgroundColor: editColor, borderColor: editColor }
                                        ]}
                                        innerStyle={{ borderRadius: 18 }}
                                        scale={false}
                                        overlayColor="transparent"
                                    >
                                        {getIcon(icon, editIcon === icon ? '#fff' : colors.text, 18)}
                                    </ScalePressable>
                                ))}
                            </ScrollView>

                            <View style={{ gap: 12, marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <ScalePressable
                                        onPress={() => setSelectedGroupToEdit(null)}
                                        style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 1 }]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        <ThemedText style={{ color: colors.text, fontWeight: '600' }}>Cancel</ThemedText>
                                    </ScalePressable>

                                    <ScalePressable
                                        onPress={handleUpdate}
                                        disabled={!editName.trim()}
                                        style={[styles.actionBtn, { backgroundColor: editColor, flex: 2 }]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</ThemedText>
                                    </ScalePressable>
                                </View>

                                <ScalePressable
                                    onPress={handleDelete}
                                    style={[styles.actionBtn, { backgroundColor: colors.error + '25', marginTop: 4 }]}
                                    innerStyle={{ borderRadius: 12 }}
                                    scaleTo={0.95}
                                >
                                    <Trash size={18} color={colors.error} weight="bold" />
                                    <ThemedText style={{ color: colors.error, fontWeight: '800', fontSize: 14 }}>Delete Group</ThemedText>
                                </ScalePressable>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    scrollContent: {
        paddingHorizontal: DesignSystem.spacing.lg,
        gap: 8,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: DesignSystem.radius.xl,
        borderWidth: 0.5,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    modalContent: {
        padding: 16,
    },
    selectorScroll: {
        marginTop: 4,
        marginBottom: 12,
        maxHeight: 40,
    },
    iconOption: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 10,
    },
    createBtn: {
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    actionBtn: {
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 13,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 2,
        opacity: 0.5,
        textTransform: 'none',
        letterSpacing: 1,
    }
});
