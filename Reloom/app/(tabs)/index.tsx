import { View, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Alert, DeviceEventEmitter, Pressable } from 'react-native';
import Animated, { FadeInDown, Layout, FadeIn, FadeOut, SlideInDown, SlideOutDown, useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { DatePicker } from '../../components/ui/DatePicker';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { GroupRepository, Group } from '../../db/repositories/GroupRepository';
import { JournalRepository } from '../../db/repositories/JournalRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Button } from '../../components/ui/Button';
import { Plus, MagnifyingGlass as Search, Camera, X, Check, CaretRight, CaretLeft, Faders as Filter, Gear as Settings, User as UserIcon, Folder, Calendar, PencilLine as PenLine, Bell, Book, PushPin, MapPin } from 'phosphor-react-native';
import { Skeleton } from '../../components/ui/Skeleton';
import { Colors } from '../../constants/Colors';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { GroupSelector, GroupSelectorHandle } from '../../components/GroupSelector';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { PersonPickerModal } from '../../components/person/PersonPickerModal';
import { NewEntryModal } from '../../components/person/NewEntryModal';
import { ManageGroupsModal } from '../../components/person/ManageGroupsModal';
import { GalleryPersonCard } from '../../components/person/GalleryPersonCard';
import { DashboardGroupCard } from '../../components/person/DashboardGroupCard';
import { ManageGroupMembersModal } from '../../components/person/ManageGroupMembersModal';
import { EntryRepository } from '../../db/repositories/EntryRepository';
import { useSettings } from '../../store/SettingsContext';
import { AddReminderModal } from '../../components/calendar/AddReminderModal';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { ContactRepository } from '../../db/repositories/ContactRepository';
import { AddressBook } from 'phosphor-react-native';
import { QuickScrollButton } from '../../components/ui/QuickScrollButton';

const PersonItem = memo(({ item, index, colors, theme, onPress, onLongPress }: any) => (
    <View>
        <ScalePressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
                styles.itemContainer,
                {
                    backgroundColor: colors.card,
                    borderRadius: DesignSystem.radius.lg,
                    borderWidth: theme === 'light' ? 1 : 0,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                }
            ]}
        >
            <View style={[styles.personCard, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                <Avatar name={item.name} uri={item.avatarUri} size={52} />
                <View style={[styles.personInfo, { flex: 1 }]}>
                    <ThemedText type="defaultSemiBold" style={styles.personName}>{item.name}</ThemedText>
                    <ThemedText
                        type="small"
                        style={[styles.personPitch, { color: colors.secondary }]}
                        numberOfLines={1}
                    >
                        {item.elevatorPitch || 'No description added'}
                    </ThemedText>
                </View>
                {item.isPinned && (
                    <PushPin size={20} color={colors.tint} weight="fill" style={{ marginLeft: 12, marginRight: 4 }} />
                )}
            </View>
        </ScalePressable>
    </View>
));

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PeopleScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [search, setSearch] = useState('');
    const [people, setPeople] = useState<Person[]>([]);
    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();

    // Scroll Logic
    const scrollY = useSharedValue(0);
    const scrollDirection = useSharedValue<'up' | 'down'>('up');
    const isScrolling = useSharedValue(false);
    const hideTimeout = useRef<any>(null);
    const flatListRef = useRef<FlatList>(null);

    const startHideTimer = useCallback(() => {
        if (hideTimeout.current) clearTimeout(hideTimeout.current);
        hideTimeout.current = setTimeout(() => {
            isScrolling.value = false;
        }, 800);
    }, []);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            const currentY = event.contentOffset.y;
            const diff = currentY - scrollY.value;
            
            if (Math.abs(diff) > 5) {
                scrollDirection.value = diff > 0 ? 'down' : 'up';
                isScrolling.value = currentY > 400;
            }
            scrollY.value = currentY;
            
            runOnJS(startHideTimer)();
        },
    });

    const handleQuickScroll = () => {
        if (scrollDirection.value === 'up') {
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } else {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    };

    // Add Menu is now handled globally in _layout.tsx
    const [showGroupAssignModal, setShowGroupAssignModal] = useState(false);

    // Add Person Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPitch, setNewPitch] = useState('');
    const [newGender, setNewGender] = useState('');
    const [newBirthdate, setNewBirthdate] = useState('');
    const [newFirstMet, setNewFirstMet] = useState('');
    const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);

    // Group Assignment Modal
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedPersonForGroup, setSelectedPersonForGroup] = useState<Person | null>(null);
    const [selectedPersonGroups, setSelectedPersonGroups] = useState<number[]>([]);
    const [reconnects, setReconnects] = useState<any[]>([]);
    const [upcoming, setUpcoming] = useState<Person[]>([]);
    const [highlights, setHighlights] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shouldAnimate, setShouldAnimate] = useState(true);

    const [isDashboardActive, setIsDashboardActive] = useState(false);

    useEffect(() => {
        if (settings.peopleTabMode === 'discovery' && selectedGroupId === null && search === '') {
            setIsDashboardActive(true);
        } else {
            setIsDashboardActive(false);
        }
    }, [settings.peopleTabMode, selectedGroupId, search]);

    // Quick Actions State
    const [showPersonPicker, setShowPersonPicker] = useState(false);
    const [showQuickNoteModal, setShowQuickNoteModal] = useState(false);
    const [selectedPersonForNote, setSelectedPersonForNote] = useState<Person | null>(null);

    // Profile Modals
    const [showAddReminderModal, setShowAddReminderModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState<number | null>(null);
    const [showManageGroupModal, setShowManageGroupModal] = useState(false);
    const [groupToManage, setGroupToManage] = useState<Group | null>(null);
    const [modalMembers, setModalMembers] = useState<Person[]>([]);
    const [initialManageAddingMode, setInitialManageAddingMode] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);

    const [personToManage, setPersonToManage] = useState<Person | null>(null);
    const [showPersonManageModal, setShowPersonManageModal] = useState(false);

    const groupSelectorRef = useRef<GroupSelectorHandle>(null);

    const [pickerMode, setPickerMode] = useState<'note' | 'contact' | null>(null);
    const [activitySortedPeople, setActivitySortedPeople] = useState<Person[]>([]);

    const handleQuickNote = async () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPickerMode('note');
        const sorted = await PersonRepository.getPeopleSortedByNotesFrequency();
        setActivitySortedPeople(sorted);
        setShowPersonPicker(true);
    };

    const handleQuickContact = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPickerMode('contact');
        setShowPersonPicker(true);
    };

    const handlePersonSelected = (person: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        setShowPersonPicker(false);
        if (pickerMode === 'note') {
            setSelectedPersonForNote(person);
            setTimeout(() => {
                setShowQuickNoteModal(true);
            }, 400); // Wait for modal animation
        } else if (pickerMode === 'contact') {
            setTimeout(() => {
                router.push({ pathname: '/contact/[id]', params: { id: 'new', personId: person.id } });
            }, 200);
        }
    };

    const handleSaveQuickNote = async (category: string, content: string) => {
        if (selectedPersonForNote) {
            await EntryRepository.addEntry(selectedPersonForNote.id, category, content, settings.addTimestampToNotes);
            setShowQuickNoteModal(false);
            const name = selectedPersonForNote.name;
            setSelectedPersonForNote(null);
            
            const { showToast } = require('../../components/ui/Toast');
            showToast(`Note added for ${name}`);
            // Optional: feedback
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleQuickReminder = () => {
        setShowAddReminderModal(true);
    };

    const handlePersonLongPress = (person: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setPersonToManage(person);
        setShowPersonManageModal(true);
    };

    useEffect(() => {
        const sub1 = DeviceEventEmitter.addListener('globalAction:newPerson', () => setShowAddModal(true));
        const sub2 = DeviceEventEmitter.addListener('globalAction:quickNote', () => handleQuickNote());
        const sub3 = DeviceEventEmitter.addListener('globalAction:quickContact', () => handleQuickContact());
        const sub4 = DeviceEventEmitter.addListener('globalAction:setReminder', () => handleQuickReminder());

        return () => {
            sub1.remove();
            sub2.remove();
            sub3.remove();
            sub4.remove();
        };
    }, []);

    const handleTogglePin = async () => {
        if (!personToManage) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        await PersonRepository.togglePin(personToManage.id, !personToManage.isPinned);
        setShowPersonManageModal(false);
        setPersonToManage(null);
        loadPeople();
    };

    const isFirstViewRef = useRef(true);

    useFocusEffect(
        useCallback(() => {
            // Only animate on the very first time the app is opened, or when changing groups
            if (isFirstViewRef.current) {
                setShouldAnimate(true);
                const timer = setTimeout(() => {
                    setShouldAnimate(false);
                    isFirstViewRef.current = false;
                }, 1500);
                loadData();
                return () => clearTimeout(timer);
            } else {
                loadData(true); // silent update
            }
            // Always reset local sort to user choice on focus
            setSortBy(settings.defaultSort);
        }, [selectedGroupId, settings.defaultSort])
    );

    const loadData = async (isSilent = false) => {
        // Only show loading if we have absolutely no data yet and not a silent update
        if (!isSilent && people.length === 0 && reconnects.length === 0 && upcoming.length === 0) {
            setIsLoading(true);
        }
        // Load Groups
        const allGroups = await GroupRepository.getAll();
        setGroups(allGroups);

        // Load People based on selection
        let data;
        if (selectedGroupId === null) {
            data = await PersonRepository.getAll(settings.defaultSort);

            // Load Dashboard Data only on main view
            const [r, u, h] = await Promise.all([
                PersonRepository.getReconnectSuggestions(),
                PersonRepository.getUpcomingBirthdays(),
                JournalRepository.getHighlights(3)
            ]);
            setReconnects(r);
            setUpcoming(u);
            setHighlights(h);
        } else {
            data = await GroupRepository.getPeopleInGroup(selectedGroupId, settings.defaultSort);
        }
        setPeople(data);

        // Always keep a full list for group assignment, sorted by preference
        const allData = await PersonRepository.getAll(settings.defaultSort);
        setAllPeople(allData);

        setIsLoading(false);
    };

    const loadPeople = async () => {
        // Re-fetch just people (helper for other ops)
        let data;
        if (selectedGroupId === null) {
            data = await PersonRepository.getAll(settings.defaultSort);
        } else {
            data = await GroupRepository.getPeopleInGroup(selectedGroupId, settings.defaultSort);
        }
        setPeople(data);

        // Always sync allPeople too
        const all = await PersonRepository.getAll(settings.defaultSort);
        setAllPeople(all);
    };

    const handleCreateGroup = async (name: string, icon: string, color: string) => {
        await GroupRepository.create({ name, icon, color });
        const all = await GroupRepository.getAll();
        setGroups(all);
    };

    const handleUpdateGroup = async (id: number, name: string, icon: string, color?: string) => {
        await GroupRepository.update(id, { name, icon, color });
        const all = await GroupRepository.getAll();
        setGroups(all);
    };

    const handleDeleteGroup = async (id: number) => {
        setGroupToDelete(id);
    };

    const handleGroupSelection = (id: number | null) => {
        const isSwitchingFromDashboard = isDashboardActive;
        const groupChanged = id !== selectedGroupId;

        if (groupChanged || isSwitchingFromDashboard) {
            setShouldAnimate(true);
            setTimeout(() => setShouldAnimate(false), 800);

            if (groupChanged) {
                setIsLoading(true);
                setPeople([]);
                setSelectedGroupId(id);
            }
        }

        setSearch('');
        if (isSwitchingFromDashboard) {
            setIsDashboardActive(false);
        }
    };

    const confirmDeleteGroup = async () => {
        if (groupToDelete !== null) {
            await GroupRepository.delete(groupToDelete);
            const all = await GroupRepository.getAll();
            setGroups(all);
            if (selectedGroupId === groupToDelete) setSelectedGroupId(null);
            setGroupToDelete(null);
        }
    };

    const handleOpenManageGroup = async (group: Group, startInAddingMode: boolean = false) => {
        setGroupToManage(group);
        setInitialManageAddingMode(startInAddingMode);
        const members = await GroupRepository.getPeopleInGroup(group.id, settings.defaultSort);
        setModalMembers(members);
        setShowManageGroupModal(true);
    };

    const openAssignData = async (person: Person) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedPersonForGroup(person);
        const pGroups = await GroupRepository.getGroupsForPerson(person.id);
        setSelectedPersonGroups(pGroups.map(g => g.id));
        setShowAssignModal(true);
    };

    const toggleGroupAssignment = async (groupId: number) => {
        if (!selectedPersonForGroup) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();

        if (selectedPersonGroups.includes(groupId)) {
            await GroupRepository.removePersonFromGroup(selectedPersonForGroup.id, groupId);
            setSelectedPersonGroups(prev => prev.filter(id => id !== groupId));
        } else {
            await GroupRepository.addPersonToGroup(selectedPersonForGroup.id, groupId);
            setSelectedPersonGroups(prev => [...prev, groupId]);
        }
        // If we are currently viewing this group, we might need to refresh, but let's wait until modal close or force it? 
        // Logic: if we remove from current group, list should update.
        if (selectedGroupId === groupId) {
            // We'll reload on modal close or effect
        }
    };

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setNewAvatarUri(result.assets[0].uri);
        }
    };

    const handleAddPerson = async () => {
        if (!newName.trim()) return;

        const newPerson = await PersonRepository.create({
            name: newName,
            elevatorPitch: newPitch,
            gender: newGender,
            birthdate: newBirthdate,
            firstMet: newFirstMet,
            avatarUri: newAvatarUri
        });

        const { showToast } = require('../../components/ui/Toast');
        showToast(`Added ${newName}`);

        resetForm();
        setShowAddModal(false);
        loadPeople();
        
        // Show success feedback
        setAlertConfig({
            visible: true,
            title: 'Person Added',
            description: `${newPerson.name} has been added to your network.`,
            type: 'success',
            onClose: () => {
                router.push(`/person/${newPerson.id}`);
            }
        });
    };

    const resetForm = () => {
        setNewName('');
        setNewPitch('');
        setNewGender('');
        setNewBirthdate('');
        setNewFirstMet('');
        setNewAvatarUri(null);
    };

    const [sortBy, setSortBy] = useState<'name' | 'newest' | 'oldest'>(settings.defaultSort);
    const [showSortMenu, setShowSortMenu] = useState(false);

    useEffect(() => {
        setSortBy(settings.defaultSort);
    }, [settings.defaultSort]);

    const filteredPeople = useMemo(() => {
        return people.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            (p.elevatorPitch && p.elevatorPitch.toLowerCase().includes(search.toLowerCase()))
        ).sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;

            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            return 0;
        });
    }, [people, search, sortBy]);

    const isGallery = settings.peopleListStyle === 'gallery';

    const renderItem = useCallback(({ item, index }: { item: Person, index: number }) => {
        if (isGallery) {
            return (
                <Animated.View entering={shouldAnimate ? FadeInDown.delay(Math.min(index, 5) * 60).duration(400) : undefined} style={{ flex: 1, minWidth: '45%', maxWidth: '48%', marginHorizontal: 6, marginBottom: 12 }}>
                    <GalleryPersonCard
                        person={item}
                        colors={colors}
                        onPress={() => router.push(`/person/${item.id}`)}
                        onLongPress={() => handlePersonLongPress(item)}
                    />
                </Animated.View>
            );
        }
        return (
            <Animated.View entering={shouldAnimate ? FadeInDown.delay(Math.min(index, 5) * 60).duration(400) : undefined}>
                <PersonItem
                    item={item}
                    index={index}
                    colors={colors}
                    theme={theme}
                    onPress={() => {
                        router.push(`/person/${item.id}`);
                    }}
                    onLongPress={() => handlePersonLongPress(item)}
                />
            </Animated.View>
        );
    }, [colors, router, theme, isGallery, shouldAnimate, openAssignData]);

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerTitleContainer}>
                    <ThemedText type="display" style={styles.title}>People</ThemedText>
                </View>
                <View style={styles.headerActions}>
                    <ScalePressable
                        onPress={() => router.push('/settings')}
                        style={[styles.headerAction, { backgroundColor: colors.surface, marginRight: 0 }]}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        innerStyle={{ borderRadius: DesignSystem.radius.full }}
                        scaleTo={0.88}
                        springConfig={DesignSystem.animation.springs.fast}
                    >
                        <Settings size={22} color={colors.text} />
                    </ScalePressable>
                </View>
            </View>



            <Animated.FlatList
                ref={flatListRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                onScrollBeginDrag={() => {
                    if (showSortMenu) setShowSortMenu(false);
                }}
                data={isDashboardActive ? [] : filteredPeople}
                key={isGallery && !isDashboardActive ? 'gallery-view' : 'list-view'}
                numColumns={isGallery && !isDashboardActive ? 2 : 1}
                columnWrapperStyle={isGallery && !isDashboardActive ? { marginHorizontal: -6, justifyContent: 'space-between' } : undefined}
                keyExtractor={(item, index) => `person-${item.id}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: insets.bottom + 100 },
                    filteredPeople.length === 0 && { flexGrow: 1 }
                ]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={Platform.OS === 'android'}
                ListHeaderComponent={
                    <View style={{ zIndex: 1000, elevation: 10 }}>
                        {isDashboardActive ? (
                            <View style={{ padding: 20, paddingTop: 10 }}>
                                <DashboardGroupCard
                                    title="All People"
                                    description="Your entire network"
                                    isMaster
                                    count={allPeople.length}
                                    colors={colors}
                                    color={colors.tint}
                                    onPress={() => handleGroupSelection(null)}
                                />
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                                    {groups.map(g => (
                                        <View key={g.id} style={{ width: '47%' }}>
                                            <DashboardGroupCard
                                                title={g.name}
                                                iconName={g.icon}
                                                color={g.color || colors.tint}
                                                colors={colors}
                                                onPress={() => handleGroupSelection(g.id)}
                                                onLongPress={() => {
                                                    groupSelectorRef.current?.openEdit(g);
                                                }}
                                            />
                                        </View>
                                    ))}
                                    {groups.length < 8 && (
                                        <View style={{ width: '47%' }}>
                                            <DashboardGroupCard
                                                title="Create Group"
                                                description="Organize people"
                                                iconName="Plus"
                                                color={colors.text}
                                                colors={colors}
                                                isAddCard
                                                onPress={() => groupSelectorRef.current?.openCreate()}
                                            />
                                        </View>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <Animated.View entering={FadeIn.duration(300)}>
                                {settings.peopleTabMode === 'discovery' && (
                                    <ScalePressable
                                        onPress={() => {
                                            if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setSearch('');
                                            setSelectedGroupId(null);
                                            setIsDashboardActive(true);
                                        }}
                                        style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 5, flexDirection: 'row', alignItems: 'center' }}
                                        innerStyle={{ borderRadius: 8 }}
                                        overlayColor="transparent"
                                        scaleTo={0.97}
                                        springConfig={DesignSystem.animation.springs.fast}
                                    >
                                        <CaretLeft size={20} color={colors.secondary} />
                                        <ThemedText style={{ color: colors.secondary, marginLeft: 8, fontWeight: '600' }}>Back to Dashboard</ThemedText>
                                    </ScalePressable>
                                )}
                                <View style={[styles.searchSection, isGallery && { marginBottom: 6 }]}>
                                    <View style={styles.searchRow}>
                                        <SearchBar
                                            value={search}
                                            onChangeText={setSearch}
                                            placeholder="Search..."
                                            style={{ height: 52, borderRadius: DesignSystem.radius.xl, marginRight: 10 }}
                                        />
                                        <ScalePressable
                                            style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}
                                            onPress={() => setShowSortMenu(!showSortMenu)}
                                            innerStyle={{ borderRadius: DesignSystem.radius.xl }}
                                        >
                                            <Filter size={20} color={showSortMenu ? colors.tint : colors.text} />
                                        </ScalePressable>
                                    </View>
                                </View>
                            </Animated.View>
                        )}

                        <GroupSelector
                            ref={groupSelectorRef}
                            groups={groups}
                            selectedGroupId={selectedGroupId}
                            onSelectGroup={handleGroupSelection}
                            onCreateGroup={handleCreateGroup}
                            onUpdateGroup={handleUpdateGroup}
                            onDeleteGroup={handleDeleteGroup}
                            onManageMembers={handleOpenManageGroup}
                            hidden={settings.peopleTabMode === 'discovery'}
                        />

                        {(!isDashboardActive && !search && !selectedGroupId && settings.showQuickArray) && (
                            <View style={styles.dashboardContainer}>
                                {isLoading ? (
                                    <View>
                                        <View style={styles.section}>
                                            <Skeleton width={120} height={20} style={{ marginBottom: 12 }} />
                                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                                <Skeleton width={180} height={70} borderRadius={16} />
                                                <Skeleton width={180} height={70} borderRadius={16} />
                                            </View>
                                        </View>
                                    </View>
                                ) : (
                                    <>


                                        {/* Upcoming Birthdays - Festive & Clean */}
                                        {upcoming.length > 0 && settings.showCalendarTab && (
                                            <View style={styles.section}>
                                                <ThemedText type="sectionHeader" style={styles.sectionTitle}>Upcoming Birthdays</ThemedText>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                                    {upcoming.map((p, idx) => (
                                                        <ScalePressable
                                                            key={`birthday-${p.id}-${idx}`}
                                                            style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}
                                                            onPress={() => router.push(`/person/${p.id}`)}
                                                        >
                                                            <View style={styles.upcomingAvatarContainer}>
                                                                <Avatar name={p.name} uri={p.avatarUri} size={44} />
                                                                <View style={[styles.birthdayBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                                                                    <ThemedText style={{ fontSize: 12 }}>🎂</ThemedText>
                                                                </View>
                                                            </View>
                                                            <View style={{ marginTop: 8, alignItems: 'center' }}>
                                                                <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 13, maxWidth: 80 }}>{p.name}</ThemedText>
                                                                <ThemedText type="tiny" style={{ color: colors.tint, marginTop: 2, fontWeight: '700' }}>
                                                                    {new Date(p.birthdate!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </ThemedText>
                                                            </View>
                                                        </ScalePressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Reconnect Suggestions - Action Oriented */}
                                        {reconnects.length > 0 && (
                                            <View style={styles.section}>
                                                <ThemedText type="sectionHeader" style={styles.sectionTitle}>Time to Reconnect</ThemedText>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                                    {reconnects.map((s, idx) => (
                                                        <ScalePressable
                                                            key={`reconnect-${s.person.id}-${idx}`}
                                                            style={[styles.reconnectCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}
                                                            onPress={() => router.push(`/person/${s.person.id}`)}
                                                        >
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                                <Avatar name={s.person.name} uri={s.person.avatarUri} size={42} />
                                                                <View style={{ flex: 1 }}>
                                                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 14 }}>{s.person.name}</ThemedText>
                                                                    <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '600' }}>{s.reason}</ThemedText>
                                                                </View>
                                                            </View>
                                                            <TouchableOpacity
                                                                style={[styles.reconnectButton, { backgroundColor: colors.tint + '15' }]}
                                                                onPress={() => router.push(`/person/${s.person.id}`)}
                                                            >
                                                                <ThemedText style={{ color: colors.tint, fontSize: 12, fontWeight: '600' }}>View Profile →</ThemedText>
                                                            </TouchableOpacity>
                                                        </ScalePressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Memory Lane - Emotional Value */}
                                        {highlights.length > 0 && settings.showJournalTab && (
                                            <View style={styles.section}>
                                                <ThemedText type="sectionHeader" style={styles.sectionTitle}>Memory Lane</ThemedText>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                                                    {highlights.map((h, idx) => (
                                                        <ScalePressable
                                                            key={`highlight-${h.id}-${idx}`}
                                                            style={[styles.highlightCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}
                                                            onPress={() => router.push({ pathname: '/journal/[id]', params: { id: h.id } })}
                                                        >
                                                            <View style={styles.highlightHeader}>
                                                                <View style={[styles.highlightTitleRow, { marginBottom: 4 }]}>
                                                                    <Book size={14} color={colors.tint} weight="bold" />
                                                                    <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '800', marginLeft: 6 }}>
                                                                        {new Date(h.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                    </ThemedText>
                                                                </View>
                                                                {h.title && (
                                                                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 13, marginBottom: 4 }}>{h.title}</ThemedText>
                                                                )}
                                                                <ThemedText type="small" numberOfLines={2} style={{ color: colors.secondary, fontSize: 12, lineHeight: 18 }}>
                                                                    {h.content}
                                                                </ThemedText>
                                                            </View>
                                                        </ScalePressable>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </>
                                )}
                            </View>
                        )}
                        <View style={{ height: 16 }} />
                    </View>
                }
                ListEmptyComponent={
                    (isLoading || isDashboardActive) ? null : (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
                                {search ? <Search size={32} color={colors.icon} weight="bold" /> : <UserIcon size={32} color={colors.icon} weight="duotone" />}
                            </View>
                            <ThemedText type="sectionHeader" style={styles.emptyTitle}>
                                {search ? 'No results' : selectedGroupId ? 'Group Empty' : 'Network'}
                            </ThemedText>
                            <ThemedText style={[styles.emptySubtitle, { color: colors.secondary }]}>
                                {search
                                    ? `No matches for "${search}"`
                                    : selectedGroupId
                                        ? 'Add members to this group.'
                                        : 'Start adding people.'}
                            </ThemedText>
                            {!search && !selectedGroupId && (
                                <Button
                                    title="Add First Person"
                                    onPress={() => setShowAddModal(true)}
                                    style={styles.emptyButton}
                                />
                            )}
                            {!search && selectedGroupId && allPeople.length > 0 && (
                                <Button
                                    title="Add Members to Group"
                                    onPress={() => {
                                        const currentGroup = groups.find(g => g.id === selectedGroupId);
                                        if (currentGroup) handleOpenManageGroup(currentGroup, true);
                                    }}
                                    style={styles.emptyButton}
                                />
                            )}
                            {!search && selectedGroupId && allPeople.length === 0 && (
                                <Button
                                    title="Add First Person"
                                    onPress={() => setShowAddModal(true)}
                                    style={styles.emptyButton}
                                />
                            )}
                        </View>
                    )
                }
            />

            <Modal
                visible={showAddModal}
                animationType="slide"
                transparent={false}
                presentationStyle="fullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={[styles.fullScreenPage, { backgroundColor: colors.background }]}>
                    <StatusBar style="auto" />
                    <View style={[styles.fullScreenHeader, { paddingTop: insets.top + 8, paddingBottom: 12 }]}>
                        <ScalePressable
                            onPress={() => setShowAddModal(false)}
                            style={styles.modalHeaderAction}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            overlayColor="transparent"
                            scaleTo={0.9}
                        >
                            <X size={24} color={colors.text} />
                        </ScalePressable>
                        <ThemedText type="display" style={styles.headerTitle}>New Person</ThemedText>
                        <ScalePressable
                            onPress={handleAddPerson}
                            disabled={!newName.trim()}
                            style={styles.modalHeaderAction}
                            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                            overlayColor="transparent"
                            scaleTo={0.9}
                        >
                            <Check size={24} color={newName.trim() ? colors.tint : colors.secondary} />
                        </ScalePressable>
                    </View>

                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                    >
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            style={styles.fullScreenContent}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                        >
                            <View style={styles.fullScreenAvatarSection}>
                                <ScalePressable
                                    onPress={pickImage}
                                    style={styles.fullScreenAvatarWrapper}
                                    overlayColor="transparent"
                                >
                                    <Avatar name={newName || '?'} uri={newAvatarUri} size={110} />
                                    <View style={[styles.fullScreenCameraBadge, { backgroundColor: colors.tint, borderColor: colors.background }]}>
                                        <Camera size={18} color={theme === 'dark' ? '#000' : '#fff'} />
                                    </View>
                                </ScalePressable>
                            </View>

                            <View style={styles.fullScreenForm}>
                                <Input
                                    label="Full Name"
                                    placeholder="e.g. Jean-Luc Picard"
                                    value={newName}
                                    onChangeText={setNewName}
                                    maxLength={40}
                                />
                                <View style={{ height: 16 }} />

                                <Input
                                    label="Headline / Role"
                                    placeholder="e.g. Captain"
                                    value={newPitch}
                                    onChangeText={setNewPitch}
                                    multiline
                                    maxLength={35}
                                />
                                <View style={{ height: 16 }} />

                                <View style={styles.fullScreenRow}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Input
                                            label="Gender"
                                            placeholder="Optional"
                                            value={newGender}
                                            onChangeText={setNewGender}
                                            maxLength={20}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <DatePicker
                                            label="Birthdate"
                                            value={newBirthdate}
                                            onChange={setNewBirthdate}
                                            maxDate={new Date()}
                                        />
                                    </View>
                                </View>

                                <View style={{ marginTop: 16 }}>
                                    <DatePicker
                                        label="First Met Date"
                                        value={newFirstMet}
                                        onChange={setNewFirstMet}
                                        maxDate={new Date()}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
            <ManageGroupMembersModal
                visible={showManageGroupModal}
                group={groupToManage}
                members={modalMembers}
                allPeople={allPeople}
                onClose={() => {
                    setShowManageGroupModal(false);
                    setModalMembers([]);
                    loadPeople();
                }}
                onToggleMember={async (id, isAdding) => {
                    if (!groupToManage) return;
                    if (isAdding) {
                        // Check if already in group (security/data integrity)
                        const isInGroup = modalMembers.some(m => m.id === id);
                        if (isInGroup) {
                            await GroupRepository.removePersonFromGroup(id, groupToManage.id);
                        } else {
                            await GroupRepository.addPersonToGroup(id, groupToManage.id);
                        }
                    } else {
                        // In management mode, this is a remove button
                        await GroupRepository.removePersonFromGroup(id, groupToManage.id);
                    }

                    // Refresh modal members to stay focused
                    const members = await GroupRepository.getPeopleInGroup(groupToManage.id, settings.defaultSort);
                    setModalMembers(members);
                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                }}
                colors={colors}
                theme={theme}
                hapticsEnabled={hapticsEnabled}
                initialAddingMode={initialManageAddingMode}
            />

            <ManageGroupsModal
                visible={showAssignModal}
                onClose={() => {
                    setShowAssignModal(false);
                    loadPeople();
                }}
                personName={selectedPersonForGroup?.name || ''}
                allGroups={groups}
                personGroups={groups.filter(g => selectedPersonGroups.includes(g.id))}
                onToggleGroup={toggleGroupAssignment}
            />
            {/* Sort Menu Dropdown Overlay */}
            {showSortMenu && (
                <View style={styles.addMenuOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setShowSortMenu(false)}
                    />
                    <Animated.View
                        entering={FadeInDown.duration(200)}
                        style={[
                            styles.sortMenu,
                            {
                                backgroundColor: colors.card,
                                borderColor: colors.border,
                                top: insets.top + (settings.peopleTabMode === 'discovery' && !isDashboardActive ? 172 : 132)
                            }
                        ]}
                    >
                        <ThemedText type="tiny" style={{ padding: 8, opacity: 0.5, fontWeight: '700' }}>Sort by</ThemedText>
                        {[
                            { label: 'Name (A-Z)', value: 'name' },
                            { label: 'Newest First', value: 'newest' },
                            { label: 'Oldest First', value: 'oldest' },
                        ].map((option) => (
                            <ScalePressable
                                key={option.value}
                                style={[styles.sortOption, sortBy === option.value && { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
                                innerStyle={{ borderRadius: 10 }}
                                scaleTo={0.97}
                                onPress={() => {
                                    setSortBy(option.value as any);
                                    setShowSortMenu(false);
                                }}
                            >
                                <ThemedText style={{ fontWeight: sortBy === option.value ? '700' : '400', color: sortBy === option.value ? colors.tint : colors.text }}>
                                    {option.label}
                                </ThemedText>
                            </ScalePressable>
                        ))}
                    </Animated.View>
                </View>
            )}

            <PersonPickerModal
                visible={showPersonPicker}
                people={pickerMode === 'note' ? activitySortedPeople : allPeople}
                onSelect={handlePersonSelected}
                onClose={() => setShowPersonPicker(false)}
                title={pickerMode === 'contact' ? "Whose contact is this?" : "Who is this note for?"}
            />

            <NewEntryModal
                visible={showQuickNoteModal}
                onClose={() => setShowQuickNoteModal(false)}
                onSave={handleSaveQuickNote}
                personId={selectedPersonForNote?.id}
            />

            <AddReminderModal
                visible={showAddReminderModal}
                onClose={() => setShowAddReminderModal(false)}
                date={new Date()}
                onSuccess={() => { }}
            />

            <DeleteModal
                visible={groupToDelete !== null}
                title="Delete Group"
                description="Are you sure you want to delete this group? The people in it will remain in your database."
                onCancel={() => setGroupToDelete(null)}
                onDelete={confirmDeleteGroup}
            />

            {/* Add People to Group Modal */}
            <Modal visible={showGroupAssignModal} transparent animationType="none" onRequestClose={() => setShowGroupAssignModal(false)} statusBarTranslucent>
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={StyleSheet.absoluteFill}
                    >
                        <BlurView
                            intensity={theme === 'dark' ? 40 : 20}
                            tint={theme === 'dark' ? 'dark' : 'light'}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]} />
                    </Animated.View>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => {
                            setShowGroupAssignModal(false);
                            if (groupToManage) setShowManageGroupModal(true);
                        }}
                    >
                        <Animated.View
                            entering={SlideInDown.duration(300)}
                            style={[styles.bottomSheet, { backgroundColor: colors.card, paddingBottom: 100 + insets.bottom + 24 }]}
                        >
                            <View style={styles.sheetHeader}>
                                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 }} />
                                <ThemedText type="defaultSemiBold">Add People to Group</ThemedText>
                                <ThemedText style={{ opacity: 0.5, fontSize: 12 }}>
                                    {groups.find(g => g.id === (groupToManage?.id || selectedGroupId))?.name}
                                </ThemedText>
                            </View>

                            <ScrollView style={{ maxHeight: 400 }}>
                                {allPeople.map(person => {
                                    const targetId = groupToManage?.id || selectedGroupId;
                                    // Robust check for membership
                                    const isCurrentlyInGroup = groupToManage
                                        ? modalMembers.some(m => m.id === person.id)
                                        : people.some(p => p.id === person.id);

                                    return (
                                        <TouchableOpacity
                                            key={person.id}
                                            style={[styles.groupOption, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
                                            onPress={async () => {
                                                const idToUse = groupToManage?.id || selectedGroupId;
                                                if (!idToUse) return;

                                                if (isCurrentlyInGroup) {
                                                    await GroupRepository.removePersonFromGroup(person.id, idToUse);
                                                } else {
                                                    await GroupRepository.addPersonToGroup(person.id, idToUse);
                                                }
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                await loadPeople();
                                                // If we came from Manage Modal, keep it updated?
                                                if (groupToManage) {
                                                    const members = await GroupRepository.getPeopleInGroup(groupToManage.id, settings.defaultSort);
                                                    setModalMembers(members);
                                                }
                                            }}
                                        >
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                                <Avatar name={person.name} uri={person.avatarUri} size={36} />
                                                <ThemedText>{person.name}</ThemedText>
                                            </View>
                                            {isCurrentlyInGroup && (
                                                <Check size={18} color={colors.tint} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                                {allPeople.length === 0 && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <ThemedText style={{ opacity: 0.5 }}>No people in your network yet.</ThemedText>
                                    </View>
                                )}
                            </ScrollView>
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            </Modal>
            {/* Person Manage Bottom Sheet */}
            <Modal
                visible={showPersonManageModal}
                animationType="none"
                transparent={true}
                onRequestClose={() => setShowPersonManageModal(false)}
                statusBarTranslucent
            >
                <View style={styles.modalOverlay}>
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
                    />
                    <Pressable
                        style={{ flex: 1, justifyContent: 'flex-end' }}
                        onPress={() => setShowPersonManageModal(false)}
                    >
                        <Animated.View 
                            entering={SlideInDown.duration(300).springify()}
                            style={[
                                styles.bottomSheet, 
                                { 
                                    backgroundColor: colors.card, 
                                    paddingBottom: insets.bottom + 160, 
                                    marginBottom: -120 
                                }
                            ]}
                            onStartShouldSetResponder={() => true}
                        >
                            <View style={styles.sheetHeader}>
                                <View style={[styles.handleIndicator, { backgroundColor: colors.border }]} />
                            </View>

                            <ThemedText type="subtitle" style={{ marginBottom: 20, textAlign: 'center', fontSize: 22, fontFamily: Typography.fontFamily.medium }}>
                                {personToManage?.name}
                            </ThemedText>

                            <ScalePressable
                                onPress={handleTogglePin}
                                style={[
                                    styles.pinButton,
                                    { backgroundColor: personToManage?.isPinned ? colors.surface : colors.tint }
                                ]}
                                scaleTo={0.96}
                            >
                                <PushPin
                                    size={22}
                                    color={personToManage?.isPinned ? colors.secondary : (theme === 'dark' ? '#000' : '#fff')}
                                    weight={personToManage?.isPinned ? 'regular' : 'fill'}
                                />
                                <ThemedText style={{ fontSize: 16, fontWeight: '700', color: personToManage?.isPinned ? colors.text : (theme === 'dark' ? '#000' : '#fff') }}>
                                    {personToManage?.isPinned ? 'Unpin from Top' : 'Pin to Top'}
                                </ThemedText>
                            </ScalePressable>
                        </Animated.View>
                    </Pressable>
                </View>
            </Modal>
            <QuickScrollButton 
                isScrolling={isScrolling} 
                direction={scrollDirection} 
                onPress={handleQuickScroll} 
            />
        </ThemedView>
    );
}

function Label({ text }: { text: string }) {
    return (
        <ThemedText style={styles.label}>{text}</ThemedText>
    );
}


function UsersIcon({ size, color }: { size: number; color: string }) {
    return (
        <View style={{ opacity: 0.5 }}>
            <UserIcon size={size} color={color} />
        </View>
    );
}

// Add these to styles
// ...


const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: DesignSystem.spacing.lg,
        marginTop: DesignSystem.spacing.md,
        marginBottom: 8,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {},
    headerAction: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        ...DesignSystem.shadows.sm,
    },
    searchSection: {
        marginBottom: 14,
    },
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterButton: {
        width: 52,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: DesignSystem.radius.xl,
    },
    sortMenu: {
        position: 'absolute',
        top: 60,
        right: DesignSystem.spacing.lg,
        width: 160,
        borderRadius: DesignSystem.radius.lg,
        padding: 4,
        zIndex: 1000,
        elevation: 11,
    },
    sortOption: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
    },
    list: {
        paddingHorizontal: DesignSystem.spacing.lg,
        paddingTop: DesignSystem.spacing.xs,
    },
    itemContainer: {
        marginBottom: 4,
    },
    personCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: DesignSystem.spacing.md,
    },
    personInfo: {
        flex: 1,
        marginLeft: DesignSystem.spacing.lg,
        justifyContent: 'center',
    },
    personName: {
        fontSize: Typography.size.lg,
        fontWeight: '600',
        marginBottom: 4,
        letterSpacing: -0.2,
        fontFamily: Typography.fontFamily.medium,
    },
    personPitch: {
        opacity: 0.7,
        fontSize: Typography.size.sm,
        lineHeight: 20,
        fontFamily: Typography.fontFamily.regular,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 40,
        alignItems: 'center',
    },
    emptyIconContainer: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 20,
        marginBottom: 2,
        textAlign: 'center',
    },
    emptySubtitle: {
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.6,
        marginBottom: 20,
        fontFamily: Typography.fontFamily.regular,
    },
    emptyButton: {
        width: '100%',
    },
    fullScreenPage: {
        flex: 1,
    },
    sheetIndicator: {
        width: '100%',
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    handleIndicator: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        opacity: 0.5,
    },
    fullScreenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 22,
        letterSpacing: -0.5,
    },
    modalHeaderAction: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenContent: {
        flex: 1,
    },
    fullScreenAvatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    fullScreenAvatarWrapper: {
        position: 'relative',
    },
    fullScreenCameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
    },
    fullScreenForm: {
        paddingHorizontal: 24,
    },
    fullScreenRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    dashboardContainer: {
        marginBottom: 8,
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        letterSpacing: 0.8,
        opacity: 0.9,
        marginTop: 3,
        marginBottom: 5,
        paddingHorizontal: 0, // Aligned with list items
    },
    horizontalScroll: {
        gap: 12,
        paddingRight: 16,
    },
    highlightCard: {
        width: 240,
        height: 120,
        borderRadius: 20,
        padding: 16,
        marginRight: 12,
        ...DesignSystem.shadows.sm,
    },
    highlightHeader: {
        flex: 1,
    },
    highlightTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    highlightDateBadge: {
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    highlightText: {
        fontSize: 15,
        lineHeight: 22,
        fontStyle: 'italic',
        marginTop: 8,
        flex: 1,
    },
    highlightFooter: {
        alignItems: 'flex-end',
    },
    upcomingCard: {
        width: 110,
        borderRadius: 20,
        padding: 12,
        marginRight: 12,
        alignItems: 'center',
        paddingVertical: 16,
        ...DesignSystem.shadows.sm,
    },
    upcomingAvatarContainer: {
        position: 'relative',
    },
    birthdayBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
    reconnectCard: {
        width: 220,
        borderRadius: 20,
        padding: 12,
        marginRight: 12,
        ...DesignSystem.shadows.sm,
    },
    reconnectButton: {
        marginTop: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    countBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingRight: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8,
        opacity: 0.5,
        letterSpacing: 0,
        lineHeight: 16,
    },
    modalOverlay: {
        flex: 1,
    },
    bottomSheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 32,
        ...DesignSystem.shadows.xl,
        width: '100%',
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    pinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        gap: 12,
        marginTop: 10,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
    },
    addMenuOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999,
    },
    addMenu: {
        position: 'absolute',
        right: DesignSystem.spacing.lg,
        width: 240,
        borderRadius: 20,
        padding: 8,
        zIndex: 1000,
    },
    addMenuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        gap: 12,
    },
    addMenuIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
