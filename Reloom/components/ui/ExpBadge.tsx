import { View } from 'react-native';
import { ThemedText } from './ThemedText';
import { Typography } from '../../constants/Typography';
import { useAppTheme } from '../../hooks/useAppTheme';

export function ExpBadge() {
    const { colors } = useAppTheme();
    return (
        <View
            style={{
                borderWidth: 1,
                borderColor: colors.tint,
                borderRadius: 4,
                paddingHorizontal: 3,
                paddingVertical: 0,
                marginLeft: 6,
                justifyContent: 'center',
            }}
        >
            <ThemedText
                style={{
                    color: colors.tint,
                    fontSize: 9,
                    lineHeight: 11,
                    fontFamily: Typography.fontFamily.bold,
                    letterSpacing: 0.5,
                }}
            >
                EXP
            </ThemedText>
        </View>
    );
}
