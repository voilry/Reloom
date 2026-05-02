import { View, type ViewProps } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
    lightColor?: string;
    darkColor?: string;
    variant?: 'default' | 'surface' | 'card';
};

export function ThemedView({ style, lightColor, darkColor, variant = 'default', ...otherProps }: ThemedViewProps) {
    const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, variant === 'default' ? 'background' : variant);

    return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
