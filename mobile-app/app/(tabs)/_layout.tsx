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

            {/* All other screens hidden */}
            <Tabs.Screen name="chat" options={{ href: null }} />
            <Tabs.Screen name="dashboard" options={{ href: null }} />
            <Tabs.Screen name="profile" options={{ href: null }} />
            <Tabs.Screen name="tools" options={{ href: null }} />
            <Tabs.Screen name="ex-chat" options={{ href: null }} />
            <Tabs.Screen name="progress" options={{ href: null }} />
            <Tabs.Screen name="memories" options={{ href: null }} />
        </Tabs>
    );
}
