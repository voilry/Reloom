import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Linking, Animated as RNAnimated, Modal, Pressable, Clipboard, Platform } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, Layout, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import { ScalePressable } from '../ui/ScalePressable';
import { ThemedText } from '../ui/ThemedText';
import { AlertModal } from '../ui/AlertModal';
import {
    Plus,
    Trash,
    PencilSimple,
    Phone,
    EnvelopeSimple,
    InstagramLogo,
    FacebookLogo,
    TiktokLogo,
    WhatsappLogo,
    LinkedinLogo,
    Globe,
    GithubLogo,
    ChatCenteredText,
    ArrowSquareOut,
    Icon,
} from '@/components/ui/Icon';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';

interface ContactMethod {
    id: number;
    platform: string;
    value: string;
}

interface ContactsTabProps {
    contacts: ContactMethod[];
    onAdd: () => void;
    onDelete: (id: number) => void;
    onEdit: (id: number) => void;
    theme: 'light' | 'dark';
    isAcrylic?: boolean;
    colors: any;
}

const HERO_HEIGHT = 78;
const ROW_HEIGHT = 52;

const PLATFORM_LABELS: Record<string, string> = {
    phone: 'Phone',
    sms: 'Message',
    email: 'Email',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    x: 'X',
    twitter: 'X',
    telegram: 'Telegram',
    github: 'GitHub',
    website: 'Website',
};

const ACTION_LABELS: Record<string, string> = {
    phone: 'Call',
    sms: 'Message',
    email: 'Email',
    whatsapp: 'WhatsApp',
    website: 'Visit website',
};

const SOCIAL_PLATFORMS = new Set([
    'instagram',
    'facebook',
    'tiktok',
    'linkedin',
    'x',
    'twitter',
    'telegram',
    'github',
]);

const PLATFORM_DOMAINS: Record<string, RegExp> = {
    instagram: /^(?:[a-z0-9-]+\.)*instagram\.com$/i,
    facebook: /^(?:[a-z0-9-]+\.)*(?:facebook|fb)\.com$/i,
    tiktok: /^(?:[a-z0-9-]+\.)*tiktok\.com$/i,
    linkedin: /^(?:[a-z0-9-]+\.)*linkedin\.com$/i,
    x: /^(?:[a-z0-9-]+\.)*(?:x|twitter)\.com$/i,
    twitter: /^(?:[a-z0-9-]+\.)*(?:x|twitter)\.com$/i,
    telegram: /^(?:www\.)?(?:t\.me|telegram\.me)$/i,
    github: /^(?:[a-z0-9-]+\.)*github\.com$/i,
};

function getPlatformRank(platform: string) {
    switch (platform.toLowerCase()) {
        case 'phone':
            return 0;
        case 'email':
            return 1;
        case 'whatsapp':
            return 2;
        case 'sms':
            return 3;
        case 'instagram':
        case 'facebook':
        case 'tiktok':
        case 'linkedin':
        case 'x':
        case 'twitter':
        case 'telegram':
        case 'github':
            return 4;
        case 'website':
            return 5;
        default:
            return 6;
    }
}

function formatPlatform(platform: string) {
    const cleaned = platform.trim();
    if (!cleaned) return 'Contact';
    return PLATFORM_LABELS[cleaned.toLowerCase()] ?? cleaned.replace(/\b\w/g, char => char.toUpperCase());
}

function getActionLabel(platform: string) {
    const lower = platform.toLowerCase();
    if (SOCIAL_PLATFORMS.has(lower)) {
        return `Open ${formatPlatform(platform)}`;
    }
    return ACTION_LABELS[lower] ?? formatPlatform(platform);
}

function getEllipsizeMode(platform: string): 'middle' | 'tail' {
    return platform.toLowerCase() === 'email' ? 'middle' : 'tail';
}

