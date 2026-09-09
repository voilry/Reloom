import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
    View, StyleSheet, LayoutChangeEvent, Dimensions, Pressable, Platform, ScrollView
} from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import Animated, {
    useSharedValue, useAnimatedStyle, withTiming,
    FadeIn, SlideInDown, SlideOutDown
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '../ui/ThemedText';
import { Avatar } from '../ui/Avatar';
import { ScalePressable } from '../ui/ScalePressable';
import { DesignSystem } from '../../constants/DesignSystem';
import { Typography } from '../../constants/Typography';
import { Person } from '../../db/repositories/PersonRepository';
import { Relationship } from '../../db/repositories/RelationshipRepository';
import { useAppTheme } from '../../hooks/useAppTheme';
import { CaretRight, UserRemove, X, Plus, Minus, Target, Filter } from '@/components/ui/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const getRelationColor = (type: string | null | undefined, defaultTint: string): string => {
    if (!type) return defaultTint;
    const lower = type.toLowerCase().trim();
    if (lower.includes('family') || lower.includes('sister') || lower.includes('brother') || lower.includes('mom') || lower.includes('dad') || lower.includes('parent') || lower.includes('cousin')) {
        return '#F43F5E'; // Warm Rose
    }
    if (lower.includes('work') || lower.includes('colleague') || lower.includes('coworker') || lower.includes('boss')) {
        return '#0EA5E9'; // Sky Blue
    }
    if (lower.includes('mentor') || lower.includes('advisor') || lower.includes('teacher')) {
        return '#8B5CF6'; // Violet
    }
    if (lower.includes('partner') || lower.includes('spouse') || lower.includes('love')) {
        return '#EC4899'; // Pink
    }
    if (lower.includes('friend') || lower.includes('bestie')) {
        return defaultTint; // Amber / Preset Tint
    }
    return defaultTint;
};

interface SocialWebCanvasProps {
    centerPerson: Person;
    relationships: Relationship[];
    allPeople: Person[];
    allRelationships?: Relationship[];
    selectedCategory?: string;
    onSelectCategory?: (cat: string) => void;
    categories?: string[];
    onSelectPerson: (person: Person) => void;
    onDeleteRelationship: (relId: number) => void;
    onAddLink: () => void;
}

interface NodeData {
    id: number;
    person: Person;
    relationship: Relationship;
    x: number;
    y: number;
    tier: number;
    color: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_PAD = 120;

export function SocialWebCanvas({
    centerPerson,
    relationships,
    allPeople,
    allRelationships = [],
    selectedCategory = 'all',
    onSelectCategory,
    categories = [],
    onSelectPerson,
    onDeleteRelationship,
    onAddLink,
}: SocialWebCanvasProps) {
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [canvasSize, setCanvasSize] = useState({ width: SCREEN_WIDTH, height: 500 });
    const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const filterScrollY = useRef(0);
    const filterScrollViewRef = useRef<ScrollView>(null);
    const [scrollMetrics, setScrollMetrics] = useState({ contentHeight: 0, containerHeight: 0, scrollY: 0 });

    useEffect(() => {
        if (isFilterMenuOpen && filterScrollY.current > 0) {
            const timer = setTimeout(() => {
                filterScrollViewRef.current?.scrollTo({ y: filterScrollY.current, animated: false });
            }, 25);
            return () => clearTimeout(timer);
        }
    }, [isFilterMenuOpen]);

    // Zoom & Pan shared values
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const onLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (width > 0 && height > 0) {
            setCanvasSize({ width, height });
        }
    };

    // Static center: NEVER shifts on node click
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;

    // Gesture Handling: Pan, Pinch to Zoom, Double-Tap to Recenter
    const pinchGesture = Gesture.Pinch()
        .onUpdate(e => {
            'worklet';
            const nextScale = savedScale.value * e.scale;
            scale.value = Math.min(Math.max(nextScale, 0.4), 2.5);
        })
        .onEnd(() => {
            'worklet';
            savedScale.value = scale.value;
        });

