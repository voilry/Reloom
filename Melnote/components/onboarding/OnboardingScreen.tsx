import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../../store/SettingsContext';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ThemedText } from '../ui/ThemedText';
import { ThemedView } from '../ui/ThemedView';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ScalePressable } from '../ui/ScalePressable';
import { Typography } from '../../constants/Typography';
import { OnboardingStage } from './OnboardingStage';

interface OnboardingScreenProps {
    onDone?: () => void;
}

const CTA_LABELS = [
    'Get started',
    'Next',
    'Next',
    'Start using Melnote',
];

export function OnboardingScreen({ onDone }: OnboardingScreenProps) {
    const { settings, updateSetting, completeOnboarding } = useSettings();
    const { colors } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [step, setStep] = useState(0);
    const [trackWidth, setTrackWidth] = useState(0);
    const finishing = useRef(false);
    const advancing = useRef(false);
    const scrollRef = useRef<ScrollView>(null);

    const fade = useSharedValue(1);
    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withTiming((step + 1) / 4, {
            duration: 420,
            easing: Easing.bezier(0.05, 0.7, 0.1, 1.0),
        });
        scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, [step, progress]);

    const screenStyle = useAnimatedStyle(() => ({
        opacity: fade.value,
        transform: [{ scale: 0.995 + fade.value * 0.005 }],
    }));

    const progressStyle = useAnimatedStyle(() => ({
        width: trackWidth * progress.value,
    }));

    const complete = useCallback(() => {
        completeOnboarding();
        onDone?.();
    }, [completeOnboarding, onDone]);

    const finish = useCallback(() => {
        if (finishing.current) return;
        finishing.current = true;
        fade.value = withTiming(
            0,
            { duration: 180, easing: Easing.bezier(0.3, 0, 0.8, 0.15) },
            (finished) => {
                if (finished) runOnJS(complete)();
            }
        );
    }, [complete, fade]);

    const goNext = () => {
        if (step >= 3) {
            finish();
            return;
        }
        if (advancing.current) return;
        advancing.current = true;
        setStep((current) => Math.min(3, current + 1));
        setTimeout(() => {
            advancing.current = false;
        }, 320);
    };

    const goBack = useCallback(() => {
        advancing.current = false;
        setStep((current) => Math.max(0, current - 1));
    }, []);

    useEffect(() => {
        const subscription = BackHandler.addEventListener(
            'hardwareBackPress',
            () => {
                if (step > 0) {
                    goBack();
                    return true;
                }
                return false;
            }
        );

        return () => subscription.remove();
    }, [goBack, step]);

    return (
        <ThemedView style={styles.root}>
            <StatusBar style="auto" />
            <Animated.View
                entering={FadeIn.duration(280)}
                style={[styles.root, screenStyle]}
            >
                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    {step > 0 ? (
                        <ScalePressable
                            onPress={goBack}
                            scaleTo={0.94}
                            hitSlop={{
                                top: 14,
                                bottom: 14,
                                left: 14,
                                right: 14,
                            }}
                            overlayColor="transparent"
                            style={styles.backButton}
                            accessibilityRole="button"
                            accessibilityLabel="Previous step"
                        >
                            <Icon
                                name="left_line"
                                size={15}
                                color={colors.textSecondary}
                            />
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.backText,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                Back
                            </Text>
                        </ScalePressable>
                    ) : (
                        <View style={styles.navPlaceholder} />
                    )}

                    {step < 3 ? (
                        <ScalePressable
                            onPress={finish}
                            scaleTo={0.94}
                            hitSlop={{
                                top: 14,
                                bottom: 14,
                                left: 14,
                                right: 14,
                            }}
                            overlayColor="transparent"
                            accessibilityRole="button"
                            accessibilityLabel="Skip introduction"
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.skipText,
                                    { color: colors.textSecondary },
                                ]}
                            >
                                Skip
                            </Text>
                        </ScalePressable>
                    ) : (
                        <View style={styles.navPlaceholder} />
                    )}
                </View>

                <View
                    style={[
                        styles.progressTrack,
                        { backgroundColor: colors.surface },
                    ]}
                    onLayout={(event) =>
                        setTrackWidth(event.nativeEvent.layout.width)
                    }
                >
                    <Animated.View
                        style={[
                            styles.progressFill,
                            { backgroundColor: colors.tint },
                            progressStyle,
                        ]}
                    />
                </View>

                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <View style={styles.column}>
                        <OnboardingStage
                            step={step}
                            cardStyle={settings.peopleListStyle}
                        />

                        <Animated.View
                            key={step}
                            entering={FadeInDown.duration(300)
                                .springify()
                                .damping(24)
                                .stiffness(220)
                                .mass(0.8)}
                            style={styles.copy}
                        >
                            {step === 0 && <WelcomeCopy />}
                            {step === 1 && <QuickNoteCopy />}
                            {step === 2 && (
                                <AppearanceCopy
                                    cardStyle={settings.peopleListStyle}
                                    onCardStyleChange={(value) =>
                                        updateSetting('peopleListStyle', value)
                                    }
                                />
                            )}
                            {step === 3 && <GestureCopy />}
                        </Animated.View>
                    </View>
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            paddingBottom: insets.bottom + 16,
                            backgroundColor: colors.background,
                        },
                    ]}
                >
                    <View style={styles.footerColumn}>
                        <Button
                            title={CTA_LABELS[step]}
                            onPress={goNext}
                            size="lg"
                            style={styles.primaryButton}
                        />
                    </View>
                </View>
            </Animated.View>
        </ThemedView>
    );
}

