import React from 'react';
import { StyleSheet, ScrollView, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { useSettings } from '../../store/SettingsContext';
import { DesignSystem } from '../../constants/DesignSystem';
import { CloudArrowUp } from '@/components/ui/Icon';
import { Card } from '../../components/ui/Card';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import * as Haptics from 'expo-haptics';
import { Toggle } from '../../components/ui/Toggle';
import { Typography } from '../../constants/Typography';
import { View } from 'react-native';
import { ThemedText } from '../../components/ui/ThemedText';

export default function ExtraSettingsScreen() {
    const { settings, updateSetting } = useSettings();
    const { colors, hapticsEnabled } = useAppTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                title="Extra"
                onBack={() => router.back()}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
                
                <View style={styles.section}>
                    <Card style={styles.card} padding="none">
                        <SettingRow
                            label="Check for Updates"
                            description="Reloom will automatically check for new versions on GitHub."
                            icon={<CloudArrowUp size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18 }]}
                        >
                            <Toggle
                                value={settings.checkForUpdatesEnabled}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('checkForUpdatesEnabled', v);
                                }}
                            />
                        </SettingRow>
                    </Card>
                </View>

            </ScrollView>
        </ThemedView>
    );
}

function SettingRow({ label, description, icon, children, colors, style }: any) {
    return (
        <View style={[styles.settingRow, style]}>
            <View style={styles.settingInfo}>
                <View style={styles.settingTitleGroup}>
                    {icon}
                    <ThemedText style={styles.settingLabel}>{label}</ThemedText>
                </View>
                {description && <ThemedText style={[styles.settingDesc, { color: colors.secondary }]}>{description}</ThemedText>}
            </View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    section: { marginBottom: 32 },
    card: { overflow: 'hidden' },
    paddingBox: { padding: 16 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    settingInfo: { flex: 1, marginRight: 16 },
    settingTitleGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    settingLabel: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.bold,
        marginLeft: 12
    },
    settingDesc: {
        fontSize: 13,
        lineHeight: 18,
        marginLeft: 32,
        fontFamily: Typography.fontFamily.medium
    },
});
