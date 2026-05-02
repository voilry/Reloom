import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView, Linking } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ThemedView } from '../../../components/ui/ThemedView';
import { ThemedText } from '../../../components/ui/ThemedText';
import { PersonRepository, Person } from '../../../db/repositories/PersonRepository';
import { DesignSystem } from '../../../constants/DesignSystem';
import { ScreenHeader } from '../../../components/ui/ScreenHeader';
import { Input } from '../../../components/ui/Input';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { ScalePressable } from '../../../components/ui/ScalePressable';
import { useAppTheme } from '../../../hooks/useAppTheme';
import { House as Home, Briefcase, Airplane as Plane, Globe, MapPin, X, Check, NavigationArrow as Navigation } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Typography } from '../../../constants/Typography';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import { DeleteModal } from '../../../components/ui/DeleteModal';

export default function PersonLocationsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();
    const personId = Number(id);

    const [person, setPerson] = useState<Person | null>(null);
    const [locationHome, setLocationHome] = useState('');
    const [locationWork, setLocationWork] = useState('');
    const [locationOther, setLocationOther] = useState('');
    const [city, setCity] = useState('');
    const [originalData, setOriginalData] = useState({ home: '', work: '', other: '', city: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [showDiscardModal, setShowDiscardModal] = useState(false);

    useEffect(() => {
        if (id) loadData();
    }, [id]);

    const loadData = async () => {
        const p = await PersonRepository.getById(personId);
        if (p) {
            setPerson(p);
            const data = {
                home: p.locationHome || '',
                work: p.locationWork || '',
                other: p.locationOther || '',
                city: p.city || ''
            };
            setLocationHome(data.home);
            setLocationWork(data.work);
            setLocationOther(data.other);
            setCity(data.city);
            setOriginalData(data);
        }
    };

    const hasChanges = useMemo(() => {
        return (
            locationHome.trim() !== originalData.home ||
            locationWork.trim() !== originalData.work ||
            locationOther.trim() !== originalData.other ||
            city.trim() !== originalData.city
        );
    }, [locationHome, locationWork, locationOther, city, originalData]);

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => {
                if (hasChanges) {
                    setShowDiscardModal(true);
                    return true;
                }
                return false;
            };

            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [hasChanges])
    );

    const handleBack = () => {
        if (hasChanges) {
            setShowDiscardModal(true);
        } else {
            router.back();
        }
    };

    const handleSave = async () => {
        if (!person) return;
        setIsSaving(true);
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        await PersonRepository.update(personId, {
            locationHome: locationHome.trim(),
            locationWork: locationWork.trim(),
            locationOther: locationOther.trim(),
            city: city.trim()
        });

        setIsSaving(false);
        router.back();
    };

    const handleOpenMap = (value: string) => {
        if (!value.trim()) return;
        const query = encodeURIComponent(value);
        const url = Platform.select({
            ios: `maps://0,0?q=${query}`,
            android: `geo:0,0?q=${query}`,
            default: `https://www.google.com/maps/search/?api=1&query=${query}`
        });
        Linking.openURL(url as string);
    };

    if (!person) {
        return (
            <ThemedView style={{ flex: 1 }}>
                <Stack.Screen options={{ headerShown: false }} />
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="auto" />

            <ScreenHeader
                onBack={handleBack}
                style={styles.header}
                alignCenter={false}
                centerContent={
                    <View style={{ flex: 1, alignItems: 'flex-start' }}>
                        <ThemedText type="display" style={{ fontSize: 28, lineHeight: 32 }}>Places</ThemedText>
                        <ThemedText style={{ fontSize: 10, color: colors.secondary, marginTop: -6, fontFamily: Typography.fontFamily.medium, textTransform: 'uppercase' }}>
                            {person.name}'s locations
                        </ThemedText>
                    </View>
                }
                rightContent={
                    <View style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }}>
                        {hasChanges && (
                            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
                                <ScalePressable
                                    onPress={handleSave}
                                    disabled={isSaving}
                                    style={[styles.saveButton, { backgroundColor: colors.tint }]}
                                    innerStyle={{ borderRadius: 22 }}
                                    springConfig={DesignSystem.animation.springs.heavy}
                                    scaleTo={0.9}
                                    overlayColor="rgba(0,0,0,0.15)"
                                >
                                    <Check size={20} color={theme === 'light' ? '#fff' : '#000'} weight="bold" />
                                </ScalePressable>
                            </Animated.View>
                        )}
                    </View>
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={{ height: 12 }} />

                    <LocationInputRow
                        label="Home"
                        value={locationHome}
                        onChangeText={setLocationHome}
                        placeholder="Residential address..."
                        icon={<Home size={22} color={colors.icon} weight="duotone" />}
                        onOpenMap={() => handleOpenMap(locationHome)}
                        colors={colors}
                    />

                    <LocationInputRow
                        label="Work"
                        value={locationWork}
                        onChangeText={setLocationWork}
                        placeholder="Office or workplace..."
                        icon={<Briefcase size={22} color={colors.icon} weight="duotone" />}
                        onOpenMap={() => handleOpenMap(locationWork)}
                        colors={colors}
                    />

                    <LocationInputRow
                        label="Other"
                        value={locationOther}
                        onChangeText={setLocationOther}
                        placeholder="Vacation home, frequent spot..."
                        icon={<Plane size={22} color={colors.icon} weight="duotone" />}
                        onOpenMap={() => handleOpenMap(locationOther)}
                        colors={colors}
                    />

                    <View style={{ height: 24 }} />
                    <View style={styles.sectionDivider}>
                        <ThemedText type="sectionHeader" style={styles.sectionLabel}>City Grouping</ThemedText>
                    </View>

                    <LocationInputRow
                        label="City"
                        value={city}
                        onChangeText={setCity}
                        placeholder="Chicago, London, etc."
                        icon={<Globe size={22} color={colors.icon} weight="duotone" />}
                        colors={colors}
                    />

                    <View style={[
                        styles.disclaimerCard,
                        {
                            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                            borderWidth: theme === 'dark' ? 0 : 1,
                            borderColor: colors.border + '40'
                        }
                    ]}>
                        <ThemedText style={[styles.disclaimerText, { color: colors.secondary, opacity: 0.8 }]}>
                            Specific addresses enable quick maps navigation, while city grouping allows you to visualize your social circle by region in the main Cities hub.
                        </ThemedText>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <DeleteModal
                visible={showDiscardModal}
                title="Discard Changes"
                description="Are you sure you want to discard your edits? Any changes you made will be lost."
                onCancel={() => setShowDiscardModal(false)}
                onDelete={() => {
                    setShowDiscardModal(false);
                    router.back();
                }}
                actionLabel="Discard"
            />
        </ThemedView>
    );
}

