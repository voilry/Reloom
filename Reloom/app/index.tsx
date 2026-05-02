import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

export default function HomeScreen() {
    const { colors } = useAppTheme();
    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Redirect href="/(tabs)" />
        </View>
    );
}
