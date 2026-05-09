import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, KeyboardAvoidingView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import Animated, { FadeInDown, FadeIn, SlideInDown, Layout } from 'react-native-reanimated';
import { ContactRepository, Contact } from '../../db/repositories/ContactRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Phone, EnvelopeSimple, InstagramLogo, FacebookLogo, TiktokLogo, WhatsappLogo, LinkedinLogo, Globe, CaretLeft as ChevronLeft, Trash } from '@/components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { DesignSystem } from '../../constants/DesignSystem';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { AlertModal } from '../../components/ui/AlertModal';

const PLATFORMS = [
    { id: 'Phone', icon: Phone, placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
    { id: 'WhatsApp', icon: WhatsappLogo, placeholder: '+1 234 567 8900', keyboard: 'phone-pad' },
    { id: 'Email', icon: EnvelopeSimple, placeholder: 'email@example.com', keyboard: 'email-address' },
    { id: 'Instagram', icon: InstagramLogo, placeholder: '@username', keyboard: 'default' },
    { id: 'Facebook', icon: FacebookLogo, placeholder: 'username or url', keyboard: 'url' },
    { id: 'TikTok', icon: TiktokLogo, placeholder: '@username', keyboard: 'default' },
    { id: 'LinkedIn', icon: LinkedinLogo, placeholder: 'username or url', keyboard: 'url' },
    { id: 'Website', icon: Globe, placeholder: 'https://example.com', keyboard: 'url' },
];

export default function ContactEditorScreen() {
    const { id, personId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors, theme, hapticsEnabled } = useAppTheme();

    const isNew = id === 'new';
    const [person, setPerson] = useState<Person | null>(null);
    const [originalContact, setOriginalContact] = useState<Contact | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
    const [value, setValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'error' | 'success' } | null>(null);

    useEffect(() => {
        loadData();
    }, [id, personId]);

    const loadData = async () => {
        try {
            if (isNew) {
                if (personId) {
                    const p = await PersonRepository.getById(Number(personId));
                    setPerson(p);
                }
            } else {
                const contact = await ContactRepository.getById(Number(id));
                if (contact) {
                    setOriginalContact(contact);
                    setValue(contact.value);
                    const plat = PLATFORMS.find(p => p.id === contact.platform) || PLATFORMS[0];
                    setSelectedPlatform(plat);

                    const p = await PersonRepository.getById(contact.personId);
                    setPerson(p);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const hasChanges = useMemo(() => {
        if (isNew) return value.trim() !== '';
        if (!originalContact) return false;
        return selectedPlatform.id !== originalContact.platform || value.trim() !== originalContact.value;
    }, [isNew, value, selectedPlatform, originalContact]);

    const handleSave = async () => {
        if (!value.trim() || !person || isSaving) return;
        setIsSaving(true);
        try {
            if (isNew) {
                await ContactRepository.addContact({
                    personId: person.id,
                    platform: selectedPlatform.id,
                    value: value.trim()
                });
            } else {
                await ContactRepository.updateContact(Number(id), {
                    platform: selectedPlatform.id,
                    value: value.trim()
                });
            }
            const { showToast } = require('../../components/ui/Toast');
            showToast(isNew ? 'Contact added' : 'Contact updated');
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (error) {
            setAlertConfig({
                visible: true,
                title: 'Error',
                description: 'Could not save contact.',
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteContact = async () => {
        setIsSaving(true);
        try {
            await ContactRepository.deleteContact(Number(id));
            setShowDeleteModal(false);
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
        } catch (err) {
            setIsSaving(false);
            setAlertConfig({
                visible: true,
                title: 'Error',
                description: 'Could not delete contact.',
                type: 'error'
            });
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                onBack={() => {
                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.back();
                }}
                centerContent={
                    <ThemedText type="display" style={{ fontSize: 28, letterSpacing: -1.5 }}>
                        {isNew ? 'New Contact' : 'Edit Contact'}
                    </ThemedText>
                }
            />

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
            >
                    <ScrollView contentContainerStyle={styles.scrollContent}>

                    {person && (
                        <View 
                            style={[
                                styles.personContext, 
                                { 
                                    backgroundColor: colors.surface,
                                    borderColor: colors.border,
                                    borderWidth: theme === 'light' ? 1 : 0
                                }
                            ]}
                        >
                            <Avatar uri={person.avatarUri} size={44} name={person.name} />
                            <View style={{ marginLeft: 16 }}>
                                <ThemedText type="tiny" style={{ opacity: 0.6, marginBottom: -1 }}>{isNew ? 'Adding contact for' : 'Editing contact for'}</ThemedText>
                                <ThemedText style={{ fontSize: 18, opacity: 0.8 }} >{person.name}</ThemedText>
                            </View>
                        </View>
                    )}

                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="sectionHeader" style={{ fontSize: 19, marginBottom: -8, marginTop: -20 }}>Platform</ThemedText>
                    </View>

                    {isNew ? (
                        <View style={styles.platformsGrid}>
                            {PLATFORMS.map(platform => {
                                const isSelected = selectedPlatform.id === platform.id;
                                const Icon = platform.icon;
                                return (
                                    <ScalePressable
                                        key={platform.id}
                                        style={[
                                            styles.platformOption,
                                            {
                                                backgroundColor: isSelected ? colors.tint : colors.surface,
                                                borderColor: isSelected ? colors.tint : colors.border,
                                                borderWidth: theme === 'light' ? 1 : 0
                                            }
                                        ]}
                                        innerStyle={{ borderRadius: 16 }}
                                        overlayColor={isSelected ? 'rgba(0,0,0,0.15)' : undefined}
                                        onPress={() => {
                                            if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                            setSelectedPlatform(platform);
                                        }}
                                    >
                                        <Icon size={20} color={isSelected ? (theme === 'dark' ? colors.background : '#FFF') : colors.text} weight={isSelected ? "fill" : "regular"} />
                                        <ThemedText style={{
                                            color: isSelected ? (theme === 'dark' ? colors.background : '#FFF') : colors.text,
                                            fontWeight: isSelected ? '700' : '500',
                                            marginTop: 1,
                                            marginBottom: 12,
                                            fontSize: 12
                                        }}>
                                            {platform.id}
                                        </ThemedText>
                                    </ScalePressable>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={[styles.activePlatformRow, { backgroundColor: colors.surface, marginBottom: 8 }]}>
                            <View style={[styles.activePlatformIcon, { backgroundColor: colors.tint + '15' }]}>
                                <selectedPlatform.icon size={22} color={colors.tint} weight="fill" />
                            </View>
                            <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>{selectedPlatform.id}</ThemedText>
                        </View>
                    )}

                    <ThemedText type="sectionHeader" style={{ fontSize: 19, marginTop: isNew ? -32 : 8, marginBottom: 8 }}>Contact Value</ThemedText>
                    <Input
                        value={value}
                        onChangeText={setValue}
                        placeholder={selectedPlatform.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType={selectedPlatform.keyboard as any}
                        style={{ marginBottom: 1 }}
                    />

                    <Button
                        title="Save Contact"
                        onPress={handleSave}
                        disabled={!hasChanges || isSaving || !person}
                    />

                    {!isNew && (
                        <ScalePressable
                            style={styles.deleteButton}
                            innerStyle={{ borderRadius: 12 }}
                            onPress={() => {
                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                setShowDeleteModal(true);
                            }}
                        >
                            <Trash size={20} color={colors.error} />
                            <ThemedText style={{ color: colors.error, fontWeight: '700', marginLeft: 8 }}>
                                Delete Contact
                            </ThemedText>
                        </ScalePressable>
                    )}

                </ScrollView>
            </KeyboardAvoidingView>

            <DeleteModal
                visible={showDeleteModal}
                title="Delete Contact"
                description="Are you sure you want to delete this contact info?"
                onCancel={() => setShowDeleteModal(false)}
                onDelete={confirmDeleteContact}
            />

            <AlertModal
                visible={alertConfig?.visible || false}
                title={alertConfig?.title || ''}
                description={alertConfig?.description || ''}
                type={alertConfig?.type}
                onClose={() => setAlertConfig(null)}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        padding: 24,
    },
    personContext: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        marginBottom: 32,
    },
    personIconBg: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 24,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    activePlatformRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
    },
    activePlatformIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    platformsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    platformOption: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 16,
    }
});
