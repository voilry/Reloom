import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../../store/SettingsContext';
import { useAppTheme } from '../../hooks/useAppTheme';
import { ThemedText } from '../ui/ThemedText';
import { ThemedView } from '../ui/ThemedView';
import { Button } from '../ui/Button';
import { Icon, List, Mosaic } from '../ui/Icon';
import { ScalePressable } from '../ui/ScalePressable';
import { Typography } from '../../constants/Typography';
import { DesignSystem } from '../../constants/DesignSystem';
import { OnboardingStage } from './OnboardingStage';

interface OnboardingScreenProps {
    onDone?: () => void;
}

const CTA_LABELS = [
    'Get started',
    'Next',
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
        progress.value = withTiming((step + 1) / 5, {
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
        if (step >= 4) {
            finish();
            return;
        }
        if (advancing.current) return;
        advancing.current = true;
        setStep((current) => Math.min(4, current + 1));
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

                    {step < 4 ? (
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
                    contentContainerStyle={[
                        styles.scrollContent,
                        step === 4 && styles.betaScrollContent,
                    ]}
                >
                    {step === 4 ? (
                        <BetaStep />
                    ) : (
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
                    )}
                </ScrollView>

                <View
                    style={[
                        styles.footer,
                        {
                            paddingBottom: insets.bottom + 30,
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
    return (
        <StepHeading
            title="Welcome to Melnote"
            lead="Keep track of your people."
            body="People, notes, journals, contacts, and reminders in one place."
            large
        />
    );
}

function QuickNoteCopy() {
    const { colors } = useAppTheme();

    return (
        <View>
            <StepHeading
                title="Quick Note"
                lead="Write it down in seconds."
                body="Add a small detail, a gift idea, or something to follow up on. It stays on their profile."
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
    const { colors } = useAppTheme();
    const [selected, setSelected] = useState<'list' | 'gallery'>(value);
    const options = [
        { label: 'List', value: 'list' as const, icon: List },
        { label: 'Gallery', value: 'gallery' as const, icon: Mosaic },
    ];

    useEffect(() => {
        setSelected(value);
    }, [value]);

    const handleSelect = (next: 'list' | 'gallery') => {
        if (next === selected) return;
        setSelected(next);
        requestAnimationFrame(() => onChange(next));
    };

    return (
        <View style={styles.choiceRow}>
            {options.map((option) => {
                const isSelected = selected === option.value;
                const OptionIcon = option.icon;
                return (
                    <ScalePressable
                        key={option.value}
                        onPress={() => handleSelect(option.value)}
                        style={[
                            styles.choiceButton,
                            {
                                backgroundColor: isSelected
                                    ? colors.tint + '18'
                                    : colors.surface,
                                borderColor: isSelected
                                    ? colors.tint
                                    : 'transparent',
                            },
                        ]}
                        innerStyle={{ borderRadius: 12.5 }}
                        scaleTo={0.94}
                        springConfig={DesignSystem.animation.springs.press}
                        accessibilityRole="button"
                        accessibilityLabel={`Card design: ${option.label}`}
                    >
                        <View style={styles.choiceButtonContent}>
                            <OptionIcon
                                size={19}
                                color={
                                    isSelected
                                        ? colors.tint
                                        : colors.secondary
                                }
                                weight={isSelected ? 'fill' : 'line'}
                            />
                            <Text
                                allowFontScaling={false}
                                style={[
                                    styles.choiceButtonText,
                                    {
                                        color: isSelected
                                            ? colors.tint
                                            : colors.secondary,
                                    },
                                ]}
                            >
                                {option.label}
                            </Text>
                        </View>
                    </ScalePressable>
                );
            })}
        </View>
    );
}

function GestureCopy() {
    return (
        <StepHeading
            title="Swipe and hold"
            lead="Two gestures to know."
            body="Swipe left on contacts to edit or delete them. Notes and journal entries delete with the same swipe. Press and hold a person or group to manage it."
        />
    );
}

function BetaStep() {
    return (
        <Animated.View
            entering={FadeInDown.duration(300)
                .springify()
                .damping(24)
                .stiffness(220)
                .mass(0.8)}
            style={styles.betaColumn}
        >
            <StepHeading
                title="Melnote is in beta"
                lead="Expect bugs and issues."
                body="Thanks for trying it early. If something feels off, let me know."
            />

            <Image
                source={require('../../assets/Notice-icon.png')}
                style={styles.betaImage}
                resizeMode="contain"
                accessible={false}
            />
        </Animated.View>
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
        paddingVertical: 4,
    },
    backText: {
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
    betaScrollContent: {
        flexGrow: 1,
    },
    betaColumn: {
        flex: 1,
        width: '100%',
        maxWidth: 520,
        alignSelf: 'center',
        justifyContent: 'center',
        paddingBottom: 12,
    },
    betaImage: {
        width: 220,
        height: 220,
        alignSelf: 'center',
        marginTop: 28,
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
    choiceRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 16,
    },
    choiceButton: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1.5,
        paddingVertical: 11,
        paddingHorizontal: 12,
    },
    choiceButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
    },
    choiceButtonText: {
        fontSize: 13.5,
        fontFamily: Typography.fontFamily.semibold,
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