    const panGesture = Gesture.Pan()
        .minDistance(6)
        .onUpdate(e => {
            'worklet';
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            'worklet';
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            'worklet';
            if (scale.value !== 1 || translateX.value !== 0 || translateY.value !== 0) {
                scale.value = withTiming(1, { duration: 250 });
                savedScale.value = 1;
                translateX.value = withTiming(0, { duration: 250 });
                savedTranslateX.value = 0;
                translateY.value = withTiming(0, { duration: 250 });
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(1.6, { duration: 250 });
                savedScale.value = 1.6;
            }
        });

    const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedCanvasStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value }
        ]
    }));

    // On-screen Zoom & Recenter controls
    const handleZoomIn = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = Math.min(scale.value * 1.25, 2.5);
        scale.value = withTiming(next, { duration: 200 });
        savedScale.value = next;
    };

    const handleZoomOut = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = Math.max(scale.value * 0.8, 0.4);
        scale.value = withTiming(next, { duration: 200 });
        savedScale.value = next;
    };

    const handleRecenter = () => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withTiming(1, { duration: 250 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 250 });
        savedTranslateX.value = 0;
        translateY.value = withTiming(0, { duration: 250 });
        savedTranslateY.value = 0;
    };

    // Map relationships to person objects
    const relData = useMemo(() => {
        return relationships.map(rel => {
            const otherId = rel.sourcePersonId === centerPerson.id ? rel.targetPersonId : rel.sourcePersonId;
            const person = allPeople.find(p => p.id === otherId);
            return { rel, person };
        }).filter((item): item is { rel: Relationship; person: Person } => !!item.person);
    }, [relationships, allPeople, centerPerson.id]);

    // Collision-free, spacious constellation layout (scales up to 50+ connections)
    const nodes: NodeData[] = useMemo(() => {
        const count = relData.length;
        if (count === 0) return [];

        // Base angle offset to avoid direct vertical stacking (90° / 270°)
        const baseOffset = 0.35;

        // Up to 6 nodes: Single spacious orbit
        if (count <= 6) {
            const radius = 135;
            return relData.map((item, i) => {
                const angle = (2 * Math.PI / count) * i + baseOffset;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + radius * Math.cos(angle),
                    y: cy + radius * Math.sin(angle),
                    tier: 1,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });
        }

        // 7 to 15 nodes: 2 tiers (e.g. Adin's circle in image 1)
        if (count <= 15) {
            const innerCount = Math.min(6, Math.ceil(count * 0.45));
            const outerCount = count - innerCount;
            const r1 = 100;
            const r2 = 175;

            const inner = relData.slice(0, innerCount).map((item, i) => {
                const angle = (2 * Math.PI / innerCount) * i + baseOffset;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + r1 * Math.cos(angle),
                    y: cy + r1 * Math.sin(angle),
                    tier: 1,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });

            const outer = relData.slice(innerCount).map((item, i) => {
                const angle = (2 * Math.PI / outerCount) * i + baseOffset + Math.PI / outerCount;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + r2 * Math.cos(angle),
                    y: cy + r2 * Math.sin(angle),
                    tier: 2,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });

            return [...inner, ...outer];
        }

        // 16 to 30 nodes: 3 tiers
        if (count <= 30) {
            const tier1Count = 6;
            const tier2Count = 10;
            const tier3Count = count - tier1Count - tier2Count;
            const r1 = 95;
            const r2 = 170;
            const r3 = 245;

            const t1 = relData.slice(0, tier1Count).map((item, i) => {
                const angle = (2 * Math.PI / tier1Count) * i + baseOffset;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + r1 * Math.cos(angle),
                    y: cy + r1 * Math.sin(angle),
                    tier: 1,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });

            const t2 = relData.slice(tier1Count, tier1Count + tier2Count).map((item, i) => {
                const angle = (2 * Math.PI / tier2Count) * i + baseOffset + 0.3;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + r2 * Math.cos(angle),
                    y: cy + r2 * Math.sin(angle),
                    tier: 2,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });

            const t3 = relData.slice(tier1Count + tier2Count).map((item, i) => {
                const angle = (2 * Math.PI / tier3Count) * i + baseOffset + 0.6;
                return {
                    id: item.person.id,
                    person: item.person,
                    relationship: item.rel,
                    x: cx + r3 * Math.cos(angle),
                    y: cy + r3 * Math.sin(angle),
                    tier: 3,
                    color: getRelationColor(item.rel.relationType, colors.tint),
                };
            });

            return [...t1, ...t2, ...t3];
        }

        // 31 to 50+ nodes: 4 spacious tiers
        const tier1Count = 6;
        const tier2Count = 10;
        const tier3Count = 14;
        const tier4Count = count - tier1Count - tier2Count - tier3Count;
        const r1 = 90;
        const r2 = 160;
        const r3 = 235;
        const r4 = 310;

        const t1 = relData.slice(0, tier1Count).map((item, i) => ({
            id: item.person.id,
            person: item.person,
            relationship: item.rel,
            x: cx + r1 * Math.cos((2 * Math.PI / tier1Count) * i + baseOffset),
            y: cy + r1 * Math.sin((2 * Math.PI / tier1Count) * i + baseOffset),
            tier: 1,
            color: getRelationColor(item.rel.relationType, colors.tint),
        }));

        const t2 = relData.slice(tier1Count, tier1Count + tier2Count).map((item, i) => ({
            id: item.person.id,
            person: item.person,
            relationship: item.rel,
            x: cx + r2 * Math.cos((2 * Math.PI / tier2Count) * i + baseOffset + 0.25),
            y: cy + r2 * Math.sin((2 * Math.PI / tier2Count) * i + baseOffset + 0.25),
            tier: 2,
            color: getRelationColor(item.rel.relationType, colors.tint),
        }));

        const t3 = relData.slice(tier1Count + tier2Count, tier1Count + tier2Count + tier3Count).map((item, i) => ({
            id: item.person.id,
            person: item.person,
            relationship: item.rel,
            x: cx + r3 * Math.cos((2 * Math.PI / tier3Count) * i + baseOffset + 0.5),
            y: cy + r3 * Math.sin((2 * Math.PI / tier3Count) * i + baseOffset + 0.5),
            tier: 3,
            color: getRelationColor(item.rel.relationType, colors.tint),
        }));

        const t4 = relData.slice(tier1Count + tier2Count + tier3Count).map((item, i) => ({
            id: item.person.id,
            person: item.person,
            relationship: item.rel,
            x: cx + r4 * Math.cos((2 * Math.PI / tier4Count) * i + baseOffset + 0.75),
            y: cy + r4 * Math.sin((2 * Math.PI / tier4Count) * i + baseOffset + 0.75),
            tier: 4,
            color: getRelationColor(item.rel.relationType, colors.tint),
        }));

        return [...t1, ...t2, ...t3, ...t4];
    }, [relData, cx, cy, colors.tint]);

    // Cross-links between secondary contacts
    const crossLinks = useMemo(() => {
        if (nodes.length < 2 || allRelationships.length === 0) return [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const links: { from: NodeData; to: NodeData }[] = [];
        const processed = new Set<string>();

        for (const rel of allRelationships) {
            if (rel.sourcePersonId === centerPerson.id || rel.targetPersonId === centerPerson.id) continue;

            const n1 = nodeMap.get(rel.sourcePersonId);
            const n2 = nodeMap.get(rel.targetPersonId);
            if (n1 && n2) {
                const key = `${Math.min(n1.id, n2.id)}-${Math.max(n1.id, n2.id)}`;
                if (!processed.has(key)) {
                    processed.add(key);
                    links.push({ from: n1, to: n2 });
                }
            }
        }
        return links;
    }, [nodes, allRelationships, centerPerson.id]);

    const selectedNode = useMemo(() => {
        if (!selectedNodeId) return null;
        return nodes.find(n => n.id === selectedNodeId) || null;
    }, [selectedNodeId, nodes]);

    // Mutual connections list for selected node
    const mutualPersons = useMemo(() => {
        if (!selectedNode) return [];
        return crossLinks
            .filter(l => l.from.id === selectedNode.id || l.to.id === selectedNode.id)
            .map(l => (l.from.id === selectedNode.id ? l.to.person.name : l.from.person.name));
    }, [selectedNode, crossLinks]);

    const handleNodePress = (nodeId: number) => {
        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
        setSelectedNodeId(prev => (prev === nodeId ? null : nodeId));
    };

    const handleCanvasPress = () => {
        if (selectedNodeId) setSelectedNodeId(null);
        if (isFilterMenuOpen) setIsFilterMenuOpen(false);
    };

    // Generate gentle organic quadratic bezier curve for cross-links
    const getCurvedPath = (x1: number, y1: number, x2: number, y2: number) => {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = midX - cx;
        const dy = midY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const curveAmount = 24;
        const qx = midX + (dx / dist) * curveAmount;
        const qy = midY + (dy / dist) * curveAmount;
        return `M ${x1} ${y1} Q ${qx} ${qy} ${x2} ${y2}`;
    };

    // Calculate node opacity based on category filter and node focus
    const getNodeOpacity = (node: NodeData) => {
        // Category filter check
        if (selectedCategory !== 'all') {
            const matchesCat = node.relationship.relationType?.trim().toLowerCase() === selectedCategory.toLowerCase();
            if (!matchesCat) return 0.2;
        }
        // Focus check when a specific node is tapped
        if (selectedNodeId) {
            const isSelected = selectedNodeId === node.id;
            const isMutual = crossLinks.some(
                l => (l.from.id === selectedNodeId && l.to.id === node.id) ||
                     (l.to.id === selectedNodeId && l.from.id === node.id)
            );
            if (!isSelected && !isMutual) return 0.35;
        }
        return 1.0;
    };

    return (
        <View style={styles.container} onLayout={onLayout}>
            {/* Gesture-enabled Zoom and Pan Canvas */}
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[StyleSheet.absoluteFill, animatedCanvasStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={handleCanvasPress} />

                    {/* SVG Connecting Web Layer with extended bounds so outer lines never clip */}
                    <Svg
                        style={{
                            position: 'absolute',
                            left: -SVG_PAD,
                            top: -SVG_PAD,
                            width: canvasSize.width + SVG_PAD * 2,
                            height: canvasSize.height + SVG_PAD * 2,
                        }}
                        viewBox={`${-SVG_PAD} ${-SVG_PAD} ${canvasSize.width + SVG_PAD * 2} ${canvasSize.height + SVG_PAD * 2}`}
                        pointerEvents="none"
                    >
                        {/* Organic curved cross-link web threads */}
                        {crossLinks.map((link, idx) => {
                            const isHighlighted = selectedNodeId === link.from.id || selectedNodeId === link.to.id;
                            const isDimmed = selectedNodeId && !isHighlighted;
                            return (
                                <Path
                                    key={`cross-${idx}`}
                                    d={getCurvedPath(link.from.x, link.from.y, link.to.x, link.to.y)}
                                    fill="none"
                                    stroke={isHighlighted ? colors.tint : (theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)')}
                                    strokeWidth={isHighlighted ? 1.8 : 1}
                                    strokeDasharray={isHighlighted ? undefined : "3 3"}
                                    opacity={isDimmed ? 0.12 : 1}
                                />
                            );
                        })}

                        {/* Radial primary connections from center person */}
                        {nodes.map(node => {
                            const isSelected = selectedNodeId === node.id;
                            const isDimmed = (selectedNodeId && !isSelected && !crossLinks.some(l => (l.from.id === selectedNodeId && l.to.id === node.id) || (l.to.id === selectedNodeId && l.from.id === node.id))) ||
                                             (selectedCategory !== 'all' && node.relationship.relationType?.trim().toLowerCase() !== selectedCategory.toLowerCase());
                            return (
                                <Line
                                    key={`radial-${node.id}`}
                                    x1={cx}
                                    y1={cy}
                                    x2={node.x}
                                    y2={node.y}
                                    stroke={isSelected ? node.color : (theme === 'dark' ? node.color + '40' : node.color + '30')}
                                    strokeWidth={isSelected ? 2.5 : 1.5}
                                    opacity={isDimmed ? 0.15 : 1}
                                />
                            );
                        })}
                    </Svg>

                    {/* Central Ego Node */}
                    <View style={[styles.centerNodeWrapper, { left: cx - 40, top: cy - 40 }]} pointerEvents="box-none">
                        <View style={[styles.centerHalo, { backgroundColor: colors.tint + '15' }]}>
                            <Avatar name={centerPerson.name} uri={centerPerson.avatarUri} size={60} />
                        </View>
                        <View style={[styles.centerNamePill, { backgroundColor: colors.surface }]}>
                            <ThemedText style={styles.centerNameText} numberOfLines={1}>
                                {centerPerson.name}
                            </ThemedText>
                        </View>
                    </View>

                    {/* Orbiting Contact Nodes */}
                    {nodes.map((node, index) => {
                        const isSelected = selectedNodeId === node.id;
                        const opacity = getNodeOpacity(node);
                        const isMutualWithSelected = selectedNodeId !== null && crossLinks.some(
                            l => (l.from.id === selectedNodeId && l.to.id === node.id) ||
                                 (l.to.id === selectedNodeId && l.from.id === node.id)
                        );

                        return (
                            <Animated.View
                                key={node.id}
                                entering={FadeIn.delay(index * 25).duration(250)}
                                style={[
                                    styles.nodeWrapper,
                                    {
                                        left: node.x - 30,
                                        top: node.y - 30,
                                        zIndex: isSelected ? 20 : 10,
                                        opacity,
                                    }
                                ]}
                            >
                                <ScalePressable
                                    onPress={() => handleNodePress(node.id)}
                                    scaleTo={0.9}
                                    style={styles.nodePressable}
                                    overlayColor="transparent"
                                >
                                    <View style={[
                                        styles.nodeAvatarRing,
                                        isSelected && { borderColor: node.color, borderRadius: 25 }
                                    ]}>
                                        <Avatar name={node.person.name} uri={node.person.avatarUri} size={44} />
                                    </View>

                                    <View style={[styles.nodeMetaBlock, { backgroundColor: colors.surface }]}>
                                        <ThemedText style={styles.nodeNameText} numberOfLines={1}>
                                            {node.person.name}
                                        </ThemedText>
                                        {node.relationship.relationType ? (
                                            <ThemedText style={[styles.nodeRoleText, { color: node.color }]}>
                                                {node.relationship.relationType}
                                            </ThemedText>
                                        ) : null}
                                    </View>
                                </ScalePressable>
                            </Animated.View>
                        );
                    })}
                </Animated.View>
            </GestureDetector>

            {/* Floating Zoom, Filter & Recenter Controls */}
            {nodes.length > 0 && (
                <View style={[styles.zoomControls, { backgroundColor: colors.surface }]}>
                    {categories.length > 1 && (
                        <>
                            <ScalePressable
                                onPress={() => {
                                    if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                    setIsFilterMenuOpen(prev => !prev);
                                }}
                                style={[
                                    styles.zoomBtn,
                                    selectedCategory !== 'all' && { backgroundColor: colors.tint + '20', borderRadius: 16 }
                                ]}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                scaleTo={0.88}
                                overlayColor="transparent"
                            >
                                <Filter
                                    size={15}
                                    color={selectedCategory !== 'all' ? colors.tint : colors.text}
                                    weight={selectedCategory !== 'all' ? 'fill' : 'regular'}
                                />
                            </ScalePressable>
                            <View style={[styles.zoomDivider, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border }]} />
                        </>
                    )}
                    <ScalePressable
                        onPress={handleZoomIn}
                        style={styles.zoomBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        scaleTo={0.88}
                        overlayColor="transparent"
                    >
                        <Plus size={15} color={colors.text} />
                    </ScalePressable>
                    <View style={[styles.zoomDivider, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border }]} />
                    <ScalePressable
                        onPress={handleZoomOut}
                        style={styles.zoomBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        scaleTo={0.88}
                        overlayColor="transparent"
                    >
                        <Minus size={15} color={colors.text} />
                    </ScalePressable>
                    <View style={[styles.zoomDivider, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border }]} />
                    <ScalePressable
                        onPress={handleRecenter}
                        style={styles.zoomBtn}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        scaleTo={0.88}
                        overlayColor="transparent"
                    >
                        <Target size={15} color={colors.text} />
                    </ScalePressable>
                </View>
            )}

            {/* Dropdown Filter Menu in Graph View */}
            {isFilterMenuOpen && categories.length > 1 && (
                <>
                    <Pressable
                        style={StyleSheet.absoluteFill}
                        onPress={() => setIsFilterMenuOpen(false)}
                    />
                    <Animated.View
                        entering={FadeIn.duration(150)}
                        style={[
                            styles.filterDropdown,
                            { backgroundColor: colors.surface }
                        ]}
                    >
                        <View style={{ position: 'relative' }}>
                            <ScrollView
                                ref={filterScrollViewRef}
                                style={categories.length > 4 ? styles.filterScrollArea : undefined}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled={true}
                                overScrollMode="always"
                                bounces={true}
                                decelerationRate="normal"
                                contentOffset={{ x: 0, y: filterScrollY.current }}
                                onContentSizeChange={(_w, h) => {
                                    setScrollMetrics(prev => prev.contentHeight !== h ? { ...prev, contentHeight: h } : prev);
                                }}
                                onLayout={(e) => {
                                    const h = e.nativeEvent.layout.height;
                                    setScrollMetrics(prev => prev.containerHeight !== h ? { ...prev, containerHeight: h } : prev);
                                }}
                                onScroll={(e) => {
                                    const y = e.nativeEvent.contentOffset.y;
                                    filterScrollY.current = y;
                                    setScrollMetrics(prev => {
                                        if (Math.abs(prev.scrollY - y) > 1.5) {
                                            return { ...prev, scrollY: y };
                                        }
                                        return prev;
                                    });
                                }}
                                scrollEventThrottle={16}
                            >
                                <ScalePressable
                                    onPress={() => {
                                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                        onSelectCategory?.('all');
                                        setIsFilterMenuOpen(false);
                                    }}
                                    style={[
                                        styles.filterDropdownItem,
                                        selectedCategory === 'all' && { backgroundColor: colors.tint + '18' }
                                    ]}
                                    innerStyle={{ borderRadius: 8 }}
                                    scaleTo={0.96}
                                >
                                    <View style={styles.filterItemLeft}>
                                        <View style={[styles.filterColorDot, { backgroundColor: colors.tint }]} />
                                        <ThemedText style={[
                                            styles.filterDropdownText,
                                            selectedCategory === 'all' && { color: colors.tint, fontFamily: Typography.fontFamily.bold }
                                        ]}>
                                            All
                                        </ThemedText>
                                    </View>
                                    <ThemedText style={[styles.filterDropdownCount, { color: colors.secondary }]}>
                                        {relationships.length}
                                    </ThemedText>
                                </ScalePressable>

                                {categories.map((cat: string) => {
                                    const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                                    const catColor = getRelationColor(cat, colors.tint);
                                    const count = relationships.filter(r => r.relationType?.trim().toLowerCase() === cat.toLowerCase()).length;
                                    return (
                                        <ScalePressable
                                            key={cat}
                                            onPress={() => {
                                                if (hapticsEnabled && Platform.OS !== 'web') Haptics.selectionAsync();
                                                onSelectCategory?.(isSelected ? 'all' : cat);
                                                setIsFilterMenuOpen(false);
                                            }}
                                            style={[
                                                styles.filterDropdownItem,
                                                isSelected && { backgroundColor: catColor + '18' }
                                            ]}
                                            innerStyle={{ borderRadius: 8 }}
                                            scaleTo={0.96}
                                        >
                                            <View style={styles.filterItemLeft}>
                                                <View style={[styles.filterColorDot, { backgroundColor: catColor }]} />
                                                <ThemedText style={[
                                                    styles.filterDropdownText,
                                                    isSelected && { color: catColor, fontFamily: Typography.fontFamily.bold }
                                                ]}>
                                                    {cat}
                                                </ThemedText>
                                            </View>
                                            <ThemedText style={[styles.filterDropdownCount, { color: colors.secondary }]}>
                                                {count}
                                            </ThemedText>
                                        </ScalePressable>
                                    );
                                })}
                            </ScrollView>

                            {/* Thin, rounded scrollbar (rounded top & bottom, thin sides) */}
                            {categories.length > 4 && scrollMetrics.contentHeight > scrollMetrics.containerHeight && scrollMetrics.containerHeight > 0 && (() => {
                                const trackHeight = scrollMetrics.containerHeight - 8;
                                const ratio = scrollMetrics.containerHeight / scrollMetrics.contentHeight;
                                const thumbHeight = Math.max(22, trackHeight * ratio);
                                const maxScroll = scrollMetrics.contentHeight - scrollMetrics.containerHeight;
                                const scrollClamped = Math.max(0, Math.min(scrollMetrics.scrollY, maxScroll));
                                const thumbTop = 4 + (maxScroll > 0 ? (scrollClamped / maxScroll) * (trackHeight - thumbHeight) : 0);

                                return (
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            styles.customScrollTrack,
                                            {
                                                height: scrollMetrics.containerHeight,
                                            }
                                        ]}
                                    >
                                        <View
                                            style={[
                                                styles.customScrollThumb,
                                                {
                                                    height: thumbHeight,
                                                    top: thumbTop,
                                                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.26)',
                                                }
                                            ]}
                                        />
                                    </View>
                                );
                            })()}
                        </View>
                    </Animated.View>
                </>
            )}

            {/* Bottom Preview Sheet: Zero-Jiggle Calm Slide Animation */}
            {selectedNode && (
                <Animated.View
                    entering={SlideInDown.duration(200)}
                    exiting={SlideOutDown.duration(160)}
                    style={[
                        styles.bottomCard,
                        {
                            backgroundColor: colors.card,
                            bottom: Math.max(insets.bottom + 12, 20),
                        }
                    ]}
                >
                    <View style={styles.bottomCardHeader}>
                        <Avatar name={selectedNode.person.name} uri={selectedNode.person.avatarUri} size={46} />
                        <View style={styles.bottomCardInfo}>
                            <View style={styles.bottomCardNameRow}>
                                <ThemedText style={styles.bottomCardName} numberOfLines={1}>
                                    {selectedNode.person.name}
                                </ThemedText>
                                {selectedNode.relationship.relationType ? (
                                    <View style={[styles.bottomCardRoleChip, { backgroundColor: selectedNode.color + '18' }]}>
                                        <ThemedText style={[styles.bottomCardRoleText, { color: selectedNode.color }]}>
                                            {selectedNode.relationship.relationType}
                                        </ThemedText>
                                    </View>
                                ) : null}
                            </View>
                            {selectedNode.person.elevatorPitch ? (
                                <ThemedText style={[styles.bottomCardPitch, { color: colors.secondary }]} numberOfLines={1}>
                                    {selectedNode.person.elevatorPitch}
                                </ThemedText>
                            ) : null}
                            {mutualPersons.length > 0 && (
                                <ThemedText style={[styles.mutualText, { color: colors.tint }]} numberOfLines={1}>
                                    Mutual with {mutualPersons.slice(0, 3).join(', ')}{mutualPersons.length > 3 ? ` +${mutualPersons.length - 3}` : ''}
                                </ThemedText>
                            )}
                        </View>
                        <ScalePressable
                            onPress={() => setSelectedNodeId(null)}
                            style={styles.closeCardBtn}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            scaleTo={0.9}
                            overlayColor="transparent"
                        >
                            <X size={18} color={colors.icon} />
                        </ScalePressable>
                    </View>

                    {/* Action Row */}
                    <View style={styles.actionRow}>
                        <ScalePressable
                            onPress={() => onSelectPerson(selectedNode.person)}
                            style={[styles.primaryActionBtn, { backgroundColor: colors.tint }]}
                            innerStyle={{ borderRadius: DesignSystem.radius.md }}
                            scaleTo={0.96}
                        >
                            <ThemedText style={[styles.primaryActionText, { color: theme === 'light' ? '#fff' : '#000' }]}>
                                View Profile
                            </ThemedText>
                            <CaretRight size={14} color={theme === 'light' ? '#fff' : '#000'} />
                        </ScalePressable>

                        <ScalePressable
                            onPress={() => {
                                onDeleteRelationship(selectedNode.relationship.id);
                                setSelectedNodeId(null);
                            }}
                            style={[
                                styles.deleteActionBtn,
                                { backgroundColor: '#e8474a' }
                            ]}
                            innerStyle={{ borderRadius: DesignSystem.radius.md }}
                            scaleTo={0.95}
                        >
                            <UserRemove size={16} color="#ffffff" weight="fill" />
                            <ThemedText style={[styles.deleteActionText, { color: '#ffffff' }]}>
                                Unlink
                            </ThemedText>
                        </ScalePressable>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },

    // Floating Zoom Controls
    zoomControls: {
        position: 'absolute',
        top: 8,
        right: 16,
        borderRadius: 20,
        zIndex: 25,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    zoomBtn: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    zoomDivider: {
        width: 1,
        height: 14,
        marginHorizontal: 2,
    },

    // Center Ego Node
    centerNodeWrapper: {
        position: 'absolute',
        width: 80,
        alignItems: 'center',
        zIndex: 15,
    },
    centerHalo: {
        padding: 4,
        borderRadius: 999,
        justifyContent: 'center',
        alignItems: 'center',
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

    // Orbiting Nodes
    nodeWrapper: {
        position: 'absolute',
        width: 60,
        alignItems: 'center',
    },
    nodePressable: {
        alignItems: 'center',
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

    // Filter dropdown in graph view
    filterDropdown: {
        position: 'absolute',
        top: 46,
        right: 16,
        borderRadius: 14,
        minWidth: 150,
        padding: 5,
        zIndex: 35,
        ...DesignSystem.shadows.md,
    },
    filterScrollArea: {
        maxHeight: 182,
    },
    filterDropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
    },
    filterItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    filterColorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    filterDropdownText: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
    },
    filterDropdownCount: {
        fontSize: 11,
        fontFamily: Typography.fontFamily.semibold,
        marginLeft: 12,
    },
    customScrollTrack: {
        position: 'absolute',
        right: 1,
        top: 0,
        width: 3,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    customScrollThumb: {
        width: 3,
        borderRadius: 2,
    },

    // Bottom Selected Node Card
    bottomCard: {
        position: 'absolute',
        left: 16,
        right: 16,
        padding: 14,
        borderRadius: DesignSystem.radius.lg,
        zIndex: 30,
        ...DesignSystem.shadows.md,
    },
    bottomCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    bottomCardInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    bottomCardNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    bottomCardName: {
        fontSize: 16,
        fontFamily: Typography.fontFamily.bold,
        lineHeight: 20,
    },
    bottomCardRoleChip: {
        paddingHorizontal: 7,
        paddingVertical: 1.5,
        borderRadius: 6,
    },
    bottomCardRoleText: {
        fontSize: 10,
        fontFamily: Typography.fontFamily.bold,
        textTransform: 'capitalize',
        lineHeight: 13,
    },
    bottomCardPitch: {
        fontSize: 12,
        fontFamily: Typography.fontFamily.medium,
        lineHeight: 16,
        marginTop: 1,
    },
    mutualText: {
        fontSize: 10.5,
        fontFamily: Typography.fontFamily.semibold,
        lineHeight: 14,
        marginTop: 1,
    },
    closeCardBtn: {
        padding: 4,
        alignSelf: 'flex-start',
    },

    // Action Row
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    primaryActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        height: 42,
        borderRadius: DesignSystem.radius.md,
    },
    primaryActionText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
    },
    deleteActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        height: 42,
        paddingHorizontal: 14,
        borderRadius: DesignSystem.radius.md,
    },
    deleteActionText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
    },
});
