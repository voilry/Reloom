import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Animated, { FadeIn, SlideInDown, Easing } from 'react-native-reanimated';
import { ThemedText } from '../ui/ThemedText';
import { ScalePressable } from '../ui/ScalePressable';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { Phone, EnvelopeSimple, InstagramLogo, FacebookLogo, TiktokLogo, WhatsappLogo, LinkedinLogo, Globe, X } from '@/components/ui/Icon';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import * as Haptics from 'expo-haptics';

const PLATFORMS = [
    { id: 'Phone', icon: Phone, placeholder: '+1 234 567 8900' },
    { id: 'WhatsApp', icon: WhatsappLogo, placeholder: '+1 234 567 8900' },
    { id: 'Email', icon: EnvelopeSimple, placeholder: 'email@example.com' },
    { id: 'Instagram', icon: InstagramLogo, placeholder: '@username' },
    { id: 'Facebook', icon: FacebookLogo, placeholder: 'username or url' },
    { id: 'TikTok', icon: TiktokLogo, placeholder: '@username' },
    { id: 'LinkedIn', icon: LinkedinLogo, placeholder: 'username or url' },
    { id: 'Website', icon: Globe, placeholder: 'https://example.com' },
];

const EASE_ENTER = Easing.bezier(0.05, 0.7, 0.1, 1.0);

export function AddContactModal({ visible, onClose, onSave, personId }: any) {
    const { colors, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();

    const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
    const [value, setValue] = useState('');

    useEffect(() => {
        if (visible) {
            setSelectedPlatform(PLATFORMS[0]);
            setValue('');
        }
    }, [visible]);

    const handleSave = () => {
        if (!value.trim()) return;
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave({ platform: selectedPlatform.id, value: value.trim() });
    };

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <KeyboardAvoidingView
                behavior="padding"
                style={styles.modalOverlay}
            >
                <Animated.View entering={FadeIn.duration(220).easing(EASE_ENTER)} style={StyleSheet.absoluteFill}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
                </Animated.View>

                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

                <Animated.View
                    entering={SlideInDown.duration(380).easing(EASE_ENTER)}
                    style={[
                        styles.bottomSheet,
                        {
                            backgroundColor: colors.background,
                            paddingBottom: 100 + insets.bottom + 24,
                            marginBottom: -100
                        }
                    ]}
                >
                    <View style={[styles.handleIndicator, { backgroundColor: colors.border }]} />
                    <View style={styles.headerTitleRow}>
                        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>Add Contact Info</ThemedText>
                        <ScalePressable
                            onPress={onClose}
                            style={styles.closeButton}
                            innerStyle={{ borderRadius: 17 }}
                            scaleTo={0.88}
                            overlayColor="transparent"
                            accessibilityRole="button"
                            accessibilityLabel="Close"
                        >
                            <X size={20} color={colors.text} />
                        </ScalePressable>
                    </View>

                    <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>Platform</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformsScroll}>
                        {PLATFORMS.map(platform => {
                            const isSelected = selectedPlatform.id === platform.id;
                            const Icon = platform.icon;
                            return (
                                <ScalePressable
                                    key={platform.id}
                                    style={[
                                        styles.platformButton,
                                        { backgroundColor: isSelected ? colors.tint : colors.surface }
                                    ]}
                                    innerStyle={{ borderRadius: 21 }}
                                    onPress={() => {
                                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                        setSelectedPlatform(platform);
                                    }}
                                    accessibilityRole="button"
                                    accessibilityLabel={platform.id}
                                >
                                    <Icon
                                        size={18}
                                        color={isSelected ? colors.tintContrast : colors.textSecondary}
                                        weight="fill"
                                    />
                                    <ThemedText
                                        style={[
                                            styles.platformLabel,
                                            { color: isSelected ? colors.tintContrast : colors.textSecondary },
                                        ]}
                                    >
                                        {platform.id}
                                    </ThemedText>
                                </ScalePressable>
                            );
                        })}
                    </ScrollView>

                    <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>Details</ThemedText>
                    <Input
                        value={value}
                        onChangeText={setValue}
                        placeholder={selectedPlatform.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType={['Phone', 'WhatsApp'].includes(selectedPlatform.id) ? 'phone-pad' : selectedPlatform.id === 'Email' ? 'email-address' : 'default'}
                        containerStyle={{ marginBottom: 20 }}
                    />

                    <Button
                        title="Save Contact"
                        onPress={handleSave}
                        disabled={value.trim() === ''}
                    />
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 20,
        paddingTop: 14,
        ...DesignSystem.shadows.xl,
    },
    handleIndicator: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 14,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 18,
    },
    headerTitle: {
        fontSize: 20,
        lineHeight: 26,
        letterSpacing: -0.3,
        fontFamily: Typography.fontFamily.serif,
    },
    closeButton: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 12.5,
        lineHeight: 17,
        fontFamily: Typography.fontFamily.semibold,
        marginBottom: 10,
        letterSpacing: 0.2,
    },
    platformsScroll: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 20,
    },
    platformButton: {
        height: 42,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 14,
        borderRadius: 21,
    },
    platformLabel: {
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: -0.1,
    },
});
