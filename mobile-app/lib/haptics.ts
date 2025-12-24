import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const haptics = {
    selection: async () => {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.selectionAsync();
            } catch (e) {
                console.warn('Haptics not available', e);
            }
        }
    },
    impact: async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.impactAsync(style);
            } catch (e) {
                console.warn('Haptics not available', e);
            }
        }
    },
    notification: async (type: Haptics.NotificationFeedbackType = Haptics.NotificationFeedbackType.Success) => {
        if (Platform.OS !== 'web') {
            try {
                await Haptics.notificationAsync(type);
            } catch (e) {
                console.warn('Haptics not available', e);
            }
        }
    },
    // Re-export constants for convenience
    ImpactFeedbackStyle: Haptics.ImpactFeedbackStyle,
    NotificationFeedbackType: Haptics.NotificationFeedbackType,
};
