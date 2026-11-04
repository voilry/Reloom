import { useState, useEffect } from 'react';
import { Appearance, AppState } from 'react-native';

/**
 * Resilient hook that reliably tracks active system color scheme.
 * Listens to Appearance changes and polls/refreshes on AppState active resume
 * to ensure background/quick-settings theme switches are immediately reflected.
 */
export function useActiveColorScheme(): 'light' | 'dark' {
    const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
        return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        const updateScheme = (scheme?: string | null) => {
            const current = scheme !== undefined ? scheme : Appearance.getColorScheme();
            setColorScheme(current === 'dark' ? 'dark' : 'light');
        };

        const appearanceListener = Appearance.addChangeListener(({ colorScheme: newScheme }) => {
            updateScheme(newScheme);
        });

        const appStateListener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                updateScheme();
            }
        });

        return () => {
            appearanceListener.remove();
            appStateListener.remove();
        };
    }, []);

    return colorScheme;
}