function StepHeading({
    title,
    lead,
    body,
    large = false,
}: {
    title: string;
    lead: string;
    body: string;
    large?: boolean;
}) {
    const { colors } = useAppTheme();

    return (
        <View>
            <ThemedText
                style={[styles.title, large && styles.titleLarge]}
            >
                {title}
            </ThemedText>
            <ThemedText style={[styles.lead, { color: colors.text }]}>
                {lead}
            </ThemedText>
            <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
                {body}
            </ThemedText>
        </View>
    );
}

function WelcomeCopy() {
    const { colors } = useAppTheme();

    return (
        <View>
            <StepHeading
                title="Welcome to Melnote"
                lead="Keep track of your people."
                body="Remember how you met, what they care about, and when to reach out again."
                large
            />
            <Text
                allowFontScaling={false}
                style={[styles.summary, { color: colors.textTertiary }]}
            >
                People, groups, notes, journals, and reminders in one place.
            </Text>
        </View>
    );
}

function QuickNoteCopy() {
    const { colors } = useAppTheme();

    return (
        <View>
            <StepHeading
                title="Quick Note"
                lead="Write it down in seconds."
                body="Add a book, a gift idea, or something to follow up on. It stays on their profile."
            />
            <View style={styles.hintRow}>
                <View
                    style={[
                        styles.hintIcon,
                        { backgroundColor: colors.tint + '14' },
                    ]}
                >
                    <Icon name="plus_line" size={13} color={colors.tint} />
                </View>
                <Text
                    allowFontScaling={false}
                    style={[styles.hintText, { color: colors.tint }]}
                >
                    Tap + and choose Quick Note.
                </Text>
            </View>
        </View>
    );
}

interface AppearanceCopyProps {
    cardStyle: 'list' | 'gallery';
    onCardStyleChange: (value: 'list' | 'gallery') => void;
}

function AppearanceCopy({
    cardStyle,
    onCardStyleChange,
}: AppearanceCopyProps) {
    return (
        <View>
            <StepHeading
                title="Appearance"
                lead="Choose your card design."
                body="You can change this anytime in Settings."
            />
            <CardStylePicker
                value={cardStyle}
                onChange={onCardStyleChange}
            />
        </View>
    );
}

