import { storage } from './storage';

const DAILY_LIMIT = 100;
const BURST_LIMIT = 35;
const BURST_WINDOW_MS = 1 * 60 * 60 * 1000; // 1 hour

interface UsageData {
    date: string;       // YYYY-MM-DD
    dailyCount: number;
    burstCount: number;
    lastBurstStart: number;
}

const getUsageKey = (userId: string) => `usage_tracking_${userId}`;

export async function checkFreeTierLimits(userId: string): Promise<{ allowed: boolean; reason?: 'daily' | 'burst', waitTime?: number }> {
    const key = getUsageKey(userId);
    const dataStr = await storage.getItem(key);

    if (!dataStr) return { allowed: true };

    const data: UsageData = JSON.parse(dataStr);
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    // 1. Reset Daily if new day
    if (data.date !== today) {
        return { allowed: true }; // Will be reset on increment
    }

    // 2. Check Daily Limit
    if (data.dailyCount >= DAILY_LIMIT) {
        return { allowed: false, reason: 'daily' };
    }

    // 3. Check Burst Refill
    const timeSinceBurstStart = now - data.lastBurstStart;

    // If window passed, we effectively have 0 burst usages (logic handled in increment, but checked here)
    if (timeSinceBurstStart >= BURST_WINDOW_MS) {
        return { allowed: true };
    }

    // 4. Check Burst Limit
    if (data.burstCount >= BURST_LIMIT) {
        const waitTime = Math.ceil((BURST_WINDOW_MS - timeSinceBurstStart) / 60000); // Minutes
        return { allowed: false, reason: 'burst', waitTime };
    }

    return { allowed: true };
}

export async function incrementFreeTierUsage(userId: string): Promise<void> {
    const key = getUsageKey(userId);
    const dataStr = await storage.getItem(key);
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];

    let data: UsageData = {
        date: today,
        dailyCount: 0,
        burstCount: 0,
        lastBurstStart: now
    };

    if (dataStr) {
        data = JSON.parse(dataStr);

        // Check Daily Reset
        if (data.date !== today) {
            data.date = today;
            data.dailyCount = 0;
            data.burstCount = 0;
            data.lastBurstStart = now;
        } else {
            // Check Burst Reset
            if (now - data.lastBurstStart >= BURST_WINDOW_MS) {
                data.burstCount = 0;
                data.lastBurstStart = now;
            }
        }
    }

    // Increment
    data.dailyCount += 1;
    data.burstCount += 1;

    console.log('[UsageTracking] Updated:', data);
    await storage.setItem(key, JSON.stringify(data));
}

export async function resetUsage(userId: string): Promise<void> {
    const key = getUsageKey(userId);
    await storage.removeItem(key);
    console.log('[UsageTracking] Limits reset for:', userId);
}
