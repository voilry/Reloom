import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsRepository } from '../db/repositories/SettingsRepository';

export type ThemeMode = 'auto' | 'light' | 'dark';

interface Settings {
    theme: ThemeMode;
    hapticsEnabled: boolean;

    showOnboarding: boolean;
    defaultSort: 'name' | 'newest' | 'oldest';
    enableReminders: boolean;
    showQuickArray: boolean;
    addTimestampToNotes: boolean;
    journalFontSize: number;
    journalPadding: number;
    profileBlurBackground: boolean;
    peopleTabMode: 'default' | 'discovery';
    peopleListStyle: 'list' | 'gallery';
    themePreset: string;
    editorFontSize: number;
    showJournalTab: boolean;
    showCalendarTab: boolean;
    profileTabsOrder: string[];
    appLockEnabled: boolean;
    biometricEnabled: boolean;
}

interface SettingsContextType {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    resetSettings: () => void;
    isLoading: boolean;
    lastSecurityEvent: number;
    triggerSecurityEvent: () => void;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'auto',
    hapticsEnabled: true,

    showOnboarding: true,
    defaultSort: 'name',
    enableReminders: true,
    showQuickArray: true,
    addTimestampToNotes: false,
    journalFontSize: 16,
    journalPadding: 28,
    profileBlurBackground: false,
    peopleTabMode: 'default',
    peopleListStyle: 'list',
    themePreset: 'default',
    editorFontSize: 15,
    showJournalTab: true,
    showCalendarTab: true,
    profileTabsOrder: ['info', 'notes', 'journals', 'contacts'],
    appLockEnabled: false,
    biometricEnabled: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSecurityEvent, setLastSecurityEvent] = useState(0);

    const triggerSecurityEvent = () => {
        setLastSecurityEvent(Date.now());
    };

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const stored = await SettingsRepository.getAll();
            const merged = { ...DEFAULT_SETTINGS };

            if (stored.theme) merged.theme = stored.theme as ThemeMode;
            if (stored.hapticsEnabled) merged.hapticsEnabled = stored.hapticsEnabled === 'true';

            if (stored.showOnboarding) merged.showOnboarding = stored.showOnboarding === 'true';
            if (stored.defaultSort) merged.defaultSort = stored.defaultSort as any;
            if (stored.enableReminders) merged.enableReminders = stored.enableReminders === 'true';
            if (stored.showQuickArray !== undefined) merged.showQuickArray = stored.showQuickArray === 'true';
            if (stored.addTimestampToNotes !== undefined) merged.addTimestampToNotes = stored.addTimestampToNotes === 'true';
            if (stored.journalFontSize !== undefined) merged.journalFontSize = parseInt(stored.journalFontSize);
            if (stored.journalPadding !== undefined) merged.journalPadding = parseInt(stored.journalPadding);
            if (stored.profileBlurBackground !== undefined) merged.profileBlurBackground = stored.profileBlurBackground === 'true';
            if (stored.peopleTabMode) merged.peopleTabMode = stored.peopleTabMode as 'default' | 'discovery';
            if (stored.peopleListStyle) merged.peopleListStyle = stored.peopleListStyle as 'list' | 'gallery';
            if (stored.themePreset) merged.themePreset = stored.themePreset;
            if (stored.editorFontSize !== undefined) merged.editorFontSize = parseInt(stored.editorFontSize);
            if (stored.showJournalTab !== undefined) merged.showJournalTab = stored.showJournalTab === 'true';
            if (stored.profileTabsOrder) {
                const storedOrder = stored.profileTabsOrder.split(',');
                // Ensure all default tabs are always present (e.g. if a new tab is added in a future update)
                const missingTabs = DEFAULT_SETTINGS.profileTabsOrder.filter(t => !storedOrder.includes(t));
                merged.profileTabsOrder = [...storedOrder, ...missingTabs];
            }
            if (stored.appLockEnabled !== undefined) merged.appLockEnabled = stored.appLockEnabled === 'true';
            if (stored.biometricEnabled !== undefined) merged.biometricEnabled = stored.biometricEnabled === 'true';
            if (stored.showCalendarTab !== undefined) merged.showCalendarTab = stored.showCalendarTab === 'true';

            setSettings(merged);
        } catch (e) {
            console.error('Failed to load settings', e);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            SettingsRepository.set(key, value.toString());
            return next;
        });
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        Object.entries(DEFAULT_SETTINGS).forEach(([key, value]) => {
            SettingsRepository.set(key, value.toString());
        });
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, isLoading, lastSecurityEvent, triggerSecurityEvent }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
