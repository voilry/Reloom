
import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, Pressable, Platform, NativeScrollEvent, NativeSyntheticEvent, Image } from 'react-native';
import Animated, { FadeIn, FadeInDown, SlideInDown, useSharedValue, useAnimatedScrollHandler, runOnJS } from 'react-native-reanimated';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { EntryRepository } from '../../db/repositories/EntryRepository';
import { JournalRepository } from '../../db/repositories/JournalRepository';
import { RelationshipRepository } from '../../db/repositories/RelationshipRepository';

import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { Trash, CaretLeft as ChevronLeft, DotsThree as MoreHorizontal, Info, ChatCenteredText as MessageSquare, BookOpen, Folder, Check, PencilSimple as Edit, Star, Users, Briefcase, Heart, Lightning as Zap, Coffee, House as Home, Globe, Airplane as Plane, MusicNote as Music, Smiley as Smile, AddressBook } from '@/components/ui/Icon';
import { GroupRepository, Group } from '../../db/repositories/GroupRepository';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';

// Extracted Components
import { PersonHeader } from '../../components/person/PersonHeader';
import { InfoTab } from '../../components/person/InfoTab';
import { EntriesTab } from '../../components/person/EntriesTab';
import { JournalsTab } from '../../components/person/JournalsTab';
import { ContactsTab } from '../../components/person/ContactsTab';
import { EditPersonModal } from '../../components/person/EditPersonModal';
import { ContactRepository, Contact } from '../../db/repositories/ContactRepository';
import { NewEntryModal } from '../../components/person/NewEntryModal';
import { ManageGroupsModal } from '../../components/person/ManageGroupsModal';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { ScalePressable } from '../../components/ui/ScalePressable';

