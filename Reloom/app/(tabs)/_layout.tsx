import { Tabs, useRouter } from 'expo-router';
import { Users, Calendar, BookOpen, Plus, User as UserIcon, PencilLine as PenLine, AddressBook, Bell, Book, X } from 'phosphor-react-native';
import { useAppTheme } from '../../hooks/useAppTheme';
import { Platform, View, TouchableOpacity, StyleSheet, Modal, DeviceEventEmitter, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ScalePressable } from '../../components/ui/ScalePressable';
import { useSettings } from '../../store/SettingsContext';
import { useState, useEffect } from 'react';
import Animated, { FadeIn, FadeOut, FadeInUp, FadeOutDown, SlideInDown, SlideOutDown, ZoomIn, ZoomOut, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { DesignSystem } from '../../constants/DesignSystem';
import { ThemedText } from '../../components/ui/ThemedText';
import { Typography } from '../../constants/Typography';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BAR_WIDTH = 180;
const BAR_HEIGHT = 56;
const ADD_BUTTON_SIZE = 46; // <-- Change this to adjust the + button size
const GAP_BETWEEN_NAV_AND_BUTTON = 4; // <-- Change this to adjust the distance between navigation and + button

const ICONS: Record<string, any> = {
    index: Users,
    calendar: Calendar,
    journal: BookOpen,
};

function MenuOption({ icon, title, onPress }: any) {
    return (
        <ScalePressable
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 22, paddingHorizontal: 16, borderRadius: 20 }}
            onPress={onPress}
            innerStyle={{ borderRadius: 20 }}
            scaleTo={0.96}
        >
            <View style={{ width: 24, alignItems: 'center', marginRight: 16 }}>
                {icon}
            </View>
            <View style={{ flex: 1, justifyContent: 'center' }}>
                <ThemedText style={{ fontSize: 16, fontFamily: Typography.fontFamily.bold, opacity: 0.9 }}>{title}</ThemedText>
            </View>
        </ScalePressable>
    );
}

