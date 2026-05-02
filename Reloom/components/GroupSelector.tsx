import { View, ScrollView, TouchableOpacity, StyleSheet, Platform, Modal, TextInput } from 'react-native';
import { ScalePressable } from './ui/ScalePressable';
import { ThemedText } from './ui/ThemedText';
import { Colors } from '../constants/Colors';
import { DesignSystem } from '../constants/DesignSystem';
import { useAppTheme } from '../hooks/useAppTheme';
import { Plus, Folder, Star, Users, Briefcase, Heart, X, Check, Lightning as Zap, Coffee, House as Home, Globe, Airplane as Plane, MusicNote as Music, BookOpen as Book, Smiley as Smile } from 'phosphor-react-native';
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

const ICONS = ['Folder', 'Star', 'Briefcase', 'Heart', 'Zap', 'Coffee', 'Home', 'Globe', 'Plane', 'Music', 'Book', 'Smile'];

export const GroupSelector = forwardRef<GroupSelectorHandle, GroupSelectorProps>((props, ref) => {
    const { groups, selectedGroupId, onSelectGroup, onCreateGroup, onUpdateGroup, onDeleteGroup, onManageMembers, hidden } = props;
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('Folder');
    const [selectedColor, setSelectedColor] = useState('#4338CA');

    // Edit Group State
    const [selectedGroupToEdit, setSelectedGroupToEdit] = useState<Group | null>(null);
    const [editName, setEditName] = useState('');
    const [editIcon, setEditIcon] = useState('Folder');
    const [editColor, setEditColor] = useState('#4338CA');
    const [memberCount, setMemberCount] = useState<number>(0);

    const COLORS = [
        '#4338CA', // Indigo 700
        '#BE123C', // Rose 700
        '#047857', // Emerald 700
        '#B45309', // Amber 700
        '#334155', // Slate 700
        '#6D28D9', // Violet 700
        '#1D4ED8', // Blue 700
        '#C2410C', // Orange 700
        '#B91C1C', // Red 700
        '#0E7490', // Cyan 700
        '#A21CAF', // Fuchsia 700
        '#BE185D', // Pink 700
        '#27272A', // Zinc 800
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
            case 'Zap': return <Zap size={size} color={color} />;
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
                            <TouchableOpacity
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setShowCreateModal(true);
                                }}
                                style={[styles.tab, { backgroundColor: colors.surface, borderWidth: theme === 'light' ? 1 : 0, borderColor: colors.border, paddingHorizontal: 12 }]}
                            >
                                <Plus size={18} color={colors.text} />
                            </TouchableOpacity>
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
                            <ThemedText type="sectionHeader">New Group</ThemedText>
                        </View>

                        <View style={styles.modalContent}>
                            <Input
                                label="Group Name"
                                placeholder="e.g. Hiking Buddies"
                                value={newGroupName}
                                onChangeText={setNewGroupName}
                                autoFocus
                            />

                            <ThemedText style={styles.label}>Select Color</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => setSelectedColor(c)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            selectedColor === c && { borderWidth: 2, borderColor: colors.text }
                                        ]}
                                    />
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.label}>Select Icon</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {ICONS.map(icon => (
                                    <TouchableOpacity
                                        key={icon}
                                        onPress={() => setSelectedIcon(icon)}
                                        style={[
                                            styles.iconOption,
                                            selectedIcon === icon && { backgroundColor: selectedColor, borderColor: selectedColor }
                                        ]}
                                    >
                                        {getIcon(icon, selectedIcon === icon ? '#fff' : colors.text, 18)}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                                <TouchableOpacity
                                    onPress={() => setShowCreateModal(false)}
                                    style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 1, borderWidth: 1, borderColor: colors.border }]}
                                >
                                    <ThemedText style={{ color: colors.text, fontWeight: '600' }}>Cancel</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={handleCreate}
                                    disabled={!newGroupName.trim()}
                                    style={[
                                        styles.actionBtn,
                                        { backgroundColor: newGroupName.trim() ? selectedColor : colors.border, flex: 2 }
                                    ]}
                                >
                                    <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Create Group</ThemedText>
                                </TouchableOpacity>
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
                                <ThemedText type="sectionHeader">Edit Group</ThemedText>
                                <ThemedText type="small" style={{ opacity: 0.6 }}>{memberCount} member{memberCount !== 1 ? 's' : ''}</ThemedText>
                            </View>
                            {onManageMembers && (
                                <TouchableOpacity 
                                    onPress={() => {
                                        if (selectedGroupToEdit) {
                                            onManageMembers(selectedGroupToEdit);
                                            setSelectedGroupToEdit(null);
                                        }
                                    }}
                                    style={{ padding: 8 }}
                                >
                                    <ThemedText type="defaultSemiBold" style={{ color: colors.tint, fontSize: 13 }}>Manage Group →</ThemedText>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.modalContent}>
                            <Input
                                label="Group Name"
                                placeholder="..."
                                value={editName}
                                onChangeText={setEditName}
                            />

                            <ThemedText style={styles.label}>Update Color</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {COLORS.map(c => (
                                    <TouchableOpacity
                                        key={c}
                                        onPress={() => setEditColor(c)}
                                        style={[
                                            styles.colorOption,
                                            { backgroundColor: c },
                                            editColor === c && { borderWidth: 2, borderColor: colors.text }
                                        ]}
                                    />
                                ))}
                            </ScrollView>

                            <ThemedText style={styles.label}>Update Icon</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorScroll}>
                                {ICONS.map(icon => (
                                    <TouchableOpacity
                                        key={icon}
                                        onPress={() => setEditIcon(icon)}
                                        style={[
                                            styles.iconOption,
                                            editIcon === icon && { backgroundColor: editColor, borderColor: editColor }
                                        ]}
                                    >
                                        {getIcon(icon, editIcon === icon ? '#fff' : colors.text, 18)}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={{ gap: 12, marginTop: 16 }}>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        onPress={() => setSelectedGroupToEdit(null)}
                                        style={[styles.actionBtn, { backgroundColor: colors.surface, flex: 1, borderWidth: 1, borderColor: colors.border }]}
                                    >
                                        <ThemedText style={{ color: colors.text, fontWeight: '600' }}>Cancel</ThemedText>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={handleUpdate}
                                        disabled={!editName.trim()}
                                        style={[styles.actionBtn, { backgroundColor: editColor, flex: 2 }]}
                                    >
                                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Save Changes</ThemedText>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={[styles.actionBtn, { backgroundColor: colors.error + '10' }]}
                                >
                                    <ThemedText style={{ color: colors.error, fontWeight: '700' }}>Delete Group</ThemedText>
                                </TouchableOpacity>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        maxWidth: 340,
        borderRadius: DesignSystem.radius.xl,
        borderWidth: 1,
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
        marginVertical: 12,
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
        height: 44,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        marginTop: 12,
        marginBottom: 8,
        opacity: 0.5,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
