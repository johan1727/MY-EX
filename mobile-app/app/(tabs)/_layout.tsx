import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                // Hide the tab bar completely for the new sidebar-based navigation
                tabBarStyle: { display: 'none' },
            }}
        >
            {/* Main screen - only visible screen */}
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Ex Simulator',
                }}
            />

        </Tabs>
    );
}
