import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
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
// Label strip height INCLUDING its top gap. It has to be the full number the
// column actually occupies, or the reserved box comes up short and the row
// resizes when the two controls swap.
const LABEL_STRIP = 27;
// Vertical offset that matches the old centred label row. ThemedText's default
// line box is 24px, so centring it in the 22px area below the 5px gap starts
// the box at 4px.
const LABEL_TOP = 4;
// Wide enough for the longest label at this size. Slots may overlap between
// neighbouring detents, but the text itself stays clear because it is centred.
const MIN_LABEL_SLOT = 44;
// A press that travels farther than this is a drag, not a tap.
const TAP_SLOP = 10;
// Extra distance, in detent widths, the finger has to travel past the midpoint
// before the "active" label (and haptic tick) moves. The stops on this control
// are close together, so without a deadband the label flickers between two
// neighbouring rungs when the finger rests near a boundary.
const DETENT_HYSTERESIS = 0.16;

const SETTLE_SPRING = {
    damping: 28,
    stiffness: 300,
    mass: 0.7,
};

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
 * The knob is driven entirely by a Gesture Handler worklet on the UI thread,
 * so close detents still track the finger at frame rate instead of waiting for
 * Javascript. The parent is only told about a new index on release, and the
 * active label/haptic uses a small deadband so it does not flicker between two
 * neighbouring rungs.
 */
