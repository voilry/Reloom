import { DarkTheme, DefaultTheme, ThemeProvider, Theme } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { useColorScheme, View, Platform, Text } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '../db/index';
import migrations from '../drizzle/migrations';
import { Colors } from '../constants/Colors';
import { SettingsProvider, useSettings } from '../store/SettingsContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { AppLock } from '../components/AppLock';
import { Toast } from '../components/ui/Toast';
import { 
  Figtree_400Regular,
  Figtree_400Regular_Italic,
  Figtree_500Medium, 
  Figtree_600SemiBold, 
  Figtree_700Bold,
  Figtree_700Bold_Italic
} from '@expo-google-fonts/figtree';
import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Fraunces_700Bold, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutContent() {
  const { settings, isLoading: settingsLoading, refreshKey } = useSettings();
  const { colors: appColors, isDark } = useAppTheme();
  
  // Track if we are fully ready to show the app
  const [isReady, setIsReady] = useState(false);

  const [loaded, fontError] = useFonts({
    'Figtree-Regular': Figtree_400Regular,
    'Figtree-Italic': Figtree_400Regular_Italic,
    'Figtree-Medium': Figtree_500Medium,
    'Figtree-SemiBold': Figtree_600SemiBold,
    'Figtree-Bold': Figtree_700Bold,
    'Figtree-BoldItalic': Figtree_700Bold_Italic,
    'Display-Bold': BricolageGrotesque_700Bold,
    'Display-ExtraBold': BricolageGrotesque_800ExtraBold,
    'Serif-Bold': Fraunces_700Bold,
    'Serif-Black': Fraunces_900Black,
    'MingCute': require('../assets/fonts/MingCute.ttf'),
  });

  const { success: migrationSuccess, error: migrationError } = useMigrations(db, migrations);

  useEffect(() => {
    if (fontError) {
      console.error("Font loading error:", fontError);
    }
  }, [fontError]);

  useEffect(() => {
    if (migrationError) {
      console.error("Migration error:", migrationError);
    }
  }, [migrationError]);

  const { checkForUpdates } = useSettings();

  useEffect(() => {
    if (isReady) {
      const timer = setTimeout(() => {
        checkForUpdates();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  useEffect(() => {
    async function prepare() {
      // Wait for everything: Fonts, Migrations, and Settings
      if ((loaded || fontError) && (migrationSuccess || migrationError) && !settingsLoading) {
        // A small delay (50ms) ensures the view has actually painted the internal theme color
        setTimeout(async () => {
          await SplashScreen.hideAsync();
          setIsReady(true);
        }, 50);
      }
    }
    prepare();
  }, [loaded, fontError, migrationSuccess, migrationError, settingsLoading]);

  if (fontError || migrationError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: appColors.background }}>
        <Text style={{ fontSize: 18, color: 'red', marginHorizontal: 20, textAlign: 'center' }}>
          Startup Error: {fontError?.message || migrationError?.message || "Unknown error"}
        </Text>
      </View>
    );
  }

  // While loading OR before the hideAsync is finished, show a View with the static splash color
  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: '#c9803a' }} />;
  }

  // Custom Navigation Themes to match our App Theme
  const MyLightTheme: Theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: appColors.tint,
      background: appColors.background,
      card: appColors.card,
      text: appColors.text,
      border: appColors.border,
      notification: appColors.error,
    },
  };

  const MyDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: appColors.tint,
      background: appColors.background,
      card: appColors.card,
      text: appColors.text,
      border: appColors.border,
      notification: appColors.error,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: appColors.background }} key={refreshKey}>
      <ThemeProvider value={isDark ? MyDarkTheme : MyLightTheme}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: appColors.background,
            },
            headerTintColor: appColors.text,
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: appColors.background,
            },
            animation: 'fade',
            animationDuration: 150,
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="journal/[id]" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="person/[id]" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="person/[id]/locations" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="person/[id]/relations" options={{ headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings', headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="settings/appearance" options={{ title: 'Appearance', headerShown: false, presentation: 'card' }} />
          <Stack.Screen
            name="editor"
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
              sheetGrabberVisible: true
            }}
          />
        </Stack>
      </ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <RootLayoutContent />
        <AppLock />
        <Toast />
      </SettingsProvider>
    </GestureHandlerRootView>
  );
}
