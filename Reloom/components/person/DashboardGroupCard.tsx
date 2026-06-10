import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../ui/ThemedText';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { ScalePressable } from '../ui/ScalePressable';
import { CaretRight, Users } from '@/components/ui/Icon';
import { getGroupIcon } from '../../constants/GroupIcons';

interface DashboardGroupCardProps {
    title: string;
    description?: string;
    iconName?: string | null;
    color: string;
    isMaster?: boolean;
    isAddCard?: boolean;
    count?: number;
    colors: any;
    onPress: () => void;
    onLongPress?: () => void;
}

export const DashboardGroupCard = memo(({ title, description, iconName, color, isMaster, isAddCard, count, colors, onPress, onLongPress }: DashboardGroupCardProps) => {
    const IconComponent = isMaster ? Users : getGroupIcon(iconName);

    return (
        <ScalePressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={[
                styles.container,
                {
                    backgroundColor: isAddCard 
                        ? (colors.theme === 'light' ? colors.surface : 'rgba(255,255,255,0.08)') 
                        : (isMaster 
                            ? (colors.theme === 'light' ? colors.tint + '10' : colors.tint + '30') 
                            : (colors.theme === 'light' ? color + '0F' : color + '35')),
                    borderColor: isAddCard 
                        ? (colors.theme === 'light' ? colors.border : colors.text + '20') 
                        : (isMaster ? colors.tint + '20' : color + '20'),
                    borderWidth: isAddCard ? 1.5 : 0,
                    borderStyle: isAddCard ? 'dashed' : 'solid',
                    minHeight: isMaster ? 130 : 120,
                    padding: 18,
                    ...((colors.theme === 'light') ? DesignSystem.shadows.none : {}),
                },
                isAddCard && { justifyContent: 'center', alignItems: 'center' },
                (!isAddCard && !isMaster) && { justifyContent: 'center', alignItems: 'center' },
            ]}
            innerStyle={{ borderRadius: 24 }}
        >
            {isAddCard ? (
                <>
                    <View style={[styles.iconContainer, { backgroundColor: colors.surface, width: 44, height: 44, borderRadius: 22, borderWidth: 0 }]}>
                        <IconComponent size={20} color={colors.text} weight="fill" />
                    </View>
                    <ThemedText style={{ marginTop: 10, fontSize: 13, fontWeight: '700', color: colors.secondary }}>Create</ThemedText>
                </>
            ) : isMaster ? (
                <>
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={[styles.iconContainer, { backgroundColor: 'transparent', width: 52, height: 52, borderRadius: 20 }]}>
                                <IconComponent size={32} color={color} weight="fill" />
                            </View>
                            {count !== undefined && (
                                <View style={[styles.badge, { backgroundColor: colors.tint + '15', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }]}>
                                    <ThemedText style={{ fontSize: 12, fontWeight: '700', color: color }}>{count}</ThemedText>
                                </View>
                            )}
                        </View>
                        <View style={{ marginTop: 'auto', paddingTop: 16 }}>
                            <ThemedText style={{ fontSize: 22, fontWeight: '800', opacity: 0.9, marginBottom: 2, letterSpacing: -0.3, fontFamily: Typography.fontFamily.bold }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
                                {title}
                            </ThemedText>
                            {description && (
                                <ThemedText style={{ color: colors.secondary, fontSize: 13, fontWeight: '500' }} numberOfLines={2}>
                                    {description}
                                </ThemedText>
                            )}
                        </View>
                    </View>
                    <View style={{ position: 'absolute', right: 18, bottom: 18, opacity: 0.2 }}>
                        <CaretRight size={24} color={color} weight="bold" />
                    </View>
                </>
            ) : (
                <>
                    <View style={[styles.iconContainer, { backgroundColor: 'transparent', width: 44, height: 44, borderRadius: 16 }]}>
                        <IconComponent size={28} color={color} weight="fill" />
                    </View>
                    <ThemedText
                        style={{ fontSize: 16, fontWeight: '800', opacity: 0.9, marginTop: 6, letterSpacing: -0.3, textAlign: 'center', fontFamily: Typography.fontFamily.bold }}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.65}
                    >
                        {title}
                    </ThemedText>
                    {description && (
                        <ThemedText style={{ color: colors.secondary, fontSize: 13, fontWeight: '500', textAlign: 'center', marginTop: 2 }} numberOfLines={2}>
                            {description}
                        </ThemedText>
                    )}
                </>
            )}
        </ScalePressable>
    );
});

const styles = StyleSheet.create({
    container: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 20,
        ...DesignSystem.shadows.sm,
        flex: 1,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
});
