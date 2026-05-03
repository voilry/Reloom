import React from 'react';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ThemedView } from '../../components/ui/ThemedView';
import { ThemedText } from '../../components/ui/ThemedText';
import { useSettings, ThemeMode } from '../../store/SettingsContext';
import { Colors } from '../../constants/Colors';
import { DesignSystem } from '../../constants/DesignSystem';
import { Sun, Moon, Compass, Cards, TextT, MagicWand, SelectionBackground, PaintBrush, Clock, ArrowUp, ArrowDown, List, ArrowsDownUp } from 'phosphor-react-native';
import { Card } from '../../components/ui/Card';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import * as Haptics from 'expo-haptics';
import { Toggle } from '../../components/ui/Toggle';
import { Typography } from '../../constants/Typography';

export default function AppearanceSettingsScreen() {
    const { settings, updateSetting } = useSettings();
    const { colors, theme, hapticsEnabled } = useAppTheme();
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
                title="Appearance"
                onBack={() => router.back()}
            />

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}>

                <Section>
                    <Card style={styles.card} padding="none">
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Color Preset"
                                description="Choose your preferred app aesthetic"
                                icon={<PaintBrush size={20} color={colors.tint} />}
                                colors={colors}
                            />

                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={{ marginTop: 16, marginLeft: -4 }}
                                contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 4 }}
                            >
                                {Object.entries(Colors.presets).map(([key, config]) => {
                                    const isSelected = (settings.themePreset || 'default') === key;
                                    const presetColors = theme === 'dark' ? config.dark : config.light;

                                    return (
                                        <TouchableOpacity
                                            key={key}
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                triggerHaptic();
                                                updateSetting('themePreset', key);
                                            }}
                                            style={[
                                                styles.presetCard,
                                                {
                                                    backgroundColor: colors.surface,
                                                    borderColor: isSelected ? colors.tint : 'transparent',
                                                    borderWidth: 2
                                                }
                                            ]}
                                        >
                                            <View style={[styles.presetSwatch, { backgroundColor: presetColors.tint }]}>
                                                {isSelected && (
                                                    <View style={[styles.checkedCircle, { backgroundColor: '#fff' }]}>
                                                        <View style={[styles.checkedInner, { backgroundColor: colors.tint }]} />
                                                    </View>
                                                )}
                                            </View>
                                            <ThemedText style={[
                                                styles.presetLabel,
                                                { color: isSelected ? colors.text : colors.secondary }
                                            ]}>
                                                {key.charAt(0).toUpperCase() + key.slice(1)}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </Card>
                </Section>

                <Section>
                    <Card style={styles.card} padding="none">
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Main View"
                                description="Switch between classic list and discovery dashboard"
                                icon={<Compass size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <SegmentedSelection
                                options={[
                                    { label: 'Classic List', value: 'default' },
                                    { label: 'Dashboard', value: 'discovery' }
                                ]}
                                selectedValue={settings.peopleTabMode}
                                onValueChange={(v: 'default' | 'discovery') => {
                                    triggerHaptic();
                                    updateSetting('peopleTabMode', v);
                                }}
                                colors={colors}
                                theme={theme}
                            />
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Card Orientation"
                                description="Standard rows or gallery grid cards"
                                icon={<Cards size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <SegmentedSelection
                                options={[
                                    { label: 'List View', value: 'list' },
                                    { label: 'Gallery Grid', value: 'gallery' }
                                ]}
                                selectedValue={settings.peopleListStyle}
                                onValueChange={(v: 'list' | 'gallery') => {
                                    triggerHaptic();
                                    updateSetting('peopleListStyle', v);
                                }}
                                colors={colors}
                                theme={theme}
                            />
                        </View>
                    </Card>
                </Section>

                <Section>
                    <Card style={styles.card} padding="none">
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Editor Font size"
                                description="Scale text for notes and biographies"
                                icon={<TextT size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <SegmentedSelection
                                options={[
                                    { label: 'Small', value: 14 },
                                    { label: 'Regular', value: 16 },
                                    { label: 'Large', value: 18 }
                                ]}
                                selectedValue={settings.editorFontSize || 16}
                                onValueChange={(v: number) => {
                                    triggerHaptic();
                                    updateSetting('editorFontSize', v);
                                }}
                                colors={colors}
                                theme={theme}
                            />
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Journal Font size"
                                description="Scale text for your reading comfort"
                                icon={<TextT size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <SegmentedSelection
                                options={[
                                    { label: 'Small', value: 14 },
                                    { label: 'Regular', value: 16 },
                                    { label: 'Large', value: 18 }
                                ]}
                                selectedValue={settings.journalFontSize || 16}
                                onValueChange={(v: number) => {
                                    triggerHaptic();
                                    updateSetting('journalFontSize', v);
                                }}
                                colors={colors}
                                theme={theme}
                            />
                        </View>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <View style={styles.paddingBox}>
                            <SettingRow
                                label="Content Padding"
                                description="Adjust horizontal margins in journal views"
                                icon={<SelectionBackground size={20} color={colors.tint} />}
                                colors={colors}
                            />
                            <SegmentedSelection
                                options={[
                                    { label: 'Tight', value: 16 },
                                    { label: 'Normal', value: 28 },
                                    { label: 'Wide', value: 40 }
                                ]}
                                selectedValue={settings.journalPadding || 28}
                                onValueChange={(v: number) => {
                                    triggerHaptic();
                                    updateSetting('journalPadding', v);
                                }}
                                colors={colors}
                                theme={theme}
                            />
                        </View>
                    </Card>
                </Section>

                <Section>
                    <Card style={styles.card} padding="none">
                        <SettingRow
                            label="Add Timestamp to Notes"
                            description="Automatically append current date and time to merged notes"
                            icon={<Clock size={20} color={colors.tint} style={{ marginBottom: -2 }} />}
                            colors={colors}
                            style={styles.paddingBox}
                        >
                            <Toggle
                                value={settings.addTimestampToNotes}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('addTimestampToNotes', v);
                                }}
                            />
                        </SettingRow>
                        <View style={[styles.separator, { backgroundColor: colors.border }]} />
                        <SettingRow
                            label="Acrylic Profiles"
                            description="Enable blurred avatar backgrounds in headers"
                            icon={<MagicWand size={20} color={colors.tint} />}
                            colors={colors}
                            style={styles.paddingBox}
                        >
                            <Toggle
                                value={settings.profileBlurBackground}
                                onValueChange={(v) => {
                                    triggerHaptic();
                                    updateSetting('profileBlurBackground', v);
                                }}
                            />
                        </SettingRow>
                    </Card>
                </Section>

                <Section title="Profile Navigation Order">
                    <ThemedText style={[styles.settingDesc, { marginLeft: 4, marginBottom: 8, marginTop: -11, opacity: 0.7 }]}>
                        Adjust the sequence of information tabs in people profile views.
                    </ThemedText>
                    <Card style={styles.card} padding="none">
                        {settings.profileTabsOrder
                            .filter(tab => tab !== 'journals' || settings.showJournalTab)
                            .map((tab, index, filteredArray) => {
                                const moveTab = (direction: 'up' | 'down') => {
                                    const newOrder = [...settings.profileTabsOrder];
                                    const actualIndex = settings.profileTabsOrder.indexOf(tab);

                                    const targetTab = direction === 'up' ? filteredArray[index - 1] : filteredArray[index + 1];
                                    if (!targetTab) return;

                                    triggerHaptic();

                                    // Extract the tab
                                    newOrder.splice(actualIndex, 1);

                                    // Find new position of the target
                                    const newTargetIndex = newOrder.indexOf(targetTab);
                                    const insertIndex = direction === 'up' ? newTargetIndex : newTargetIndex + 1;

                                    // Insert
                                    newOrder.splice(insertIndex, 0, tab);
                                    updateSetting('profileTabsOrder', newOrder);
                                };

                                const getLabel = (t: string) => {
                                    if (t === 'journals') return 'Journal Memories';
                                    return t.charAt(0).toUpperCase() + t.slice(1);
                                };

                                return (
                                    <View key={tab}>
                                        <View style={[styles.paddingBox, styles.sortRow]}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <List size={18} color={colors.icon} style={{ opacity: 0.4 }} />
                                                <ThemedText style={{ marginLeft: 12, fontWeight: '600', fontSize: 15 }}>{getLabel(tab)}</ThemedText>
                                            </View>
                                            <View style={{ flexDirection: 'row' }}>
                                                <TouchableOpacity
                                                    onPress={() => moveTab('up')}
                                                    disabled={index === 0}
                                                    style={[styles.sortAction, index === 0 && { opacity: 0.2 }]}
                                                >
                                                    <ArrowUp size={18} color={colors.text} />
                                                </TouchableOpacity>
                                                <View style={{ width: 8 }} />
                                                <TouchableOpacity
                                                    onPress={() => moveTab('down')}
                                                    disabled={index === filteredArray.length - 1}
                                                    style={[styles.sortAction, index === filteredArray.length - 1 && { opacity: 0.2 }]}
                                                >
                                                    <ArrowDown size={18} color={colors.text} />
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                        {index < filteredArray.length - 1 && (
                                            <View style={[styles.separator, { backgroundColor: colors.border }]} />
                                        )}
                                    </View>
                                );
                            })}
                    </Card>
                </Section>

            </ScrollView>
        </ThemedView>
    );
}

function Section({ title, children }: { title?: string, children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            {title && <ThemedText type="sectionHeader" style={styles.sectionTitle}>{title}</ThemedText>}
            {children}
        </View>
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
                <ThemedText style={[styles.settingDesc, { color: colors.secondary }]}>{description}</ThemedText>
            </View>
            {children}
        </View>
    );
}

function SegmentedSelection({ options, selectedValue, onValueChange, colors, theme }: any) {
    const selectedIndex = options.findIndex((o: any) => o.value === selectedValue);
    
    const pillStyle = useAnimatedStyle(() => {
        const widthPercent = 100 / options.length;
        return {
            width: `${widthPercent}%`,
            left: withSpring(`${selectedIndex * widthPercent}%`, { damping: 50, stiffness: 800, mass: 0.5 }),
        };
    });

    return (
        <View style={[styles.segmentedContainer, { backgroundColor: colors.surface, marginLeft: 32 }]}>
            {/* Sliding Background Pill */}
            <Animated.View 
                style={[
                    pillStyle,
                    {
                        position: 'absolute',
                        top: 4,
                        bottom: 4,
                        backgroundColor: theme === 'dark' ? colors.tint + '40' : colors.tint,
                        borderRadius: 7,
                    }
                ]} 
            />

            {options.map((opt: any, index: number) => {
                const isSelected = index === selectedIndex;
                return (
                    <TouchableOpacity
                        key={opt.label}
                        activeOpacity={0.8}
                        onPress={() => onValueChange(opt.value)}
                        style={styles.segmentedOption}
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
        fontFamily: Typography.fontFamily.semibold
    },
    separator: { height: 1, marginHorizontal: 16, opacity: 0.2 },
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
        fontFamily: Typography.fontFamily.bold,
    },
    presetCard: {
        width: 100,
        padding: 12,
        borderRadius: 20,
        marginHorizontal: 6,
        alignItems: 'center',
    },
    presetSwatch: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginBottom: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    presetLabel: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.bold,
    },
    sortRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
    },
    sortAction: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
