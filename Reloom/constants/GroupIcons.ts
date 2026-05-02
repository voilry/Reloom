import {
    Users, Suitcase, Heart, House, Globe, Sparkle,
    GraduationCap, Briefcase, Folder, Airplane,
    Palette, MusicNotes, Star, FirstAid, Plus,
    Lightning, Coffee, MusicNote, BookOpen, Smiley
} from 'phosphor-react-native';

export const GROUP_ICONS: Record<string, React.ComponentType<any>> = {
    Users,
    Suitcase,
    Heart,
    House,
    Globe,
    Sparkle,
    GraduationCap,
    Briefcase,
    Folder,
    Airplane,
    Palette,
    MusicNotes,
    Star,
    FirstAid,
    Plus,
    // GroupSelector exact strings mapping:
    Zap: Lightning,
    Coffee,
    Home: House,
    Plane: Airplane,
    Music: MusicNote,
    Book: BookOpen,
    Smile: Smiley
};

export function getGroupIcon(iconName?: string | null): React.ComponentType<any> {
    return (iconName && GROUP_ICONS[iconName]) ? GROUP_ICONS[iconName] : Folder;
}
