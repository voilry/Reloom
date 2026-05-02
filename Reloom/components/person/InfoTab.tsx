
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { ScalePressable } from '../ui/ScalePressable';
import { ThemedText } from '../ui/ThemedText';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { MarkdownText } from '../ui/MarkdownText';
import { DesignSystem } from '../../constants/DesignSystem';
import { Colors } from '../../constants/Colors';
import { User, Calendar, Clock, MapPin, CaretRight as ChevronRight, PencilSimple as Edit, ArrowsOutSimple as Expand, House as Home, Briefcase, Airplane as Plane, Globe } from 'phosphor-react-native';
import { Person } from '../../db/repositories/PersonRepository';
import { Relationship } from '../../db/repositories/RelationshipRepository';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';

interface InfoTabProps {
    person: Person;
    age: number | null;
    relationships: any[];
    allPeople: Person[];
    onEdit: () => void;
    onEditProfile: () => void;
    isAcrylic?: boolean;
}

export function InfoTab({ person, age, relationships, allPeople, onEdit, onEditProfile, isAcrylic }: InfoTabProps) {
    const router = useRouter();
    const { colors, hapticsEnabled, theme } = useAppTheme();

    const acrylicBg = isAcrylic ? (theme === 'dark' ? 'rgba(0,0,0,0.45)' : `${colors.background}D9`) : undefined;

    const getRelationDisplay = (rel: Relationship) => {
        const otherId = rel.sourcePersonId === person?.id ? rel.targetPersonId : rel.sourcePersonId;
        const otherPerson = allPeople.find(p => p.id === otherId);
        return {
            name: otherPerson?.name || 'Unknown',
            avatar: otherPerson?.avatarUri,
            type: rel.relationType
        };
    };


    return (
        <>
            <Card style={[styles.infoCard, acrylicBg && { backgroundColor: acrylicBg }]}>
                <View style={styles.sectionHeader}>
                    <ThemedText type="sectionHeader" style={styles.sectionTitle}>Details</ThemedText>
                </View>
                <InfoItem
                    label="Gender"
                    value={person.gender}
                    icon={<User size={18} color={colors.icon} />}
                    placeholder={
                        <ScalePressable onPress={onEditProfile} overlayColor="transparent">
                            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>+ Add Gender</ThemedText>
                        </ScalePressable>
                    }
                />
                <InfoItem
                    label="Birthday"
                    value={person.birthdate}
                    prefix={age !== null ? `${age}` : ''}
                    icon={<Calendar size={18} color={colors.icon} />}
                    placeholder={
                        <ScalePressable onPress={onEditProfile} overlayColor="transparent">
                            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>+ Add Birthday</ThemedText>
                        </ScalePressable>
                    }
                />
                <InfoItem
                    label="First Met"
                    value={person.firstMet}
                    icon={<Clock size={18} color={colors.icon} />}
                    placeholder={
                        <ScalePressable onPress={onEditProfile} overlayColor="transparent">
                            <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 14 }}>+ Set Date</ThemedText>
                        </ScalePressable>
                    }
                />

                <View style={[styles.infoRow, { borderBottomColor: 'transparent' }]}>
                    <View style={styles.infoIconContainer}>
                        <MapPin size={18} color={colors.icon} />
                    </View>
                    <View style={styles.infoTextContainer}>
                        <ScalePressable 
                            onPress={() => router.push(`/person/${person.id}/locations`)}
                            style={{ flexDirection: 'row', alignItems: 'center' }}
                            overlayColor="transparent"
                            scaleTo={0.9}
                        >
                            <ThemedText style={styles.infoLabel}>Places</ThemedText>
                            <ChevronRight size={14} color={colors.icon} style={{ marginLeft: 4, opacity: 0.5 }} />
                        </ScalePressable>

                        <View style={styles.infoValueWrapper}>
                            {(person.locationHome || person.locationWork || person.locationOther) ? (
                                <View style={styles.locationTags}>
                                    {person.locationHome && <MapTag label="Home" value={person.locationHome} icon={<Home size={10} color={colors.tint} weight="bold" />} colors={colors} />}
                                    {person.locationWork && <MapTag label="Work" value={person.locationWork} icon={<Briefcase size={10} color={colors.tint} weight="bold" />} colors={colors} />}
                                    {person.locationOther && <MapTag label="Other" value={person.locationOther} icon={<Plane size={10} color={colors.tint} weight="bold" />} colors={colors} />}
                                </View>
                            ) : (
                                <ScalePressable onPress={() => router.push(`/person/${person.id}/locations`)} overlayColor="transparent">
                                    <ThemedText style={{ color: colors.tint, fontWeight: '600', fontSize: 13 }}>+ Add Location</ThemedText>
                                </ScalePressable>
                            )}
                        </View>
                    </View>
                </View>
            </Card>

            <ScalePressable
                style={[styles.relationshipCard, { borderColor: isAcrylic ? 'transparent' : colors.border, backgroundColor: acrylicBg ?? colors.card }]}
                innerStyle={{ borderRadius: DesignSystem.radius.lg }}
                scale={false}
                onPress={() => {
                    router.push(`/person/${person.id}/relations`);
                }}
            >
                <View style={styles.relLeft}>
                    <View style={styles.avatarStack}>
                        {relationships.slice(0, 3).map((rel, idx) => (
                            <Avatar
                                key={idx}
                                name={getRelationDisplay(rel).name}
                                uri={getRelationDisplay(rel).avatar}
                                size={36}
                                style={[styles.stackedAvatar, { marginLeft: idx > 0 ? -12 : 0, borderColor: colors.card, borderWidth: 2 }]}
                            />
                        ))}
                        {relationships.length === 0 && (
                            <View style={[styles.emptyRelCircle, { backgroundColor: colors.surface }]}>
                                <User size={20} color={colors.icon} />
                            </View>
                        )}
                        {relationships.length > 3 && (
                            <View style={[styles.moreRelCircle, { backgroundColor: colors.surface, marginLeft: -12, borderColor: colors.card, borderWidth: 2 }]}>
                                <ThemedText type="tiny" style={{ fontWeight: '700' }}>+{relationships.length - 3}</ThemedText>
                            </View>
                        )}
                    </View>
                    <View style={styles.relText}>
                        <ThemedText type="sectionHeader" style={{ fontSize: 18 }}>Social Web</ThemedText>
                        <ThemedText type="small" style={{ color: colors.secondary }}>
                            {relationships.length} connection{relationships.length !== 1 ? 's' : ''}
                        </ThemedText>
                    </View>
                </View>
                <ChevronRight size={20} color={colors.icon} />
            </ScalePressable>


            <View style={styles.sectionHeader}>
                <ThemedText type="sectionHeader" style={styles.sectionTitle}>Biography</ThemedText>
                <ScalePressable
                    onPress={() => router.push({
                        pathname: '/editor',
                        params: { id: person.id, type: 'description' }
                    })}
                >
                    <Edit size={16} color={colors.tint} />
                </ScalePressable>
            </View>

            <ScalePressable
                onPress={() => router.push({
                    pathname: '/editor',
                    params: { id: person.id, type: 'description' }
                })}
                scale={false}
                innerStyle={{ borderRadius: DesignSystem.radius.md }}
            >
                <Card style={[styles.descCard, acrylicBg && { backgroundColor: acrylicBg }]} padding="lg">
                    {person.description ? (
                        <MarkdownText content={person.description} style={styles.descText} />
                    ) : (
                        <ThemedText style={{ color: colors.secondary, fontStyle: 'italic', lineHeight: 22 }}>
                            Write down the story of how you met, their background, and other lasting impressions...
                        </ThemedText>
                    )}
                    <View style={styles.descIcon}>
                        <Expand size={14} color={colors.icon} />
                    </View>
                </Card>
            </ScalePressable>
        </>
    );
}

