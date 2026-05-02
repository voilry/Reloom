import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { ThemedView } from '../ui/ThemedView';
import { Avatar } from '../ui/Avatar';
import { X, UserPlus, CheckCircle, MagnifyingGlass, PlusCircle, ArrowLeft, MagnifyingGlassPlus, Plus } from 'phosphor-react-native';
import { Person } from '../../db/repositories/PersonRepository';
import { Group } from '../../db/repositories/GroupRepository';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScalePressable } from '../ui/ScalePressable';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, Layout, useAnimatedStyle, useAnimatedScrollHandler, useSharedValue, interpolate, Extrapolate } from 'react-native-reanimated';
import { Button } from '../ui/Button';
import { UsersThree } from 'phosphor-react-native';

interface ManageGroupMembersModalProps {
    visible: boolean;
    onClose: () => void;
    group: Group | null;
    members: Person[];
    allPeople: Person[];
    onToggleMember: (id: number, isAdding: boolean) => void;
    colors: any;
    theme: string;
    hapticsEnabled: boolean;
    initialAddingMode?: boolean;
}

export const ManageGroupMembersModal = ({
    visible,
    onClose,
    group,
    members,
    allPeople,
    onToggleMember,
    colors,
    theme,
    hapticsEnabled,
    initialAddingMode = false
}: ManageGroupMembersModalProps) => {
    const insets = useSafeAreaInsets();
    const [isAddingMode, setIsAddingMode] = React.useState(initialAddingMode);
    const [searchQuery, setSearchQuery] = React.useState('');
    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
        },
    });

    React.useEffect(() => {
        if (visible) {
            setIsAddingMode(initialAddingMode);
            setSearchQuery('');
        }
    }, [visible, initialAddingMode]);

    const filteredAllPeople = React.useMemo(() => {
        if (!searchQuery) return allPeople;
        return allPeople.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [allPeople, searchQuery]);

    const groupColor = group?.color || colors.tint;

    const handleBack = () => {
        if (isAddingMode) {
            setIsAddingMode(false);
            setSearchQuery('');
            scrollY.value = 0;
        } else {
            onClose();
        }
    };

    const headerAnimatedStyle = useAnimatedStyle(() => {
        // Balanced curve: stable for first 30px, then smooth dissolve over next 45px
        const opacity = interpolate(scrollY.value, [-50, 0, 30, 75], [1, 1, 1, 0], Extrapolate.CLAMP);
        const translateY = interpolate(scrollY.value, [-50, 0, 30, 75], [0, 0, 0, -40], Extrapolate.CLAMP);
        const scale = interpolate(scrollY.value, [-50, 0, 30, 75], [1, 1, 1, 0.98], Extrapolate.CLAMP);

        return {
            opacity,
            transform: [{ translateY }, { scale }],
        };
    });



    if (!visible || !group) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            statusBarTranslucent={true}
            onRequestClose={onClose}
        >
            <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Removed backgroundColor here so it doesn't clip the scrolling cards with a hard edge */}
                <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }, headerAnimatedStyle]}>
                    <View style={{ paddingTop: insets.top }}>
                        <View style={[styles.header, { borderBottomColor: 'transparent' }]}>
                            <ScalePressable
                                onPress={handleBack}
                                style={styles.headerCircleAction}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                overlayColor="transparent"
                                scaleTo={0.9}
                                innerStyle={{ borderRadius: 22 }}
                            >
                                {isAddingMode ? <ArrowLeft size={22} color={colors.text} /> : <X size={22} color={colors.text} />}
                            </ScalePressable>

                            <View style={styles.headerTitleContainer}>
                                <ThemedText type="display" style={[styles.headerTitle, { marginBottom: -14, marginTop: 10 }]}>
                                    {isAddingMode ? 'Add People' : 'Group Members'}
                                </ThemedText>
                                <View style={[styles.groupBadge, { backgroundColor: groupColor + '10', borderColor: groupColor + '20' }]}>
                                    <ThemedText type="tiny" style={{ color: groupColor, fontWeight: '700', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' }}>{group.name}</ThemedText>
                                </View>
                            </View>

                            <View style={styles.headerActionContainer}>
                                {!isAddingMode ? (
                                    <ScalePressable
                                        onPress={() => {
                                            if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            setIsAddingMode(true);
                                        }}
                                        style={[styles.headerCircleAction, { backgroundColor: groupColor + '20' }]}
                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                        overlayColor={groupColor + '25'}
                                        scaleTo={0.88}
                                        innerStyle={{ borderRadius: 22 }}
                                    >
                                        <UserPlus size={22} color={groupColor} weight="bold" />
                                    </ScalePressable>
                                ) : (
                                    <View style={{ width: 44 }} />
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Search / Section Info */}
                    <View style={[styles.topInfo, { paddingBottom: 24 }]}>
                        {isAddingMode ? (
                            <View style={styles.searchSection}>
                                <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}>
                                    <MagnifyingGlass size={20} color={colors.secondary} weight="regular" />
                                    <TextInput
                                        placeholder="Search network..."
                                        placeholderTextColor={colors.secondary + '80'}
                                        style={[styles.searchInput, { color: colors.text, fontFamily: Typography.fontFamily.regular }]}
                                        value={searchQuery}
                                        onChangeText={setSearchQuery}
                                    />
                                    {searchQuery.length > 0 && (
                                        <ScalePressable onPress={() => setSearchQuery('')} hitSlop={10} scaleTo={0.8} innerStyle={{ borderRadius: 10 }}>
                                            <X size={18} color={colors.secondary} />
                                        </ScalePressable>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.statsSection}>
                                <ThemedText type="sectionHeader" style={{ color: colors.secondary, letterSpacing: 1, fontSize: 13 }}>
                                    Member List
                                </ThemedText>
                                <ThemedText type="small" style={{ opacity: 0.5, fontSize: 12 }}>
                                    {members.length} Member{members.length !== 1 ? 's' : ''}
                                </ThemedText>
                            </View>
                        )}
                    </View>
                </Animated.View>

                {/* Content */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={{ flex: 1 }}
                >
                    <Animated.ScrollView
                        style={styles.content}
                        contentContainerStyle={{
                            paddingHorizontal: 16,
                            paddingBottom: insets.bottom + 40,
                            paddingTop: insets.top + (isAddingMode ? 166 : 150)
                        }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        onScroll={scrollHandler}
                        scrollEventThrottle={16}
                    >
                        <Animated.View layout={Layout.springify()}>
                            {isAddingMode ? (
                                filteredAllPeople.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <MagnifyingGlassPlus size={48} color={colors.icon} weight="light" />
                                        <ThemedText style={{ color: colors.secondary, textAlign: 'center', marginTop: 12 }}>
                                            No matches found.
                                        </ThemedText>
                                    </View>
                                ) : (
                                    filteredAllPeople.map((person, index) => {
                                        const isMember = members.some(m => m.id === person.id);
                                        return (
                                            <Animated.View key={person.id} entering={FadeInDown.delay(Math.min(index, 8) * 40)}>
                                                <ScalePressable
                                                    onPress={() => onToggleMember(person.id, true)}
                                                    style={[
                                                        styles.cardRow,
                                                        {
                                                            backgroundColor: colors.card,
                                                            borderColor: isMember ? groupColor + '40' : colors.border,
                                                            borderWidth: theme === 'light' ? 1 : 0
                                                        }
                                                    ]}
                                                    innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                                                >
                                                    <Avatar name={person.name} uri={person.avatarUri} size={48} />
                                                    <View style={styles.memberInfo}>
                                                        <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{person.name}</ThemedText>
                                                        <ThemedText type="tiny" style={{ color: colors.secondary, marginTop: 2, fontFamily: Typography.fontFamily.regular }} numberOfLines={1}>
                                                            {person.elevatorPitch || 'No description'}
                                                        </ThemedText>
                                                    </View>
                                                    <View style={styles.statusIcon}>
                                                        {isMember ? (
                                                            <CheckCircle size={26} color={colors.tint} weight="fill" />
                                                        ) : (
                                                            <PlusCircle size={26} color={colors.secondary + '40'} weight="regular" />
                                                        )}
                                                    </View>
                                                </ScalePressable>
                                            </Animated.View>
                                        );
                                    })
                                )
                            ) : (
                                members.length === 0 ? (
                                    <View style={[styles.emptyState, { marginTop: 40 }]}>
                                        <UsersThree size={72} color={colors.icon} weight="light" />
                                        <ThemedText type="display" style={{ color: colors.secondary, textAlign: 'center', marginTop: 8, fontSize: 16, letterSpacing: -0.2 }}>
                                            Group is currently empty.
                                        </ThemedText>
                                    </View>
                                ) : (
                                    members.map((person, index) => (
                                        <Animated.View key={person.id} entering={FadeInDown.delay(Math.min(index, 8) * 40)}>
                                            <View style={[
                                                styles.cardRow,
                                                {
                                                    backgroundColor: colors.card,
                                                    borderColor: groupColor + '20',
                                                    borderWidth: theme === 'light' ? 1 : 0
                                                }
                                            ]}>
                                                <Avatar name={person.name} uri={person.avatarUri} size={48} />
                                                <View style={styles.memberInfo}>
                                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 15 }}>{person.name}</ThemedText>
                                                    <ThemedText type="tiny" style={{ color: colors.secondary, marginTop: 2 }} numberOfLines={1}>
                                                        {person.elevatorPitch || 'No description'}
                                                    </ThemedText>
                                                </View>
                                                <ScalePressable
                                                    onPress={() => onToggleMember(person.id, false)}
                                                    style={[styles.statusIcon, { backgroundColor: colors.error + '10' }]}
                                                    innerStyle={{ borderRadius: 19 }}
                                                    scaleTo={0.8}
                                                >
                                                    <X size={20} color={colors.error} weight="bold" />
                                                </ScalePressable>
                                            </View>
                                        </Animated.View>
                                    ))
                                )
                            )}
                        </Animated.View>
                    </Animated.ScrollView>
                </KeyboardAvoidingView>
            </ThemedView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        height: 64,
    },
    headerAction: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleContainer: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        letterSpacing: -1,
    },
    content: {
        flex: 1,
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 12,
    },
    emptyState: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyAction: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: DesignSystem.radius.lg,
    },
    topInfo: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    searchSection: {
        marginBottom: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 52,
        borderRadius: DesignSystem.radius.xl,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '500',
    },
    statsSection: {
        paddingVertical: 4,
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: DesignSystem.radius.lg,
        marginBottom: 10,
    },
    memberInfo: {
        flex: 1,
        marginLeft: 14,
    },
    statusIcon: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActionContainer: {
        width: 44,
        alignItems: 'flex-end',
    },
    headerCircleAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupBadge: {
        marginTop: 6,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        maxWidth: 200,
    }
});
