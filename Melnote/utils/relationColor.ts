export const getRelationColor = (
    type: string | null | undefined,
    defaultTint: string
): string => {
    if (!type) return defaultTint;
    const lower = type.toLowerCase().trim();
    if (
        lower.includes('family') ||
        lower.includes('sister') ||
        lower.includes('brother') ||
        lower.includes('mom') ||
        lower.includes('dad') ||
        lower.includes('parent') ||
        lower.includes('cousin')
    ) {
        return '#F43F5E'; // Warm Rose
    }
    if (
        lower.includes('work') ||
        lower.includes('colleague') ||
        lower.includes('coworker') ||
        lower.includes('boss')
    ) {
        return '#0EA5E9'; // Sky Blue
    }
    if (
        lower.includes('mentor') ||
        lower.includes('advisor') ||
        lower.includes('teacher')
    ) {
        return '#8B5CF6'; // Violet
    }
    if (
        lower.includes('partner') ||
        lower.includes('spouse') ||
        lower.includes('love')
    ) {
        return '#EC4899'; // Pink
    }
    if (lower.includes('friend') || lower.includes('bestie')) {
        return defaultTint; // Amber / Preset Tint
    }
    return defaultTint;
};