function buildContactUrl(platform: string, value: string) {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed) || /^(mailto|tel|sms):/i.test(trimmed)) {
        return trimmed;
    }
    if (/^www\./i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    const lower = platform.toLowerCase();
    const host = trimmed.split(/[/?#]/)[0].replace(/:\d+$/, '');

    if (SOCIAL_PLATFORMS.has(lower)) {
        if (PLATFORM_DOMAINS[lower]?.test(host)) {
            return `https://${trimmed}`;
        }
        if (/^[^\s/]+\.[^\s/]+\//.test(trimmed)) {
            return `https://${trimmed}`;
        }
    }

    const handle = trimmed.replace(/^@+/, '');
    const phone = trimmed.replace(/[^\d+]/g, '');

    switch (lower) {
        case 'phone':
            return phone ? `tel:${phone}` : '';
        case 'sms':
            return phone ? `sms:${phone}` : '';
        case 'email':
            return `mailto:${trimmed}`;
        case 'whatsapp': {
            const waPhone = phone.replace(/^\+/, '');
            return waPhone ? `https://wa.me/${waPhone}` : '';
        }
        case 'instagram':
            return `https://instagram.com/${handle}`;
        case 'facebook':
            return `https://facebook.com/${handle}`;
        case 'tiktok':
            return `https://tiktok.com/@${handle}`;
        case 'linkedin':
            return `https://linkedin.com/in/${handle}`;
        case 'x':
        case 'twitter':
            return `https://x.com/${handle}`;
        case 'telegram':
            return `https://t.me/${handle}`;
        case 'github':
            return `https://github.com/${handle}`;
        case 'website':
        default:
            return `https://${trimmed}`;
    }
}

function PlatformGlyph({ platform, size, color }: { platform: string; size: number; color: string }) {
    switch (platform.toLowerCase()) {
        case 'phone':
            return <Phone size={size} color={color} weight="fill" />;
        case 'sms':
            return <ChatCenteredText size={size} color={color} weight="fill" />;
        case 'email':
            return <EnvelopeSimple size={size} color={color} weight="fill" />;
        case 'instagram':
            return <InstagramLogo size={size} color={color} weight="fill" />;
        case 'facebook':
            return <FacebookLogo size={size} color={color} weight="fill" />;
        case 'tiktok':
            return <TiktokLogo size={size} color={color} weight="fill" />;
        case 'whatsapp':
            return <WhatsappLogo size={size} color={color} weight="fill" />;
        case 'linkedin':
            return <LinkedinLogo size={size} color={color} weight="fill" />;
        case 'github':
            return <GithubLogo size={size} color={color} weight="fill" />;
        case 'website':
        default:
            return <Globe size={size} color={color} weight="fill" />;
    }
}

interface ContactActionModalProps {
    contact: ContactMethod | null;
    colors: any;
    onClose: () => void;
    onOpen: () => void;
}

function ContactActionModal({ contact, colors, onClose, onOpen }: ContactActionModalProps) {
    const { hapticsEnabled } = useAppTheme();
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setCopied(false);
    }, [contact?.id]);

    useEffect(() => {
        if (!copied) return;
        const timeout = setTimeout(onClose, 700);
        return () => clearTimeout(timeout);
    }, [copied, onClose]);

    if (!contact) return null;

    const handleCopy = () => {
        Clipboard.setString(contact.value.trim());
        setCopied(true);
        if (hapticsEnabled && Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
    };

    return (
        <Modal
            visible={!!contact}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.actionOverlay}>
                <Animated.View
                    entering={FadeIn.duration(220).easing(Easing.bezier(0.05, 0.7, 0.1, 1.0))}
                    style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}
                />
                <Pressable style={styles.actionBackdrop} onPress={onClose}>
                    <Animated.View
                        entering={ZoomIn.duration(280).springify().damping(22).stiffness(240).mass(0.85)}
                        style={[styles.actionCard, { backgroundColor: colors.card }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.actionIcon}>
                            <PlatformGlyph platform={contact.platform} size={36} color={colors.tint} />
                        </View>
                        <ThemedText type="sectionHeader" style={styles.actionTitle}>
                            {formatPlatform(contact.platform)}
                        </ThemedText>
                        <ThemedText
                            style={[styles.actionValue, { color: colors.secondary }]}
                            numberOfLines={2}
                            ellipsizeMode={getEllipsizeMode(contact.platform)}
                        >
                            {contact.value}
                        </ThemedText>
                        <View style={styles.actionButtons}>
                            <ScalePressable
                                onPress={handleCopy}
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: copied ? `${colors.tint}18` : colors.surface },
                                ]}
                                innerStyle={{ borderRadius: 16 }}
                                scaleTo={0.96}
                                haptic={false}
                                accessibilityRole="button"
                                accessibilityLabel={copied ? 'Copied' : 'Copy contact value'}
                            >
                                <Icon
                                    name={copied ? 'check_fill' : 'copy_2_line'}
                                    size={18}
                                    color={copied ? colors.tint : colors.text}
                                />
                                <ThemedText
                                    style={[styles.actionButtonText, { color: copied ? colors.tint : colors.text }]}
                                >
                                    {copied ? 'Copied' : 'Copy'}
                                </ThemedText>
                            </ScalePressable>
                            <ScalePressable
                                onPress={onOpen}
                                style={[styles.actionButton, { backgroundColor: colors.tint }]}
                                innerStyle={{ borderRadius: 16 }}
                                scaleTo={0.96}
                                accessibilityRole="button"
                                accessibilityLabel="Open contact"
                            >
                                <ArrowSquareOut size={18} color={colors.tintContrast} weight="fill" />
                                <ThemedText style={[styles.actionButtonText, { color: colors.tintContrast }]}>
                                    Open
                                </ThemedText>
                            </ScalePressable>
                        </View>
                    </Animated.View>
                </Pressable>
            </View>
        </Modal>
    );
}

