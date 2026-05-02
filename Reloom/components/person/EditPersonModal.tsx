import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '../ui/ThemedText';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Avatar } from '../ui/Avatar';
import { DatePicker } from '../ui/DatePicker';
import { X, Camera, Check } from 'phosphor-react-native';
import * as ImagePicker from 'expo-image-picker';
import { Person } from '../../db/repositories/PersonRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSettings } from '../../store/SettingsContext';

interface EditPersonModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    person: Person;
}

export function EditPersonModal({ visible, onClose, onSave, person }: EditPersonModalProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const { settings } = useSettings();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState(person.name);
    const [pitch, setPitch] = useState(person.elevatorPitch || '');
    const [gender, setGender] = useState(person.gender || '');
    const [birthdate, setBirthdate] = useState(person.birthdate || '');
    const [firstMet, setFirstMet] = useState(person.firstMet || '');
    const [avatarUri, setAvatarUri] = useState(person.avatarUri || null);

    useEffect(() => {
        if (visible) {
            setName(person.name);
            setPitch(person.elevatorPitch || '');
            setGender(person.gender || '');
            setBirthdate(person.birthdate || '');
            setFirstMet(person.firstMet || '');
            setAvatarUri(person.avatarUri || null);
        }
    }, [visible, person]);

    const handleSave = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSave({
            name,
            elevatorPitch: pitch,
            gender,
            birthdate,
            firstMet,
            avatarUri,
        });
    };

    const handleClose = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const pickImage = async () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatarUri(result.assets[0].uri);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            presentationStyle="fullScreen"
            statusBarTranslucent={true}
            onRequestClose={handleClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar style="auto" />
                <View style={[styles.header, { paddingTop: insets.top + 8, paddingBottom: 12 }]}>
                    <TouchableOpacity
                        onPress={handleClose}
                        style={styles.headerAction}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        activeOpacity={0.6}
                    >
                        <X size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText type="display" style={styles.headerTitle}>Edit Profile</ThemedText>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!name.trim()}
                        style={styles.headerAction}
                        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                        activeOpacity={0.6}
                    >
                        <Check size={24} color={name.trim() ? colors.tint : colors.secondary} />
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <ScrollView
                        style={styles.content}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.avatarSection}>
                            <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                                <View style={styles.avatarWrapper}>
                                    <Avatar name={name} uri={avatarUri} size={110} />
                                    <View style={[styles.cameraBadge, { backgroundColor: colors.tint, borderColor: colors.background }]}>
                                        <Camera size={18} color={theme === 'dark' ? '#000' : '#fff'} />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.formSection}>
                            <Input label="Full Name" value={name} onChangeText={setName} maxLength={40} />
                            <View style={{ height: 16 }} />
                            <Input label="Headline" value={pitch} onChangeText={setPitch} multiline placeholder="Bio" maxLength={35} />
                            <View style={{ height: 16 }} />

                            <View style={styles.row}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                    <Input label="Gender" value={gender} onChangeText={setGender} maxLength={20} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <DatePicker label="Birthday" value={birthdate} onChange={setBirthdate} maxDate={new Date()} />
                                </View>
                            </View>

                            <View style={{ height: 16 }} />
                            <DatePicker label="First Met" value={firstMet} onChange={setFirstMet} maxDate={new Date()} />
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    sheetIndicator: {
        width: '100%',
        height: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    handle: {
        width: 36,
        height: 5,
        borderRadius: 2.5,
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 20,
        letterSpacing: -0.5,
    },
    headerAction: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
    },
    avatarSection: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarWrapper: {
        position: 'relative',
    },
    cameraBadge: {
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
    formSection: {
        paddingHorizontal: 24,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    }
});
