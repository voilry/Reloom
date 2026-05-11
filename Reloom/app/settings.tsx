import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Share, Linking, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '../components/ui/ThemedView';
import { ThemedText } from '../components/ui/ThemedText';
import { useSettings, ThemeMode } from '../store/SettingsContext';
import { Colors } from '../constants/Colors';
import { DesignSystem } from '../constants/DesignSystem';
import { Typography } from '../constants/Typography';
import { CaretLeft, CaretRight, Moon, Sun, Desktop as Monitor, Waveform, Trash, Database, Info, GithubLogo as Github, ShieldCheck, Heart, ShareNetwork as Share2, ArrowsInLineHorizontal, Sliders, ArrowSquareOut as ExternalLink, DownloadSimple as Download, Bell, ListMagnifyingGlass as ListFilter, Layout, TextT, SelectionBackground, MagicWand, Cards, Compass, PaintBrush, Book, LockKey, Calendar, CloudArrowUp, CircleHalf, Mosaic } from '@/components/ui/Icon';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import * as Haptics from 'expo-haptics';
import { DataRepository } from '../db/repositories/DataRepository';
import { EntryRepository } from '../db/repositories/EntryRepository';
import { PersonRepository } from '../db/repositories/PersonRepository';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../hooks/useAppTheme';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolateColor, withTiming } from 'react-native-reanimated';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { DeleteModal } from '../components/ui/DeleteModal';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { Toggle } from '../components/ui/Toggle';
import { AlertModal } from '../components/ui/AlertModal';
import { ScalePressable } from '../components/ui/ScalePressable';
import { APP_VERSION } from '../constants/Version';

