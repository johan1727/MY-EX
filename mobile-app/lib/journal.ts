import OpenAI from 'openai';
import { supabase } from './supabase';

const openai = new OpenAI({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
});

export interface JournalEntry {
    id: string;
    user_id: string;
    mood_score: number;
    emotions: string[];
    entry_text: string;
    created_at: string;
}

export interface WeeklyAnalysis {
    averageMood: number;
    moodTrend: 'improving' | 'stable' | 'declining';
    peakEmotions: string[];
    lowMoodTimes: string[];
    commonTriggers: string[];
    recommendations: string[];
    insights: string;
}

export interface MoodData {
    date: string;
    mood: number;
}

export async function saveJournalEntry(
    userId: string,
    moodScore: number,
    emotions: string[],
    entryText: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase
            .from('journal_entries')
            .insert({
                user_id: userId,
                mood_score: moodScore,
                emotions,
                entry_text: entryText
            });

        if (error) throw error;

        return { success: true };
    } catch (error: any) {
        console.error('Error saving journal entry:', error);
        return { success: false, error: error.message };
    }
}

export async function getJournalEntries(
    userId: string,
    limit: number = 30
): Promise<JournalEntry[]> {
    try {
        const { data, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('Error getting journal entries:', error);
        return [];
    }
}

export async function getWeeklyMoodData(userId: string): Promise<MoodData[]> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error } = await supabase
            .from('journal_entries')
            .select('mood_score, created_at')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        return (data || []).map(entry => ({
            date: new Date(entry.created_at).toLocaleDateString('en-US', { weekday: 'short' }),
            mood: entry.mood_score
        }));
    } catch (error) {
        console.error('Error getting weekly mood data:', error);
        return [];
    }
}

export async function generateWeeklyAnalysis(userId: string): Promise<WeeklyAnalysis | null> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: entries, error } = await supabase
            .from('journal_entries')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;
        if (!entries || entries.length === 0) return null;

        // Prepare data for AI analysis
        const entriesText = entries.map((e, i) => {
            const date = new Date(e.created_at);
            const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
            const timeOfDay = date.getHours() < 12 ? 'morning' : date.getHours() < 18 ? 'afternoon' : 'evening';

            return `Entry ${i + 1} (${dayOfWeek} ${timeOfDay}):
Mood: ${e.mood_score}/10
Emotions: ${e.emotions?.join(', ') || 'none'}
Text: ${e.entry_text}`;
        }).join('\n\n');

        const prompt = `Analyze these journal entries from the past week for someone healing from a breakup:

${entriesText}

Provide a comprehensive weekly analysis in JSON format:
{
  "averageMood": number (1-10),
  "moodTrend": "improving" | "stable" | "declining",
  "peakEmotions": ["emotion1", "emotion2"],
  "lowMoodTimes": ["time pattern 1", "time pattern 2"],
  "commonTriggers": ["trigger1", "trigger2"],
  "recommendations": ["recommendation1", "recommendation2", "recommendation3"],
  "insights": "A compassionate 2-3 sentence summary of their emotional journey this week"
}

Focus on:
- Patterns in when they feel worst (nights, weekends, etc.)
- Recurring emotions or triggers
- Progress or setbacks
- Actionable, specific recommendations`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are an empathetic therapist analyzing journal entries to help someone heal from a breakup. Provide insights that are honest but encouraging.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 800,
            response_format: { type: 'json_object' }
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        return analysis as WeeklyAnalysis;

    } catch (error) {
        console.error('Error generating weekly analysis:', error);
        return null;
    }
}

export async function deleteJournalEntry(entryId: string): Promise<boolean> {
    try {
        const { error } = await supabase
            .from('journal_entries')
            .delete()
            .eq('id', entryId);

        if (error) throw error;
        return true;
    } catch (error) {
        console.error('Error deleting journal entry:', error);
        return false;
    }
}

export const EMOTION_OPTIONS = [
    { value: 'sad', label_en: 'Sad', label_es: 'Triste', emoji: '😢', color: '#3b82f6' },
    { value: 'angry', label_en: 'Angry', label_es: 'Enojado/a', emoji: '😠', color: '#ef4444' },
    { value: 'anxious', label_en: 'Anxious', label_es: 'Ansioso/a', emoji: '😰', color: '#f59e0b' },
    { value: 'lonely', label_en: 'Lonely', label_es: 'Solo/a', emoji: '😔', color: '#6366f1' },
    { value: 'hopeful', label_en: 'Hopeful', label_es: 'Esperanzado/a', emoji: '🌟', color: '#22c55e' },
    { value: 'grateful', label_en: 'Grateful', label_es: 'Agradecido/a', emoji: '🙏', color: '#10b981' },
    { value: 'confused', label_en: 'Confused', label_es: 'Confundido/a', emoji: '😕', color: '#8b5cf6' },
    { value: 'relieved', label_en: 'Relieved', label_es: 'Aliviado/a', emoji: '😌', color: '#14b8a6' },
    { value: 'nostalgic', label_en: 'Nostalgic', label_es: 'Nostálgico/a', emoji: '🥺', color: '#a855f7' },
    { value: 'strong', label_en: 'Strong', label_es: 'Fuerte', emoji: '💪', color: '#f97316' }
];
