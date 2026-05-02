import React, { useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Animated as RNAnimated, Alert } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { ScalePressable } from '../ui/ScalePressable';
import { ThemedText } from '../ui/ThemedText';
import { AlertModal } from '../ui/AlertModal';
import { Card } from '../ui/Card';
import { Swipeable } from 'react-native-gesture-handler';
import { Plus, Trash, PencilSimple, Phone, EnvelopeSimple, InstagramLogo, FacebookLogo, TiktokLogo, WhatsappLogo, LinkedinLogo, Globe } from 'phosphor-react-native';
import { Button } from '../ui/Button';

export function ContactsTab({ contacts, onAdd, onDelete, onEdit, theme, isAcrylic, colors }: any) {
    const [showLinkError, setShowLinkError] = React.useState(false);
    const renderRightActions = useCallback((id: number, dragX: RNAnimated.AnimatedInterpolation<number>) => {
        const trans = dragX.interpolate({
            inputRange: [-150, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={{ flexDirection: 'row', width: 140 }}>
                <ScalePressable
                    style={{
                        backgroundColor: colors.border,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1,
                        borderRadius: 16,
                        marginBottom: 12,
                        marginLeft: 12,
                    }}
                    innerStyle={{ borderRadius: 16 }}
                    scale={true}
                    overlayColor="rgba(0,0,0,0.15)"
                    onPress={() => onEdit && onEdit(id)}
                >
                    <RNAnimated.View style={{ transform: [{ scale: trans }] }}>
                        <PencilSimple size={22} color={colors.text} weight="fill" />
                    </RNAnimated.View>
                </ScalePressable>
                <ScalePressable
                    style={{
                        backgroundColor: colors.error,
                        justifyContent: 'center',
                        alignItems: 'center',
                        flex: 1,
                        borderRadius: 16,
                        marginBottom: 12,
                        marginLeft: 12,
                    }}
                    innerStyle={{ borderRadius: 16 }}
                    scale={true}
                    overlayColor="rgba(0,0,0,0.15)"
                    onPress={() => onDelete(id)}
                >
                    <RNAnimated.View style={{ transform: [{ scale: trans }] }}>
                        <Trash size={22} color="#FFF" weight="fill" />
                    </RNAnimated.View>
                </ScalePressable>
            </View>
        );
    }, [colors, onDelete, onEdit]);

    if (!contacts || contacts.length === 0) {
        return (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                    <Phone size={32} color={colors.icon} />
                </View>
                <ThemedText type="sectionHeader" style={{ marginTop: 1, opacity: 0.8 }}>No Contacts Yet</ThemedText>
                <ThemedText style={{ color: colors.secondary, marginTop: 2, fontSize: 12, textAlign: 'center' }}>
                    Add phone numbers, social media, and more.
                </ThemedText>
                <Button
                    title="Add Contact"
                    onPress={onAdd}
                    style={{ marginTop: 17 }}
                />
            </Animated.View>
        );
    }

    const handlePress = (platform: string, value: string) => {
        let url = '';
        const cleanValue = value.replace('@', '').trim();
        switch (platform.toLowerCase()) {
            case 'phone': url = `tel:${cleanValue}`; break;
            case 'email': url = `mailto:${cleanValue}`; break;
            case 'whatsapp':
                const waPhone = cleanValue.replace(/[^\d+]/g, '');
                url = `https://wa.me/${waPhone.startsWith('+') ? waPhone.substring(1) : waPhone}`;
                break;
            case 'instagram': url = `https://instagram.com/${cleanValue}`; break;
            case 'facebook': url = `https://facebook.com/${cleanValue}`; break;
            case 'tiktok': url = `https://tiktok.com/@${cleanValue}`; break;
            case 'linkedin': url = value.startsWith('http') ? value : `https://linkedin.com/in/${cleanValue}`; break;
            default: url = value.startsWith('http') ? value : `https://${value}`; break;
        }

        Linking.openURL(url).catch(err => {
            setShowLinkError(true);
        });
    };

    const getPlatformIcon = (platform: string) => {
        const size = 20;
        const color = colors.tint;
        switch (platform.toLowerCase()) {
            case 'phone': return <Phone size={size} color={color} weight="fill" />;
            case 'email': return <EnvelopeSimple size={size} color={color} weight="fill" />;
            case 'instagram': return <InstagramLogo size={size} color={color} weight="fill" />;
            case 'facebook': return <FacebookLogo size={size} color={color} weight="fill" />;
            case 'tiktok': return <TiktokLogo size={size} color={color} weight="fill" />;
            case 'whatsapp': return <WhatsappLogo size={size} color={color} weight="fill" />;
            case 'linkedin': return <LinkedinLogo size={size} color={color} weight="fill" />;
            default: return <Globe size={size} color={color} weight="fill" />;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ThemedText type="sectionHeader" style={{ marginTop: -1, opacity: 0.9 }}>Contact Info</ThemedText>
                <ScalePressable 
                    onPress={onAdd} 
                    style={{ padding: 4 }}
                    innerStyle={{ borderRadius: 12 }}
                >
                    <Plus size={20} color={colors.tint} weight="bold" />
                </ScalePressable>
            </View>

            {contacts.map((contact: any, index: number) => (
                <Animated.View
                    key={contact.id}
                    entering={FadeInDown.delay(index * 60).duration(400)}
                    layout={Layout.springify()}
                >
                    <Swipeable
                        renderRightActions={(_prog, dragX) => renderRightActions(contact.id, dragX)}
                        overshootRight={false}
                        friction={3}
                        overshootFriction={8}
                        rightThreshold={60}
                    >
                        <ScalePressable 
                            onPress={() => handlePress(contact.platform, contact.value)}
                            style={{ marginBottom: 12 }}
                            innerStyle={{ borderRadius: 16 }}
                        >
                            <Card style={[
                                styles.contactCard,
                                {
                                    backgroundColor: isAcrylic ? (theme === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.7)') : colors.card,
                                    borderColor: colors.border,
                                    borderWidth: theme === 'light' ? 1 : 0
                                }
                            ]}>
                                <View style={[styles.iconContainer, { backgroundColor: colors.surface }]}>
                                    {getPlatformIcon(contact.platform)}
                                </View>
                                <View style={styles.contactInfo}>
                                    <ThemedText style={styles.platformName}>{contact.platform}</ThemedText>
                                    <ThemedText style={[styles.contactValue, { color: colors.tint, textDecorationLine: 'underline', opacity: 0.8 }]}>{contact.value}</ThemedText>
                                </View>
                            </Card>
                        </ScalePressable>
                    </Swipeable>
                </Animated.View>
            ))}

            <AlertModal
                visible={showLinkError}
                title="Cannot open link"
                description="You might not have the app installed, or the link is invalid."
                type="error"
                onClose={() => setShowLinkError(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        opacity: 0.8,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contactInfo: {
        flex: 1,
    },
    platformName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: -1,
    },
    contactValue: {
        fontSize: 14,
    }
});