export default function PersonDetailScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();
    const insets = useSafeAreaInsets();

    const [person, setPerson] = useState<Person | null>(null);
    const [entries, setEntries] = useState<any[]>([]);
    const [journals, setJournals] = useState<any[]>([]);
    const [relationships, setRelationships] = useState<any[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);

    const [allPeople, setAllPeople] = useState<Person[]>([]);
    const [personGroups, setPersonGroups] = useState<Group[]>([]);
    const [allGroups, setAllGroups] = useState<Group[]>([]);

    const getTabId = (tab: string) => tab === 'notes' ? 'entries' : tab;

    const orderedTabs = settings.profileTabsOrder.filter(tab => {
        if (tab === 'journals' && !settings.showJournalTab) return false;
        return true;
    });

    const [activeTab, setActiveTab] = useState<'info' | 'entries' | 'journals' | 'contacts'>(() => {
        if (orderedTabs.length > 0) return getTabId(orderedTabs[0]) as any;
        return 'info';
    });
    const [headerVisible, setHeaderVisible] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    // Modal Visibility States
    const [showNewEntryModal, setShowNewEntryModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [profileToDelete, setProfileToDelete] = useState(false);
    const [entryToDelete, setEntryToDelete] = useState<number | null>(null);
    const [journalToDelete, setJournalToDelete] = useState<number | null>(null);
    const [contactToDelete, setContactToDelete] = useState<number | null>(null);

    useFocusEffect(
        useCallback(() => {
            if (id) loadData();
        }, [id])
    );

    const loadData = async () => {
        const personId = Number(id);
        const p = await PersonRepository.getById(personId);
        if (!p) return;
        setPerson(p);

        const [e, j, r, all, pg, g, c] = await Promise.all([
            EntryRepository.getForPerson(personId),
            JournalRepository.getJournalsForPerson(personId),
            RelationshipRepository.getForPerson(personId),
            PersonRepository.getAll(),
            GroupRepository.getGroupsForPerson(personId),
            GroupRepository.getAll(),
            ContactRepository.getContactsForPerson(personId)
        ]);

        setEntries(e);
        setJournals(j);
        setRelationships(r);
        setPersonGroups(pg);
        setAllGroups(g);
        setAllPeople(all.filter(x => x.id !== personId));
        setContacts(c);
    };

    const toggleGroup = async (groupId: number) => {
        if (!person) return;
        const isAssigned = personGroups.some(g => g.id === groupId);

        if (isAssigned) {
            await GroupRepository.removePersonFromGroup(person.id, groupId);
        } else {
            await GroupRepository.addPersonToGroup(person.id, groupId);
        }

        // Refresh local groups
        const pg = await GroupRepository.getGroupsForPerson(person.id);
        setPersonGroups(pg);
    };

    const handleDeletePerson = () => {
        setProfileToDelete(true);
    };

    const confirmDeletePerson = async () => {
        setProfileToDelete(false);
        await PersonRepository.delete(Number(id));
        router.back();
    };



    const handleUpdateProfile = async (data: any) => {
        if (!person) return;
        await PersonRepository.update(person.id, data);
        setShowEditModal(false);
        loadData();
    };

    const handleCreateEntry = async (title: string, content: string) => {
        if (!person) return;
        const entryTitle = title.trim() || 'General Note';
        await EntryRepository.addEntry(person.id, entryTitle, content, settings.addTimestampToNotes);
        setShowNewEntryModal(false);
        loadData();
    };

    const handleDeleteEntry = (entryId: number) => {
        setEntryToDelete(entryId);
    };

    const confirmDeleteEntry = async () => {
        if (entryToDelete !== null) {
            await EntryRepository.delete(entryToDelete);
            loadData();
            setEntryToDelete(null);
        }
    };

    const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    const handleDeleteJournal = (journalId: number) => {
        setJournalToDelete(journalId);
    };

    const confirmDeleteJournal = async () => {
        if (journalToDelete !== null) {
            await JournalRepository.delete(journalToDelete);
            loadData();
            setJournalToDelete(null);
        }
    };

    const confirmDeleteContact = async () => {
        if (contactToDelete !== null) {
            await ContactRepository.deleteContact(contactToDelete);
            loadData();
            setContactToDelete(null);
        }
    };

    const parseFlexibleDate = (dateStr: string) => {
        let d = new Date(dateStr);
        if (!isNaN(d.getTime())) return d;
        d = new Date(dateStr.replace(/-/g, '/'));
        if (!isNaN(d.getTime())) return d;
        d = new Date(dateStr.replace(/\//g, '-'));
        if (!isNaN(d.getTime())) return d;
        return new Date(NaN);
    };

    const getAge = (birthdate?: string | null) => {
        if (!birthdate) return null;
        const birthDate = parseFlexibleDate(birthdate);
        if (isNaN(birthDate.getTime())) return null;

        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const scrollY = useSharedValue(0);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollY.value = event.contentOffset.y;
            if (event.contentOffset.y > 100 && !headerVisible) {
                runOnJS(setHeaderVisible)(true);
            }
            if (event.contentOffset.y <= 100 && headerVisible) {
                runOnJS(setHeaderVisible)(false);
            }
        },
    });

    const handleTabChange = (tab: any) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveTab(tab);
    };

    const getTabIcon = (tab: string) => {
        switch (tab) {
            case 'info': return Info;
            case 'notes': return MessageSquare;
            case 'journals': return BookOpen;
            case 'contacts': return AddressBook;
            default: return Info;
        }
    };

    if (!person) return null;

    const age = getAge(person.birthdate);

    return (
        <ThemedView style={[styles.container, settings.profileBlurBackground && person.avatarUri && { backgroundColor: 'transparent' }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {settings.profileBlurBackground && person.avatarUri && (
                <View style={StyleSheet.absoluteFill}>
                    <Image
                        source={{ uri: person.avatarUri }}
                        style={[StyleSheet.absoluteFill, { opacity: theme === 'dark' ? 0.4 : 0.6 }]}
                        resizeMode="cover"
                        blurRadius={12}
                    />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.2)' : `${colors.tint}10` }]} />
                </View>
            )}

            <View style={styles.topBarWrapper}>
                <BlurView
                    intensity={headerVisible ? (settings.profileBlurBackground && person.avatarUri ? 40 : (theme === 'dark' ? 70 : 30)) : 0}
                    tint={theme === 'dark' ? 'dark' : 'default'}
                    style={[
                        styles.topBar,
                        {
                            paddingTop: insets.top + 10,
                            borderBottomColor: headerVisible ? colors.border : 'transparent',
                            backgroundColor: headerVisible
                                ? (settings.profileBlurBackground && person.avatarUri
                                    ? (theme === 'dark' ? `${colors.background}73` : `${colors.background}E6`)
                                    : (theme === 'dark' ? `${colors.background}CC` : `${colors.background}F7`))
                                : 'transparent'
                        }
                    ]}
                >
                    <View style={styles.topBarContent}>
                        <ScalePressable
                            style={[styles.backButton, { backgroundColor: (headerVisible && !settings.profileBlurBackground) ? 'transparent' : (settings.profileBlurBackground && person.avatarUri ? 'rgba(128,128,128,0.15)' : colors.surface) }]}
                            onPress={() => {
                                triggerHaptic();
                                router.back();
                            }}
                            innerStyle={{ borderRadius: 22 }}
                            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
                        >
                            <ChevronLeft size={28} color={colors.text} />
                        </ScalePressable>

                        {headerVisible && (
                            <Animated.View entering={FadeIn.duration(200)}>
                                <ThemedText style={styles.topBarTitle} numberOfLines={1}>{person.name}</ThemedText>
                            </Animated.View>
                        )}

                        <ScalePressable
                            style={[styles.moreButton, { backgroundColor: (headerVisible && !settings.profileBlurBackground) ? 'transparent' : (settings.profileBlurBackground && person.avatarUri ? 'rgba(128,128,128,0.15)' : colors.surface) }]}
                            onPress={() => setShowMoreMenu(true)}
                            innerStyle={{ borderRadius: 22 }}
                        >
                            <MoreHorizontal size={24} color={colors.text} />
                        </ScalePressable>
                    </View>
                </BlurView>
            </View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
            >
                <PersonHeader
                    person={person}
                    onEdit={() => setShowEditModal(true)}
                    scrollY={scrollY}
                />



                {settings.profileBlurBackground && person.avatarUri ? (
                    <View 
                        style={[styles.tabContainer, { borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : `${colors.tint}15`, overflow: 'hidden', backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.45)' : `${colors.background}D9`, borderWidth: theme === 'light' ? 1 : 0 }]}
                    >
                        <BlurView
                            intensity={40}
                            tint={theme === 'dark' ? 'dark' : 'default'}
                            style={StyleSheet.absoluteFill}
                        />
                        {orderedTabs.map(tab => (
                            <TabItem
                                key={tab}
                                active={activeTab === getTabId(tab)}
                                icon={getTabIcon(tab)}
                                onPress={() => handleTabChange(getTabId(tab))}
                                colors={colors}
                                theme={theme}
                                isAcrylic={true}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={[styles.tabContainer, { backgroundColor: theme === 'dark' ? colors.surface : colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}>
                        {orderedTabs.map(tab => (
                            <TabItem
                                key={tab}
                                active={activeTab === getTabId(tab)}
                                icon={getTabIcon(tab)}
                                onPress={() => handleTabChange(getTabId(tab))}
                                colors={colors}
                                theme={theme}
                            />
                        ))}
                    </View>
                )}

                <View style={styles.content}>
                    {activeTab === 'info' && (
                        <InfoTab
                            person={person}
                            age={age}
                            relationships={relationships}
                            allPeople={allPeople}
                            onEdit={() => router.push(`/person/${person.id}/locations`)}
                            onEditProfile={() => setShowEditModal(true)}
                            isAcrylic={settings.profileBlurBackground && !!person.avatarUri}
                        />
                    )}

                    {activeTab === 'entries' && (
                        <EntriesTab
                            entries={entries}
                            onAdd={() => setShowNewEntryModal(true)}
                            onDelete={handleDeleteEntry}
                            theme={theme}
                            isAcrylic={settings.profileBlurBackground && !!person.avatarUri}
                        />
                    )}

                    {activeTab === 'journals' && (
                        <JournalsTab
                            journals={journals}
                            personName={person.name}
                            onDelete={handleDeleteJournal}
                            isAcrylic={settings.profileBlurBackground && !!person.avatarUri}
                        />
                    )}

                    {activeTab === 'contacts' && (
                        <ContactsTab
                            contacts={contacts}
                            onAdd={() => router.push({ pathname: '/contact/[id]', params: { id: 'new', personId: person.id } })}
                            onDelete={(id: number) => setContactToDelete(id)}
                            onEdit={(id: number) => router.push({ pathname: '/contact/[id]', params: { id: id } })}
                            theme={theme}
                            colors={colors}
                            isAcrylic={settings.profileBlurBackground && !!person.avatarUri}
                        />
                    )}
                </View>

                {/* Group Chips (Moved to Bottom) - Only Show in Info Tab */}
                {activeTab === 'info' && personGroups.length > 0 && (
                    <View style={{ paddingHorizontal: 20, paddingBottom: 40, marginTop: 20 }}>
                        <ThemedText type="sectionHeader" style={{ fontSize: 16, marginBottom: 12, opacity: 0.7 }}>Groups</ThemedText>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {personGroups.map(g => {
                                const isAcrylic = settings.profileBlurBackground && !!person.avatarUri;
                                const groupAcrylicBg = isAcrylic ? (theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(180,83,9,0.08)') : colors.surface;

                                return (
                                    <ScalePressable
                                        key={g.id}
                                        onPress={() => { }} // No action for now but tactile feel
                                        style={[styles.groupChip, { backgroundColor: theme === 'light' ? colors.surface : 'rgba(255,255,255,0.08)', borderColor: 'transparent', paddingVertical: 6, paddingHorizontal: 12 }]}
                                        innerStyle={{ borderRadius: 12 }}
                                    >
                                        {getGroupIcon(g.icon, colors.tint, 14)}
                                        <ThemedText style={{ fontSize: 13, color: colors.tint, fontWeight: '700', marginLeft: 6 }}>{g.name}</ThemedText>
                                    </ScalePressable>
                                );
                            })}
                        </View>
                    </View>
                )}
            </Animated.ScrollView>

            <NewEntryModal
                visible={showNewEntryModal}
                onClose={() => setShowNewEntryModal(false)}
                onSave={handleCreateEntry}
                personId={person?.id}
            />

            <EditPersonModal
                visible={showEditModal}
                onClose={() => setShowEditModal(false)}
                onSave={handleUpdateProfile}
                person={person}
            />





            <Modal visible={showMoreMenu} transparent animationType="fade" statusBarTranslucent>
                <Pressable
                    style={[styles.modalOverlay, { justifyContent: 'flex-start', alignItems: 'flex-start' }]}
                    onPress={() => setShowMoreMenu(false)}
                >
                    <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
                    />

                    {/* Replicated Button for Focus Persistence */}
                    <View style={{ position: 'absolute', top: insets.top + 11, right: 16 }}>
                        <View style={[styles.moreButton, { backgroundColor: colors.surface }]}>
                            <MoreHorizontal size={24} color={colors.text} />
                        </View>
                    </View>

                    <Animated.View
                        entering={FadeInDown.duration(200).springify()}
                        style={[styles.menuContent, { top: insets.top + 56, backgroundColor: colors.card, ...DesignSystem.shadows.lg }]}>
                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                setShowEditModal(true);
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Edit size={18} color={colors.text} />
                            <ThemedText style={styles.menuText}>Edit Profile</ThemedText>
                        </ScalePressable>

                        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6, marginHorizontal: 8 }} />

                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                setShowGroupModal(true);
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Folder size={18} color={colors.text} />
                            <ThemedText style={styles.menuText}>Manage Groups</ThemedText>
                        </ScalePressable>

                        <View style={{ height: 1, backgroundColor: colors.border, opacity: 0.6, marginHorizontal: 8 }} />

                        <ScalePressable
                            style={styles.menuItem}
                            onPress={() => {
                                setShowMoreMenu(false);
                                handleDeletePerson();
                            }}
                            innerStyle={{ borderRadius: 12 }}
                        >
                            <Trash size={18} color={colors.error} />
                            <ThemedText style={[styles.menuText, { color: colors.error, fontWeight: '700' }]}>Delete Profile</ThemedText>
                        </ScalePressable>
                    </Animated.View>
                </Pressable>
            </Modal>

            {/* Manage Groups Modal */}
            <ManageGroupsModal
                visible={showGroupModal}
                onClose={() => setShowGroupModal(false)}
                personName={person.name}
                allGroups={allGroups}
                personGroups={personGroups}
                onToggleGroup={toggleGroup}
            />

            <DeleteModal
                visible={profileToDelete}
                title="Delete Profile"
                description={`Are you sure you want to delete ${person?.name}? This action cannot be undone.`}
                onCancel={() => setProfileToDelete(false)}
                onDelete={confirmDeletePerson}
            />

            <DeleteModal
                visible={entryToDelete !== null}
                title="Delete Note"
                description="Are you sure you want to remove this note?"
                onCancel={() => setEntryToDelete(null)}
                onDelete={confirmDeleteEntry}
            />

            <DeleteModal
                visible={journalToDelete !== null}
                title="Delete Journal Entry"
                description="Are you sure you want to remove this journal entry?"
                onCancel={() => setJournalToDelete(null)}
                onDelete={confirmDeleteJournal}
            />

            <DeleteModal
                visible={contactToDelete !== null}
                title="Delete Contact"
                description="Are you sure you want to remove this contact?"
                onCancel={() => setContactToDelete(null)}
                onDelete={confirmDeleteContact}
            />
        </ThemedView>
    );
}

const getGroupIcon = (name: string | null, color: string, size = 16) => {
    const weight = "bold";
    switch (name) {
        case 'Star': return <Star size={size} color={color} weight={weight} />;
        case 'Briefcase': return <Briefcase size={size} color={color} weight={weight} />;
        case 'Heart': return <Heart size={size} color={color} weight={weight} />;
        case 'Users': return <Users size={size} color={color} weight={weight} />;
        case 'Zap': return <Zap size={size} color={color} weight={weight} />;
        case 'Coffee': return <Coffee size={size} color={color} weight={weight} />;
        case 'Home': return <Home size={size} color={color} weight={weight} />;
        case 'Globe': return <Globe size={size} color={color} weight={weight} />;
        case 'Plane': return <Plane size={size} color={color} weight={weight} />;
        case 'Music': return <Music size={size} color={color} weight={weight} />;
        case 'Book': return <BookOpen size={size} color={color} weight={weight} />;
        case 'Smile': return <Smile size={size} color={color} weight={weight} />;
        default: return <Folder size={size} color={color} weight={weight} />;
    }
};

function TabItem({ active, icon: Icon, onPress, colors, theme, isAcrylic }: any) {
    const activeBg = isAcrylic
        ? (theme === 'dark' ? 'rgba(0,0,0,0.4)' : `${colors.tint}15`)
        : (theme === 'dark' ? colors.card : colors.surface);

    return (
        <ScalePressable
            onPress={onPress}
            style={[
                styles.tab,
                active && {
                    backgroundColor: activeBg,
                    borderColor: 'transparent',
                    borderWidth: 0,
                }
            ]}
            innerStyle={{ borderRadius: 10 }}
        >
            <View style={styles.tabContent} collapsable={false}>
                <Icon
                    color={active ? colors.tint : colors.icon}
                    size={18}
                    weight={active ? 'fill' : 'regular'}
                />
            </View>
        </ScalePressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    topBarWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    topBar: {
        justifyContent: 'flex-end',
        borderBottomWidth: 1,
    },
    topBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    topBarTitle: {
        fontSize: 17,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center',
        marginHorizontal: 12,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    moreButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: { paddingBottom: 120 },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        padding: 5,
        borderRadius: 14,
        borderWidth: 0,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: 10,
        alignItems: 'center',
    },
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    tabLabel: { fontWeight: '700', fontSize: 13 },
    content: { paddingHorizontal: 20, marginTop: 12 },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    menuContent: {
        borderRadius: 16,
        padding: 6,
        minWidth: 180,
        position: 'absolute',
        right: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingLeft: 12,
        paddingRight: 16,
        borderRadius: 12,
    },
    menuText: {
        marginLeft: 12,
        fontWeight: '600',
    },
    groupChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 0,
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        ...DesignSystem.shadows.xl,
    },
    sheetHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    }
});
