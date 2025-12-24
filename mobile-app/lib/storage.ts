import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const storage = {
    async getItem(key: string): Promise<string | null> {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                return localStorage.getItem(key);
            }
            return await AsyncStorage.getItem(key);
        } catch (e) {
            console.error('Error getting item from storage', e);
            return null;
        }
    },

    async setItem(key: string, value: string): Promise<void> {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.setItem(key, value);
            } else {
                await AsyncStorage.setItem(key, value);
            }
        } catch (e) {
            console.error('Error setting item in storage', e);
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.removeItem(key);
            } else {
                await AsyncStorage.removeItem(key);
            }
        } catch (e) {
            console.error('Error removing item from storage', e);
        }
    },

    async clear(): Promise<void> {
        try {
            if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
                localStorage.clear();
            } else {
                await AsyncStorage.clear();
            }
        } catch (e) {
            console.error('Error clearing storage', e);
        }
    }
};
