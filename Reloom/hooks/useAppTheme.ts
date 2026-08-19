import { useMemo } from 'react';
import { useSettings } from '../store/SettingsContext';
import { Colors } from '../constants/Colors';
import { useActiveColorScheme } from './useActiveColorScheme';
import { getMaterialYouThemeColors } from '../utils/materialYou';

export function useAppTheme() {
    const systemColorScheme = useActiveColorScheme();
    const { settings } = useSettings();

    return useMemo(() => {
        const themeOption = settings.theme === 'auto' ? systemColorScheme : settings.theme;
        // Fallback to safe known modes if system gives something unexpected
        const theme: 'light' | 'dark' = themeOption === 'dark' ? 'dark' : 'light';
        const preset = settings.themePreset || 'default';
        
        let colors: typeof Colors.light;
        if (settings.materialYouEnabled) {
            // Material You dynamic Android Monet theme
            colors = getMaterialYouThemeColors(theme, settings.amoledEnabled);
        } else {
            // Ensure preset and theme exist, otherwise fallback to default light/dark
            const presetColors = Colors.presets[preset]?.[theme];
            colors = presetColors || Colors[theme];
        }
        
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
    }, [settings.theme, settings.themePreset, settings.materialYouEnabled, settings.hapticsEnabled, settings.amoledEnabled, systemColorScheme]);
}

