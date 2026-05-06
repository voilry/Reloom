import React, { createContext, useContext, useState, useEffect } from 'react';
import { SettingsRepository } from '../db/repositories/SettingsRepository';
import { APP_VERSION, GITHUB_REPO } from '../constants/Version';
import { Platform } from 'react-native';

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
    hasUpdate: boolean;
    latestVersion: string;
}

interface SettingsContextType {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    resetSettings: () => void;
    isLoading: boolean;
    lastSecurityEvent: number;
    triggerSecurityEvent: () => void;
    refreshKey: number;
    refreshApp: () => void;
    hasUpdate: boolean;
    latestVersion: string | null;
    checkForUpdates: () => Promise<void>;
}

const DEFAULT_SETTINGS: Settings = {
    theme: 'auto',
    hapticsEnabled: true,

    showOnboarding: true,
    defaultSort: 'name',
    enableReminders: true,
    showQuickArray: false,
    addTimestampToNotes: false,
    journalFontSize: 16,
    journalPadding: 28,
    profileBlurBackground: false,
    peopleTabMode: 'default',
    peopleListStyle: 'list',
    themePreset: 'default',
    editorFontSize: 16,
    showJournalTab: true,
    showCalendarTab: true,
    profileTabsOrder: ['info', 'notes', 'journals', 'contacts'],
    appLockEnabled: false,
    biometricEnabled: false,
    hasUpdate: false,
    latestVersion: '',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [isLoading, setIsLoading] = useState(true);
    const [lastSecurityEvent, setLastSecurityEvent] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [hasUpdate, setHasUpdate] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    const triggerSecurityEvent = () => {
        setLastSecurityEvent(Date.now());
    };

    const refreshApp = () => {
        setRefreshKey(prev => prev + 1);
    };

    const isVersionGreater = (latest: string, current: string) => {
        const parse = (v: string) => v.replace(/[^0-9.]/g, '').split('.').map(Number);
        const v1 = parse(latest);
        const v2 = parse(current);
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
            const num1 = v1[i] || 0;
            const num2 = v2[i] || 0;
            if (num1 > num2) return true;
            if (num1 < num2) return false;
        }
        return false;
    };

    const checkForUpdates = async (force = false) => {
        if (Platform.OS === 'web') return;
        
        // Don't check more than once a day unless forced
        const now = Date.now();
        const lastCheck = await SettingsRepository.get('lastUpdateCheck');
        if (!force && lastCheck && now - parseInt(lastCheck) < 1000 * 60 * 60 * 24) {
            console.log('Update check skipped (checked recently)');
            return;
        }

        try {
            const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
                headers: { 'Accept': 'application/vnd.github.v3+json' }
            });
            
            SettingsRepository.set('lastUpdateCheck', now.toString());

            if (!response.ok) return;
            
            const data = await response.json();
            const latest = data.tag_name;
            const current = APP_VERSION;

            if (latest && isVersionGreater(latest, current)) {
                updateSetting('latestVersion', latest);
                updateSetting('hasUpdate', true);
            } else {
                updateSetting('hasUpdate', false);
            }
        } catch (e) {
            console.log('Update check failed (likely offline)');
        }
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
            if (stored.hasUpdate !== undefined) merged.hasUpdate = stored.hasUpdate === 'true';
            if (stored.latestVersion) merged.latestVersion = stored.latestVersion;

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
        <SettingsContext.Provider value={{ 
            settings, 
            updateSetting, 
            resetSettings, 
            isLoading, 
            lastSecurityEvent, 
            triggerSecurityEvent,
            refreshKey,
            refreshApp,
            hasUpdate: settings.hasUpdate,
            latestVersion: settings.latestVersion,
            checkForUpdates
        }}>
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
