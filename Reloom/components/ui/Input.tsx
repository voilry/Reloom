import { TextInput, StyleSheet, TextInputProps, View, Platform } from 'react-native';
import { DesignSystem } from '../../constants/DesignSystem';
import { ThemedText } from './ThemedText';
import { useState } from 'react';
import { useAppTheme } from '../../hooks/useAppTheme';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: any;
}

export function Input({ label, error, style, containerStyle, ...rest }: InputProps) {
    const { colors, theme } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <ThemedText type="sectionHeader" style={[styles.label, { color: colors.text, opacity: 0.5 }]}>
                    {label}
                </ThemedText>
            )}
            <TextInput
                style={[
                    styles.input,
                    {
                        backgroundColor: colors.surface,
                        color: colors.text,
                        borderColor: error ? colors.error : (isFocused ? colors.tint : 'transparent'),
                        borderWidth: 2,
                        textAlignVertical: rest.multiline ? 'top' : 'center',
                        paddingTop: rest.multiline ? 16 : 0,
                        paddingBottom: rest.multiline ? 16 : 0,
                        ...(isFocused ? DesignSystem.shadows.sm : {})
                    },
                    style,
                ]}
                placeholderTextColor={theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...rest}
            />
            {error && <ThemedText type="small" style={{ color: colors.error, marginTop: 4 }}>{error}</ThemedText>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 8,
        letterSpacing: 1,
        lineHeight: 16,
    },
    input: {
        minHeight: 56,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 0,
        fontSize: 14,
        fontWeight: '600',
        textAlignVertical: 'center',
    },
});
