import { supabase } from './supabase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AttributionData {
    // UTM Parameters
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;

    // TikTok specific
    ttclid?: string;           // TikTok Click ID
    tt_campaign_id?: string;
    tt_ad_group_id?: string;
    tt_ad_id?: string;

    // Google Play
    gclid?: string;            // Google Click ID
    install_referrer?: string; // Google Play Install Referrer

    // Other
    referrer?: string;
    landing_page?: string;
}

const ATTRIBUTION_STORAGE_KEY = 'user_attribution_data';

/**
 * Capture attribution data from deep link or Google Play Install Referrer
 */
export async function captureAttribution(): Promise<AttributionData | null> {
    try {
        // Try to get from Google Play Install Referrer (native Android)
        if (Platform.OS === 'android') {
            try {
                const { getInstallReferrerInfo } = require('expo-application');
                const referrerInfo = await getInstallReferrerInfo();

                if (referrerInfo) {
                    console.log('[Attribution] Google Play Referrer:', referrerInfo);

                    // Parse referrer URL params
                    const params = parseUrlParams(referrerInfo);

                    const attribution: AttributionData = {
                        utm_source: params.utm_source,
                        utm_medium: params.utm_medium,
                        utm_campaign: params.utm_campaign,
                        utm_content: params.utm_content,
                        utm_term: params.utm_term,
                        ttclid: params.ttclid,
                        gclid: params.gclid,
                        install_referrer: referrerInfo,
                    };

                    await AsyncStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
                    return attribution;
                }
            } catch (error) {
                console.log('[Attribution] No install referrer available:', error);
            }
        }

        // Fallback: Check if we stored it previously
        const stored = await AsyncStorage.getItem(ATTRIBUTION_STORAGE_KEY);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('[Attribution] Error capturing attribution:', error);
        return null;
    }
}

/**
 * Parse URL parameters from install referrer or deep link
 */
function parseUrlParams(referrerString: string): Record<string, string> {
    const params: Record<string, string> = {};

    try {
        // Handle both query string and full URL
        const queryString = referrerString.includes('?')
            ? referrerString.split('?')[1]
            : referrerString;

        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            if (key && value) {
                params[key] = decodeURIComponent(value);
            }
        });
    } catch (error) {
        console.error('[Attribution] Error parsing params:', error);
    }

    return params;
}

/**
 * Get device information for attribution
 */
async function getDeviceInfo() {
    return {
        platform: Platform.OS,
        device_type: Device.deviceType === Device.DeviceType.PHONE ? 'phone' : 'tablet',
        device_model: Device.modelName || 'unknown',
        os_version: `${Platform.OS} ${Device.osVersion}`,
        app_version: Application.nativeApplicationVersion || '1.0.0',
    };
}

/**
 * Save attribution to Supabase when user registers
 */
export async function saveAttribution(userId: string): Promise<void> {
    try {
        const attribution = await captureAttribution();
        const deviceInfo = await getDeviceInfo();

        if (!attribution && !deviceInfo) {
            console.log('[Attribution] No attribution data to save');
            return;
        }

        const { error } = await supabase.from('user_attribution').insert({
            user_id: userId,
            utm_source: attribution?.utm_source || 'organic',
            utm_medium: attribution?.utm_medium,
            utm_campaign: attribution?.utm_campaign,
            utm_content: attribution?.utm_content,
            utm_term: attribution?.utm_term,
            ttclid: attribution?.ttclid,
            tt_campaign_id: attribution?.tt_campaign_id,
            tt_ad_group_id: attribution?.tt_ad_group_id,
            tt_ad_id: attribution?.tt_ad_id,
            gclid: attribution?.gclid,
            install_referrer: attribution?.install_referrer,
            ...deviceInfo,
            first_touch_at: new Date().toISOString(),
        });

        if (error) {
            console.error('[Attribution] Error saving attribution:', error);
        } else {
            console.log('✅ Attribution saved for user:', userId);
        }
    } catch (error) {
        console.error('[Attribution] Error in saveAttribution:', error);
    }
}

/**
 * Update attribution with conversion events
 */
export async function trackConversion(
    userId: string,
    event: 'app_install' | 'registration' | 'first_analysis' | 'first_simulation' | 'first_call' | 'first_subscription',
    metadata?: { tier?: string; value?: number }
): Promise<void> {
    try {
        const updateData: any = {};

        switch (event) {
            case 'app_install':
                updateData.app_install_at = new Date().toISOString();
                break;
            case 'registration':
                updateData.registration_at = new Date().toISOString();
                break;
            case 'first_analysis':
                updateData.first_analysis_at = new Date().toISOString();
                break;
            case 'first_simulation':
                updateData.first_simulation_at = new Date().toISOString();
                break;
            case 'first_call':
                updateData.first_call_at = new Date().toISOString();
                break;
            case 'first_subscription':
                updateData.first_subscription_at = new Date().toISOString();
                updateData.subscription_tier = metadata?.tier;
                updateData.subscription_value = metadata?.value;
                break;
        }

        const { error } = await supabase
            .from('user_attribution')
            .update(updateData)
            .eq('user_id', userId);

        if (error) {
            console.error(`[Attribution] Error tracking ${event}:`, error);
        } else {
            console.log(`✅ Tracked conversion: ${event} for user:`, userId);
        }
    } catch (error) {
        console.error('[Attribution] Error in trackConversion:', error);
    }
}

/**
 * Get attribution data for current user
 */
export async function getUserAttribution(userId: string): Promise<AttributionData | null> {
    try {
        const { data, error } = await supabase
            .from('user_attribution')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) {
            return null;
        }

        return {
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            utm_content: data.utm_content,
            utm_term: data.utm_term,
            ttclid: data.ttclid,
            gclid: data.gclid,
        };
    } catch (error) {
        console.error('[Attribution] Error getting user attribution:', error);
        return null;
    }
}

/**
 * Check if user came from TikTok
 */
export async function isFromTikTok(userId: string): Promise<boolean> {
    const attribution = await getUserAttribution(userId);
    return attribution?.utm_source === 'tiktok';
}