export default function SettingsScreen() {
    const { settings, updateSetting, resetSettings, refreshApp, hasUpdate, latestVersion } = useSettings();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showClearData, setShowClearData] = useState(false);
    const [showResetSettings, setShowResetSettings] = useState(false);
    const [importedDataToRestore, setImportedDataToRestore] = useState<any>(null);
    const [alertConfig, setAlertConfig] = useState<{ visible: boolean, title: string, description: string, type: 'success' | 'error' | 'info' | 'warning', onClose?: () => void } | null>(null);


    const showAlert = (title: string, description: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', onClose?: () => void) => {
        setAlertConfig({ visible: true, title, description, type, onClose });
    };

    const triggerHaptic = (style = Haptics.ImpactFeedbackStyle.Light) => {
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.impactAsync(style);
        }
    };

    const handleThemeChange = (mode: ThemeMode) => {
        triggerHaptic();
        updateSetting('theme', mode);
    };

    const handleExportData = async () => {
        try {
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            const allData = await DataRepository.exportAllData();
            const jsonString = JSON.stringify(allData, null, 2);
            const fileName = `backup_${new Date().toISOString().split('T')[0]}.reloom`;

            if (Platform.OS === 'web') {
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                return;
            }

            if (Platform.OS === 'android') {
                const SAF = (FileSystem as any).StorageAccessFramework;
                if (!SAF) throw new Error("Storage Access Framework not available");

                const permissions = await SAF.requestDirectoryPermissionsAsync();

                if (permissions.granted) {
                    const uri = await SAF.createFileAsync(
                        permissions.directoryUri,
                        fileName,
                        'application/octet-stream'
                    );
                    await FileSystem.writeAsStringAsync(uri, jsonString, { encoding: 'utf8' });
                    showAlert("Success", "Reloom backup saved to your selected folder.", "success");
                } else {
                    showAlert("Permission Denied", "Could not save without folder access.", "error");
                }
                return;
            }

            // iOS Implementation (Save to Files via Share Sheet)
            const cacheDir = (FileSystem as any).cacheDirectory;
            const fileUri = `${cacheDir}${fileName}`;
            await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(fileUri, {
                    mimeType: 'application/octet-stream',
                    dialogTitle: 'Save Reloom Backup',
                    UTI: 'public.data'
                });
            } else {
                showAlert("Export Error", "Sharing is not available on this device.", "error");
            }
        } catch (error) {
            console.error('Export error:', error);
            showAlert("Export Failed", "There was an error generating your backup file.", "error");
        }
    };

    const handleImportData = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            if (result.canceled) return;

            const fileUri = result.assets[0].uri;
            const content = await FileSystem.readAsStringAsync(fileUri);
            const importedData = JSON.parse(content);

            triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
            setImportedDataToRestore(importedData);
        } catch (error) {
            showAlert("Import Failed", "Could not read the backup file.", "error");
        }
    };

    const confirmRestoreBackup = async () => {
        if (!importedDataToRestore) return;
        try {
            await DataRepository.importData(importedDataToRestore);
            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
            showAlert("Success", "Your network has been restored.", "success", () => {
                router.dismissAll();
                setTimeout(() => refreshApp(), 100);
            });
        } catch (e: any) {
            console.error('Full import error:', e);
            showAlert("Import Error", `Failed to restore: ${e.message || "Unknown error"}`, "error");
        } finally {
            setImportedDataToRestore(null);
        }
    };

    const handleClearData = () => {
        triggerHaptic(Haptics.ImpactFeedbackStyle.Heavy);
        setShowClearData(true);
    };

    const confirmClearData = async () => {
        await DataRepository.clearAllData();
        triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
        setShowClearData(false);
        showAlert("Registry Wiped", "Your network has been cleared.", "success", () => {
            router.dismissAll();
            setTimeout(() => refreshApp(), 100);
        });
    };

    const openLink = (url: string) => {
        triggerHaptic();
        Linking.openURL(url).catch(() => {
            showAlert("Link Error", "Could not open external browser.", "error");
        });
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScreenHeader
                title="Settings"
                onBack={() => router.back()}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
                <View style={[styles.themeCardsGrid, { marginBottom: 20 }]}>
                    <ThemeCard
                        label="System"
                        active={settings.theme === 'auto'}
                        onPress={() => handleThemeChange('auto')}
                        icon={Monitor}
                        colors={colors}
                        theme={theme}
                    />
                    <ThemeCard
                        label="Light"
                        active={settings.theme === 'light'}
                        onPress={() => handleThemeChange('light')}
                        icon={Sun}
                        colors={colors}
                        theme={theme}
                    />
                    <ThemeCard
                        label="Dark"
                        active={settings.theme === 'dark'}
                        onPress={() => handleThemeChange('dark')}
                        icon={Moon}
                        colors={colors}
                        theme={theme}
                    />
                </View>

                <ScalePressable
                    onPress={() => {
                        triggerHaptic();
                        router.push('/settings/appearance');
                    }}
                    scaleTo={0.97}
                    style={{ width: '100%', marginBottom: 8 }}
                    innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                >
                    <Card style={styles.card} padding="none">
                        <MenuOption
                            label="Appearance"
                            icon={<PaintBrush size={24} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            rightIcon={<CaretRight size={16} color={colors.icon} />}
                            noBackground
                        />
                    </Card>
                </ScalePressable>

                {theme === 'dark' && (
                    <Card style={[styles.card, { marginBottom: 32 }]} padding="none">
                        <SettingRow
                            label={
                                <ThemedText style={styles.settingLabel}>
                                    A<ThemedText style={[styles.settingLabel, { fontVariant: ['small-caps'], fontSize: 14 }]}>moled</ThemedText> Mode
                                </ThemedText>
                            }
                            icon={<CircleHalf size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 23 }]}
                        >
                            <Toggle
                                value={settings.amoledEnabled}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('amoledEnabled', v);
                                }}
                            />
                        </SettingRow>
                    </Card>
                )}

                {hasUpdate && settings.checkForUpdatesEnabled && (
                    <ScalePressable
                        onPress={() => {
                            triggerHaptic();
                            Linking.openURL('https://github.com/voilry/Reloom/releases/latest');
                        }}
                        scaleTo={0.97}
                        style={{ width: '100%', marginBottom: 32 }}
                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                    >
                        <Card style={[styles.card, { borderColor: colors.tint + '40', borderWidth: 1.2 }]} padding="none">
                            <MenuOption
                                label={`Update Available: ${latestVersion}`}
                                description="A new version of Reloom is ready."
                                icon={null}
                                colors={colors}
                                rightIcon={<ExternalLink size={16} color={colors.tint} />}
                                noBackground
                            />
                        </Card>
                    </ScalePressable>
                )}

                <Section title="App Dynamics">
                    <Card style={[styles.card, { marginBottom: 12 }]} padding="none">
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Default People Sort"
                                icon={<ListFilter size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <View style={styles.strengthOptions}>
                                {[
                                    { label: 'Name (A-Z)', value: 'name' },
                                    { label: 'Newest First', value: 'newest' },
                                    { label: 'Oldest First', value: 'oldest' }
                                ].map((opt) => (
                                    <View key={opt.label} style={styles.strengthButtonWrapper}>
                                        <ScalePressable
                                            onPress={() => {
                                                triggerHaptic();
                                                updateSetting('defaultSort', opt.value as any);
                                            }}
                                            style={[
                                                styles.strengthButton,
                                                {
                                                    backgroundColor: settings.defaultSort === opt.value ? colors.tint + '15' : colors.surface,
                                                    borderColor: settings.defaultSort === opt.value ? colors.tint + '60' : 'transparent',
                                                    borderWidth: 1
                                                }
                                            ]}
                                        >
                                            <ThemedText type="tiny" style={{ color: settings.defaultSort === opt.value ? colors.tint : colors.secondary, fontWeight: '800' }}>
                                                {opt.label}
                                            </ThemedText>
                                        </ScalePressable>
                                    </View>
                                ))}
                            </View>
                        </View>
                    </Card>

                    <Card style={[styles.card, { marginTop: 12 }]} padding="none">
                        <SettingRow
                            label="Haptic Response"
                            icon={<Waveform size={20} color={colors.tint} />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18, paddingBottom: 20, paddingTop: 20 }]}
                        >
                            <Toggle
                                value={settings.hapticsEnabled}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('hapticsEnabled', v);
                                }}
                            />
                        </SettingRow>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <SettingRow
                            label="Notifications"
                            icon={<Bell size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18, paddingBottom: 20, paddingTop: 20 }]}
                        >
                            <Toggle
                                value={settings.enableReminders}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('enableReminders', v);
                                }}
                            />
                        </SettingRow>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <SettingRow
                            label="Journal"
                            icon={<Book size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18, paddingBottom: 20, paddingTop: 20 }]}
                        >
                            <Toggle
                                value={settings.showJournalTab}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('showJournalTab', v);
                                }}
                            />
                        </SettingRow>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <SettingRow
                            label="Calendar"
                            icon={<Calendar size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18, paddingBottom: 20, paddingTop: 20 }]}
                        >
                            <Toggle
                                value={settings.showCalendarTab}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('showCalendarTab', v);
                                }}
                            />
                        </SettingRow>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <SettingRow
                            label="Quick Glance"
                            icon={<Layout size={20} color={colors.tint} weight="duotone" />}
                            colors={colors}
                            style={[styles.paddingBox, { paddingVertical: 18, paddingBottom: 20, paddingTop: 20 }]}
                        >
                            <Toggle
                                value={settings.showQuickArray}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('showQuickArray', v);
                                }}
                            />
                        </SettingRow>
                    </Card>

                    <ScalePressable
                        onPress={() => {
                            triggerHaptic();
                            router.push('/settings/extra');
                        }}
                        scaleTo={0.97}
                        style={{ width: '100%', marginTop: 12 }}
                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                    >
                        <Card style={styles.card} padding="none">
                            <MenuOption
                                label="Extra"
                                icon={<Mosaic size={24} color={colors.tint} weight="duotone" />}
                                colors={colors}
                                rightIcon={<CaretRight size={16} color={colors.icon} />}
                                noBackground
                            />
                        </Card>
                    </ScalePressable>
                </Section>

                <Section title="Privacy & Security">
                    <ScalePressable
                        onPress={() => {
                            triggerHaptic();
                            router.push('/settings/privacy');
                        }}
                        scaleTo={0.97}
                        style={{ width: '100%', marginBottom: 32 }}
                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                    >
                        <Card style={styles.card} padding="none">
                            <MenuOption
                                label="App Lock"
                                icon={<LockKey size={24} color={colors.tint} weight="duotone" />}
                                colors={colors}
                                rightIcon={<CaretRight size={16} color={colors.icon} />}
                                noBackground
                            />
                        </Card>
                    </ScalePressable>
                </Section>

                <Section title="Data Management">
                    <Card style={styles.card} padding="none">
                        <MenuOption
                            label="Export Data"
                            icon={<Share2 size={20} color={colors.secondary} />}
                            onPress={handleExportData}
                            colors={colors}
                        />
                        <MenuOption
                            label="Import Data"
                            icon={<Download size={20} color={colors.secondary} />}
                            onPress={handleImportData}
                            colors={colors}
                        />
                        <MenuOption
                            label="Delete All Data"
                            icon={<Trash size={20} color={colors.error} />}
                            onPress={handleClearData}
                            colors={colors}
                            isDestructive
                        />
                    </Card>
                </Section>

                <Section title="About App">
                    <Card style={styles.card} padding="none">
                        <MenuOption
                            label="Privacy Policy"
                            icon={<ShieldCheck size={20} color={colors.secondary} />}
                            onPress={() => openLink('https://github.com/voilry/Reloom/blob/main/PRIVACY.md')}
                            colors={colors}
                            rightIcon={<ExternalLink size={14} color={colors.icon} />}
                        />
                        <MenuOption
                            label="GitHub Repository"
                            icon={<Github size={20} color={colors.secondary} />}
                            onPress={() => openLink('https://github.com/voilry/Reloom')}
                            colors={colors}
                            rightIcon={<ExternalLink size={14} color={colors.icon} />}
                        />
                        <View style={styles.infoRow}>
                            <Heart size={16} color={colors.error} weight="fill" />
                            <View style={{ marginLeft: 16 }}>
                                <ThemedText type="sectionHeader" style={{ fontSize: 14, marginBottom: -4 }}>Reloom v{APP_VERSION}</ThemedText>
                                <ThemedText type="tiny" style={{ color: colors.secondary, marginTop: 1 }}>Build with love by zash</ThemedText>
                            </View>
                        </View>
                    </Card>
                </Section>

                <Button
                    title="Restore Factory Settings"
                    variant="ghost"
                    onPress={() => {
                        triggerHaptic(Haptics.ImpactFeedbackStyle.Light);
                        setShowResetSettings(true);
                    }}
                    style={{ marginTop: 20, marginBottom: 20 }}
                />
            </ScrollView>

            <DeleteModal
                visible={showClearData}
                title="Wipe All Data"
                description="This will permanently delete every person, journal entry, and location you've ever created. This is irreversible."
                onCancel={() => setShowClearData(false)}
                onDelete={confirmClearData}
            />

            <DeleteModal
                visible={showResetSettings}
                title="Reset Settings"
                description="Restore UI and Dynamics to defaults?"
                onCancel={() => setShowResetSettings(false)}
                onDelete={() => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    resetSettings();
                    setShowResetSettings(false);
                }}
            />
            <DeleteModal
                visible={!!importedDataToRestore}
                title="Restore Data"
                description="This will replace all your current contacts and notes with the data from the backup file. This cannot be undone."
                onCancel={() => setImportedDataToRestore(null)}
                onDelete={confirmRestoreBackup}
                actionLabel="Restore"
                actionColor={colors.tint}
                actionTextColor="#000"
            />

            <AlertModal
                visible={alertConfig?.visible || false}
                title={alertConfig?.title || ''}
                description={alertConfig?.description || ''}
                type={alertConfig?.type}
                onClose={() => {
                    const cb = alertConfig?.onClose;
                    setAlertConfig(null);
                    if (cb) cb();
                }}
            />
        </ThemedView>
    );
}

