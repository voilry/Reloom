import { Platform } from 'react-native';
import MaterialYou, { MaterialYouPalette } from 'react-native-material-you-colors';
import { baseLightColors, baseDarkColors } from '../constants/Colors';

export type ReloomThemeColors = typeof baseLightColors;

/**
 * Checks if native Material You dynamic theming is supported on the current device.
 */
export function isMaterialYouSupported(): boolean {
    if (Platform.OS !== 'android') return false;
    return Boolean(MaterialYou?.isSupported);
}

/**
 * Retrieves the Material You palette (or generates from seed color as fallback)
 */
export function getMaterialYouPaletteSafe(): MaterialYouPalette {
    try {
        // Use Reloom's signature amber tint as seed fallback
        return MaterialYou.getMaterialYouPalette(baseLightColors.tint, 'TONAL_SPOT');
    } catch {
        // In case of unlinked native module or unsupported environment, generate safely
        try {
            return MaterialYou.generatePaletteFromColor(baseLightColors.tint, 'TONAL_SPOT');
        } catch {
            return {
                system_accent1: Array(13).fill(baseLightColors.tint) as any,
                system_accent2: Array(13).fill(baseLightColors.tint) as any,
                system_accent3: Array(13).fill(baseLightColors.tint) as any,
                system_neutral1: Array(13).fill('#F8F3EB') as any,
                system_neutral2: Array(13).fill('#EEE8DE') as any,
            };
        }
    }
}

/**
 * Maps the Android Monet / Material You tonal shades into Reloom's design system tokens.
 *
 * Material You 13-shade tone indexing (lightness descending):
 * 0: 100% (White)
 * 1: 99%
 * 2: 95%
 * 3: 90%
 * 4: 80%
 * 5: 70%
 * 6: 60%
 * 7: 50%
 * 8: 40%
 * 9: 30%
 * 10: 20%
 * 11: 10%
 * 12: 0% (Black)
 */
export function getMaterialYouThemeColors(
    theme: 'light' | 'dark',
    amoledEnabled: boolean = false
): ReloomThemeColors {
    const palette = getMaterialYouPaletteSafe();

    if (theme === 'light') {
        const bg = palette.system_neutral1?.[1] || palette.system_neutral1?.[2] || baseLightColors.background;
        const surface = palette.system_neutral2?.[2] || palette.system_neutral1?.[2] || baseLightColors.surface;
        const card = palette.system_neutral1?.[3] || palette.system_neutral2?.[3] || baseLightColors.card;
        const border = palette.system_neutral2?.[4] || palette.system_neutral1?.[4] || baseLightColors.border;
        const tint = palette.system_accent1?.[8] || palette.system_accent1?.[7] || baseLightColors.tint;
        const text = palette.system_neutral1?.[11] || baseLightColors.text;
        const textSecondary = palette.system_neutral2?.[9] || palette.system_neutral1?.[9] || baseLightColors.textSecondary;
        const textTertiary = palette.system_neutral2?.[7] || baseLightColors.textTertiary;
        const icon = palette.system_neutral1?.[9] || baseLightColors.icon;

        return {
            text,
            textSecondary,
            textTertiary,
            background: bg,
            tint,
            icon,
            tabIconDefault: textTertiary,
            tabIconSelected: tint,
            border,
            card,
            surface,
            primary: text,
            secondary: textSecondary,
            error: baseLightColors.error,
            warning: baseLightColors.warning,
            success: baseLightColors.success,
            info: baseLightColors.info,
        };
    } else {
        const bg = amoledEnabled
            ? '#000000'
            : (palette.system_neutral1?.[11] || baseDarkColors.background);
        const card = amoledEnabled
            ? '#161514'
            : (palette.system_neutral1?.[10] || baseDarkColors.card);
        const surface = amoledEnabled
            ? '#22201F'
            : (palette.system_neutral2?.[10] || baseDarkColors.surface);
        const border = amoledEnabled
            ? '#3D3935'
            : (palette.system_neutral2?.[9] || baseDarkColors.border);
        const tint = palette.system_accent1?.[4] || palette.system_accent1?.[3] || baseDarkColors.tint;
        const text = palette.system_neutral1?.[1] || baseDarkColors.text;
        const textSecondary = palette.system_neutral2?.[4] || baseDarkColors.textSecondary;
        const textTertiary = palette.system_neutral2?.[6] || baseDarkColors.textTertiary;
        const icon = palette.system_neutral1?.[2] || baseDarkColors.icon;

        return {
            text,
            textSecondary,
            textTertiary,
            background: bg,
            tint,
            icon,
            tabIconDefault: palette.system_neutral2?.[5] || baseDarkColors.tabIconDefault,
            tabIconSelected: tint,
            border,
            card,
            surface,
            primary: text,
            secondary: textSecondary,
            error: baseDarkColors.error,
            warning: baseDarkColors.warning,
            success: baseDarkColors.success,
            info: baseDarkColors.info,
        };
    }
}
