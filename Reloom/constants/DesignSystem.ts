import { Platform } from 'react-native';

export const DesignSystem = {
    spacing: {
        none: 0,
        xs: 4,
        sm: 8,
        md: 12, // Adjusted from 16 to 12 for tighter mobile density
        lg: 16,
        xl: 24,
        '2xl': 32,
        '3xl': 48,
        huge: 64,
    },
    radius: {
        xs: 5,
        sm: 10,
        md: 14,
        lg: 20,
        xl: 28,
        '2xl': 36,
        full: 9999,
    },
    shadows: {
        none: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        xs: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        sm: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        md: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        lg: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
        xl: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
            elevation: 0,
        },
    },
    animation: {
        durations: {
            fast: 150,
            normal: 300,
            slow: 500,
        },
        easing: {
            spring: {
                damping: 20,
                stiffness: 90,
            }
        },
        springs: {
            heavy: {
                damping: 25,
                mass: 1.6,
                stiffness: 180,
            },
            bouncy: {
                damping: 15,
                mass: 1.0,
                stiffness: 200,
            },
            light: {
                damping: 20,
                mass: 0.5,
                stiffness: 150,
            },
            fast: {
                damping: 15,
                mass: 0.6,
                stiffness: 350,
            }
        }
    },
    glass: {
        light: {
            backgroundColor: 'rgba(253, 252, 251, 0.8)', // Ivory 80%
            ...Platform.select({
                ios: {
                    shadowColor: '#121110',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                },
                android: {
                    elevation: 4,
                },
            }),
        },
        dark: {
            backgroundColor: 'rgba(18, 17, 16, 0.8)', // Obsidian 80%
            ...Platform.select({
                ios: {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.5,
                    shadowRadius: 20,
                },
                android: {
                    elevation: 4,
                },
            }),
        },
    }
};