function LocationInputRow({ label, value, onChangeText, placeholder, icon, onOpenMap, colors }: any) {
    return (
        <View style={styles.inputRow}>
            <View style={styles.inputRowHeader}>
                <View style={styles.labelGroup}>
                    {icon}
                    <ThemedText style={styles.inputLabel}>{label}</ThemedText>
                </View>
                {onOpenMap && value.trim().length > 0 && (
                    <ScalePressable
                        onPress={onOpenMap}
                        style={styles.mapAction}
                        springConfig={DesignSystem.animation.springs.fast}
                        scaleTo={0.9}
                        overlayColor="rgba(0,0,0,0.15)"
                    >
                        <Navigation size={18} color={colors.tint} weight="bold" />
                    </ScalePressable>
                )}
            </View>
            <Input
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                style={styles.input}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingBottom: 12 },
    saveButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
    },
    inputRow: {
        marginBottom: 16,
    },
    inputRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
        paddingHorizontal: 4,
    },
    labelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    inputLabel: {
        fontSize: 14,
        fontFamily: Typography.fontFamily.bold,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    input: {
        marginBottom: 0,
    },
    mapAction: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionDivider: {
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionLabel: {
        fontSize: 15,
        opacity: 0.7,
        marginBottom: 4,
    },
    disclaimerCard: {
        marginTop: 32,
        padding: 20,
        borderRadius: 16,
    },
    disclaimerText: {
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontFamily: Typography.fontFamily.serif,
    },
});