export function ContactsTab({ contacts, onAdd, onDelete, onEdit, theme, isAcrylic, colors }: ContactsTabProps) {
    const [showLinkError, setShowLinkError] = useState(false);
    const [selectedContact, setSelectedContact] = useState<ContactMethod | null>(null);

    const contactList = contacts ?? [];

    const primaryContact = useMemo(() => {
        if (contactList.length === 0) return null;
        return contactList.reduce((best, contact) =>
            getPlatformRank(contact.platform) < getPlatformRank(best.platform) ? contact : best
        );
    }, [contactList]);

    const secondaryContacts = useMemo(() => {
        if (!primaryContact) return [];
        return contactList.filter(contact => contact.id !== primaryContact.id);
    }, [contactList, primaryContact]);

    const surfaceColor = isAcrylic
        ? `${colors.card}${theme === 'dark' ? 'E6' : 'D9'}`
        : colors.card;

    const handleOpenContact = useCallback((platform: string, value: string) => {
        const url = buildContactUrl(platform, value);
        if (!url) {
            setShowLinkError(true);
            return;
        }
        Linking.openURL(url).catch(() => {
            setShowLinkError(true);
        });
    }, []);

    const closeContactAction = useCallback(() => {
        setSelectedContact(null);
    }, []);

    const openSelectedContact = useCallback(() => {
        if (!selectedContact) return;
        const contact = selectedContact;
        setSelectedContact(null);
        handleOpenContact(contact.platform, contact.value);
    }, [handleOpenContact, selectedContact]);

    const renderRightActions = useCallback((
        id: number,
        height: number,
        dragX: RNAnimated.AnimatedInterpolation<number>
    ) => {
        const scale = dragX.interpolate({
            inputRange: [-120, 0],
            outputRange: [1, 0.55],
            extrapolate: 'clamp',
        });
        const opacity = dragX.interpolate({
            inputRange: [-48, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });
        const actionSize = height >= 70 ? 52 : 44;

        return (
            <RNAnimated.View style={[styles.swipeTray, { height, opacity, width: actionSize * 2 + 20 }]}>
                <RNAnimated.View style={[styles.swipeActionsInner, { transform: [{ scale }] }]}>
                    <ScalePressable
                        onPress={() => onEdit(id)}
                        style={[
                            styles.swipeAction,
                            {
                                width: actionSize,
                                height: actionSize,
                                backgroundColor: colors.surface,
                            },
                        ]}
                        innerStyle={{ borderRadius: DesignSystem.radius.md }}
                        scaleTo={0.88}
                        overlayColor="rgba(0,0,0,0.15)"
                        accessibilityRole="button"
                        accessibilityLabel="Edit contact method"
                    >
                        <PencilSimple size={18} color={colors.text} weight="fill" />
                    </ScalePressable>
                    <ScalePressable
                        onPress={() => onDelete(id)}
                        style={[
                            styles.swipeAction,
                            {
                                width: actionSize,
                                height: actionSize,
                                backgroundColor: colors.error,
                            },
                        ]}
                        innerStyle={{ borderRadius: DesignSystem.radius.md }}
                        scaleTo={0.88}
                        overlayColor="rgba(0,0,0,0.15)"
                        accessibilityRole="button"
                        accessibilityLabel="Delete contact method"
                    >
                        <Trash size={18} color="#FFFFFF" weight="fill" />
                    </ScalePressable>
                </RNAnimated.View>
            </RNAnimated.View>
        );
    }, [colors, onDelete, onEdit]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ThemedText type="sectionHeader" style={styles.headerTitle}>
                    Contacts
                </ThemedText>
                <ScalePressable
                    onPress={onAdd}
                    style={[styles.addButton, { backgroundColor: colors.surface }]}
                    innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                    scaleTo={0.9}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Add contact method"
                >
                    <Plus size={20} color={colors.tint} weight="fill" />
                </ScalePressable>
            </View>

            {contactList.length === 0 ? (
                <Animated.View
                    entering={FadeInDown.duration(260).springify().damping(26).stiffness(280).mass(0.7)}
                >
                    <ScalePressable
                        onPress={onAdd}
                        style={[styles.hero, { backgroundColor: surfaceColor }]}
                        innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                        scaleTo={0.975}
                        hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                        accessibilityRole="button"
                        accessibilityLabel="Add a way to reach them"
                    >
                        <View style={styles.emptyIcon}>
                            <Plus size={24} color={colors.tint} weight="fill" />
                        </View>
                        <View style={styles.heroText}>
                            <ThemedText style={[styles.emptyTitle, { color: colors.text }]}>
                                Add a way to reach them
                            </ThemedText>
                            <ThemedText style={[styles.emptyHint, { color: colors.secondary }]}>
                                Phone, email, or social handle
                            </ThemedText>
                        </View>
                    </ScalePressable>
                </Animated.View>
            ) : (
                <>
                    {primaryContact && (
                        <Animated.View
                            entering={FadeInDown.duration(260).springify().damping(26).stiffness(280).mass(0.7)}
                            layout={Layout.springify().damping(26).stiffness(280)}
                        >
                            <Swipeable
                                renderRightActions={(_progress, dragX) =>
                                    renderRightActions(primaryContact.id, HERO_HEIGHT, dragX)
                                }
                                overshootRight={false}
                                friction={3}
                                overshootFriction={8}
                                rightThreshold={60}
                            >
                                <ScalePressable
                                    onPress={() => setSelectedContact(primaryContact)}
                                    style={[styles.hero, { backgroundColor: surfaceColor }]}
                                    innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                                    scaleTo={0.975}
                                    hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${getActionLabel(primaryContact.platform)} ${primaryContact.value}`}
                                >
                                    <View style={[styles.heroIcon, { backgroundColor: `${colors.tint}18` }]}>
                                        <PlatformGlyph
                                            platform={primaryContact.platform}
                                            size={24}
                                            color={colors.tint}
                                        />
                                    </View>
                                    <View style={styles.heroText}>
                                        <ThemedText
                                            style={[styles.heroAction, { color: colors.secondary }]}
                                            numberOfLines={1}
                                        >
                                            {getActionLabel(primaryContact.platform)}
                                        </ThemedText>
                                        <ThemedText
                                            style={[styles.heroValue, { color: colors.text }]}
                                            numberOfLines={1}
                                            ellipsizeMode={getEllipsizeMode(primaryContact.platform)}
                                        >
                                            {primaryContact.value}
                                        </ThemedText>
                                    </View>
                                </ScalePressable>
                            </Swipeable>
                        </Animated.View>
                    )}

                    {secondaryContacts.length > 0 && (
                        <Animated.View
                            entering={FadeInDown.delay(40).duration(260).springify().damping(26).stiffness(280).mass(0.7)}
                            layout={Layout.springify().damping(26).stiffness(280)}
                            style={styles.moreSection}
                        >
                            <ThemedText style={[styles.groupLabel, { color: colors.secondary }]}>
                                Other contacts
                            </ThemedText>
                            <View style={[styles.group, { backgroundColor: surfaceColor }]}>
                                {secondaryContacts.map(contact => (
                                    <Animated.View
                                        key={contact.id}
                                        layout={Layout.springify().damping(26).stiffness(280)}
                                    >
                                        <Swipeable
                                            renderRightActions={(_progress, dragX) =>
                                                renderRightActions(contact.id, ROW_HEIGHT, dragX)
                                            }
                                            overshootRight={false}
                                            friction={3}
                                            overshootFriction={8}
                                            rightThreshold={60}
                                        >
                                            <ScalePressable
                                                onPress={() => setSelectedContact(contact)}
                                                style={styles.row}
                                                innerStyle={{ borderRadius: DesignSystem.radius.md }}
                                                scaleTo={0.985}
                                                accessibilityRole="button"
                                                accessibilityLabel={`${formatPlatform(contact.platform)} ${contact.value}`}
                                            >
                                                <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
                                                    <PlatformGlyph
                                                        platform={contact.platform}
                                                        size={18}
                                                        color={colors.secondary}
                                                    />
                                                </View>
                                                <ThemedText
                                                    style={[styles.rowLabel, { color: colors.secondary }]}
                                                    numberOfLines={1}
                                                >
                                                    {formatPlatform(contact.platform)}
                                                </ThemedText>
                                                <ThemedText
                                                    style={[styles.rowValue, { color: colors.text }]}
                                                    numberOfLines={1}
                                                    ellipsizeMode={getEllipsizeMode(contact.platform)}
                                                >
                                                    {contact.value}
                                                </ThemedText>
                                            </ScalePressable>
                                        </Swipeable>
                                    </Animated.View>
                                ))}
                            </View>
                        </Animated.View>
                    )}
                </>
            )}

            <ContactActionModal
                contact={selectedContact}
                colors={colors}
                onClose={closeContactAction}
                onOpen={openSelectedContact}
            />

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
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
    },
    headerTitle: {
        marginTop: -1,
        marginRight: 12,
        flexShrink: 1,
        opacity: 0.95,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: DesignSystem.radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        width: '100%',
        minHeight: HERO_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: DesignSystem.radius.lg,
    },
    heroIcon: {
        width: 46,
        height: 46,
        borderRadius: DesignSystem.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    heroText: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    heroAction: {
        fontSize: 13,
        lineHeight: 17,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: 0.1,
    },
    heroValue: {
        fontSize: 18,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.semibold,
        marginTop: 2,
    },
    emptyIcon: {
        width: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    emptyTitle: {
        fontSize: 17,
        lineHeight: 22,
        fontFamily: Typography.fontFamily.semibold,
    },
    emptyHint: {
        fontSize: 13,
        lineHeight: 19,
        fontFamily: Typography.fontFamily.regular,
        marginTop: 1,
    },
    moreSection: {
        marginTop: 22,
    },
    groupLabel: {
        marginLeft: 6,
        marginBottom: 8,
        fontSize: 13,
        lineHeight: 18,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: 0.1,
    },
    group: {
        borderRadius: DesignSystem.radius.lg,
        paddingVertical: 4,
        paddingHorizontal: 4,
        overflow: 'hidden',
    },
    row: {
        width: '100%',
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        borderRadius: DesignSystem.radius.md,
    },
    rowIcon: {
        width: 32,
        height: 32,
        borderRadius: DesignSystem.radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    rowLabel: {
        width: 84,
        fontSize: 13,
        fontFamily: Typography.fontFamily.medium,
        letterSpacing: 0.05,
    },
    rowValue: {
        flex: 1,
        minWidth: 0,
        marginLeft: 8,
        fontSize: 15,
        fontFamily: Typography.fontFamily.medium,
        textAlign: 'right',
    },
    actionOverlay: {
        flex: 1,
    },
    actionBackdrop: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    actionCard: {
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderRadius: DesignSystem.radius.xl,
        padding: 24,
    },
    actionIcon: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        marginBottom: 12,
    },
    actionTitle: {
        fontSize: 20,
        lineHeight: 26,
        textAlign: 'center',
    },
    actionValue: {
        fontSize: 15,
        lineHeight: 21,
        textAlign: 'center',
        paddingHorizontal: 8,
        marginTop: 6,
    },
    actionButtons: {
        width: '100%',
        flexDirection: 'row',
        gap: 10,
        marginTop: 24,
    },
    actionButton: {
        flex: 1,
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 16,
    },
    actionButtonText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
    },
    swipeTray: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 8,
        paddingRight: 4,
    },
    swipeActionsInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    swipeAction: {
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: DesignSystem.radius.md,
    },
});
