import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Typography } from '../../constants/Typography';

const TRACK_HEIGHT = 34;
// Full track height: the knob is a circle that spans the track, so no straight
// sliver of track shows above or below it at any position.
const KNOB_SIZE = TRACK_HEIGHT;
const KNOB_INSET = KNOB_SIZE / 2;
// Label strip height INCLUDING its 5px top gap. It has to be the full number
// the column actually occupies, or the reserved box comes up short and the
// row resizes when the two controls swap.
const LABEL_STRIP = 27;

/** Track box only, for callers that need to reason about the control's height. */
export const SLIDER_TRACK_HEIGHT = TRACK_HEIGHT;
/**
 * Track plus the label strip. The Custom stepper stands in for this whole
 * column, so it has to reserve the same box or everything below it jumps
 * when the two swap.
 */
export const SLIDER_COLUMN_HEIGHT = TRACK_HEIGHT + LABEL_STRIP;

interface NotificationSliderProps {
    /** One label per snap position, left to right. */
    labels: string[];
    index: number;
    onChange: (index: number) => void;
}

/**
 * Discrete intensity slider. Snaps to `labels.length` positions so the whole
 * notification ladder stays readable on one control instead of a chip grid.
 *
 * The knob tracks the finger on the UI thread and only commits an index on
 * release. Committing per move event re-rendered the host modal every frame,
 * which is what made the drag feel heavy.
 */
