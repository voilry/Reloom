import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import mapping from './mingcute_mapping.json';

export type IconName = keyof typeof mapping;

interface IconProps {
    name: IconName;
    size?: number;
    color?: string;
    style?: TextStyle;
}

export const Icon = ({ name, size = 24, color = '#000', style }: IconProps) => {
    const glyphCode = mapping[name];
    if (!glyphCode) {
        console.warn(`Icon "${String(name)}" not found in MingCute mapping.`);
        return null;
    }

    return (
        <Text
            style={[
                {
                    fontFamily: 'MingCute',
                    fontSize: size,
                    color: color,
                },
                style,
            ]}
        >
            {String.fromCharCode(glyphCode)}
        </Text>
    );
};

// Individual exports for Phosphor compatibility
export const Plus = (props: any) => <Icon name={props.weight === 'fill' ? 'plus_fill' : 'plus_line'} {...props} />;
export const X = (props: any) => <Icon name={props.weight === 'fill' ? 'close_fill' : 'close_line'} {...props} />;
export const Trash = (props: any) => <Icon name={props.weight === 'fill' ? 'delete_2_fill' : 'delete_2_line'} {...props} />;
export const UserPlus = (props: any) => <Icon name={props.weight === 'fill' ? 'user_add_fill' : 'user_add_line'} {...props} />;
export const Users = (props: any) => <Icon name={props.weight === 'fill' ? 'group_fill' : 'group_line'} {...props} />;
export const Calendar = (props: any) => <Icon name={props.weight === 'fill' ? 'calendar_fill' : 'calendar_line'} {...props} />;
export const Clock = (props: any) => <Icon name={props.weight === 'fill' ? 'time_fill' : 'time_line'} {...props} />;
export const MagnifyingGlass = (props: any) => <Icon name={props.weight === 'fill' ? 'search_fill' : 'search_line'} {...props} />;
export const Check = (props: any) => <Icon name={props.weight === 'fill' ? 'check_fill' : 'check_line'} {...props} />;
export const CheckCircle = (props: any) => <Icon name={props.weight === 'fill' ? 'check_circle_fill' : 'check_circle_line'} {...props} />;
export const XCircle = (props: any) => <Icon name={props.weight === 'fill' ? 'close_circle_fill' : 'close_circle_line'} {...props} />;
export const Info = (props: any) => <Icon name={props.weight === 'fill' ? 'information_fill' : 'information_line'} {...props} />;
export const WarningCircle = (props: any) => <Icon name={props.weight === 'fill' ? 'warning_fill' : 'warning_line'} {...props} />;
export const CaretRight = (props: any) => <Icon name={props.weight === 'fill' ? 'right_fill' : 'right_line'} {...props} />;
export const CaretLeft = (props: any) => <Icon name={props.weight === 'fill' ? 'left_fill' : 'left_line'} {...props} />;
export const ArrowLeft = (props: any) => <Icon name={props.weight === 'fill' ? 'arrow_left_fill' : 'arrow_left_line'} {...props} />;
export const House = (props: any) => <Icon name={props.weight === 'fill' ? 'home_3_fill' : 'home_3_line'} {...props} />;
export const Briefcase = (props: any) => <Icon name={props.weight === 'fill' ? 'briefcase_fill' : 'briefcase_line'} {...props} />;
export const Heart = (props: any) => <Icon name={props.weight === 'fill' ? 'heart_fill' : 'heart_line'} {...props} />;
export const Star = (props: any) => <Icon name={props.weight === 'fill' ? 'star_fill' : 'star_line'} {...props} />;
export const Lightning = (props: any) => <Icon name={props.weight === 'fill' ? 'flash_fill' : 'flash_line'} {...props} />;
export const Coffee = (props: any) => <Icon name={props.weight === 'fill' ? 'teacup_fill' : 'teacup_line'} {...props} />;
export const Globe = (props: any) => <Icon name={props.weight === 'fill' ? 'earth_fill' : 'earth_line'} {...props} />;
export const Airplane = (props: any) => <Icon name={props.weight === 'fill' ? 'flight_takeoff_fill' : 'flight_takeoff_line'} {...props} />;
export const MusicNote = (props: any) => <Icon name={props.weight === 'fill' ? 'music_2_fill' : 'music_2_line'} {...props} />;
export const Smiley = (props: any) => <Icon name={props.weight === 'fill' ? 'emoji_fill' : 'emoji_line'} {...props} />;
export const AddressBook = (props: any) => <Icon name={props.weight === 'fill' ? 'contacts_fill' : 'contacts_line'} {...props} />;
export const LockKey = (props: any) => <Icon name={props.weight === 'fill' ? 'lock_fill' : 'lock_line'} {...props} />;
export const LockKeyOpen = (props: any) => <Icon name={props.weight === 'fill' ? 'unlock_fill' : 'unlock_line'} {...props} />;
export const Fingerprint = (props: any) => <Icon name={props.weight === 'fill' ? 'fingerprint_fill' : 'fingerprint_line'} {...props} />;
export const Backspace = (props: any) => <Icon name={props.weight === 'fill' ? 'backspace_fill' : 'backspace_line'} {...props} />;
export const Bell = (props: any) => <Icon name={props.weight === 'fill' ? 'notification_fill' : 'notification_line'} {...props} />;
export const BookOpen = (props: any) => <Icon name={props.weight === 'fill' ? 'book_2_fill' : 'book_2_line'} {...props} />;
export const Folder = (props: any) => <Icon name={props.weight === 'fill' ? 'folder_fill' : 'folder_line'} {...props} />;
export const User = (props: any) => <Icon name={props.weight === 'fill' ? 'user_2_fill' : 'user_2_line'} {...props} />;
export const MapPin = (props: any) => <Icon name={props.weight === 'fill' ? 'location_fill' : 'location_line'} {...props} />;
export const ArrowsOutSimple = (props: any) => <Icon name={props.weight === 'fill' ? 'fullscreen_fill' : 'fullscreen_line'} {...props} />;
export const PencilSimple = (props: any) => <Icon name={props.weight === 'fill' ? 'edit_2_fill' : 'edit_2_line'} {...props} />;
export const Pencil = (props: any) => <Icon name={props.weight === 'fill' ? 'edit_fill' : 'edit_line'} {...props} />;
export const Phone = (props: any) => <Icon name={props.weight === 'fill' ? 'phone_fill' : 'phone_line'} {...props} />;
export const EnvelopeSimple = (props: any) => <Icon name={props.weight === 'fill' ? 'mail_fill' : 'mail_line'} {...props} />;
export const InstagramLogo = (props: any) => <Icon name={props.weight === 'fill' ? 'instagram_fill' : 'instagram_line'} {...props} />;
export const FacebookLogo = (props: any) => <Icon name={props.weight === 'fill' ? 'facebook_fill' : 'facebook_line'} {...props} />;
export const TiktokLogo = (props: any) => <Icon name={props.weight === 'fill' ? 'tiktok_fill' : 'tiktok_line'} {...props} />;
export const WhatsappLogo = (props: any) => <Icon name={props.weight === 'fill' ? 'whatsapp_fill' : 'whatsapp_line'} {...props} />;
export const LinkedinLogo = (props: any) => <Icon name={props.weight === 'fill' ? 'linkedin_fill' : 'linkedin_line'} {...props} />;
export const DotsThree = (props: any) => <Icon name={props.weight === 'fill' ? 'more_1_fill' : 'more_1_line'} {...props} />;
export const DotsThreeVertical = (props: any) => <Icon name={props.weight === 'fill' ? 'more_2_fill' : 'more_2_line'} {...props} />;
export const ChatCenteredText = (props: any) => <Icon name={props.weight === 'fill' ? 'chat_1_fill' : 'chat_1_line'} {...props} />;
export const Rocket = (props: any) => <Icon name={props.weight === 'fill' ? 'rocket_fill' : 'rocket_line'} {...props} />;
export const CloudArrowUp = (props: any) => <Icon name={props.weight === 'fill' ? 'cloud_upload_fill' : 'cloud_upload_line'} {...props} />;
export const ArrowsLeftRight = (props: any) => <Icon name={props.weight === 'fill' ? 'transfer_fill' : 'transfer_line'} {...props} />;
export const CaretUp = (props: any) => <Icon name={props.weight === 'fill' ? 'up_fill' : 'up_line'} {...props} />;
export const CaretDown = (props: any) => <Icon name={props.weight === 'fill' ? 'down_fill' : 'down_line'} {...props} />;
export const PlusCircle = (props: any) => <Icon name={props.weight === 'fill' ? 'add_circle_fill' : 'add_circle_line'} {...props} />;
export const MagnifyingGlassPlus = (props: any) => <Icon name={props.weight === 'fill' ? 'zoom_in_fill' : 'zoom_in_line'} {...props} />;
export const FileText = (props: any) => <Icon name={props.weight === 'fill' ? 'file_info_fill' : 'file_info_line'} {...props} />;
export const PushPin = (props: any) => <Icon name={props.weight === 'fill' ? 'pin_fill' : 'pin_line'} {...props} />;
export const ArrowSquareOut = (props: any) => <Icon name={props.weight === 'fill' ? 'external_link_fill' : 'external_link_line'} {...props} />;
export const DownloadSimple = (props: any) => <Icon name={props.weight === 'fill' ? 'download_2_fill' : 'download_2_line'} {...props} />;
export const ListMagnifyingGlass = (props: any) => <Icon name={props.weight === 'fill' ? 'list_search_fill' : 'list_search_line'} {...props} />;
export const Layout = (props: any) => <Icon name={props.weight === 'fill' ? 'layout_fill' : 'layout_line'} {...props} />;
export const TextT = (props: any) => <Icon name={props.weight === 'fill' ? 'text_fill' : 'text_line'} {...props} />;
export const SelectionBackground = (props: any) => <Icon name={props.weight === 'fill' ? 'grid_fill' : 'grid_line'} {...props} />;
export const MagicWand = (props: any) => <Icon name={props.weight === 'fill' ? 'magic_1_fill' : 'magic_1_line'} {...props} />;
export const Cards = (props: any) => <Icon name={props.weight === 'fill' ? 'card_pay_fill' : 'card_pay_line'} {...props} />;
export const Compass = (props: any) => <Icon name={props.weight === 'fill' ? 'compass_fill' : 'compass_line'} {...props} />;
export const PaintBrush = (props: any) => <Icon name={props.weight === 'fill' ? 'paint_fill' : 'paint_line'} {...props} />;
export const Book = (props: any) => <Icon name={props.weight === 'fill' ? 'book_3_fill' : 'book_3_line'} {...props} />;
export const CircleHalf = (props: any) => <Icon name={props.weight === 'fill' ? 'sun_cloudy_fill' : 'sun_cloudy_line'} {...props} />;
export const Moon = (props: any) => <Icon name={props.weight === 'fill' ? 'moon_fill' : 'moon_line'} {...props} />;
export const Sun = (props: any) => <Icon name={props.weight === 'fill' ? 'sun_fill' : 'sun_line'} {...props} />;
export const Monitor = (props: any) => <Icon name={props.weight === 'fill' ? 'display_fill' : 'display_line'} {...props} />;
export const Desktop = Monitor;
export const Waveform = (props: any) => <Icon name={props.weight === 'fill' ? 'voice_fill' : 'voice_line'} {...props} />;
export const Database = (props: any) => <Icon name={props.weight === 'fill' ? 'server_fill' : 'server_line'} {...props} />;
export const ShieldCheck = (props: any) => <Icon name={props.weight === 'fill' ? 'shield_fill' : 'shield_line'} {...props} />;
export const ShareNetwork = (props: any) => <Icon name={props.weight === 'fill' ? 'share_2_fill' : 'share_2_line'} {...props} />;
export const ArrowsInLineHorizontal = (props: any) => <Icon name={props.weight === 'fill' ? 'minimize_fill' : 'minimize_line'} {...props} />;
export const Sliders = (props: any) => <Icon name={props.weight === 'fill' ? 'settings_2_fill' : 'settings_2_line'} {...props} />;
export const PencilLine = (props: any) => <Icon name={props.weight === 'fill' ? 'edit_3_fill' : 'edit_3_line'} {...props} />;
export const Faders = (props: any) => <Icon name={props.weight === 'fill' ? 'settings_6_fill' : 'settings_6_line'} {...props} />;
export const Gear = (props: any) => <Icon name={props.weight === 'fill' ? 'settings_1_fill' : 'settings_1_line'} {...props} />;
export const Sparkle = (props: any) => <Icon name={props.weight === 'fill' ? 'sparkles_fill' : 'sparkles_line'} {...props} />;
export const Gift = (props: any) => <Icon name={props.weight === 'fill' ? 'gift_fill' : 'gift_line'} {...props} />;
export const Target = (props: any) => <Icon name={props.weight === 'fill' ? 'target_fill' : 'target_line'} {...props} />;
export const Tag = (props: any) => <Icon name={props.weight === 'fill' ? 'tag_fill' : 'tag_line'} {...props} />;
export const UsersThree = (props: any) => <Icon name={props.weight === 'fill' ? 'group_fill' : 'group_line'} {...props} />;
export const LightningSlash = (props: any) => <Icon name={props.weight === 'fill' ? 'flash_line' : 'flash_line'} {...props} />;
export const RadioButton = (props: any) => <Icon name={props.weight === 'fill' ? 'round_fill' : 'round_line'} {...props} />;
export const Graph = (props: any) => <Icon name={props.weight === 'fill' ? 'node_fill' : 'node_line'} {...props} />;
export const FloppyDisk = (props: any) => <Icon name={props.weight === 'fill' ? 'save_fill' : 'save_line'} {...props} />;
export const CaretLeftDouble = (props: any) => <Icon name={props.weight === 'fill' ? 'arrows_left_fill' : 'arrows_left_line'} {...props} />;
export const ClockCounterClockwise = (props: any) => <Icon name={props.weight === 'fill' ? 'history_fill' : 'history_line'} {...props} />;
export const Cake = (props: any) => <Icon name={props.weight === 'fill' ? 'cake_fill' : 'cake_line'} {...props} />;
export const ArrowSquareOutSimple = (props: any) => <Icon name={props.weight === 'fill' ? 'external_link_fill' : 'external_link_line'} {...props} />;
export const NavigationArrow = (props: any) => <Icon name={props.weight === 'fill' ? 'navigation_fill' : 'navigation_line'} {...props} />;
export const MapTrifold = (props: any) => <Icon name={props.weight === 'fill' ? 'map_2_fill' : 'map_2_line'} {...props} />;
export const UserIcon = User;
export const ArrowUp = (props: any) => <Icon name={props.weight === 'fill' ? 'up_fill' : 'up_line'} {...props} />;
export const ArrowDown = (props: any) => <Icon name={props.weight === 'fill' ? 'down_fill' : 'down_line'} {...props} />;
export const List = (props: any) => <Icon name={props.weight === 'fill' ? 'list_check_fill' : 'list_check_line'} {...props} />;
export const ArrowsDownUp = (props: any) => <Icon name={props.weight === 'fill' ? 'transfer_fill' : 'transfer_line'} {...props} />;
export const ChevronRight = CaretRight;
export const ChevronLeft = CaretLeft;
export const MoreHorizontal = DotsThree;
export const MessageSquare = ChatCenteredText;
export const PenLine = PencilLine;
export const PenTool = Pencil;
export const PenLineIcon = PencilLine;
export const Search = MagnifyingGlass;
export const Sparkles = Sparkle;
export const Expand = ArrowsOutSimple;
export const ExternalLink = ArrowSquareOut;
export const Download = DownloadSimple;
export const ListFilter = ListMagnifyingGlass;
export const Share2 = ShareNetwork;
export const Edit = PencilSimple;
export const Edit3 = Pencil;
export const Save = FloppyDisk;
export const History = ClockCounterClockwise;
export const Network = Graph;
export const Map = MapTrifold;
export const Navigation = NavigationArrow;
export const Zap = Lightning;
export const Smile = Smiley;
export const Music = MusicNote;
export const Github = (props: any) => <Icon name={props.weight === 'fill' ? 'github_fill' : 'github_line'} {...props} />;
export const GithubLogo = Github;
export const Link = (props: any) => <Icon name={props.weight === 'fill' ? 'link_fill' : 'link_line'} {...props} />;
export const MoreVertical = DotsThreeVertical;
export const ShareIcon = ShareNetwork;
export const Camera = (props: any) => <Icon name={props.weight === 'fill' ? 'camera_fill' : 'camera_line'} {...props} />;
export const Trash2 = Trash;
export const Suitcase = (props: any) => <Icon name={props.weight === 'fill' ? 'suitcase_fill' : 'suitcase_line'} {...props} />;
export const GraduationCap = (props: any) => <Icon name={props.weight === 'fill' ? 'graduation_fill' : 'graduation_line'} {...props} />;
export const Palette = (props: any) => <Icon name={props.weight === 'fill' ? 'palette_fill' : 'palette_line'} {...props} />;
export const MusicNotes = (props: any) => <Icon name={props.weight === 'fill' ? 'music_fill' : 'music_line'} {...props} />;
export const FirstAid = (props: any) => <Icon name={props.weight === 'fill' ? 'medicine_fill' : 'medicine_line'} {...props} />;
