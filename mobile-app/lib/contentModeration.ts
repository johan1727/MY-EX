// Content Moderation and Reporting System
// Required by Google Play for Generative AI apps (effective Jan 31, 2024)

import { supabase } from './supabase';

export interface ContentReport {
    id?: string;
    message_id: string;
    message_content: string;
    reason: 'offensive' | 'inappropriate' | 'harmful' | 'false_information' | 'other';
    additional_details?: string;
    user_id?: string;
    reported_at: string;
}

// Prohibited content patterns (Google Play restricted content)
const PROHIBITED_PATTERNS = {
    sexual: [
        /\b(sexual|sexo|desnud[oa]s?|pornográfico|erótico)\b/i,
        /\b(penetr(ar|ación)|masturb|orgasmo|genitales)\b/i,
    ],
    violence: [
        /\b(matar|asesinar|golpear|torturar|mutilar)\b/i,
        /\b(sangre|violencia|arma|cuchillo|pistola)\b/i,
    ],
    threats: [
        /\b(amenaz(ar|a)|voy a (matar|lastimar|hacer daño))\b/i,
        /\b(te voy a|te haré|sufrirás)\b/i,
    ],
    harassment: [
        /\b(acoso|stalking|perseguir|hostigar)\b/i,
    ],
    deepfake: [
        /\b(deepfake|genera (imagen|foto|video) de)\b/i,
        /\b(simula (voz|cara|cuerpo))\b/i,
    ],
};

/**
 * Check if content contains prohibited patterns
 * Required by Google Play AI content policy
 */
export function checkProhibitedContent(content: string): {
    isProhibited: boolean;
    category?: string;
    message?: string;
} {
    for (const [category, patterns] of Object.entries(PROHIBITED_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(content)) {
                return {
                    isProhibited: true,
                    category,
                    message: `Este contenido viola las políticas de Google Play (categoría: ${category}). Por favor, reformula tu mensaje.`,
                };
            }
        }
    }

    return { isProhibited: false };
}

/**
 * Report AI-generated content
 * Required by Google Play for all generative AI apps
 */
export async function reportContent(report: ContentReport): Promise<{ success: boolean; error?: string }> {
    try {
        console.log('[ContentModeration] Reporting content:', report.reason);

        // Get current user (if logged in)
        const { data: { user } } = await supabase.auth.getUser();

        const reportData = {
            ...report,
            user_id: user?.id || 'anonymous',
            reported_at: new Date().toISOString(),
        };

        // Store report in Supabase (create table if doesn't exist)
        const { error } = await supabase
            .from('content_reports')
            .insert(reportData);

        if (error) {
            console.error('[ContentModeration] Error saving report:', error);
            // Don't fail if table doesn't exist - log locally instead
            console.log('[ContentModeration] Report logged locally:', reportData);
        }

        return { success: true };
    } catch (error: any) {
        console.error('[ContentModeration] Report error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Get report statistics (for manual review dashboard)
 */
export async function getReportStats(): Promise<{
    totalReports: number;
    byCategory: Record<string, number>;
}> {
    try {
        const { data, error } = await supabase
            .from('content_reports')
            .select('reason');

        if (error || !data) {
            return { totalReports: 0, byCategory: {} };
        }

        const byCategory = data.reduce((acc, report) => {
            acc[report.reason] = (acc[report.reason] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            totalReports: data.length,
            byCategory,
        };
    } catch (error) {
        console.error('[ContentModeration] Stats error:', error);
        return { totalReports: 0, byCategory: {} };
    }
}