function CustomTabBar({ state, descriptors, navigation }: any) {
    const { settings } = useSettings();
    const { colors, theme, hapticsEnabled } = useAppTheme();
    const router = useRouter();
    const [showAddMenu, setShowAddMenu] = useState(false);

    const rotation = useSharedValue(0);

    useEffect(() => {
        rotation.value = withSpring(showAddMenu ? 1 : 0);
    }, [showAddMenu]);

    const plusIconStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value * 45}deg` }]
    }));

    // Only show routes that are not hidden
    const visibleRoutes = state.routes.filter((route: any) => {
        const { options } = descriptors[route.key];
        const isJournalHidden = route.name === 'journal' && !settings.showJournalTab;
        const isCalendarHidden = route.name === 'calendar' && !settings.showCalendarTab;
        return options.href !== null && ICONS[route.name] && !isJournalHidden && !isCalendarHidden;
    });

    const currentBarWidth = visibleRoutes.length === 3 ? 180 : (visibleRoutes.length === 2 ? 130 : 80);

    const barBg = theme === 'dark' ? (colors.background === '#000000' ? '#121110' : '#181818') : colors.background;

    const handleAction = (action: string) => {
        setShowAddMenu(false);
        setTimeout(() => {
            if (action === 'quickJournal') {
                router.push({ pathname: '/journal/[id]', params: { id: 'new', edit: 'true' } });
            } else {
                DeviceEventEmitter.emit(`globalAction:${action}`);
            }
        }, 100);
    };

    return (
        <View style={{
            position: 'absolute',
            bottom: 30,
            left: 0,
            right: 0,
            alignItems: 'center', // centers the capsule
            pointerEvents: 'box-none',
            zIndex: 10,
        }}>
            {/* Global Add Menu Overlay (NO MODAL) */}
            {showAddMenu && (
                <View style={{ position: 'absolute', bottom: -30, width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 1.2, pointerEvents: 'box-none' }}>
                    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={StyleSheet.absoluteFill}>
                        <BlurView intensity={theme === 'dark' ? 80 : 50} tint={theme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: theme === 'dark' ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.4)' }]} />
                        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowAddMenu(false)} />
                    </Animated.View>

                    {/* The sleek menu card */}
                    <Animated.View entering={FadeInUp.duration(300)} exiting={FadeOutDown.duration(200)} style={{ position: 'absolute', bottom: 100, left: 20, right: 20, alignItems: 'center', pointerEvents: 'box-none' }}>
                        <View style={{ width: '100%', maxWidth: 300, backgroundColor: colors.card, borderRadius: 28, padding: 8, borderColor: colors.border, borderWidth: theme === 'light' ? 1 : 0, ...DesignSystem.shadows.xl }}>

                            <MenuOption icon={<UserIcon size={22} color={colors.tint} />} title="New Person" onPress={() => handleAction('newPerson')} />
                            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, opacity: theme === 'dark' ? 0.6 : 1.0 }} />

                            <MenuOption icon={<PenLine size={22} color="#6366f1" />} title="Quick Note" onPress={() => handleAction('quickNote')} />
                            <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, opacity: theme === 'dark' ? 0.6 : 1.0 }} />

                            <MenuOption icon={<AddressBook size={22} color="#f59e0b" />} title="Quick Contact" onPress={() => handleAction('quickContact')} />

                            {settings.showCalendarTab && (
                                <>
                                    <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, opacity: theme === 'dark' ? 0.6 : 1.0 }} />
                                    <MenuOption icon={<Bell size={22} color="#ef4444" />} title="Set Reminder" onPress={() => handleAction('setReminder')} />
                                </>
                            )}

                            {settings.showJournalTab && (
                                <>
                                    <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 16, opacity: theme === 'dark' ? 0.6 : 1.0 }} />
                                    <MenuOption icon={<Book size={22} color="#10b981" />} title="Quick Journal" onPress={() => handleAction('quickJournal')} />
                                </>
                            )}

                        </View>
                    </Animated.View>
                </View>
            )}

            {/* Nav Pill and Detached Button */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: GAP_BETWEEN_NAV_AND_BUTTON, pointerEvents: 'box-none' }}>
                <View style={{
                    flexDirection: 'row',
                    height: BAR_HEIGHT,
                    width: currentBarWidth,
                    borderRadius: BAR_HEIGHT / 2,
                    backgroundColor: barBg,
                    borderWidth: theme === 'dark' ? 0 : 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                }}>
                    {visibleRoutes.map((route: any) => {
                        const isFocused = state.routes[state.index]?.name === route.name;
                        const Icon = ICONS[route.name];

                        const activeColor = colors.tint;
                        const inactiveColor = theme === 'dark' ? 'rgba(255,255,255,0.38)' : colors.tabIconDefault;

                        const onPress = () => {
                            if (hapticsEnabled && Platform.OS !== 'web') {
                                Haptics.selectionAsync();
                            }
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate({ name: route.name, merge: true });
                            }
                        };

                        return (
                            <ScalePressable
                                key={route.key}
                                onPress={onPress}
                                scale={true}
                                scaleTo={0.82}
                                haptic={false}
                                overlayColor="transparent"
                                style={{
                                    flex: 1,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: BAR_HEIGHT,
                                }}
                                innerStyle={{ borderRadius: 22 }}
                            >
                                {/* Outer clips the shape — inner fills color. Splitting these is the fix for Android borderRadius re-render bug */}
                                <View style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 22,
                                    overflow: 'hidden',
                                    // SVG dynamic key to handle Android caching bugs
                                }}>
                                    <View style={{
                                        flex: 1,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: isFocused ? colors.tint + '25' : 'transparent',
                                    }}>
                                        <Icon
                                            key={isFocused ? 'fill' : 'regular'}
                                            size={22}
                                            color={isFocused ? activeColor : inactiveColor}
                                            weight={isFocused ? 'fill' : 'regular'}
                                        />
                                    </View>
                                </View>
                            </ScalePressable>
                        );
                    })}
                </View>

                {/* Detached Add Button - Combined solid background with ScalePressable to fix scaling and transparency */}
                <ScalePressable
                    onPress={() => {
                        if (hapticsEnabled && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowAddMenu(!showAddMenu);
                    }}
                    scaleTo={0.88}
                    style={{
                        width: ADD_BUTTON_SIZE,
                        height: ADD_BUTTON_SIZE,
                        borderRadius: ADD_BUTTON_SIZE / 2,
                        backgroundColor: barBg,
                        justifyContent: 'center',
                        alignItems: 'center',
                        overflow: 'hidden',
                    }}
                    innerStyle={{ borderRadius: ADD_BUTTON_SIZE / 2 }}
                    hapticStyle={Haptics.ImpactFeedbackStyle.Medium}
                >
                    {/* The Tint Overlay - This is the "design" part */}
                    <View style={{
                        ...StyleSheet.absoluteFillObject,
                        backgroundColor: showAddMenu ? colors.tint : (colors.tint + '25'),
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}>
                        <Animated.View style={plusIconStyle}>
                            <Plus size={ADD_BUTTON_SIZE * 0.45} color={showAddMenu ? (theme === 'dark' ? '#000' : '#fff') : colors.tint} weight="bold" />
                        </Animated.View>
                    </View>
                </ScalePressable>
            </View>
        </View>
    );
}

export default function TabLayout() {
    const { settings } = useSettings();
    return (
        <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                sceneStyle: { backgroundColor: 'transparent' },
            }}
        >
            <Tabs.Screen name="index" options={{ title: 'People' }} />
            <Tabs.Screen name="graph" options={{ href: null }} />
            <Tabs.Screen name="calendar" options={{ 
                title: 'Calendar',
                href: settings.showCalendarTab ? undefined : null
            }} />
            <Tabs.Screen name="journal" options={{
                title: 'Journal',
                href: settings.showJournalTab ? undefined : null
            }} />
        </Tabs>
    );
}