export function NotificationSlider({ labels, index, onChange }: NotificationSliderProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    const areaRef = useRef<View>(null);

    const count = labels.length;
    const lastIndex = count - 1;

    // progress is a 0..1 ratio; width is needed on the UI thread to convert it
    // to pixels without a round trip through React.
    const progress = useSharedValue(lastIndex > 0 ? index / lastIndex : 0);
    const width = useSharedValue(0);
    const dragging = useSharedValue(0);

    // Live props for the JS-side gesture handlers.
    const widthRef = useRef(0);
    const originXRef = useRef(0);
    const countRef = useRef(count);
    const lastIndexRef = useRef(lastIndex);
    const onChangeRef = useRef(onChange);
    const hapticsRef = useRef(hapticsEnabled);
    const lastTickRef = useRef(index);
    // Index the release gesture has already committed and is springing toward.
    const releaseTargetRef = useRef<number | null>(null);

    countRef.current = count;
    lastIndexRef.current = lastIndex;
    onChangeRef.current = onChange;
    hapticsRef.current = hapticsEnabled;

    const measure = useCallback(() => {
        areaRef.current?.measureInWindow((x, _y, w) => {
            originXRef.current = x;
            if (w > 0) {
                widthRef.current = w;
                width.value = w;
            }
        });
    }, [width]);

    // Commit outward, then tick. Haptics fire on the crossed detent only, so a
    // slow drag produces one tick per rung instead of one per frame.
    const commit = useCallback((next: number) => {
        const clamped = Math.max(0, Math.min(countRef.current - 1, next));
        onChangeRef.current(clamped);
    }, []);

    const tick = useCallback(() => {
        if (hapticsRef.current && Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => {});
        }
    }, []);

    // Called on the JS side whenever a drag crosses into a new detent.
    const handleDetentCrossed = useCallback(() => {
        const steps = countRef.current - 1;
        if (steps <= 0) return;
        const next = Math.round(Math.min(1, Math.max(0, progress.value)) * steps);
        if (next !== lastTickRef.current) {
            lastTickRef.current = next;
            tick();
        }
    }, [progress, tick]);

    const snapToRatio = useCallback((ratio: number, animate: boolean) => {
        const clamped = Math.min(1, Math.max(0, ratio));
        if (animate) {
            progress.value = withSpring(clamped, {
                damping: 26,
                stiffness: 320,
                mass: 0.6,
            });
        } else {
            progress.value = clamped;
        }
    }, [progress]);

    const ratioFromLocalX = useCallback((localX: number) => {
        const travel = widthRef.current - KNOB_INSET * 2;
        if (travel <= 0) return 0;
        return (localX - KNOB_INSET) / travel;
    }, []);

    const ratioFromPageX = useCallback((pageX: number) => {
        const travel = widthRef.current - KNOB_INSET * 2;
        if (travel <= 0) return 0;
        return (pageX - originXRef.current - KNOB_INSET) / travel;
    }, []);

    const responder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
            measure();
            dragging.value = 1;
            // Drop any stale claim from a previous gesture. Releasing without
            // changing the index never re-ran the sync effect, so the ref could
            // latch and silently swallow the next external index change.
            releaseTargetRef.current = null;
            // locationX is trustworthy at grant time; moveX is not, because the
            // origin offset only arrives once measureInWindow resolves.
            progress.value = Math.min(1, Math.max(0, ratioFromLocalX(e.nativeEvent.locationX)));
            handleDetentCrossed();
        },
        onPanResponderMove: (_e, gesture) => {
            progress.value = Math.min(1, Math.max(0, ratioFromPageX(gesture.moveX)));
            handleDetentCrossed();
        },
        onPanResponderRelease: () => {
            dragging.value = 0;
            const steps = countRef.current - 1;
            const settled = steps > 0 ? Math.round(progress.value * steps) : 0;
            // Spring to the exact rung so it lands clean rather than wherever
            // the finger happened to let go.
            const target = steps > 0 ? Math.min(1, Math.max(0, settled / steps)) : 0;
            progress.value = withSpring(target, {
                damping: 24,
                stiffness: 300,
                mass: 0.6,
            });
            // Claim the index change as ours so the sync effect ignores it.
            releaseTargetRef.current = settled;
            commit(settled);
        },
        onPanResponderTerminate: () => {
            dragging.value = 0;
        },
    }), [measure, dragging, progress, ratioFromLocalX, ratioFromPageX, handleDetentCrossed, commit, releaseTargetRef]);

    // An index arriving from outside the slider (form reset, accessibility
    // increment) animates to its rung instead of jumping.
    //
    // releaseTargetRef suppresses this while the gesture's own spring is still
    // settling. Without it, releasing fires commit(), which changes `index`,
    // which re-enters here and starts a second spring to the same place and
    // leaves the knob drifting.
    useEffect(() => {
        lastTickRef.current = index;
        if (dragging.value) return;
        if (releaseTargetRef.current !== null) {
            if (releaseTargetRef.current === index) {
                releaseTargetRef.current = null;
            }
            return;
        }
        snapToRatio(lastIndex > 0 ? index / lastIndex : 0, true);
    }, [index, lastIndex, dragging, snapToRatio]);

    const fillStyle = useAnimatedStyle(() => {
        const travel = Math.max(0, width.value - KNOB_INSET * 2);
        return { width: KNOB_INSET + travel * progress.value };
    });

    const knobStyle = useAnimatedStyle(() => {
        const travel = Math.max(0, width.value - KNOB_INSET * 2);
        return { transform: [{ translateX: travel * progress.value }] };
    });

    // Hide the fill at "None" so it shows a clean track instead of a stub.
    // Plain conditional on purpose: withTiming inside useAnimatedStyle restarts
    // the animation on every re-evaluation and never settles, and importing
    // interpolate/Extrapolation into this worklet is needless risk for a
    // one-step fade nobody asked for.
    const fillOpacity = useAnimatedStyle(() => ({
        opacity: progress.value > 0.001 ? 1 : 0,
    }));

    return (
        <View style={styles.container}>
            <View
                ref={areaRef}
                style={styles.trackArea}
                onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0) {
                        widthRef.current = w;
                        width.value = w;
                    }
                    measure();
                }}
                {...responder.panHandlers}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel="Notification intensity"
                accessibilityValue={{ min: 0, max: lastIndex, now: index, text: labels[index] }}
                accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                onAccessibilityAction={(e) => {
                    if (e.nativeEvent.actionName === 'increment') commit(index + 1);
                    if (e.nativeEvent.actionName === 'decrement') commit(index - 1);
                }}
            >
                <View
                    pointerEvents="none"
                    style={[styles.track, { height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, backgroundColor: colors.surface }]}
                >
                    {/* Fill length doubles as the intensity read-out: more colour means more nagging.
                        Only the left corners are rounded. Rounding the right end too left a dark
                        wedge between fill and knob that read as the two being unconnected. */}
                    <Animated.View
                        style={[
                            {
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                borderTopLeftRadius: TRACK_HEIGHT / 2,
                                borderBottomLeftRadius: TRACK_HEIGHT / 2,
                                backgroundColor: colors.tint,
                            },
                            fillStyle,
                            fillOpacity,
                        ]}
                    />
                    {/* Knob punches a hole in the fill so it stays readable on both halves of the track. */}
                    <Animated.View
                        style={[
                            styles.knob,
                            {
                                width: KNOB_SIZE,
                                height: KNOB_SIZE,
                                borderRadius: KNOB_INSET,
                                backgroundColor: colors.background,
                                borderColor: colors.tint,
                            },
                            knobStyle,
                        ]}
                    />
                </View>
            </View>

            <View style={styles.labels} pointerEvents="none">
                {labels.map((label, i) => (
                    <ThemedText
                        key={label}
                        numberOfLines={1}
                        style={[
                            styles.label,
                            {
                                // secondary, not textTertiary: tertiary is ~2.8:1 on the
                                // warm background and these labels are only 10px.
                                color: i === index ? colors.text : colors.secondary,
                                fontFamily: i === index
                                    ? Typography.fontFamily.bold
                                    : Typography.fontFamily.medium,
                            },
                        ]}
                    >
                        {label}
                    </ThemedText>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    trackArea: {
        height: TRACK_HEIGHT,
        justifyContent: 'center',
    },
    track: {
        width: '100%',
        overflow: 'hidden',
    },
    knob: {
        position: 'absolute',
        left: 0,
        top: (TRACK_HEIGHT - KNOB_SIZE) / 2,
        // Thick ring, small hole: keeps the full-height circle so no track shows
        // above or below it, while tightening the inner disc.
        borderWidth: 5,
    },
    labels: {
        height: LABEL_STRIP,
        paddingTop: 5,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 10,
        letterSpacing: 0.2,
    },
});