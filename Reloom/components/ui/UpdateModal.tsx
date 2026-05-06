import React from 'react';
import { View, StyleSheet, Modal, Pressable, Linking } from 'react-native';
import { ThemedText } from './ThemedText';
import { Button } from './Button';
import { useAppTheme } from '../../hooks/useAppTheme';
import { DesignSystem } from '../../constants/DesignSystem';
import { CloudArrowUp, X } from 'phosphor-react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

interface UpdateModalProps {
    visible: boolean;
    version: string | null;
    onClose: () => void;
}

export function UpdateModal({ visible, version, onClose }: UpdateModalProps) {
    const { colors, theme } = useAppTheme();

    if (!visible) return null;

    const handleGoToGithub = () => {
        Linking.openURL('https://github.com/voilry/Reloom/releases/latest');
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
            <View style={styles.overlay}>
                <Animated.View
                    entering={FadeIn.duration(200)}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.73)' }]}
                />

                <Animated.View
                    entering={ZoomIn.duration(300).springify()}
                    style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0 }]}
                >
                    <View style={styles.iconContainer}>
                        <CloudArrowUp size={50} color={colors.tint} weight="duotone" />
                    </View>

                    <ThemedText type="sectionHeader" style={styles.title}>Update Available</ThemedText>
                    <ThemedText style={[styles.description, { color: colors.secondary, fontSize: 14, marginTop: -6 }]}>
                        A new version {version ? `(${version})` : ''} of Reloom is available on GitHub.
                    </ThemedText>

                    <View style={styles.actions}>
                        <Button
                            title="Go to GitHub"
                            onPress={handleGoToGithub}
                            style={{ flex: 1, marginRight: 8, paddingVertical: 8 }}
                        />
                        <Button
                            title="Later"
                            variant="secondary"
                            onPress={onClose}
                            style={{ flex: 1, marginLeft: 8, paddingVertical: 8 }}
                        />
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 340,
        borderRadius: 32,
        padding: 24,
        alignItems: 'center',
        ...DesignSystem.shadows.xl,
    },
    iconContainer: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        textAlign: 'center',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    actions: {
        flexDirection: 'row',
        width: '100%',
    }
});
