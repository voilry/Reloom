import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { Card } from '../../components/ui/Card';
import { Toggle } from '../../components/ui/Toggle';
import { Button } from '../../components/ui/Button';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LockKey, Fingerprint, Backspace } from '@/components/ui/Icon';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { DesignSystem } from '../../constants/DesignSystem';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { AlertModal } from '../../components/ui/AlertModal';
import { DeleteModal } from '../../components/ui/DeleteModal';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated';
import { Typography } from '../../constants/Typography';

const PIN_KEY = 'reloom_app_pin';

export default function PrivacySettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors } = useAppTheme();
    const { settings, lastSecurityEvent, updateSetting, triggerSecurityEvent } = useSettings();
    const [hasBiometrics, setHasBiometrics] = useState(false);
    const [pinMode, setPinMode] = useState<'idle' | 'create' | 'confirm'>('idle');
    const [tempPin, setTempPin] = useState('');
    const [pinInput, setPinInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isErrorShake, setIsErrorShake] = useState(false);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
    const [showDisableConfirm, setShowDisableConfirm] = useState(false);
    const errorShake = useSharedValue(0);


    useEffect(() => {
        checkBiometrics();
    }, []);

    const checkBiometrics = async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometrics(hasHardware && isEnrolled);
    };

    const triggerHaptic = () => {
        if (settings.hapticsEnabled) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const handleToggleAppLock = async (val: boolean) => {
        triggerHaptic();
        if (val) {
            setPinMode('create');
            setErrorMessage('');
        } else {
            setShowDisableConfirm(true);
        }
    };

    const confirmDisableLock = async () => {
        await SecureStore.deleteItemAsync(PIN_KEY);
        triggerSecurityEvent();
        updateSetting('appLockEnabled', false);
        updateSetting('biometricEnabled', false);
        setShowDisableConfirm(false);
        triggerHaptic();
    };

    const handlePinPress = (num: string) => {
        if (errorMessage) return;
        triggerHaptic();
        const newVal = pinInput + num;
        if (newVal.length > 4) return;
        setPinInput(newVal);

        if (newVal.length === 4) {
            handlePinValidation(newVal);
        }
    };

    const handleBackspace = () => {
        if (errorMessage) return;
        triggerHaptic();
        setErrorMessage('');
        setPinInput(prev => prev.slice(0, -1));
    };

    const triggerErrorShake = () => {
        errorShake.value = withSequence(
            withTiming(10, { duration: 50 }),
            withTiming(-10, { duration: 50 }),
            withTiming(10, { duration: 50 }),
            withTiming(0, { duration: 50 })
        );
    };

    const animatedShakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: errorShake.value }]
    }));

    const handlePinValidation = async (cleaned: string) => {
        if (pinMode === 'create') {
            setTempPin(cleaned);
            setPinInput('');
            setPinMode('confirm');
            setErrorMessage('');
        } else if (pinMode === 'confirm') {
            if (cleaned === tempPin) {
                await SecureStore.setItemAsync(PIN_KEY, cleaned);
                triggerSecurityEvent();
                updateSetting('appLockEnabled', true);
                setPinMode('idle');
                setPinInput('');
                setTempPin('');
                setErrorMessage('');
                setAlertConfig({
                    visible: true,
                    title: 'Passcode Set',
                    description: 'Reloom is now secured with your 4-digit passcode.',
                    type: 'success'
                });
            } else {
                if (settings.hapticsEnabled) {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                }
                setErrorMessage("Passcodes don't match");
                triggerErrorShake();

                setTimeout(() => {
                    setPinInput('');
                    setPinMode('create');
                    setTempPin('');
                    setErrorMessage('');
                }, 1500);
            }
        }
    };

    if (pinMode !== 'idle') {
        return (
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />
                <ScreenHeader
                    title={pinMode === 'create' ? 'Create Passcode' : 'Confirm Passcode'}
                    onBack={() => {
                        setPinMode('idle');
                        setPinInput('');
                        setTempPin('');
                    }}
                />
                <View style={styles.pinContainer}>
                    <View style={{ height: 24, marginBottom: 8 }}>
                        {errorMessage ? (
                            <ThemedText style={{ color: colors.error, fontSize: 14, fontFamily: Typography.fontFamily.bold }}>{errorMessage}</ThemedText>
                        ) : (
                            <ThemedText style={{ opacity: 0.5, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                                {pinMode === 'create' ? 'Create Passcode' : 'Confirm Passcode'}
                            </ThemedText>
                        )}
                    </View>

                    <Animated.View style={[styles.pinDotsContainer, animatedShakeStyle]}>
                        {[0, 1, 2, 3].map((i) => (
                            <View
                                key={i}
                                style={[
                                    styles.pinDot,
                                    {
                                        borderColor: errorMessage ? colors.error : (pinInput.length > i ? colors.tint : colors.border),
                                        backgroundColor: errorMessage ? colors.error : (pinInput.length > i ? colors.tint : 'transparent'),
                                        transform: [{ scale: pinInput.length > i ? 1.1 : 1 }]
                                    }
                                ]}
                            />
                        ))}
                    </Animated.View>

                    <View style={styles.keypad}>
                        {[
                            ['1', '2', '3'],
                            ['4', '5', '6'],
                            ['7', '8', '9'],
                            ['', '0', 'delete']
                        ].map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.keypadRow}>
                                {row.map((key) => {
                                    if (key === 'delete') {
                                        return (
                                            <ScalePressable key={key} onPress={handleBackspace} style={styles.keyItem}>
                                                <Backspace size={28} color={colors.text} />
                                            </ScalePressable>
                                        );
                                    }
                                    if (key === '') return <View key="empty" style={styles.keyItem} />;
                                    return (
                                        <ScalePressable key={key} onPress={() => handlePinPress(key)} style={styles.keyItem}>
                                            <ThemedText style={styles.keyText}>{key}</ThemedText>
                                        </ScalePressable>
                                    );
                                })}
                            </View>
                        ))}
                    </View>
                </View>
            </ThemedView>
        );
    }

    const handleToggleBiometric = async (val: boolean) => {
        triggerHaptic();
        updateSetting('biometricEnabled', val);
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                title="Passcode & App Lock"
                onBack={() => router.back()}
            />

            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
                <Card style={styles.card} padding="none">
                    <View style={[styles.settingRow, { borderBottomWidth: 1, borderBottomColor: colors.border + '50' }]}>
                        <View style={styles.settingIconText}>
                            <LockKey 
                                key={settings.appLockEnabled ? 'locked' : 'unlocked'}
                                size={22} 
                                color={settings.appLockEnabled ? colors.tint : colors.text} 
                                weight={settings.appLockEnabled ? "duotone" : "regular"} 
                            />
                            <View>
                                <ThemedText style={styles.settingLabel}>App Lock</ThemedText>
                                <ThemedText style={styles.settingSub}>Require passcode to open Reloom</ThemedText>
                            </View>
                        </View>
                        <Toggle
                            value={settings.appLockEnabled}
                            onValueChange={handleToggleAppLock}
                        />
                    </View>

                    {settings.appLockEnabled && hasBiometrics && (
                        <View style={[styles.settingRow]}>
                            <View style={styles.settingIconText}>
                                <Fingerprint 
                                    key={settings.biometricEnabled ? 'active' : 'inactive'}
                                    size={22} 
                                    color={colors.text} 
                                    weight={settings.biometricEnabled ? "duotone" : "regular"} 
                                />
                                <View>
                                    <ThemedText style={styles.settingLabel}>Security Fallback</ThemedText>
                                    <ThemedText style={styles.settingSub}>Fingerprint or FaceID support</ThemedText>
                                </View>
                            </View>
                            <Toggle
                                value={settings.biometricEnabled}
                                onValueChange={handleToggleBiometric}
                            />
                        </View>
                    )}
                </Card>

                {settings.appLockEnabled && (
                    <View style={{ marginTop: 24 }}>
                        <Button
                            title="Change Passcode"
                            variant="secondary"
                            onPress={() => setPinMode('create')}
                        />
                    </View>
                )}
            </ScrollView>

            <DeleteModal
                visible={showDisableConfirm}
                title="Disable Security?"
                description="Your app will no longer be protected by a passcode or biometrics."
                actionLabel="Disable"
                onCancel={() => setShowDisableConfirm(false)}
                onDelete={confirmDisableLock}
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
        padding: DesignSystem.spacing.lg,
    },
    card: {
        paddingVertical: 8,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
    },
    settingIconText: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.bold,
        lineHeight: 20,
    },
    pinContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40,
        backgroundColor: 'transparent',
    },
    pinDotsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    pinDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 1.5,
    },
    keypad: {
        marginTop: 48,
        width: '100%',
    },
    keypadRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 24,
        marginBottom: 20,
    },
    keyItem: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
    },
    keyText: {
        fontSize: 28,
        fontFamily: Typography.fontFamily.medium,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingSub: {
        fontSize: 12,
        opacity: 0.5,
        marginTop: 0,
    }
});
