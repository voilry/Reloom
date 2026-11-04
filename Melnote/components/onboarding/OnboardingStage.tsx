import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeOut,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, {
    Circle,
    Defs,
    Line,
    Path,
    RadialGradient,
    Stop,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';
import { Avatar } from '../ui/Avatar';
import {
    ArrowUp,
    FileText,
    Icon,
    PencilSimple,
    Trash,
    Users,
} from '../ui/Icon';
import { ScalePressable } from '../ui/ScalePressable';
import { getRelationColor } from '../person/SocialWebCanvas';
import { getGroupIcon } from '../../constants/GroupIcons';
import { OnboardingPreview } from './OnboardingPreview';
import { OnboardingGroupModal } from './OnboardingGroupModal';
import {
    SAMPLE_CONTACT,
    SAMPLE_GROUPS,
    SAMPLE_NOTE,
    SAMPLE_PEOPLE,
    type CardStyle,
    type SampleGroup,
} from './onboardingData';

interface OnboardingStageProps {
    step: number;
    cardStyle: CardStyle;
}

const STAGE_HEIGHT = 340;
const SWIPE_WIDTH = 124;
const SPRING_BLOOM = { dampingRatio: 0.8, duration: 320 };
const SPRING_POP = { dampingRatio: 1, duration: 220 };

const SAMPLE_PERSON = SAMPLE_PEOPLE[0];
const SAMPLE_NODES = SAMPLE_PEOPLE.slice(1);
const NODE_BASE_ANGLE = 0.35;

export function OnboardingStage({ step, cardStyle }: OnboardingStageProps) {
    return (
        <View style={styles.stage}>
            <Animated.View
                key={step}
                entering={FadeIn.duration(220)}
                exiting={FadeOut.duration(120)}
                style={styles.scene}
            >
                {step === 0 && <ConstellationScene />}
                {step === 1 && <QuickNoteScene />}
                {step === 2 && <OnboardingPreview cardStyle={cardStyle} />}
                {step === 3 && <GestureScene />}
            </Animated.View>
        </View>
    );
}

interface BloomProps {
    play: boolean;
    delay?: number;
    fromScale?: number;
    fromX?: number;
    fromY?: number;
    spring?: { dampingRatio: number; duration: number };
    style: any;
    children: React.ReactNode;
}

function Bloom({
    play,
    delay = 0,
    fromScale = 0.94,
    fromX = 0,
    fromY = 0,
    spring = SPRING_BLOOM,
    style,
    children,
}: BloomProps) {
    const progress = useSharedValue(0);
    const opacity = useSharedValue(0);

    useEffect(() => {
        if (!play) return;
        progress.value = withDelay(delay, withSpring(1, spring));
        opacity.value = withDelay(delay, withTiming(1, { duration: 140 }));
    }, [play, delay, spring]);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [
            { translateX: fromX * (1 - progress.value) },
            { translateY: fromY * (1 - progress.value) },
            { scale: fromScale + (1 - fromScale) * progress.value },
        ],
    }));

    return (
        <Animated.View pointerEvents="none" style={[style, animatedStyle]}>
            {children}
        </Animated.View>
    );
}

function getCurvedPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    cx: number,
    cy: number
) {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const dx = midX - cx;
    const dy = midY - cy;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const curveAmount = 24;
    const qx = midX + (dx / distance) * curveAmount;
    const qy = midY + (dy / distance) * curveAmount;
    return `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
}

function ConstellationScene() {
    const { colors, theme } = useAppTheme();
    const [width, setWidth] = useState(0);
    const [play, setPlay] = useState(false);
    const lineOpacity = useSharedValue(0);

    const cx = width / 2;
    const cy = 172;
    const orbit = 92;

    useEffect(() => {
        if (width > 0) {
            setPlay(true);
            lineOpacity.value = withDelay(
                820,
                withSpring(1, { dampingRatio: 1, duration: 200 })
            );
        }
    }, [width, lineOpacity]);

    const lineStyle = useAnimatedStyle(() => ({ opacity: lineOpacity.value }));

    const nodes = SAMPLE_NODES.map((person, index) => {
        const angle =
            NODE_BASE_ANGLE + ((2 * Math.PI) / SAMPLE_NODES.length) * index;
        const x = cx + orbit * Math.cos(angle);
        const y = cy + orbit * Math.sin(angle);
        const dx = x - cx;
        const dy = y - cy;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;

        return {
            person,
            x,
            y,
            color: getRelationColor(person.relation, colors.tint),
            fromX: -(dx / distance) * 22,
            fromY: -(dy / distance) * 22,
            delay: 200 + index * 50,
        };
    });

    const crossLink =
        nodes.length >= 3
            ? getCurvedPath(
                  nodes[1].x,
                  nodes[1].y,
                  nodes[2].x,
                  nodes[2].y,
                  cx,
                  cy
              )
            : null;

    return (
        <View
            style={styles.fill}
            onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (nextWidth !== width) setWidth(nextWidth);
            }}
        >
            {width > 0 && (
                <>
                    <Animated.View
                        pointerEvents="none"
                        style={[StyleSheet.absoluteFill, lineStyle]}
                    >
                        <Svg width={width} height={STAGE_HEIGHT}>
                            <Defs>
                                <RadialGradient
                                    id="onboardingPersonGlow"
                                    cx="50%"
                                    cy="50%"
                                    rx="50%"
                                    ry="50%"
                                    fx="50%"
                                    fy="50%"
                                >
                                    <Stop
                                        offset="0%"
                                        stopColor={colors.tint}
                                        stopOpacity="0.4"
                                    />
                                    <Stop
                                        offset="40%"
                                        stopColor={colors.tint}
                                        stopOpacity="0.16"
                                    />
                                    <Stop
                                        offset="75%"
                                        stopColor={colors.tint}
                                        stopOpacity="0.04"
                                    />
                                    <Stop
                                        offset="100%"
                                        stopColor={colors.tint}
                                        stopOpacity="0"
                                    />
                                </RadialGradient>
                            </Defs>

                            <Circle
                                cx={cx}
                                cy={cy}
                                r={80}
                                fill="url(#onboardingPersonGlow)"
                            />

                            {crossLink && (
                                <Path
                                    d={crossLink}
                                    fill="none"
                                    stroke={
                                        theme === 'dark'
                                            ? 'rgba(255,255,255,0.12)'
                                            : 'rgba(0,0,0,0.08)'
                                    }
                                    strokeWidth={1}
                                    strokeDasharray="3 3"
                                />
                            )}

                            {nodes.map((node) => (
                                <Line
                                    key={`radial-${node.person.id}`}
                                    x1={cx}
                                    y1={cy}
                                    x2={node.x}
                                    y2={node.y}
                                    stroke={
                                        theme === 'dark'
                                            ? node.color + '40'
                                            : node.color + '30'
                                    }
                                    strokeWidth={1.5}
                                />
                            ))}
                        </Svg>
                    </Animated.View>

                    <Bloom
                        play={play}
                        delay={0}
                        fromScale={0.3}
                        spring={SPRING_POP}
                        style={{
                            position: 'absolute',
                            left: cx - 40,
                            top: cy - 40,
                            width: 80,
                            alignItems: 'center',
                            transformOrigin: '50% 30px',
                        }}
                    >
                        <Avatar
                            name={SAMPLE_PERSON.name}
                            uri={SAMPLE_PERSON.avatarUri}
                            size={60}
                        />
                        <View
                            style={[
                                styles.centerNamePill,
                                { backgroundColor: colors.surface },
                            ]}
                        >
                            <Text
                                numberOfLines={1}
                                allowFontScaling={false}
                                style={[
                                    styles.centerNameText,
                                    { color: colors.text },
                                ]}
                            >
                                {SAMPLE_PERSON.name}
                            </Text>
                        </View>
                    </Bloom>

                    {nodes.map(
                        ({ person, x, y, fromX, fromY, delay, color }) => (
                            <Bloom
                                key={person.id}
                                play={play}
                                delay={delay}
                                fromX={fromX}
                                fromY={fromY}
                                style={{
                                    position: 'absolute',
                                    left: x - 40,
                                    top: y - 30,
                                    width: 80,
                                    alignItems: 'center',
                                    transformOrigin: '50% 25px',
                                }}
                            >
                                <View style={styles.nodeAvatarRing}>
                                    <Avatar
                                        name={person.name}
                                        uri={person.avatarUri}
                                        size={44}
                                    />
                                </View>
                                <View
                                    style={[
                                        styles.nodeMetaBlock,
                                        { backgroundColor: colors.surface },
                                    ]}
                                >
                                    <Text
                                        numberOfLines={1}
                                        allowFontScaling={false}
                                        style={[
                                            styles.nodeNameText,
                                            { color: colors.text },
                                        ]}
                                    >
                                        {person.name}
                                    </Text>
                                    <Text
                                        numberOfLines={1}
                                        allowFontScaling={false}
                                        style={[
                                            styles.nodeRoleText,
                                            { color },
                                        ]}
                                    >
                                        {person.relation}
                                    </Text>
                                </View>
                            </Bloom>
                        )
                    )}
                </>
            )}
        </View>
    );
}

function QuickNoteScene() {
    const { colors } = useAppTheme();
    const [typed, setTyped] = useState('');

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | undefined;
        const timeout = setTimeout(() => {
            let index = 0;
            interval = setInterval(() => {
                index += 1;
                setTyped(SAMPLE_NOTE.slice(0, index));
                if (index >= SAMPLE_NOTE.length && interval) {
                    clearInterval(interval);
                }
            }, 24);
        }, 340);

        return () => {
            clearTimeout(timeout);
            if (interval) clearInterval(interval);
        };
    }, []);

    const typing = typed.length < SAMPLE_NOTE.length;
    const hasText = typed.length > 0;

    return (
        <View style={styles.noteScreen}>
            <View style={styles.noteTopBar}>
                <View style={styles.noteClose}>
                    <Icon name="close_line" size={22} color={colors.text} />
                </View>
            </View>

            <View style={styles.notePersonRow}>
                <Avatar
                    name={SAMPLE_PERSON.name}
                    uri={SAMPLE_PERSON.avatarUri}
                    size={38}
                />
                <View style={styles.notePersonInfo}>
                    <Text
                        numberOfLines={1}
                        allowFontScaling={false}
                        style={[
                            styles.notePersonName,
                            { color: colors.text },
                        ]}
                    >
                        {SAMPLE_PERSON.name}
                    </Text>
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.notePersonLabel,
                            { color: colors.secondary },
                        ]}
                    >
                        Quick Note
                    </Text>
                </View>
            </View>

            <View style={styles.noteComposerArea}>
                <Text
                    allowFontScaling={false}
                    style={[styles.noteComposer, { color: colors.text }]}
                >
                    {typed}
                    {typing ? (
                        <Text style={{ color: colors.tint }}>|</Text>
                    ) : null}
                </Text>
            </View>

            <View style={styles.noteBottomBar}>
                <View
                    style={[
                        styles.noteDestPill,
                        { backgroundColor: colors.surface },
                    ]}
                >
                    <View style={styles.noteDestContent}>
                        <FileText
                            size={17}
                            color={colors.tint}
                            weight="fill"
                        />
                        <Text
                            numberOfLines={1}
                            allowFontScaling={false}
                            style={[
                                styles.noteDestText,
                                { color: colors.text },
                            ]}
                        >
                            Note
                        </Text>
                    </View>
                    <Icon
                        name="down_line"
                        size={15}
                        color={colors.secondary}
                    />
                </View>

                <View
                    style={[
                        styles.noteSaveButton,
                        {
                            backgroundColor: hasText
                                ? colors.tint
                                : colors.surface,
                        },
                    ]}
                >
                    <ArrowUp
                        size={22}
                        color={
                            hasText ? colors.tintContrast : colors.textTertiary
                        }
                        weight="bold"
                    />
                </View>
            </View>
        </View>
    );
}

function GestureScene() {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const [editingGroup, setEditingGroup] = useState<SampleGroup | null>(null);
    const interacted = useRef(false);

    const translateX = useSharedValue(0);
    const opened = useSharedValue(false);

    const haptic = useCallback(
        (style = Haptics.ImpactFeedbackStyle.Light) => {
            if (hapticsEnabled && Platform.OS !== 'web') {
                Haptics.impactAsync(style).catch(() => {});
            }
        },
        [hapticsEnabled]
    );

    const markInteracted = useCallback(() => {
        interacted.current = true;
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (interacted.current) return;
            translateX.value = withTiming(-SWIPE_WIDTH, {
                duration: 420,
                easing: Easing.bezier(0.05, 0.7, 0.1, 1),
            });
            opened.value = true;
        }, 800);

        return () => clearTimeout(timeout);
    }, [opened, translateX]);

    const closeTray = useCallback(() => {
        translateX.value = withSpring(0, {
            damping: 20,
            stiffness: 260,
            mass: 0.8,
        });
        opened.value = false;
    }, [opened, translateX]);

    const pan = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-14, 14])
        .onBegin(() => {
            runOnJS(markInteracted)();
        })
        .onUpdate((event) => {
            const base = opened.value ? -SWIPE_WIDTH : 0;
            translateX.value = Math.max(
                -SWIPE_WIDTH,
                Math.min(0, base + event.translationX)
            );
        })
        .onEnd((event) => {
            const shouldOpen =
                translateX.value < -SWIPE_WIDTH * 0.4 ||
                event.velocityX < -420;
            translateX.value = withSpring(
                shouldOpen ? -SWIPE_WIDTH : 0,
                {
                    damping: 20,
                    stiffness: 260,
                    mass: 0.8,
                }
            );
            if (shouldOpen !== opened.value) runOnJS(haptic)();
            opened.value = shouldOpen;
        });

    const rowStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View style={styles.gestureScene}>
            <View style={styles.demoBlock}>
                <View style={styles.demoHint}>
                    <Icon
                        name="arrow_left_line"
                        size={12}
                        color={colors.textTertiary}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.demoHintText,
                            { color: colors.textTertiary },
                        ]}
                    >
                        Swipe left
                    </Text>
                </View>

                <View style={styles.swipeClip}>
                    <View style={styles.contactSwipeTray}>
                        <ScalePressable
                            onPress={() => {
                                haptic();
                                closeTray();
                            }}
                            style={[
                                styles.swipeAction,
                                { backgroundColor: colors.surface },
                            ]}
                            innerStyle={{ borderRadius: 14 }}
                            scaleTo={0.88}
                            overlayColor="rgba(0,0,0,0.15)"
                            accessibilityRole="button"
                            accessibilityLabel="Edit contact method"
                        >
                            <PencilSimple
                                size={18}
                                color={colors.text}
                                weight="fill"
                            />
                        </ScalePressable>

                        <ScalePressable
                            onPress={() => {
                                haptic(Haptics.ImpactFeedbackStyle.Medium);
                                closeTray();
                            }}
                            style={[
                                styles.swipeAction,
                                { backgroundColor: colors.error },
                            ]}
                            innerStyle={{ borderRadius: 14 }}
                            scaleTo={0.88}
                            overlayColor="rgba(0,0,0,0.15)"
                            accessibilityRole="button"
                            accessibilityLabel="Delete contact method"
                        >
                            <Trash size={18} color="#FFFFFF" weight="fill" />
                        </ScalePressable>
                    </View>

                    <GestureDetector gesture={pan}>
                        <Animated.View
                            style={[
                                styles.contactHero,
                                { backgroundColor: colors.card },
                                rowStyle,
                            ]}
                        >
                            <View
                                style={[
                                    styles.contactHeroIcon,
                                    { backgroundColor: colors.tint + '18' },
                                ]}
                            >
                                <Icon
                                    name="instagram_line"
                                    size={24}
                                    color={colors.tint}
                                />
                            </View>
                            <View style={styles.contactHeroText}>
                                <Text
                                    allowFontScaling={false}
                                    numberOfLines={1}
                                    style={[
                                        styles.contactHeroLabel,
                                        { color: colors.secondary },
                                    ]}
                                >
                                    {SAMPLE_CONTACT.platform}
                                </Text>
                                <Text
                                    allowFontScaling={false}
                                    numberOfLines={1}
                                    style={[
                                        styles.contactHeroValue,
                                        { color: colors.text },
                                    ]}
                                >
                                    {SAMPLE_CONTACT.value}
                                </Text>
                            </View>
                        </Animated.View>
                    </GestureDetector>
                </View>
            </View>

            <View style={styles.demoBlock}>
                <View style={styles.demoHint}>
                    <Icon
                        name="hand_finger_line"
                        size={12}
                        color={colors.textTertiary}
                    />
                    <Text
                        allowFontScaling={false}
                        style={[
                            styles.demoHintText,
                            { color: colors.textTertiary },
                        ]}
                    >
                        Press and hold
                    </Text>
                </View>

                <View style={styles.groupChipRow}>
                    <View
                        style={[
                            styles.groupChip,
                            { backgroundColor: colors.tint },
                        ]}
                    >
                        <Users
                            size={16}
                            color={theme === 'light' ? '#fff' : '#000'}
                        />
                        <Text
                            allowFontScaling={false}
                            style={[
                                styles.groupChipText,
                                {
                                    color:
                                        theme === 'light' ? '#fff' : '#000',
                                },
                            ]}
                        >
                            All
                        </Text>
                    </View>

                    {SAMPLE_GROUPS.slice(0, 2).map((group) => {
                        const GroupIcon = getGroupIcon(group.icon);

                        return (
                            <ScalePressable
                                key={group.name}
                                onPress={() => {}}
                                onLongPress={() => {
                                    haptic(
                                        Haptics.ImpactFeedbackStyle.Medium
                                    );
                                    setEditingGroup(group);
                                }}
                                style={[
                                    styles.groupChip,
                                    { backgroundColor: colors.surface },
                                ]}
                                innerStyle={{ borderRadius: 20 }}
                                scaleTo={0.92}
                                haptic={false}
                                accessibilityRole="button"
                                accessibilityLabel={`${group.name} group`}
                            >
                                <GroupIcon size={16} color={group.color} />
                                <Text
                                    allowFontScaling={false}
                                    style={[
                                        styles.groupChipText,
                                        { color: colors.text },
                                    ]}
                                >
                                    {group.name}
                                </Text>
                            </ScalePressable>
                        );
                    })}
                </View>
            </View>

            <OnboardingGroupModal
                visible={!!editingGroup}
                group={editingGroup}
                onClose={() => setEditingGroup(null)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    stage: {
        height: STAGE_HEIGHT,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    scene: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fill: {
        ...StyleSheet.absoluteFillObject,
    },

    centerNamePill: {
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        maxWidth: 90,
    },
    centerNameText: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.bold,
        lineHeight: 14,
        textAlign: 'center',
    },
    nodeAvatarRing: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: 'transparent',
    },
    nodeMetaBlock: {
        marginTop: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        alignItems: 'center',
        maxWidth: 80,
    },
    nodeNameText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        lineHeight: 13,
        textAlign: 'center',
    },
    nodeRoleText: {
        fontSize: 8,
        fontFamily: Typography.fontFamily.medium,
        lineHeight: 10,
        textTransform: 'capitalize',
        opacity: 0.85,
    },

    noteScreen: {
        width: '100%',
        maxWidth: 342,
        height: STAGE_HEIGHT,
        backgroundColor: 'transparent',
        overflow: 'hidden',
    },
    noteTopBar: {
        height: 50,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    noteClose: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    notePersonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 4,
        paddingBottom: 20,
    },
    notePersonInfo: {
        flex: 1,
        marginLeft: 12,
    },
    notePersonName: {
        fontSize: 23,
        letterSpacing: -0.4,
        fontFamily: Typography.fontFamily.serif,
    },
    notePersonLabel: {
        fontSize: 13,
        letterSpacing: 0.2,
        fontFamily: Typography.fontFamily.semibold,
        marginTop: 2,
        opacity: 0.7,
    },
    noteComposerArea: {
        flex: 1,
        paddingHorizontal: 24,
    },
    noteComposer: {
        paddingTop: 2,
        fontSize: 18,
        lineHeight: 27,
        fontFamily: Typography.fontFamily.regular,
    },
    noteBottomBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 12,
    },
    noteDestPill: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 46,
        borderRadius: 23,
        paddingLeft: 16,
        paddingRight: 12,
        maxWidth: '72%',
        flexShrink: 1,
        marginRight: 12,
    },
    noteDestContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1,
        marginRight: 6,
    },
    noteDestText: {
        fontSize: 15,
        fontFamily: Typography.fontFamily.semibold,
        marginLeft: 8,
        flexShrink: 1,
    },
    noteSaveButton: {
        width: 54,
        height: 54,
        borderRadius: 27,
        alignItems: 'center',
        justifyContent: 'center',
    },

    gestureScene: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        paddingHorizontal: 16,
        gap: 22,
    },
    demoBlock: {
        width: '100%',
        maxWidth: 342,
        alignSelf: 'center',
    },
    demoHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
        paddingHorizontal: 2,
    },
    demoHintText: {
        marginLeft: 5,
        fontSize: 11,
        fontFamily: Typography.fontFamily.semibold,
    },
    swipeClip: {
        height: 78,
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
    },
    contactSwipeTray: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 8,
        paddingRight: 4,
    },
    swipeAction: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contactHero: {
        width: '100%',
        minHeight: 78,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 20,
    },
    contactHeroIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    contactHeroText: {
        flex: 1,
        minWidth: 0,
        justifyContent: 'center',
    },
    contactHeroLabel: {
        fontSize: 13,
        lineHeight: 17,
        fontFamily: Typography.fontFamily.semibold,
        letterSpacing: 0.1,
    },
    contactHeroValue: {
        fontSize: 18,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.semibold,
        marginTop: 2,
    },
    groupChipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    groupChip: {
        height: 40,
        paddingHorizontal: 16,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    groupChipText: {
        fontSize: 14,
        lineHeight: 24,
        fontFamily: Typography.fontFamily.semibold,
    },
});
