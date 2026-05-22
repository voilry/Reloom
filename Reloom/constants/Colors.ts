export const baseLightColors = {
    text: '#1A1410', // Deep warm espresso black
    textSecondary: '#6B5E55', // Deeper warm brown secondary (readable)
    textTertiary: '#9C928A',
    background: '#F8F3EB', // Warm linen ivory (restored original background)
    tint: '#B45309', // Deep Amber (user's preferred brown)
    icon: '#5C534C', // Warm brown icon tone
    tabIconDefault: '#9C928A',
    tabIconSelected: '#B45309',
    border: '#E5DFD4', // Warm tan divider/selected border tone (restored)
    card: '#EEE8DE', // Warm cream/tan card backdrop (restored)
    surface: '#F2EDE4', // Warm sand surface (for search bar, pills, secondary buttons) (restored)
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
    background: '#121211', // Almost imperceptible Amber shift
    tint: '#FBBF24', // Extra Vibrant Gold
    icon: '#F5F5F5',
    tabIconDefault: '#909090',
    tabIconSelected: '#FBBF24',
    border: '#333333', // Visible border
    card: '#1C1C1B', // Barely-there warm charcoal
    surface: '#242423', // Subtle surface lift
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
            background: '#F2F5FA', // Warm ice-blue-tinted ivory paper (96.5% light)
            surface: '#E5EAF2',    // Soft ice blue surface (92.4% light)
            card: '#DDE3EC',       // Rich steel blue card (89.6% light)
            border: '#D0D7E2',     // Cohesive ocean divider & bottom tab border (85.1% light)
            text: '#0F141F',       // Deep ocean navy (high contrast, ~9.4% light)
            textSecondary: '#475160', // Slate blue for improved readability (~32.7% light)
            textTertiary: '#758090',  // Muted slate for metadata/tiny text (~51.2% light)
            icon: '#343E4C',       // Subdued navy-slate icon
            primary: '#0F141F',
            secondary: '#475160',
            tint: '#0284C7',       
            tabIconSelected: '#0284C7',
            tabIconDefault: '#758090',
        },
        dark: {
            ...baseDarkColors,
            background: '#121214', // Almost imperceptible Blue shift
            card: '#1C1C1F',       
            surface: '#242429', 
            border: '#333338',     
            tint: '#38BDF8',       
            tabIconSelected: '#38BDF8',
        }
    },
    forest: {
        light: {
            ...baseLightColors,
            background: '#F2F7F4', // Warm mint-tinted ivory paper (96.1% light)
            surface: '#E3EBE6',    // Soft mint surface (91.8% light)
            card: '#DBE4DE',       // Rich sage green card (89.6% light)
            border: '#CED7D1',     // Cohesive forest divider & bottom tab border (84.7% light)
            text: '#0E1712',       // Deep forest black (high contrast, ~7.5% light)
            textSecondary: '#445249', // Sage green for improved readability (~29.4% light)
            textTertiary: '#718076',  // Muted sage for metadata/tiny text (~47.5% light)
            icon: '#324037',       // Subdued forest-green icon
            primary: '#0E1712',
            secondary: '#445249',
            tint: '#059669',       
            tabIconSelected: '#059669',
            tabIconDefault: '#718076',
        },
        dark: {
            ...baseDarkColors,
            background: '#121412', // Almost imperceptible Green shift
            card: '#1C211C',       
            surface: '#242B24', 
            border: '#2C332C',     
            tint: '#10B981',       
            tabIconSelected: '#10B981',
        }
    },
    rose: {
        light: {
            ...baseLightColors,
            background: '#FCEEEF', // Warm rose-tinted ivory paper (96.9% light)
            surface: '#F5E2E4',    // Soft rose surface (92.4% light)
            card: '#F1DADB',       // Rich rose card (90.0% light)
            border: '#E8CCD0',     // Cohesive rose border/divider (85.1% light)
            text: '#23070C',       // Deep rose-tinted espresso (high contrast, ~8.2% light)
            textSecondary: '#5E383E', // Burgundy for improved readability (~29.4% light)
            textTertiary: '#8C676D',  // Muted rose for metadata/tiny text (~47.8% light)
            icon: '#4E242B',       // Subdued rose-espresso icon
            primary: '#23070C',
            secondary: '#5E383E',
            tint: '#F43F5E',       
            tabIconSelected: '#F43F5E',
            tabIconDefault: '#8C676D',
        },
        dark: {
            ...baseDarkColors,
            background: '#141212', // Almost imperceptible Rose shift
            card: '#211C1C',       
            surface: '#2B2424', 
            border: '#332C2C',     
            tint: '#FB7185',       
            tabIconSelected: '#FB7185',
        }
    },
    lavender: {
        light: {
            ...baseLightColors,
            background: '#F5F2FC', // Warm lilac-tinted ivory paper (96.9% light)
            surface: '#EBE5F7',    // Soft lilac surface (93.3% light)
            card: '#E3DBF3',       // Rich lavender card (90.6% light)
            border: '#D7CCEB',     // Cohesive lavender border/divider (85.3% light)
            text: '#120A1E',       // Deep lavender-tinted black (high contrast, ~7.5% light)
            textSecondary: '#4A4057', // Plum for improved readability (~29.4% light)
            textTertiary: '#776C87',  // Muted lavender for metadata/tiny text (~47.8% light)
            icon: '#3B3147',       // Subdued lavender-plum icon
            primary: '#120A1E',
            secondary: '#4A4057',
            tint: '#8B5CF6',       
            tabIconSelected: '#8B5CF6',
            tabIconDefault: '#776C87',
        },
        dark: {
            ...baseDarkColors,
            background: '#121115', // Almost imperceptible Purple/Lavender shift
            card: '#1B1A1E',       
            surface: '#242229', 
            border: '#33303B',     
            tint: '#A78BFA',       
            tabIconSelected: '#A78BFA',
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
