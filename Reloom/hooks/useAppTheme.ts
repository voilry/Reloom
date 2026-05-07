import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../store/SettingsContext';
import { Colors } from '../constants/Colors';

export function useAppTheme() {
    const systemColorScheme = useColorScheme() ?? 'light';
    const { settings } = useSettings();

    return useMemo(() => {
        const themeOption = settings.theme === 'auto' ? systemColorScheme : settings.theme;
        // Fallback to safe known modes if system gives something unexpected
        const theme: 'light' | 'dark' = themeOption === 'dark' ? 'dark' : 'light';
        const preset = settings.themePreset || 'default';
        
        // Ensure preset and theme exist, otherwise fallback to default light/dark
        const presetColors = Colors.presets[preset]?.[theme];
        const colors = presetColors || Colors[theme];
        
        // Apply AMOLED override if enabled in dark mode
        const finalColors = (theme === 'dark' && settings.amoledEnabled) 
            ? {
                ...colors,
                background: '#000000',
                card: '#161514',
                surface: '#22201F',
                border: '#3D3935', // Original AMOLED border
              }
            : colors;

        return {
            theme,
            colors: {
                ...finalColors,
                tintContrast: theme === 'dark' ? '#000' : '#fff'
            },
            isDark: theme === 'dark',
            hapticsEnabled: settings.hapticsEnabled
        };
    }, [settings.theme, settings.themePreset, settings.hapticsEnabled, settings.amoledEnabled, systemColorScheme]);
}
