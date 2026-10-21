import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, Platform, BackHandler } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { ContactRepository, Contact } from '../../db/repositories/ContactRepository';
import { PersonRepository, Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DeleteModal } from '../../components/ui/DeleteModal';
import { Avatar } from '../../components/ui/Avatar';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Phone, EnvelopeSimple, InstagramLogo, FacebookLogo, TiktokLogo, WhatsappLogo, LinkedinLogo, Globe, Trash } from '@/components/ui/Icon';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import * as Haptics from 'expo-haptics';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { AlertModal } from '../../components/ui/AlertModal';
import { showToast } from '../../components/ui/Toast';

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

const PLATFORMS_ROWS = [
    PLATFORMS.slice(0, 3),
    PLATFORMS.slice(3, 6),
    PLATFORMS.slice(6, 8),
];

const HANDLE_PATTERN = /^@?[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;
const URL_PATTERN = /^(https?:\/\/)?(www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#][^\s]*)?$/i;

function isUrlLike(value: string) {
    return URL_PATTERN.test(value.trim());
}

export default function ContactEditorScreen() {
    const { id, personId } = useLocalSearchParams();
    const router = useRouter();
    const { colors, theme, hapticsEnabled } = useAppTheme();

    const isNew = id === 'new';
    const [person, setPerson] = useState<Person | null>(null);
    const [originalContact, setOriginalContact] = useState<Contact | null>(null);
    const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
    const [value, setValue] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);
    const [fieldError, setFieldError] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'error' | 'success' } | null>(null);

    useEffect(() => {
        loadData();
    }, [id, personId]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            if (isNew) {
                if (!personId) {
                    setLoadError('No person was specified for this contact.');
                    return;
                }
                const p = await PersonRepository.getById(Number(personId));
                if (!p) {
                    setLoadError('This person no longer exists.');
                    return;
                }
                setPerson(p);
            } else {
                const contact = await ContactRepository.getById(Number(id));
                if (!contact) {
                    setLoadError('This contact no longer exists.');
                    return;
                }
                setOriginalContact(contact);
                setValue(contact.value);
                const plat = PLATFORMS.find(p => p.id.toLowerCase() === contact.platform.toLowerCase());
                setSelectedPlatform(plat ?? {
                    id: contact.platform,
                    icon: Globe,
                    placeholder: 'Enter contact value',
                    keyboard: 'default',
                });

                const p = await PersonRepository.getById(contact.personId);
                if (!p) {
                    setLoadError('The person for this contact no longer exists.');
                    return;
                }
                setPerson(p);
            }
        } catch (error) {
            console.error(error);
            setLoadError('Could not load this contact.');
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = useMemo(() => {
        if (isNew) return value.trim() !== '';
        if (!originalContact) return false;
        return selectedPlatform.id.toLowerCase() !== originalContact.platform.toLowerCase() || value.trim() !== originalContact.value;
    }, [isNew, value, selectedPlatform, originalContact]);

    useFocusEffect(
        useCallback(() => {
            const onBackPress = () => {
                if (showDeleteModal) {
                    setShowDeleteModal(false);
                    return true;
                }
                if (showDiscardModal) {
                    setShowDiscardModal(false);
                    return true;
                }
                if (alertConfig?.visible) {
                    setAlertConfig(null);
                    return true;
                }
                if (hasChanges) {
                    setShowDiscardModal(true);
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [alertConfig?.visible, hasChanges, showDeleteModal, showDiscardModal])
    );

    const canSave = Boolean(hasChanges && !isSaving && person && value.trim().length > 0);
    const saveButtonScale = useSharedValue(1);
    const prevCanSave = useRef(false);

    useEffect(() => {
        if (canSave && !prevCanSave.current) {
            saveButtonScale.value = withSequence(
                withSpring(1.025, { damping: 10, stiffness: 320, mass: 0.5 }),
                withSpring(1.0, { damping: 14, stiffness: 240, mass: 0.7 })
            );
        }
        prevCanSave.current = canSave;
    }, [canSave]);

    const saveButtonAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: saveButtonScale.value }],
    }));

    const validateContactValue = (platformId: string, rawValue: string): string | null => {
        const trimmed = rawValue.trim();
        switch (platformId) {
            case 'Phone':
            case 'WhatsApp': {
                const digits = trimmed.replace(/\D/g, '');
                if (digits.length < 7) return 'Enter a valid phone number.';
                return null;
            }
            case 'Email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.';
                return null;
            case 'Instagram':
            case 'TikTok':
                if (!isUrlLike(trimmed) && !HANDLE_PATTERN.test(trimmed)) {
                    return 'Enter a valid handle or URL.';
                }
                return null;
            case 'Facebook':
            case 'LinkedIn':
                if (!isUrlLike(trimmed) && !HANDLE_PATTERN.test(trimmed)) {
                    return 'Enter a username or URL.';
                }
                return null;
            case 'Website':
                if (!isUrlLike(trimmed)) return 'Enter a valid URL.';
                return null;
            default:
                return null;
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        if (!value.trim()) {
            setAlertConfig({
                visible: true,
                title: 'Missing Value',
                description: 'Please enter a contact detail or handle.',
                type: 'error'
            });
            return;
        }
        if (!person) {
            setAlertConfig({
                visible: true,
                title: 'Invalid Contact Target',
                description: 'No person profile associated with this contact.',
                type: 'error'
            });
            return;
        }
        const formatError = validateContactValue(selectedPlatform.id, value);
        if (formatError) {
            setFieldError(formatError);
            return;
        }
        try {
            const existing = await ContactRepository.getContactsForPerson(person.id);
            const trimmedValue = value.trim().toLowerCase();
            const duplicate = existing.find(c =>
                c.platform.toLowerCase() === selectedPlatform.id.toLowerCase() &&
                c.value.trim().toLowerCase() === trimmedValue &&
                (isNew || c.id !== Number(id))
            );
            if (duplicate) {
                setFieldError('This contact already exists for this person.');
                return;
            }
        } catch (error) {
            console.error(error);
            setAlertConfig({
                visible: true,
                title: 'Error',
                description: 'Could not verify existing contacts.',
                type: 'error'
            });
            return;
        }
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
            showToast(isNew ? 'Contact added' : 'Contact updated');
            if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (router.canGoBack()) router.back(); else router.replace('/');
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
            if (router.canGoBack()) router.back(); else router.replace('/');
        } catch (err) {
            setIsSaving(false);
            setShowDeleteModal(false);
            setAlertConfig({
                visible: true,
                title: 'Error',
                description: 'Could not delete contact.',
                type: 'error'
            });
        }
    };

    const goBack = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const handleBack = () => {
        if (hasChanges) {
            setShowDiscardModal(true);
        } else {
            goBack();
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                onBack={handleBack}
                centerContent={
                    <ThemedText type="display" style={{ fontSize: 28, letterSpacing: -1.5 }}>
                        {isNew ? 'New Contact' : 'Edit Contact'}
                    </ThemedText>
                }
            />

            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                bottomOffset={24}
            >

                    {loadError ? (
                        <View style={styles.errorContainer}>
                            <ThemedText type="sectionHeader" style={{ textAlign: 'center' }}>
                                {isNew ? 'Cannot Create Contact' : 'Contact Not Found'}
                            </ThemedText>
                            <ThemedText style={{ textAlign: 'center', opacity: 0.6, marginTop: 8 }}>
                                {loadError}
                            </ThemedText>
                            <Button
                                title="Go Back"
                                onPress={() => router.back()}
                                style={{ marginTop: 24, alignSelf: 'center', paddingHorizontal: 28 }}
                            />
                        </View>
                    ) : isLoading || !person ? null : (
                    <>
                    <Animated.View 
                        entering={FadeInDown.duration(320).springify().damping(24).stiffness(180).mass(0.9)}
                        style={[
                            styles.personContext, 
                            { 
                                backgroundColor: colors.surface,
                                borderWidth: 0
                            }
                        ]}
                    >
                        <Avatar uri={person.avatarUri} size={44} name={person.name} />
                        <View style={{ marginLeft: 16 }}>
                            <ThemedText type="tiny" style={{ opacity: 0.6, marginBottom: -1 }}>{isNew ? 'Adding contact for' : 'Editing contact for'}</ThemedText>
                            <ThemedText style={{ fontSize: 18, opacity: 0.8 }} >{person.name}</ThemedText>
                        </View>
                    </Animated.View>

                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="sectionHeader" style={{ fontSize: 19, marginBottom: -8, marginTop: -20 }}>Platform</ThemedText>
                    </View>

                    {isNew ? (
                        <View style={styles.platformsGrid}>
                            {PLATFORMS_ROWS.map((row, rowIndex) => (
                                <Animated.View
                                    key={rowIndex}
                                    entering={FadeInDown.delay(70 + rowIndex * 60).duration(440).springify().damping(22).stiffness(125).mass(0.9)}
                                    style={styles.platformRow}
                                >
                                    {row.map((platform) => {
                                        const isSelected = selectedPlatform.id === platform.id;
                                        const Icon = platform.icon;
                                        return (
                                            <ScalePressable
                                                key={platform.id}
                                                style={[
                                                    styles.platformOption,
                                                    {
                                                        backgroundColor: isSelected ? colors.tint : colors.surface,
                                                        borderColor: isSelected && theme === 'light' ? colors.tint : 'transparent',
                                                        borderWidth: theme === 'light' ? 1.5 : 0
                                                    }
                                                ]}
                                                innerStyle={{ borderRadius: 16 }}
                                                overlayColor={isSelected ? 'rgba(0,0,0,0.15)' : undefined}
                                                onPress={() => {
                                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                    setSelectedPlatform(platform);
                                                    if (fieldError) setFieldError(null);
                                                }}
                                            >
                                                <Icon size={20} color={isSelected ? (theme === 'dark' ? colors.background : '#FFF') : colors.text} weight={isSelected ? "fill" : "regular"} />
                                                <ThemedText style={{
                                                    color: isSelected ? (theme === 'dark' ? colors.background : '#FFF') : colors.text,
                                                    fontWeight: isSelected ? '700' : '500',
                                                    marginTop: 6,
                                                    fontSize: 12
                                                }}>
                                                    {platform.id}
                                                </ThemedText>
                                            </ScalePressable>
                                        );
                                    })}
                                </Animated.View>
                            ))}
                        </View>
                    ) : (
                        <View style={[styles.activePlatformRow, { backgroundColor: colors.surface, marginBottom: 8 }]}>
                            <View style={styles.activePlatformIcon}>
                                <selectedPlatform.icon size={25} color={colors.tint} weight="fill" />
                            </View>
                            <ThemedText style={{ fontSize: 16, fontWeight: '700' }}>{selectedPlatform.id}</ThemedText>
                        </View>
                    )}

                    <Animated.View entering={FadeInDown.delay(240).duration(460).springify().damping(22).stiffness(120).mass(1.0)}>
                        <ThemedText type="sectionHeader" style={{ fontSize: 19, marginTop: 8, marginBottom: 8 }}>Contact Value</ThemedText>
                        <Input
                            value={value}
                            onChangeText={(text) => {
                                setValue(text);
                                if (fieldError) setFieldError(null);
                            }}
                            placeholder={selectedPlatform.placeholder}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType={selectedPlatform.keyboard as any}
                            error={fieldError ?? undefined}
                            style={{ marginBottom: 1 }}
                        />

                        <Animated.View style={saveButtonAnimatedStyle}>
                            <Button
                                title="Save Contact"
                                onPress={handleSave}
                                textStyle={{ fontSize: 17 }}
                                style={styles.saveButton}
                                disabled={!canSave}
                            />
                        </Animated.View>

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
                    </Animated.View>
                    </>
                    )}

            </KeyboardAwareScrollView>

            <DeleteModal
                visible={showDeleteModal}
                title="Delete Contact"
                description="Are you sure you want to delete this contact info?"
                onCancel={() => setShowDeleteModal(false)}
                onDelete={confirmDeleteContact}
            />

            <DeleteModal
                visible={showDiscardModal}
                title="Discard Changes?"
                description="You have unsaved changes. Are you sure you want to go back?"
                actionLabel="Discard"
                onCancel={() => setShowDiscardModal(false)}
                onDelete={() => {
                    setShowDiscardModal(false);
                    goBack();
                }}
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
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 16,
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
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    platformsGrid: {
        flexDirection: 'column',
        gap: 12,
        marginBottom: 16,
    },
    platformRow: {
        flexDirection: 'row',
        gap: 12,
    },
    platformOption: {
        width: '30%',
        height: 78,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        height: 65,
        paddingHorizontal: 20,
        borderRadius: 21,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        marginTop: 16,
    }
});