function InfoItem({ label, value, prefix, icon, placeholder }: any) {
    const { colors } = useAppTheme();
    if (!value && !placeholder) return null;

    const isComplex = React.isValidElement(value);

    return (
        <View style={[styles.infoRow, { borderBottomColor: colors.border + '40' }]}>
            <View style={styles.infoIconContainer}>
                {icon}
            </View>
            <View style={styles.infoTextContainer}>
                <ThemedText style={styles.infoLabel}>{label}</ThemedText>
                <View style={styles.infoValueWrapper}>
                    {value ? (
                        isComplex ? (
                            value
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {prefix ? (
                                    <View style={[styles.ageTag, { backgroundColor: colors.tint + '15' }]}>
                                        <ThemedText type="tiny" style={[styles.ageTagText, { color: colors.tint }]}>{prefix}</ThemedText>
                                    </View>
                                ) : null}
                                <ThemedText style={styles.infoValue}>
                                    {value}
                                </ThemedText>
                            </View>
                        )
                    ) : (
                        placeholder
                    )}
                </View>
            </View>
        </View>
    );
}

function MapTag({ label, value, icon, colors }: any) {
    const handleOpenMap = () => {
        const query = encodeURIComponent(value);
        const url = Platform.select({
            ios: `maps://0,0?q=${query}`,
            android: `geo:0,0?q=${query}`,
            default: `https://www.google.com/maps/search/?api=1&query=${query}`
        });
        Linking.openURL(url as string);
    };

    return (
        <ScalePressable
            onPress={handleOpenMap}
            style={[styles.locationTag, { backgroundColor: colors.surface, borderColor: 'transparent' }]}
            innerStyle={{ borderRadius: 8 }}
            scaleTo={0.95}
        >
            {icon}
            <ThemedText type="tiny" style={{ color: colors.tint, fontWeight: '700', marginLeft: 4 }}>
                {label}
            </ThemedText>
        </ScalePressable>
    );
}

const styles = StyleSheet.create({
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: { fontSize: 20 },
    infoCard: { marginBottom: 16 },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    infoLabel: { fontFamily: Typography.fontFamily.semibold, opacity: 0.5, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontFamily: Typography.fontFamily.semibold, fontSize: 14, textAlign: 'right', opacity: 0.9 },
    infoValueWrapper: { alignItems: 'flex-end', marginLeft: 2 },
    infoIconContainer: { width: 32, alignItems: 'center', justifyContent: 'center' },
    infoTextContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 8 },
    ageTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginRight: 6,
    },
    ageTagText: {
        fontFamily: Typography.fontFamily.bold,
        fontSize: 11,
    },
    relationshipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: DesignSystem.radius.lg,
        borderWidth: 1,
        marginBottom: 32,
        overflow: 'hidden', // Fix press effect clipping
        ...DesignSystem.shadows.sm,
    },
    relLeft: { flexDirection: 'row', alignItems: 'center' },
    avatarStack: { flexDirection: 'row', alignItems: 'center' },
    stackedAvatar: { width: 36, height: 36, borderRadius: 18 },
    emptyRelCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    moreRelCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    relText: { marginLeft: 16 },
    descCard: { minHeight: 100 },
    descText: { lineHeight: 22, fontSize: 14, opacity: 0.9 },
    descIcon: { position: 'absolute', bottom: 12, right: 12, opacity: 0.5 },
    locationTags: {
        flexDirection: 'row',
        gap: 4,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    locationTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
    },
});
