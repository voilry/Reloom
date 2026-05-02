import { Platform } from 'react-native';

const fontMain = 'Figtree-Regular';

export const Typography = {
    fontFamily: {
        regular: 'Figtree-Regular',
        italic: 'Figtree-Italic',
        medium: 'Figtree-Medium',
        semibold: 'Figtree-SemiBold',
        bold: 'Figtree-Bold',
        boldItalic: 'Figtree-BoldItalic',
        display: 'Display-Bold',
        serif: 'Serif-Bold',
    },
    // Font Weights
    weight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        heavy: '800',
    } as const,
    // Font Sizes
    size: {
        xs: 12,
        sm: 13, // Slightly smaller for dense info
        base: 15, // Standard body
        lg: 17, // Standard headers
        xl: 20,
        '2xl': 24,
        '3xl': 32,
        '4xl': 40,
    },
    lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.6,
    },
};