function SegmentedSelection({ options, selectedValue, onValueChange, colors, theme }: any) {
    const selectedIndex = options.findIndex((o: any) => o.value === selectedValue);

    return (
        <View style={[styles.segmentedContainer, { backgroundColor: colors.surface, marginLeft: 32 }]}>
            {options.map((opt: any, index: number) => {
                const isSelected = index === selectedIndex;
                return (
                    <TouchableOpacity
                        key={opt.label}
                        onPress={() => onValueChange(opt.value)}
                        style={[
                            styles.segmentedOption,
                            isSelected && {
                                backgroundColor: theme === 'dark' ? colors.tint + '40' : colors.tint,
                                borderColor: 'transparent',
                                borderWidth: 0
                            }
                        ]}
                    >
                        <ThemedText style={[
                            styles.segmentedText,
                            {
                                color: isSelected
                                    ? (theme === 'dark' ? colors.tint : '#fff')
                                    : colors.secondary
                            }
                        ]}>
                            {opt.label}
                        </ThemedText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

function Section({ title, children }: { title: string, children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <ThemedText type="sectionHeader" style={styles.sectionTitle}>{title}</ThemedText>
            {children}
        </View>
    );
}

function ThemeOption({ label, selected, onPress, icon, colors }: any) {
    return (
        <TouchableOpacity style={styles.optionRow} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.optionLabelGroup}>
                {icon}
                <ThemedText style={[styles.optionLabel, { marginLeft: 12 }]}>{label}</ThemedText>
            </View>
            <View style={[styles.radio, { borderColor: selected ? colors.tint : colors.border }]}>
                {selected && <View style={[styles.radioInner, { backgroundColor: colors.tint }]} />}
            </View>
        </TouchableOpacity>
    );
}

function SettingRow({ label, description, icon, children, colors, style }: any) {
    return (
        <View style={[styles.settingRow, !description && { paddingVertical: 12 }, style]}>
            <View style={styles.settingInfo}>
                <View style={[styles.settingTitleGroup, !description && { marginBottom: 0 }]}>
                    {icon}
                    <ThemedText style={styles.settingLabel}>{label}</ThemedText>
                </View>
                {description ? (
                    <ThemedText style={[styles.settingDesc, { color: colors.secondary }]}>{description}</ThemedText>
                ) : null}
            </View>
            {children}
        </View>
    );
}

function MenuOption({ label, description, icon, onPress, colors, isDestructive, rightIcon, noBackground, borderRadius, scale = true }: any) {
    const content = (
        <View style={[styles.optionRow, !description && { paddingVertical: 12 }]}>
            <View style={styles.optionLabelGroup}>
                {icon && (
                    <View style={[
                        styles.menuIconContainer,
                        { backgroundColor: noBackground ? 'transparent' : colors.surface },
                        noBackground && { width: 32, alignItems: 'flex-start' }
                    ]}>
                        {icon}
                    </View>
                )}
                <View style={{ marginLeft: icon ? (noBackground ? 8 : 16) : 0 }}>
                    <ThemedText style={[styles.optionLabel, isDestructive && { color: colors.error }]}>{label}</ThemedText>
                    {description ? <ThemedText type="tiny" style={{ color: colors.secondary, marginTop: 2 }}>{description}</ThemedText> : null}
                </View>
            </View>
            {rightIcon}
        </View>
    );

    if (!onPress) return content;

    return (
        <ScalePressable
            onPress={onPress}
            innerStyle={{ borderRadius: borderRadius || DesignSystem.radius.sm }}
            scale={scale}
            scaleTo={0.96}
        >
            {content}
        </ScalePressable>
    );
}

function ThemeCard({ label, active, onPress, icon: Icon, colors, theme }: any) {
    const bg = active
        ? (theme === 'dark' ? 'rgba(255,255,255,0.12)' : colors.tint + '15')
        : (theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.surface);

    return (
        <ScalePressable
            onPress={onPress}
            style={[
                styles.themeCard,
                {
                    backgroundColor: bg,
                    borderColor: 'transparent',
                }
            ]}
            innerStyle={{ borderRadius: 24 }}
            scale={true}
        >
            <View style={styles.themeCardMain}>
                <Icon
                    color={active ? colors.tint : (theme === 'dark' ? 'rgba(255,255,255,0.45)' : colors.icon)}
                    weight={active ? 'fill' : 'regular'}
                    size={32}
                />
            </View>
            <ThemedText style={[styles.themeCardLabel, { color: active ? colors.text : colors.secondary, marginTop: 12 }]}>
                {label}
            </ThemedText>
        </ScalePressable>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 20 },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 18, opacity: 0.85, marginBottom: 14, marginLeft: 4 },
    card: { overflow: 'hidden' },
    paddingBox: { padding: 16 },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    optionLabelGroup: { flexDirection: 'row', alignItems: 'center' },
    optionLabel: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.semibold,
    },
    separator: { height: 1, marginHorizontal: 16, opacity: 0.2 },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
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
        fontFamily: Typography.fontFamily.medium,
        marginTop: 2
    },
    strengthOptions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, marginLeft: 32 },
    strengthButtonWrapper: { marginRight: 8, marginBottom: 8 },
    strengthButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 10,
        borderWidth: 0,
    },
    segmentedContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 4,
        marginTop: 12,
        overflow: 'hidden',
    },
    segmentedOption: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 7,
    },
    segmentedText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.semibold,
    },
    menuIconContainer: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    versionText: {
        fontFamily: Typography.fontFamily.semibold,
        fontSize: 13
    },
    themeCardsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },
    themeCard: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 24,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderRadius: 24,
    },
    themeCardMain: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    themeCardLabel: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
    },
});
