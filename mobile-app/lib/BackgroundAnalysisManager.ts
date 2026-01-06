/**
 * BACKGROUND ANALYSIS MANAGER
 * 
 * Manages Ex-Simulator analysis in background, allowing users to navigate
 * away while analysis runs. Persists progress to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import { analyzePersonality } from './exSimulator';
import { generateMasterPrompt } from './masterPromptGenerator';
import { saveProfile } from './profileSync';
import { sanitizeChat, type SanitizedData } from './privacyFilter';
import { detectMessagingPattern } from './messagingPatternAnalyzer';
import { extractEntities, saveEntitiesToSupabase } from './entityExtractor';
import { detectDefensiveTopics } from './defensiveTopicsDetector';
import { detectJealousyTriggers } from './jealousyDetector';
import { detectNicknameEvolution } from './nicknameEvolutionTracker';
import { detectTopConflicts } from './topConflictsDetector';
import type { ParsedMessage, ExProfile } from './exSimulator';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { analyzeActivityPeaks } from './activityAnalyzer';
import { detectConflicts } from './conflictDetector';
import { getRelationshipPreset, buildEnhancedAIInstructions } from './relationshipPresets';
import { supabase } from './supabase';
import { extractImportantDates, saveImportantDates } from './dateExtractor';
import { embedMessages, getEmbeddingStats } from './vectorRAG';

// ===============================================
// TYPES
// ===============================================

export interface AnalysisState {
    profileId: string;
    exName: string;
    status: 'running' | 'paused' | 'completed' | 'error';
    currentPhase: 'personality' | 'master_prompt' | 'saving';
    progress: number; // 0-100
    logs: string[];
    result?: ExProfile;
    error?: string;
    startedAt: string;
    lastUpdateAt: string;
}

// ===============================================
// STORAGE KEYS
// ===============================================

const ANALYSIS_STATE_KEY = 'background_analysis_';
const ACTIVE_ANALYSES_KEY = 'active_background_analyses';

// ===============================================
// EVENT EMITTER (Real-time updates)
// ===============================================

const progressEmitter = new EventEmitter();

// ===============================================
// CORE FUNCTIONS
// ===============================================

export class BackgroundAnalysisManager {

    /**
     * Start analysis in background (non-blocking)
     */
    static async startAnalysis(
        profileId: string,
        messages: ParsedMessage[],
        exName: string,
        relationshipType: string = 'ex',
        updateProfileId?: string
    ): Promise<void> {
        console.log('[BackgroundAnalysis] Starting for:', exName, 'Type:', relationshipType);

        // 1. Initialize state
        const state: AnalysisState = {
            profileId,
            exName,
            status: 'running',
            currentPhase: 'personality',
            progress: 0,
            logs: ['🚀 Iniciando análisis en segundo plano...'],
            startedAt: new Date().toISOString(),
            lastUpdateAt: new Date().toISOString()
        };

        await this.saveState(profileId, state);

        // 2. Add to active analyses
        await this.addToActiveList(profileId);

        // 3. Execute async (don't await - let it run in background)
        this.executeAnalysisAsync(profileId, messages, exName, relationshipType, updateProfileId)
            .catch(err => this.handleError(profileId, err));
    }

    /**
     * Internal: Execute the actual analysis
     * This matches GitHub's working approach but with state persistence
     */
    private static async executeAnalysisAsync(
        profileId: string,
        messages: ParsedMessage[],
        exName: string,
        relationshipType: string,
        updateProfileId?: string
    ): Promise<void> {
        try {
            // Progress callback that saves to AsyncStorage
            const onProgress = async (percentage: number, message: string) => {
                const state = await this.getState(profileId);
                if (!state) return;

                state.progress = percentage;
                state.logs.push(message);
                state.lastUpdateAt = new Date().toISOString();

                // Determine phase based on percentage
                if (percentage < 65) {
                    state.currentPhase = 'personality';
                } else if (percentage < 95) {
                    state.currentPhase = 'master_prompt';
                } else {
                    state.currentPhase = 'saving';
                }

                await this.saveState(profileId, state);
                this.emitProgress(profileId, state);
            };

            // CHECKPOINT 0: Sanitize PII (SECURITY)
            await onProgress(2, '🔒 Protegiendo datos sensibles...');

            const { messages: sanitizedMessages, reverseMap } = sanitizeChat(messages);
            console.log('[BackgroundAnalysis] Sanitized', reverseMap.size, 'PII items');

            // Store reverse map for later (to show original data to user if needed)
            await AsyncStorage.setItem(
                `pii_reverse_map_${profileId}`,
                JSON.stringify(Array.from(reverseMap.entries()))
            );

            // CHECKPOINT 1: Start personality analysis (0-65%)
            await onProgress(5, '📊 Analizando personalidad...');

            const profile = await analyzePersonality(
                sanitizedMessages, // Use sanitized messages
                exName,
                (p, s) => {
                    const mapped = Math.round(5 + (p * 0.6)); // Map 0-100 to 5-65%
                    onProgress(mapped, s);
                },
                relationshipType as 'ex' | 'friend' | 'family' | 'deceased'
            );

            // CHECKPOINT 2: Detect sender names
            await onProgress(68, '🔍 Identificando participantes...');

            const senderCounts = new Map<string, number>();
            sanitizedMessages.forEach(msg => {
                senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
            });

            const exNameLower = (exName || '').toLowerCase().trim();
            const exSenderName = Array.from(senderCounts.keys()).find(name => {
                if (!name) return false; // SAFETY: skip undefined/null names
                const nameLower = name.toLowerCase().trim();
                return nameLower === exNameLower ||
                    nameLower.includes(exNameLower) ||
                    exNameLower.includes(nameLower);
            }) || exName || 'Persona';


            const allParticipants = Array.from(senderCounts.keys()).filter(n => n); // Filter out null/undefined
            const detectedUserName = allParticipants.find(name =>
                name && name.toLowerCase().trim() !== (exSenderName || '').toLowerCase().trim()
            ) || 'Usuario';


            console.log('[BackgroundAnalysis] Detected:', { exSenderName, detectedUserName });

            // CHECKPOINT 3: Generate Master Prompt (70-95%)
            await onProgress(70, '🧠 Generando Master Prompt...');

            let masterPromptResult;
            try {
                masterPromptResult = await generateMasterPrompt(
                    sanitizedMessages, // Use sanitized messages
                    exSenderName,
                    exName,
                    relationshipType,
                    (p, s, t) => {
                        const mapped = Math.round(70 + (p * 0.25)); // Map 0-100 to 70-95%
                        onProgress(mapped, s);
                    }
                );
            } catch (err) {
                console.error('[BackgroundAnalysis] Master prompt failed (continuing without):', err);
            }

            // CHECKPOINT 3.5: Extract Relationship Entities (Wiki)
            await onProgress(92, '📚 Extrayendo entidades de la relación...');

            let entities = [];
            try {
                const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                entities = await extractEntities(messages, exName, model);
                console.log('[BackgroundAnalysis] Extracted', entities.length, 'entities');
            } catch (entityErr) {
                console.error('[BackgroundAnalysis] Entity extraction failed:', entityErr);
            }

            // CHECKPOINT 3.7: Detect Defensive Topics
            await onProgress(93, '🛡️ Detectando temas defensivos...');

            let defensiveTopics = [];
            try {
                const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                defensiveTopics = await detectDefensiveTopics(messages, exName, exSenderName, model);
                console.log('[BackgroundAnalysis] Found', defensiveTopics.length, 'defensive topics');
            } catch (defErr) {
                console.error('[BackgroundAnalysis] Defensive topics detection failed:', defErr);
            }

            // CHECKPOINT 3.8: Detect Jealousy Triggers
            await onProgress(93.5, '💚 Detectando celos y terceros...');

            let jealousyTriggers = [];
            try {
                const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                jealousyTriggers = await detectJealousyTriggers(messages, exName, exSenderName, model);
                console.log('[BackgroundAnalysis] Found', jealousyTriggers.length, 'jealousy triggers');
            } catch (jealErr) {
                console.error('[BackgroundAnalysis] Jealousy detection failed:', jealErr);
            }

            // CHECKPOINT 3.9: Detect Nickname Evolution
            await onProgress(93.7, '💕 Rastreando evolución de apodos...');

            let nicknameEvolution = [];
            try {
                const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                nicknameEvolution = await detectNicknameEvolution(messages, exName, model);
                console.log('[BackgroundAnalysis] Tracked', nicknameEvolution.length, 'nickname changes');
            } catch (nickErr) {
                console.error('[BackgroundAnalysis] Nickname evolution failed:', nickErr);
            }

            // CHECKPOINT 3.95: Detect Top Conflicts
            await onProgress(93.9, '⚔️ Identificando conflictos recurrentes...');

            let topConflicts = [];
            try {
                const genAI = new GoogleGenerativeAI(process.env.EXPO_PUBLIC_GEMINI_API_KEY || '');
                const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

                topConflicts = await detectTopConflicts(messages, exName, model);
                console.log('[BackgroundAnalysis] Found', topConflicts.length, 'recurring conflicts');
            } catch (confErr) {
                console.error('[BackgroundAnalysis] Top conflicts detection failed:', confErr);
            }

            // CHECKPOINT 3.96: Activity Peaks Analysis (NEW)
            await onProgress(94.2, '📊 Analizando picos de actividad...');

            let activityPeaks = null;
            try {
                activityPeaks = analyzeActivityPeaks(messages);
                console.log('[BackgroundAnalysis] Found', activityPeaks.hottestDays.length, 'hot days,',
                    activityPeaks.coldestDays.length, 'cold periods');
            } catch (actErr) {
                console.error('[BackgroundAnalysis] Activity analysis failed:', actErr);
            }

            // CHECKPOINT 3.97: Conflict Detection (NEW)
            await onProgress(94.4, '⚔️ Detectando conflictos detallados...');

            let conflictAnalysis = null;
            try {
                conflictAnalysis = detectConflicts(messages, exName);
                console.log('[BackgroundAnalysis] Detected', conflictAnalysis.conflictMoments.length, 'conflict moments');
            } catch (conflErr) {
                console.error('[BackgroundAnalysis] Conflict detection failed:', conflErr);
            }

            // CHECKPOINT 3.98: Relationship Preset (NEW)
            await onProgress(94.6, '🎭 Aplicando predisposición por tipo de relación...');

            let relationshipPreset = null;
            try {
                relationshipPreset = getRelationshipPreset(relationshipType);
                console.log('[BackgroundAnalysis] Applied preset for:', relationshipType);
            } catch (presetErr) {
                console.error('[BackgroundAnalysis] Relationship preset failed:', presetErr);
            }

            // Get user early for embeddings and dates
            const { data: { user } } = await supabase.auth.getUser();

            // CHECKPOINT 3.99: Date Extraction (NEW - Advanced AI)
            await onProgress(94.8, '📅 Extrayendo fechas importantes...');

            let importantDates = [];
            try {
                importantDates = extractImportantDates(messages, exName, detectedUserName, relationshipType);
                console.log('[BackgroundAnalysis] Extracted', importantDates.length, 'important dates');

                // Guardar en Supabase
                if (importantDates.length > 0 && user?.id) {
                    await saveImportantDates(importantDates, profileId, user.id);
                }
            } catch (dateErr) {
                console.error('[BackgroundAnalysis] Date extraction failed:', dateErr);
            }

            // CHECKPOINT 4.01: Vector Embeddings (NEW - Advanced AI)
            await onProgress(95.5, '🧠 Creando embeddings semánticos...');

            let embeddingStats = null;
            try {


                // Solo crear embeddings si hay mensajes y usuario autenticado
                if (messages.length > 0 && user?.id) {
                    await embedMessages(
                        messages,
                        profileId,
                        user.id,
                        (current, total) => {
                            const percent = 95.5 + ((current / total) * 2); // 95.5% a 97.5%
                            onProgress(percent, `🧠 Embeddings: ${current}/${total}...`);
                        }
                    );

                    embeddingStats = await getEmbeddingStats(profileId);
                    console.log('[BackgroundAnalysis] Created', embeddingStats.totalMessages, 'embeddings');
                }
            } catch (embErr) {
                console.error('[BackgroundAnalysis] Embedding creation failed:', embErr);
            }

            // CHECKPOINT 4.02: Emotional Memories (NEW - Advanced AI)
            await onProgress(97.8, '💭 Analizando memorias emocionales...');

            let emotionalMemories = [];
            try {
                const { createEmotionalMemories } = await import('./emotionalRAG');

                // Crear memorias emocionales con progress tracking
                if (messages.length >= 20 && user?.id) {
                    emotionalMemories = await createEmotionalMemories(
                        messages,
                        profileId,
                        user.id,
                        (current, total) => {
                            const percent = 97.8 + ((current / total) * 0.4); // 97.8% a 98.2%
                            onProgress(percent, `💭 Memorias: ${current}/${total}...`);
                        }
                    );
                    console.log('[BackgroundAnalysis] Created', emotionalMemories.length, 'emotional memories');
                }
            } catch (memErr) {
                console.error('[BackgroundAnalysis] Emotional memories failed:', memErr);
            }

            // ✨ CHECKPOINT 4.03: Regenerate Master Prompt with Advanced AI Features
            await onProgress(98.2, '🎯 Regenerando Master Prompt con IA Avanzada...');

            // Now that we have important dates and embedding stats, regenerate the master prompt
            if (importantDates.length > 0 || embeddingStats?.totalMessages) {
                try {
                    const tempProfile = {
                        importantDates,
                        embeddingStats
                    };

                    masterPromptResult = await generateMasterPrompt(
                        messages, // Usa sanitized messages
                        exSenderName,
                        exName,
                        relationshipType,
                        (p, s, t) => {
                            const mapped = Math.round(98.2 + (p * 0.005)); // Map 0-100 to 98.2-98.7%
                            onProgress(mapped, s);
                        },
                        tempProfile // ✨ Pass profile with AI features
                    );

                    console.log('[BackgroundAnalysis] ✅ Master prompt regenerated with AI features');
                } catch (err) {
                    console.error('[BackgroundAnalysis] Master prompt regeneration failed:', err);
                }
            }

            // CHECKPOINT 4: Analyze messaging pattern
            await onProgress(98.8, '💬 Analizando patrón de mensajes...');

            const messagingPattern = detectMessagingPattern(messages, exSenderName);
            console.log('[BackgroundAnalysis] Messaging pattern:', messagingPattern.style);

            // CHECKPOINT 5: Build final profile
            await onProgress(99.5, '💾 Guardando perfil...');

            const profileData = {
                id: profileId,
                exName,
                userName: detectedUserName,
                relationshipType,
                profile: {
                    ...profile,
                    messagingPattern,     // Feature #2
                    defensiveTopics,      // Feature #4
                    jealousyTriggers,     // Feature #5
                    nicknameEvolution,    // Feature #6
                    topConflicts,         // Feature #7
                    activityPeaks,        // Feature #8 (NEW)
                    conflictAnalysis,     // Feature #9 (NEW)
                    relationshipPreset,   // Feature #10 (NEW)
                    importantDates,       // Feature #11 (Advanced AI)
                    embeddingStats,       // Feature #12 (Advanced AI)
                },
                messageCount: messages.length,
                createdAt: new Date().toISOString(),
                masterPrompt: masterPromptResult?.masterPrompt,
                tokenCount: masterPromptResult?.tokenCount
            };

            console.log('[BackgroundAnalysis] Attempting to save profile:', {
                id: profileData.id,
                exName: profileData.exName,
                relationshipType: profileData.relationshipType,
                hasProfile: !!profileData.profile,
                hasMasterPrompt: !!profileData.masterPrompt
            });

            const saved = await saveProfile(profileData as any, user?.id || undefined);

            console.log('[BackgroundAnalysis] Profile saved successfully:', {
                savedProfileId: saved?.id,
                supabaseId: saved?.supabaseId
            });

            // CHECKPOINT 6: Save entities to Supabase (if user is logged in)
            if (user?.id && entities.length > 0 && saved?.id) {
                try {
                    const { supabase } = await import('./supabase');
                    await saveEntitiesToSupabase(entities, saved.id, user.id, supabase);
                    console.log('[BackgroundAnalysis] ✅ Entities saved to Supabase');
                } catch (entitySaveErr) {
                    console.error('[BackgroundAnalysis] Entity save failed:', entitySaveErr);
                }
            }

            // CHECKPOINT 7: Mark as completed
            const state = await this.getState(profileId);
            if (!state) return;

            state.status = 'completed';
            state.progress = 100;
            state.result = profileData as any; // Cast to bypass strict type check
            state.logs.push('✅ Análisis completado');

            await this.saveState(profileId, state);
            await this.removeFromActiveList(profileId);
            this.emitProgress(profileId, state);

            // Send notification and trigger navigation
            this.sendCompletionNotification(exName, saved?.id || profileId);

            console.log('[BackgroundAnalysis] ✅ Completed:', exName);

        } catch (error: any) {
            console.error('[BackgroundAnalysis] Error:', error);
            await this.handleError(profileId, error);
        }
    }

    /**
     * Get current analysis state
     */
    static async getState(profileId: string): Promise<AnalysisState | null> {
        try {
            const json = await AsyncStorage.getItem(`${ANALYSIS_STATE_KEY}${profileId}`);
            return json ? JSON.parse(json) : null;
        } catch (e) {
            console.error('[BackgroundAnalysis] Error loading state:', e);
            return null;
        }
    }

    /**
     * Save analysis state
     */
    private static async saveState(profileId: string, state: AnalysisState): Promise<void> {
        try {
            await AsyncStorage.setItem(
                `${ANALYSIS_STATE_KEY}${profileId}`,
                JSON.stringify(state)
            );
        } catch (e) {
            console.error('[BackgroundAnalysis] Error saving state:', e);
        }
    }

    /**
     * Listen to progress updates
     */
    static onProgressUpdate(
        profileId: string,
        callback: (state: AnalysisState) => void
    ): () => void {
        const eventName = `progress_${profileId}`;
        progressEmitter.on(eventName, callback);

        // Return unsubscribe function
        return () => {
            progressEmitter.off(eventName, callback);
        };
    }

    /**
     * Emit progress event
     */
    private static emitProgress(profileId: string, state: AnalysisState): void {
        progressEmitter.emit(`progress_${profileId}`, state);
    }

    /**
     * Listen to analysis completions (for auto-navigation)
     */
    static onAnalysisCompleted(
        callback: (data: { exName: string; profileId: string }) => void
    ): () => void {
        progressEmitter.on('analysis_completed', callback);

        // Return unsubscribe function
        return () => {
            progressEmitter.off('analysis_completed', callback);
        };
    }

    /**
     * Cancel running analysis
     */
    static async cancelAnalysis(profileId: string): Promise<void> {
        const state = await this.getState(profileId);
        if (!state) return;

        state.status = 'paused';
        state.logs.push('⏸️ Análisis cancelado por el usuario');
        await this.saveState(profileId, state);
        await this.removeFromActiveList(profileId);

        console.log('[BackgroundAnalysis] Cancelled:', profileId);
    }

    /**
     * Get list of active analyses
     */
    static async getActiveAnalyses(): Promise<string[]> {
        try {
            const json = await AsyncStorage.getItem(ACTIVE_ANALYSES_KEY);
            return json ? JSON.parse(json) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Add to active analyses list
     */
    private static async addToActiveList(profileId: string): Promise<void> {
        const active = await this.getActiveAnalyses();
        if (!active.includes(profileId)) {
            active.push(profileId);
            await AsyncStorage.setItem(ACTIVE_ANALYSES_KEY, JSON.stringify(active));
        }
    }

    /**
     * Remove from active analyses list
     */
    private static async removeFromActiveList(profileId: string): Promise<void> {
        const active = await this.getActiveAnalyses();
        const filtered = active.filter(id => id !== profileId);
        await AsyncStorage.setItem(ACTIVE_ANALYSES_KEY, JSON.stringify(filtered));
    }

    /**
     * Handle analysis error
     */
    private static async handleError(profileId: string, error: Error): Promise<void> {
        const state = await this.getState(profileId);
        if (!state) return;

        state.status = 'error';
        state.error = error.message;
        state.logs.push(`❌ Error: ${error.message}`);

        await this.saveState(profileId, state);
        await this.removeFromActiveList(profileId);
        this.emitProgress(profileId, state);

        console.error('[BackgroundAnalysis] ❌ Error for:', profileId, error);
    }

    /**
     * Send completion notification and trigger navigation
     */
    private static sendCompletionNotification(exName: string, profileId: string): void {
        console.log('[BackgroundAnalysis] 🔔 Analysis completed for:', exName);

        // Emit global completion event for auto-navigation
        progressEmitter.emit('analysis_completed', { exName, profileId });

        // TODO: Implement actual push notification with expo-notifications
    }

    /**
     * Clean up old/completed analyses (call periodically)
     */
    static async cleanup(): Promise<void> {
        const active = await this.getActiveAnalyses();

        for (const profileId of active) {
            const state = await this.getState(profileId);

            if (!state) {
                await this.removeFromActiveList(profileId);
                continue;
            }

            // Remove if completed/error and older than 24h
            if (state.status === 'completed' || state.status === 'error') {
                const age = Date.now() - new Date(state.lastUpdateAt).getTime();
                const hours = age / (1000 * 60 * 60);

                if (hours > 24) {
                    await AsyncStorage.removeItem(`${ANALYSIS_STATE_KEY}${profileId}`);
                    await this.removeFromActiveList(profileId);
                }
            }
        }
    }
}
