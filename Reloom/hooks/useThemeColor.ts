/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useAppTheme } from './useAppTheme';

export function useThemeColor(
    props: { light?: string; dark?: string },
    colorName: string
) {
    const { theme, colors } = useAppTheme();
    const colorFromProps = props[theme === 'dark' ? 'dark' : 'light'];

    if (colorFromProps) {
        return colorFromProps;
    } else {
        return (colors as any)[colorName];
    }
}
