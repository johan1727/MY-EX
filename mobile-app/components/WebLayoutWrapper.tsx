import React from 'react';
import { View, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '../lib/ThemeContext';

export default function WebLayoutWrapper({ children }: { children: React.ReactNode }) {
    if (Platform.OS !== 'web') {
        return <View style={{ flex: 1 }}>{children}</View>;
    }

    const { isDark } = useTheme();

    return (
        <View style={[
            styles.container,
            { backgroundColor: isDark ? '#111' : '#f3f4f6' } // Outer background (desktop wallpaper style)
        ]}>
            <View style={[
                styles.contentContainer,
                {
                    backgroundColor: isDark ? '#000' : '#fff',
                    borderColor: isDark ? '#333' : '#e5e7eb',
                }
            ]}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100%',
    },
    contentContainer: {
        flex: 1,
        width: '100%',
        maxWidth: 480, // Mobile-like width
        height: '100%', // Full height inside the constraint

        // Shadow for "App floating" effect on desktop
        ...Platform.select({
            web: {
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                borderLeftWidth: 1,
                borderRightWidth: 1,
            }
        })
    }
});
