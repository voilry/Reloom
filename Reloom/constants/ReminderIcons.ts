import React from 'react';
import {
    Bell, Calendar, Clock, Heart, Coffee, Star,
    Basket, Wallet, Celebrate, Comment, Leaf,
    Cake, Gift, Briefcase, Target,
} from '@/components/ui/Icon';

export const REMINDER_ICONS: Record<string, React.ComponentType<any>> = {
    Bell,
    Calendar,
    Clock,
    Heart,
    Coffee,
    Star,
    basket_fill: Basket,
    wallet_2_fill: Wallet,
    celebrate_fill: Celebrate,
    comment_2_fill: Comment,
    leaf_3_fill: Leaf,
    // Aliases
    Basket,
    Wallet,
    Celebrate,
    Comment,
    Leaf,
    // Backwards compatibility for previously saved reminders
    Cake,
    Gift,
    Briefcase,
    Target,
};

export const REMINDER_ICON_KEYS = [
    'Bell',
    'Calendar',
    'Clock',
    'Heart',
    'Coffee',
    'Star',
    'basket_fill',
    'wallet_2_fill',
    'celebrate_fill',
    'comment_2_fill',
    'leaf_3_fill',
];

export const REMINDER_COLORS = [
    { name: 'Amber', value: '#F59E0B' },
    { name: 'Orange', value: '#F97316' },
    { name: 'Red', value: '#EF4444' },
    { name: 'Pink', value: '#EC4899' },
    { name: 'Violet', value: '#8B5CF6' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Teal', value: '#0D9488' },
    { name: 'Emerald', value: '#10B981' },
];

export function getReminderIcon(iconName?: string | null): React.ComponentType<any> {
    if (!iconName) return Bell;
    if (REMINDER_ICONS[iconName]) return REMINDER_ICONS[iconName];
    const lower = iconName.toLowerCase();
    for (const [k, v] of Object.entries(REMINDER_ICONS)) {
        if (k.toLowerCase() === lower) return v;
    }
    const clean = lower.replace(/_fill$/, '').replace(/_line$/, '');
    for (const [k, v] of Object.entries(REMINDER_ICONS)) {
        if (k.toLowerCase().replace(/_fill$/, '') === clean) return v;
    }
    return Bell;
}

