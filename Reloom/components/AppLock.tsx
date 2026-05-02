import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, AppState, AppStateStatus, TextInput } from 'react-native';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withSequence, withSpring } from 'react-native-reanimated';
import { Typography } from '../constants/Typography';
import { BlurView } from 'expo-blur';
import { ThemedText } from './ui/ThemedText';
import { useSettings } from '../store/SettingsContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { LockKey, LockKeyOpen, Fingerprint, Check, Backspace } from 'phosphor-react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { DesignSystem } from '../constants/DesignSystem';
import { ScalePressable } from './ui/ScalePressable';

export function AppLock() {
    const { settings, lastSecurityEvent } = useSettings();
    const { colors, theme } = useAppTheme();
    const [isLocked, setIsLocked] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [unlockedSuccess, setUnlockedSuccess] = useState(false);
    const successScale = useSharedValue(0);
    const errorShake = useSharedValue(0);
    const [errorMessage, setErrorMessage] = useState('');

    const initialMount = React.useRef(true);
    const prevLockEnabled = React.useRef(settings.appLockEnabled);
    const lockBypassUntil = React.useRef(0);

    useEffect(() => {
        if (lastSecurityEvent > 0) {
            console.log('AppLock: Security event detected, setting grace period');
            lockBypassUntil.current = Date.now() + 20000; // 20s grace
        }
    }, [lastSecurityEvent]);

    useEffect(() => {
        // If app lock was just turned on, set a grace period
        if (settings.appLockEnabled && !prevLockEnabled.current) {
            console.log('AppLock: Just enabled, setting grace period');
            lockBypassUntil.current = Date.now() + 20000;
        }
        prevLockEnabled.current = settings.appLockEnabled;

        if (!settings.appLockEnabled) {
            setIsLocked(false);
            return;
        }

        // Only lock automatically on the VERY first launch of the component
        if (initialMount.current) {
            setIsLocked(true);
            handleBiometricAuth();
            initialMount.current = false;
        }

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            subscription.remove();
        };
    }, [settings.appLockEnabled, settings.biometricEnabled]);

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active' && settings.appLockEnabled) {
            // Check if we are in the grace period (e.g. just set/unlocked)
            if (Date.now() < lockBypassUntil.current) {
                console.log('AppLock: Grace period active, skipping lock');
                return;
            }
            setIsLocked(true);
            handleBiometricAuth();
        } else if (nextAppState === 'background' && settings.appLockEnabled) {
            // Don't lock immediately if in grace period
            if (Date.now() < lockBypassUntil.current) return;
            setIsLocked(true);
        }
    };

    const handleBiometricAuth = async (ignoreSettings = false) => {
        if (!settings.biometricEnabled && !ignoreSettings) return;
        
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            
            if (hasHardware && isEnrolled) {
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: 'Unlock Reloom',
                    fallbackLabel: 'Use Passcode',
                    cancelLabel: 'Cancel',
                    disableDeviceFallback: true
                });

                if (result.success) {
                    handleSuccess();
                }
            }
        } catch (e) {
            console.error('Biometric error:', e);
        }
    };

    const handleSuccess = () => {
        setUnlockedSuccess(true);
        if (settings.hapticsEnabled) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        successScale.value = withSpring(1, DesignSystem.animation.easing.spring);

        // Set grace period to avoid immediate re-lock (e.g. from alert modals)
        lockBypassUntil.current = Date.now() + 10000; // 10 seconds

        setTimeout(() => {
            setIsLocked(false);
            setUnlockedSuccess(false);
            setPinInput('');
            setFailedAttempts(0);
            successScale.value = 0;
        }, 1500);
    };

    const handlePinPress = (num: string) => {
        if (unlockedSuccess || errorMessage) return;
        if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        const newVal = pinInput + num;
        if (newVal.length > 4) return;
        setPinInput(newVal);

        if (newVal.length === 4) {
            validatePin(newVal);
        }
    };

    const handleBackspace = () => {
        if (unlockedSuccess || errorMessage) return;
        if (settings.hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setPinInput(prev => prev.slice(0, -1));
    };

    const validatePin = async (input: string) => {
        const storedPin = await SecureStore.getItemAsync('reloom_app_pin');
        if (input === storedPin) {
            handleSuccess();
        } else {
            const nextFailed = failedAttempts + 1;
            setFailedAttempts(nextFailed);
            setPinInput('');
            
            if (settings.hapticsEnabled) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            
            // Shake animation
            setErrorMessage('Wrong Passcode');
            errorShake.value = withSequence(
                withTiming(10, { duration: 50 }),
                withTiming(-10, { duration: 50 }),
                withTiming(10, { duration: 50 }),
                withTiming(0, { duration: 50 })
            );
            
            setTimeout(() => setErrorMessage(''), 1500);

            if (nextFailed >= 3) {
                handleBiometricAuth(true);
            }
        }
    };

    const animatedShakeStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: errorShake.value }]
    }));

    const animatedSuccessStyle = useAnimatedStyle(() => ({
        transform: [{ scale: successScale.value }]
    }));

    if (!isLocked) return null;

    return (
        <Modal transparent animationType="fade" visible={isLocked}>
            <BlurView intensity={theme === 'dark' ? 80 : 100} tint={theme} style={styles.blurContainer}>
                <View style={[styles.content, { backgroundColor: colors.background }]}>
                    {unlockedSuccess ? (
                        <Animated.View style={[animatedSuccessStyle, { alignItems: 'center' }]}>
                            <View style={[styles.successCircle, { backgroundColor: colors.tint }]}>
                                <LockKeyOpen size={48} color={theme === 'dark' ? '#000' : '#fff'} weight="bold" />
                            </View>
                            <ThemedText style={[styles.title, { marginTop: 24 }]}>Unlocked</ThemedText>
                        </Animated.View>
                    ) : (
                        <>
                            <LockKey 
                                key={errorMessage ? 'error' : 'locked'}
                                size={48} 
                                color={errorMessage ? colors.error : colors.tint} 
                                weight="duotone" 
                                style={{ marginBottom: 24 }} 
                            />
                            <ThemedText style={styles.title}>{errorMessage ? 'Error' : 'App Locked'}</ThemedText>
                             <ThemedText style={[styles.subtitle, errorMessage ? { color: colors.error, opacity: 1, fontFamily: Typography.fontFamily.bold } : null]}>
                                {errorMessage || 'Enter passcode to continue'}
                            </ThemedText>

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
                                    ['bio', '0', 'delete']
                                ].map((row, rowIndex) => (
                                    <View key={rowIndex} style={styles.keypadRow}>
                                        {row.map((key) => {
                                            if (key === 'bio') {
                                                return (
                                                    <ScalePressable 
                                                        key={key} 
                                                        onPress={handleBiometricAuth} 
                                                        style={styles.keyItem}
                                                        disabled={!settings.biometricEnabled}
                                                    >
                                                        {settings.biometricEnabled && <Fingerprint size={28} color={colors.text} />}
                                                    </ScalePressable>
                                                );
                                            }
                                            if (key === 'delete') {
                                                return (
                                                    <ScalePressable key={key} onPress={handleBackspace} style={styles.keyItem}>
                                                        <Backspace size={28} color={colors.text} />
                                                    </ScalePressable>
                                                );
                                            }
                                            return (
                                                <ScalePressable key={key} onPress={() => handlePinPress(key)} style={styles.keyItem}>
                                                    <ThemedText style={styles.keyText}>{key}</ThemedText>
                                                </ScalePressable>
                                            );
                                        })}
                                    </View>
                                ))}
                            </View>
                        </>
                    )}
                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    blurContainer: {
        flex: 1,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 40, // Centered better, matches setup screen
    },
    title: {
        fontSize: 24,
        fontFamily: Typography.fontFamily.bold,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 32,
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
    successCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        ...DesignSystem.shadows.lg,
    }
});
