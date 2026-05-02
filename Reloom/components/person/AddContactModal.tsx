import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, KeyboardAvoidingView, Platform, TextInput, ScrollView } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ThemedText } from '../ui/ThemedText';
import { ScalePressable } from '../ui/ScalePressable';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DesignSystem } from '../../constants/DesignSystem';
import { Phone, EnvelopeSimple, InstagramLogo, TiktokLogo, WhatsappLogo, LinkedinLogo, Globe, X } from 'phosphor-react-native';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import * as Haptics from 'expo-haptics';

const PLATFORMS = [
    { id: 'Phone', icon: Phone, placeholder: '+1 234 567 8900' },
    { id: 'WhatsApp', icon: WhatsappLogo, placeholder: '+1 234 567 8900' },
    { id: 'Email', icon: EnvelopeSimple, placeholder: 'email@example.com' },
    { id: 'Instagram', icon: InstagramLogo, placeholder: '@username' },
    { id: 'TikTok', icon: TiktokLogo, placeholder: '@username' },
    { id: 'LinkedIn', icon: LinkedinLogo, placeholder: 'username or url' },
    { id: 'Website', icon: Globe, placeholder: 'https://example.com' },
];

export function AddContactModal({ visible, onClose, onSave, personId }: any) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
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
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
                    <BlurView intensity={theme === 'dark' ? 40 : 20} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)' }]} />
                </Animated.View>
                
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

                <Animated.View
                    entering={SlideInDown.duration(300)}
                    style={[
                        styles.bottomSheet,
                        { 
                            backgroundColor: colors.background, 
                            paddingBottom: 100 + insets.bottom + 24,
                            marginBottom: -100
                        }
                    ]}
                >
                    <View style={styles.sheetHeader}>
                        <View style={[styles.handleIndicator, { backgroundColor: colors.border }]} />
                        <View style={styles.headerTitleRow}>
                            <ThemedText style={styles.headerTitle}>Add Contact Info</ThemedText>
                            <ScalePressable 
                                onPress={onClose} 
                                style={[styles.closeButton, { backgroundColor: colors.surface }]}
                                innerStyle={{ borderRadius: 16 }}
                            >
                                <X size={20} color={colors.text} />
                            </ScalePressable>
                        </View>
                    </View>

                    <ThemedText style={[styles.sectionLabel, { color: colors.secondary }]}>PLATFORM</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.platformsScroll}>
                        {PLATFORMS.map(platform => {
                            const isSelected = selectedPlatform.id === platform.id;
                            const Icon = platform.icon;
                            return (
                                <ScalePressable
                                    key={platform.id}
                                    style={[
                                        styles.platformButton,
                                        { 
                                            backgroundColor: isSelected ? colors.tint : colors.surface,
                                            borderColor: isSelected ? colors.tint : colors.border,
                                            borderWidth: theme === 'light' ? 1 : 0
                                        }
                                    ]}
                                    innerStyle={{ borderRadius: 12 }}
                                    overlayColor={isSelected ? 'rgba(0,0,0,0.15)' : undefined}
                                    onPress={() => {
                                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                        setSelectedPlatform(platform);
                                    }}
                                >
                                    <Icon size={20} color={isSelected ? '#FFF' : colors.text} weight={isSelected ? "fill" : "regular"} />
                                    <ThemedText style={{ color: isSelected ? '#FFF' : colors.text, marginLeft: 8, fontWeight: isSelected ? '700' : '500' }}>
                                        {platform.id}
                                    </ThemedText>
                                </ScalePressable>
                            );
                        })}
                    </ScrollView>

                    <ThemedText style={[styles.sectionLabel, { color: colors.secondary, marginTop: 24 }]}>DETAILS</ThemedText>
                    <Input
                        value={value}
                        onChangeText={setValue}
                        placeholder={selectedPlatform.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType={['Phone', 'WhatsApp'].includes(selectedPlatform.id) ? 'phone-pad' : selectedPlatform.id === 'Email' ? 'email-address' : 'default'}
                        style={{ marginBottom: 24 }}
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
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        ...DesignSystem.shadows.xl,
    },
    sheetHeader: {
        marginBottom: 20,
    },
    handleIndicator: {
        width: 40,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    platformsScroll: {
        flexDirection: 'row',
        gap: 12,
        paddingRight: 24,
    },
    platformButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
    }
});
