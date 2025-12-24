import { supabase } from './supabase';

export interface Milestone {
    id: string;
    days: number;
    title_en: string;
    title_es: string;
    badge: string;
    reward: string;
    color: string;
    unlocked: boolean;
    unlockedAt?: string;
}

export const MILESTONES: Omit<Milestone, 'id' | 'unlocked' | 'unlockedAt'>[] = [
    {
        days: 1,
        title_en: "First Step",
        title_es: "Primer Paso",
        badge: "🌱",
        reward: "Survivor Badge",
        color: "#22c55e"
    },
    {
        days: 3,
        title_en: "Three Day Warrior",
        title_es: "Guerrero de 3 Días",
        badge: "💪",
        reward: "Warrior Badge",
        color: "#3b82f6"
    },
    {
        days: 7,
        title_en: "One Week Champion",
        title_es: "Campeón de Una Semana",
        badge: "🛡️",
        reward: "Shield Badge",
        color: "#8b5cf6"
    },
    {
        days: 14,
        title_en: "Two Week Hero",
        title_es: "Héroe de Dos Semanas",
        badge: "🏆",
        reward: "Trophy Badge",
        color: "#f59e0b"
    },
    {
        days: 30,
        title_en: "Month Master",
        title_es: "Maestro del Mes",
        badge: "👑",
        reward: "Crown Badge",
        color: "#eab308"
    },
    {
        days: 60,
        title_en: "Phoenix Rising",
        title_es: "Fénix Renaciendo",
        badge: "🔥",
        reward: "Phoenix Badge",
        color: "#ef4444"
    },
    {
        days: 90,
        title_en: "Freedom Fighter",
        title_es: "Luchador de la Libertad",
        badge: "🦅",
        reward: "Eagle Badge",
        color: "#06b6d4"
    },
    {
        days: 180,
        title_en: "Half Year Hero",
        title_es: "Héroe de Medio Año",
        badge: "⭐",
        reward: "Star Badge",
        color: "#a855f7"
    },
    {
        days: 365,
        title_en: "Year of Strength",
        title_es: "Año de Fortaleza",
        badge: "💎",
        reward: "Diamond Badge",
        color: "#ec4899"
    }
];

export async function checkAndUnlockMilestones(userId: string, currentDays: number): Promise<Milestone[]> {
    try {
        // Get already unlocked milestones
        const { data: unlocked } = await supabase
            .from('user_achievements')
            .select('achievement_type, unlocked_at')
            .eq('user_id', userId)
            .filter('achievement_data->type', 'eq', 'milestone');

        const unlockedDays = new Set(
            unlocked?.map(a => parseInt(a.achievement_type.replace('milestone_', ''))) || []
        );

        // Find newly unlocked milestones
        const newlyUnlocked: Milestone[] = [];

        for (const milestone of MILESTONES) {
            if (currentDays >= milestone.days && !unlockedDays.has(milestone.days)) {
                // Unlock this milestone
                const { data, error } = await supabase
                    .from('user_achievements')
                    .insert({
                        user_id: userId,
                        achievement_type: `milestone_${milestone.days}`,
                        achievement_data: {
                            type: 'milestone',
                            days: milestone.days,
                            title: milestone.title_en,
                            badge: milestone.badge
                        }
                    })
                    .select()
                    .single();

                if (!error && data) {
                    newlyUnlocked.push({
                        id: data.id,
                        ...milestone,
                        unlocked: true,
                        unlockedAt: data.unlocked_at
                    });
                }
            }
        }

        return newlyUnlocked;
    } catch (error) {
        console.error('Error checking milestones:', error);
        return [];
    }
}

export async function getUserMilestones(userId: string, language: 'en' | 'es' = 'en'): Promise<Milestone[]> {
    try {
        const { data: unlocked } = await supabase
            .from('user_achievements')
            .select('*')
            .eq('user_id', userId)
            .filter('achievement_data->type', 'eq', 'milestone');

        const unlockedMap = new Map(
            unlocked?.map(a => [
                parseInt(a.achievement_type.replace('milestone_', '')),
                { id: a.id, unlockedAt: a.unlocked_at }
            ]) || []
        );

        return MILESTONES.map(m => ({
            id: unlockedMap.get(m.days)?.id || '',
            ...m,
            title_en: m.title_en,
            title_es: m.title_es,
            unlocked: unlockedMap.has(m.days),
            unlockedAt: unlockedMap.get(m.days)?.unlockedAt
        }));
    } catch (error) {
        console.error('Error getting milestones:', error);
        return [];
    }
}

export async function getNextMilestone(currentDays: number, language: 'en' | 'es' = 'en'): Promise<Milestone | null> {
    const next = MILESTONES.find(m => m.days > currentDays);
    if (!next) return null;

    return {
        id: '',
        ...next,
        unlocked: false
    };
}

export function calculateProgress(currentDays: number, nextMilestoneDays: number): number {
    const previousMilestone = MILESTONES
        .filter(m => m.days <= currentDays)
        .sort((a, b) => b.days - a.days)[0];

    const start = previousMilestone?.days || 0;
    const end = nextMilestoneDays;
    const current = currentDays;

    return Math.min(100, Math.max(0, ((current - start) / (end - start)) * 100));
}

// Confetti animation data
export function getConfettiConfig() {
    return {
        count: 50,
        spread: 360,
        startVelocity: 30,
        decay: 0.9,
        gravity: 1,
        drift: 0,
        ticks: 200,
        colors: ['#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444']
    };
}