function CardStylePicker({
    value,
    onChange,
}: {
    value: 'list' | 'gallery';
    onChange: (value: 'list' | 'gallery') => void;
}) {
    const { colors, theme } = useAppTheme();
    const [width, setWidth] = useState(0);
    const selectedIndex = value === 'gallery' ? 1 : 0;
    const options: Array<{ label: string; value: 'list' | 'gallery' }> = [
        { label: 'List View', value: 'list' },
        { label: 'Gallery Grid', value: 'gallery' },
    ];

    const pillStyle = useAnimatedStyle(() => {
        if (width === 0) return { opacity: 0 };
        const itemWidth = (width - 8) / options.length;
        return {
            width: itemWidth,
            transform: [
                {
                    translateX: withSpring(selectedIndex * itemWidth, {
                        damping: 20,
                        stiffness: 240,
                        mass: 0.8,
                    }),
                },
            ],
            opacity: 1,
        };
    });

    return (
        <View>
            <Text
                allowFontScaling={false}
                style={[styles.choiceLabel, { color: colors.textTertiary }]}
            >
                Card design
            </Text>

            <View
                style={[
                    styles.segmentedContainer,
                    { backgroundColor: colors.surface },
                ]}
                onLayout={(event) =>
                    setWidth(event.nativeEvent.layout.width)
                }
            >
                <Animated.View
                    style={[
                        pillStyle,
                        styles.segmentedPill,
                        {
                            backgroundColor:
                                theme === 'dark'
                                    ? colors.tint + '40'
                                    : colors.tint,
                        },
                    ]}
                />

                {options.map((option, index) => {
                    const isSelected = index === selectedIndex;
                    return (
                        <ScalePressable
                            key={option.value}
                            onPress={() => onChange(option.value)}
                            style={styles.segmentedOption}
                            innerStyle={{ borderRadius: 7 }}
                            scaleTo={0.98}
                            overlayColor="transparent"
                            accessibilityRole="button"
                            accessibilityLabel={`Card design: ${option.label}`}
                        >
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.segmentedText,
                                    {
                                        color: isSelected
                                            ? theme === 'dark'
                                                ? colors.tint
                                                : '#fff'
                                            : colors.secondary,
                                    },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </ScalePressable>
                    );
                })}
            </View>

            <Animated.View
                key={value}
                entering={FadeIn.duration(160)}
            >
                <Text
                    allowFontScaling={false}
                    style={[
                        styles.choiceDescription,
                        { color: colors.textTertiary },
                    ]}
                >
                    {value === 'list'
                        ? 'A row for each person.'
                        : 'A grid of larger cards.'}
                </Text>
            </Animated.View>
        </View>
    );
}

function GestureCopy() {
    return (
        <StepHeading
            title="Swipe and hold"
            lead="Two gestures to know."
            body="Swipe left on a contact to edit or delete it. Press and hold a group to edit its name, color, and icon."
        />
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingBottom: 8,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingRight: 8,
    },
    backText: {
        marginLeft: 4,
        fontSize: 13,
        fontFamily: Typography.fontFamily.semibold,
    },
    navPlaceholder: {
        width: 48,
        height: 24,
    },
    skipText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.semibold,
    },
    progressTrack: {
        height: 2.5,
        borderRadius: 2,
        marginHorizontal: 24,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 2,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 14,
        paddingBottom: 18,
    },
    column: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    copy: {
        marginTop: 16,
    },
    title: {
        fontSize: 30,
        lineHeight: 36,
        letterSpacing: -0.6,
        fontFamily: Typography.fontFamily.serif,
    },
    titleLarge: {
        fontSize: 32,
        lineHeight: 39,
        letterSpacing: -0.8,
    },
    lead: {
        marginTop: 3,
        fontSize: 16,
        lineHeight: 22,
        fontFamily: Typography.fontFamily.semibold,
    },
    body: {
        marginTop: 8,
        fontSize: 14.5,
        lineHeight: 21.5,
        fontFamily: Typography.fontFamily.regular,
    },
    summary: {
        marginTop: 12,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: Typography.fontFamily.medium,
    },
    hintRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
    },
    hintIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    hintText: {
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.semibold,
    },
    choiceLabel: {
        marginTop: 16,
        fontSize: 11.5,
        fontFamily: Typography.fontFamily.semibold,
    },
    segmentedContainer: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 4,
        marginTop: 6,
        overflow: 'hidden',
    },
    segmentedPill: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        borderRadius: 7,
    },
    segmentedOption: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
    },
    segmentedText: {
        fontSize: 13,
        fontFamily: Typography.fontFamily.bold,
        textAlign: 'center',
    },
    choiceDescription: {
        marginTop: 6,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: Typography.fontFamily.medium,
    },
    footer: {
        paddingTop: 12,
        paddingHorizontal: 24,
    },
    footerColumn: {
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
    },
    primaryButton: {
        borderRadius: 18,
    },
});
