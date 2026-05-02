import React from 'react';
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft } from 'phosphor-react-native';
import { ThemedText } from './ThemedText';
import { ScalePressable } from './ScalePressable';
import { useRouter } from 'expo-router';
import { DesignSystem } from '../../constants/DesignSystem';

interface ScreenHeaderProps {
    title?: string;
    showBackButton?: boolean;
    onBack?: () => void;
    rightContent?: React.ReactNode;
    centerContent?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    borderBottom?: boolean;
    backButtonIcon?: React.ReactNode;
    backButtonStyle?: StyleProp<ViewStyle>;
    alignCenter?: boolean;
}

export function ScreenHeader({ 
    title, 
    showBackButton = true, 
    onBack, 
    rightContent, 
    centerContent, 
    style, 
    borderBottom = false,
    backButtonIcon,
    backButtonStyle,
    alignCenter = true
}: ScreenHeaderProps) {
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <View 
            style={[
                styles.header, 
                { paddingTop: insets.top + 10 },
                borderBottom && { borderBottomWidth: 1, borderBottomColor: colors.border },
                style
            ]}
        >
            <View style={styles.sideContainer}>
                {showBackButton ? (
        <ScalePressable
            onPress={handleBack}
            style={[
                styles.headerButton, 
                { backgroundColor: 'transparent' },
                backButtonStyle
            ]}
            hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }}
            scaleTo={0.88}
            overlayColor="transparent"
            springConfig={DesignSystem.animation.springs.fast}
        >
            {backButtonIcon || <CaretLeft size={24} color={colors.text} />}
        </ScalePressable>
                ) : (
                    <View style={styles.headerButtonPlaceholder} />
                )}
            </View>

            <View style={[styles.centerContainer, !alignCenter && { alignItems: 'flex-start' }]}>
                {centerContent ? centerContent : (
                    title ? <ThemedText type="display" style={[styles.headerTitle, !alignCenter && { textAlign: 'left' }]}>{title}</ThemedText> : null
                )}
            </View>

            <View style={[styles.sideContainer, { alignItems: 'flex-end' }]}>
                {rightContent ? rightContent : <View style={styles.headerButtonPlaceholder} />}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 16,
        overflow: 'visible',
    },
    sideContainer: {
        minWidth: 48,
        alignItems: 'flex-start',
        justifyContent: 'center',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerButtonPlaceholder: {
        width: 40,
        height: 40,
    },
    headerTitle: {
        letterSpacing: -1.0,
        textAlign: 'center',
    },
});
