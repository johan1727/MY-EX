import { Tabs } from 'expo-router';
import { MessageSquare, Wrench, User, TrendingUp } from 'lucide-react-native';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#6366f1',
                headerShown: false,
                tabBarStyle: { display: 'none' } // Hide bottom tab bar
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Coach',
                    tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="tools"
                options={{
                    title: 'Tools',
                    tabBarIcon: ({ color }) => <Wrench size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="progress"
                options={{
                    title: 'Progress',
                    tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color }) => <User size={24} color={color} />,
                }}
            />
            <Tabs.Screen
                name="memories"
                options={{
                    title: 'Memories',
                    href: null, // This keeps it hidden from the tab bar if we ever show it again
                }}
            />
        </Tabs>
    );
}
