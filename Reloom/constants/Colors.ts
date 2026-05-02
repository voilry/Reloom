export const baseLightColors = {
    text: '#1A1410', // Deep warm espresso black
    textSecondary: '#6B5E55', // Deeper warm brown secondary (readable)
    textTertiary: '#9C928A',
    background: '#F8F3EB', // Warm linen ivory
    tint: '#B45309', // Deep Amber (user's preferred brown)
    icon: '#5C534C', // Warm brown icon tone
    tabIconDefault: '#9C928A',
    tabIconSelected: '#B45309',
    border: '#E5DFD4', // Warm tan border
    card: '#EEE8DE', // Slightly darker warm cream for cards
    surface: '#F2EDE4', // Lighter warm surface (search bar, pills — lighter than cards)
    primary: '#1A1410',
    secondary: '#6B5E55', // Deeper warm brown
    error: '#DC2626',
    warning: '#D97706',
    success: '#059669',
    info: '#2563EB',
};

export const baseDarkColors = {
    text: '#FFFFFF', // High contrast white
    textSecondary: '#D6D1CC', // Much brighter secondary text
    textTertiary: '#A39D96', // Mid grey
    background: '#000000', // Pure OLED Black for maximum pop
    tint: '#FBBF24', // Extra Vibrant Gold
    icon: '#F5F5F5',
    tabIconDefault: '#736D66',
    tabIconSelected: '#FBBF24',
    border: '#3D3935', // More visible dark border
    card: '#161514', // Lighter / More distinct card surface
    surface: '#22201F', // Distinct navigation/header surfaces
    primary: '#FFFFFF',
    secondary: '#D6D1CC',
    error: '#EF4444',
    warning: '#FCD34D',
    success: '#34D399',
    info: '#60A5FA',
};

export const ThemePresets: Record<string, { light: typeof baseLightColors, dark: typeof baseDarkColors }> = {
    default: {
        light: baseLightColors,
        dark: baseDarkColors,
    },
    ocean: {
        light: {
            ...baseLightColors,
            background: '#F9FAFC', 
            surface: '#F1F4F8',    
            card: '#EAEFF4',       
            border: '#DCE2EA',     
            text: '#1C212B',       
            textSecondary: '#4F5968', 
            textTertiary: '#828C9A',  
            icon: '#3B4554',       
            primary: '#1C212B',
            secondary: '#4F5968',
            tint: '#0284C7',       
            tabIconSelected: '#0284C7',
            tabIconDefault: '#828C9A',
        },
        dark: {
            ...baseDarkColors,
            background: '#0F0F0F', 
            card: '#1E1E1E',       
            surface: '#262626', 
            border: '#323232',     
            tint: '#38BDF8',       
            tabIconSelected: '#38BDF8',
        }
    },
    forest: {
        light: {
            ...baseLightColors,
            background: '#F9FCFA', 
            surface: '#F1F7F4',    
            card: '#E9F2EC',       
            border: '#D8E5DD',
            text: '#1C2621',       
            textSecondary: '#4E5C53', 
            textTertiary: '#818F86',
            icon: '#394A41',
            primary: '#1C2621',
            secondary: '#4E5C53',
            tint: '#059669',       
            tabIconSelected: '#059669',
            tabIconDefault: '#818F86',
        },
        dark: {
            ...baseDarkColors,
            tint: '#10B981',       
            tabIconSelected: '#10B981',
        }
    },
    rose: {
        light: {
            ...baseLightColors,
            background: '#FFFBFB', 
            surface: '#FAEBEE',    
            card: '#FFF9FA',       // Lightest floating card
            border: '#F2D8DC',     
            text: '#3B141C',       
            textSecondary: '#6A4349', 
            textTertiary: '#9E7A80',  
            icon: '#5D2F37',       
            primary: '#3B141C',
            secondary: '#6A4349',
            tint: '#F43F5E',       
            tabIconSelected: '#F43F5E',
            tabIconDefault: '#9E7A80',
        },
        dark: {
            ...baseDarkColors,
            background: '#0F0F0F', 
            card: '#1E1E1E',       
            surface: '#262626', 
            border: '#323232',     
            tint: '#FB7185',       
            tabIconSelected: '#FB7185',
        }
    }
};

export const Colors = {
    // Premium Obsidian & Warm Amber palette with Enhanced Contrast
    palette: {
        obsidian: {
            50: '#FFFFFF', // True white for dark mode text
            100: '#F5F5F3', // Cleaner surface back
            200: '#E8E8E4', // Neutral border
            300: '#D6D1CC',
            400: '#8E8881', // Darkened for light mode secondary
            500: '#736D66',
            600: '#4D4843', // Darkened for better contrast
            700: '#3D3935',
            800: '#1D1B1A',
            900: '#121110',
            950: '#050505', // Slightly richer black
        },
        amber: {
            400: '#FBBF24', // Brighter Gold
            500: '#F59E0B',
            600: '#D97706',
        },
        rose: '#F43F5E',
        emerald: '#10B981',
    },
    presets: ThemePresets,
    light: baseLightColors,
    dark: baseDarkColors,
};