export function NotificationSlider({ labels, index, onChange }: NotificationSliderProps) {
    const { colors, hapticsEnabled } = useAppTheme();
    // Measured width is needed to place the labels over their detents.
    const [trackWidth, setTrackWidth] = useState(0);
    // Which rung should look active. Updated only when a drag crosses a detent.
    const [displayIndex, setDisplayIndex] = useState(index);

    const count = labels.length;
    const lastIndex = count - 1;

    const progress = useSharedValue(
        lastIndex > 0 ? Math.min(1, Math.max(0, index / lastIndex)) : 0
    );
    const width = useSharedValue(0);
    // Ratio the drag started from; keeps the knob relative to the finger with
    // no dependency on an async screen measurement.
    const dragStartRatio = useSharedValue(0);
    // Sticky nearest rung for the label/haptics. It only moves once the finger
    // clears the hysteresis band, not at the exact midpoint.
    const activeDetent = useSharedValue(index);
    const dragActive = useSharedValue(0);

    const onChangeRef = useRef(onChange);
    const hapticsRef = useRef(hapticsEnabled);
    const indexRef = useRef(index);
    const lastTickRef = useRef(index);
    // Index a release has already committed and is springing toward. Used to
    // suppress the duplicate spring from the prop-sync effect.
    const pendingTargetRef = useRef<number | null>(null);

    onChangeRef.current = onChange;
    hapticsRef.current = hapticsEnabled;
    indexRef.current = index;

    const tick = useCallback(() => {
        if (hapticsRef.current && Platform.OS !== 'web') {
            Haptics.selectionAsync().catch(() => {});
        }
    }, []);

    // Called from the UI thread while dragging, and only when the sticky
    // detent actually changes. Five label re-renders over a full sweep is
    // cheap; the knob itself never waits for React.
    const announceDetent = useCallback((next: number) => {
        setDisplayIndex(next);
        if (next !== lastTickRef.current) {
            lastTickRef.current = next;
            tick();
        }
    }, [tick]);

    // Called once a gesture has chosen its final rung. Commits only when the
    // value really changed, and ticks if the final snap landed on a rung the
    // drag had not announced yet.
    const finishSettle = useCallback((next: number) => {
        setDisplayIndex(next);
        if (next !== lastTickRef.current) {
            lastTickRef.current = next;
            tick();
        }
        if (next !== indexRef.current) {
            pendingTargetRef.current = next;
            onChangeRef.current(next);
        }
    }, [tick]);

    const gesture = React.useMemo(() => {
        const settle = (ratio: number) => {
            'worklet';
            const settled = lastIndex > 0
                ? Math.max(0, Math.min(lastIndex, Math.round(ratio * lastIndex)))
                : 0;
            progress.value = withSpring(
                lastIndex > 0 ? settled / lastIndex : 0,
                SETTLE_SPRING
            );
            runOnJS(finishSettle)(settled);
        };

        const pan = Gesture.Pan()
            // Wait for horizontal intent, but give clear vertical movement to
            // the surrounding form scroll instead of swallowing it.
            .activeOffsetX([-6, 6])
            .failOffsetY([-14, 14])
            .onStart(() => {
                'worklet';
                dragStartRatio.value = progress.value;
                dragActive.value = 1;
                activeDetent.value = lastIndex > 0
                    ? Math.round(progress.value * lastIndex)
                    : 0;
            })
            .onUpdate((event) => {
                'worklet';
                const travel = Math.max(1, width.value - KNOB_INSET * 2);
                const ratio = Math.min(
                    1,
                    Math.max(0, dragStartRatio.value + event.translationX / travel)
                );
                progress.value = ratio;

                if (lastIndex <= 0) return;

                const exact = ratio * lastIndex;
                const previous = activeDetent.value;
                // Deadband around the midpoint. The knob keeps moving smoothly;
                // only the label/haptic changes wait for a clear winner.
                if (Math.abs(exact - previous) > 0.5 + DETENT_HYSTERESIS) {
                    const next = Math.max(0, Math.min(lastIndex, Math.round(exact)));
                    if (next !== previous) {
                        activeDetent.value = next;
                        runOnJS(announceDetent)(next);
                    }
                }
            })
            .onEnd(() => {
                'worklet';
                dragActive.value = 0;
                settle(progress.value);
            })
            .onFinalize((_event, success) => {
                'worklet';
                // Also catch an active drag that was cancelled (e.g. the modal
                // closed or another gesture won) so the knob cannot be left
                // between two labels.
                if (success || dragActive.value === 0) return;
                dragActive.value = 0;
                settle(progress.value);
            });

        const tap = Gesture.Tap()
            .maxDistance(TAP_SLOP)
            .onEnd((event) => {
                'worklet';
                const travel = Math.max(1, width.value - KNOB_INSET * 2);
                const ratio = Math.min(
                    1,
                    Math.max(0, (event.x - KNOB_INSET) / travel)
                );
                settle(ratio);
            });

        return Gesture.Race(pan, tap);
    }, [
        activeDetent,
        announceDetent,
        dragActive,
        dragStartRatio,
        finishSettle,
        lastIndex,
        progress,
        width,
    ]);

    // An index arriving from outside the slider (form reset, accessibility
    // increment) animates to its rung instead of jumping.
    useEffect(() => {
        if (dragActive.value === 1) return;

        activeDetent.value = index;
        lastTickRef.current = index;
        setDisplayIndex(index);

        if (pendingTargetRef.current !== null) {
            const pending = pendingTargetRef.current;
            pendingTargetRef.current = null;
            if (pending === index) return;
        }

        progress.value = withSpring(
            lastIndex > 0 ? Math.min(1, Math.max(0, index / lastIndex)) : 0,
            SETTLE_SPRING
        );
    }, [index, lastIndex, activeDetent, dragActive, progress]);

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

    const travel = Math.max(0, trackWidth - KNOB_INSET * 2);
    const labelSlot = trackWidth > 0
        ? Math.max(MIN_LABEL_SLOT, lastIndex > 0 ? travel / lastIndex : trackWidth)
        : 0;

    return (
        <View style={styles.container}>
            <GestureDetector gesture={gesture}>
                <View
                    style={styles.trackArea}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w <= 0) return;
                        width.value = w;
                        setTrackWidth(prev => (prev === w ? prev : w));
                    }}
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityLabel="Notification intensity"
                    accessibilityValue={{ min: 0, max: lastIndex, now: index, text: labels[index] }}
                    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                    onAccessibilityAction={(e) => {
                        const next = e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
                        const clamped = Math.max(0, Math.min(lastIndex, next));
                        if (clamped !== index) onChange(clamped);
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
            </GestureDetector>

            <View style={styles.labels} pointerEvents="none">
                {trackWidth > 0 && labels.map((label, i) => {
                    // Detent centres, not equal flex slots: the first and last
                    // positions are half a knob in from each edge because the
                    // knob travels between those two centres.
                    const center = lastIndex > 0
                        ? KNOB_INSET + (i / lastIndex) * travel
                        : trackWidth / 2;
                    const active = i === displayIndex;
                    return (
                        <ThemedText
                            key={`${label}-${i}`}
                            numberOfLines={1}
                            style={[
                                styles.label,
                                {
                                    left: center - labelSlot / 2,
                                    width: labelSlot,
                                    color: active ? colors.text : colors.secondary,
                                    fontFamily: active
                                        ? Typography.fontFamily.bold
                                        : Typography.fontFamily.medium,
                                },
                            ]}
                        >
                            {label}
                        </ThemedText>
                    );
                })}
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
        position: 'relative',
    },
    label: {
        position: 'absolute',
        top: LABEL_TOP,
        fontSize: 10,
        letterSpacing: 0.2,
        textAlign: 'center',
    },
});
