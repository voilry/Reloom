import React from 'react';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '../components/onboarding/OnboardingScreen';

export default function OnboardingRoute() {
    const router = useRouter();

    return (
        <OnboardingScreen
            onDone={() => {
                if (router.canGoBack()) {
                    router.back();
                } else {
                    router.replace('/(tabs)');
                }
            }}
        />
    );
}
