import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { ParsedMessage } from './exSimulator';
import { analyzePersonality, ExProfile } from './exSimulator';
import { clearAnalysisCache } from './chatValidation';
import { generateMasterPrompt } from './masterPromptGenerator';
import { saveProfile } from './profileSync';
import { supabase } from './supabase';
import { storage } from './storage';
import { saveExtractedFacts } from './factEmbeddings';

interface AnalysisContextType {
    isAnalyzing: boolean;
    progress: number;
    currentLogs: string[];
    error: string | null;
    result: ExProfile | null;
    startAnalysis: (
        parsedMessages: ParsedMessage[],
        exName: string,
        relationshipType: 'partner' | 'ex' | 'friend' | 'family' | 'deceased',
        updateProfileId?: string
    ) => Promise<void>;
    resetAnalysis: () => void;
    addLog: (message: string) => void;
}

const AnalysisContext = createContext<AnalysisContextType | null>(null);

export const useAnalysis = () => {
    const context = useContext(AnalysisContext);
    if (!context) {
        throw new Error('useAnalysis must be used within an AnalysisProvider');
    }
    return context;
};

export const AnalysisProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentLogs, setCurrentLogs] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ExProfile | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const addLog = useCallback((message: string) => {
        console.log(`[AnalysisContext] ${message}`);
        setCurrentLogs(prev => [...prev.slice(-49), message]);
    }, []);

    const resetAnalysis = useCallback(() => {
        if (isAnalyzing) return; // Don't reset if busy
        setIsAnalyzing(false);
        setProgress(0);
        setCurrentLogs([]);
        setError(null);
        setResult(null);
    }, [isAnalyzing]);

    const startAnalysis = useCallback(async (
        parsedMessages: ParsedMessage[],
        exName: string,
        relationshipType: 'partner' | 'ex' | 'friend' | 'family' | 'deceased',
        updateProfileId?: string
    ) => {
        if (isAnalyzing) return;

        // Reset state for new run
        setIsAnalyzing(true);
        setProgress(0);
        setCurrentLogs([]);
        setError(null);
        setResult(null);

        addLog(`🚀 Iniciando análisis en background para: ${exName}`);

        try {
            await clearAnalysisCache(exName);

            // 1. Analyze Personality
            addLog('🧠 Analizando personalidad y patrones...');
            const profile = await analyzePersonality(
                parsedMessages,
                exName,
                (p, stage) => {
                    // Map 0-100 (Stage 1) to 0-60% global
                    const mapped = Math.round(p * 0.6);
                    setProgress(mapped);
                    if (p % 20 === 0) addLog(`Progreso AI: ${p}%`);
                },
                relationshipType
            );

            addLog('✅ Personalidad analizada');
            setProgress(60);

            // 2. Identify Names
            const senderCounts = new Map<string, number>();
            parsedMessages.forEach(msg => {
                senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
            });

            const exNameLower = exName.toLowerCase().trim();
            const exSenderName = Array.from(senderCounts.keys()).find(name => {
                const nameLower = name.toLowerCase().trim();
                return nameLower === exNameLower ||
                    nameLower.includes(exNameLower) ||
                    exNameLower.includes(nameLower);
            }) || exName;

            const detectedUserName = Array.from(senderCounts.keys()).find(name =>
                name.toLowerCase().trim() !== exSenderName.toLowerCase().trim()
            ) || 'Usuario';

            addLog(`👤 Usuario identificado: ${detectedUserName}`);

            // 3. Generate Master Prompt
            addLog('📝 Generando sistema maestro...');
            const masterPromptResult = await generateMasterPrompt(
                parsedMessages,
                exSenderName,
                exName,
                (p, s) => {
                    // Map 0-100 to 60-90% global
                    const mapped = 60 + Math.round(p * 0.3);
                    setProgress(mapped);
                }
            );
            addLog(`✅ Sistema maestro generado (${masterPromptResult.tokenCount} tokens)`);
            setProgress(90);

            // 4. Construct Profile Data
            const profileData: any = {
                id: `local_${Date.now()}`,
                exName,
                userName: detectedUserName,
                profile,
                messageCount: parsedMessages.length,
                createdAt: new Date().toISOString(),
                tokenCount: masterPromptResult.tokenCount,
                masterPrompt: masterPromptResult.masterPrompt
            };

            // 5. Save
            addLog('💾 Guardando perfil...');
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            let finalProfileId: string | undefined = updateProfileId;

            try {
                if (updateProfileId && userId) {
                    addLog(`🔄 Actualizando perfil existente: ${updateProfileId}`);
                    // Wrap update in timeout/try-catch to ensure we don't hang
                    try {
                        const updatePromise = supabase
                            .from('ex_profiles')
                            .update({
                                profile_data: profileData.profile,
                                message_count: profileData.messageCount,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', updateProfileId)
                            .eq('user_id', userId);

                        const timeoutPromise = new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Update timeout')), 5000)
                        );

                        await Promise.race([updatePromise, timeoutPromise]);
                        addLog('✅ Perfil actualizado en nube');
                        finalProfileId = updateProfileId;
                    } catch (updateErr) {
                        console.error('[AnalysisContext] Cloud update failed:', updateErr);
                        addLog('⚠️ Error actualizando nube (guardado local)');
                        // Fallback: Continue with local save logic below via exception handling
                        throw updateErr;
                    }
                } else {
                    addLog('➕ Creando nuevo perfil');
                    // saveProfile already has timeout logic, but let's be double sure
                    const savedProfile = await saveProfile(profileData, userId);
                    finalProfileId = savedProfile.supabaseId;
                }

                // 6. Save Extracted Facts (Memory)
                if (finalProfileId && profile.extractedFacts && profile.extractedFacts.length > 0) {
                    addLog(`🧠 Guardando ${profile.extractedFacts.length} recuerdos en memoria...`);
                    await saveExtractedFacts(finalProfileId, profile.extractedFacts);
                    addLog('✅ Recuerdos indexados');
                }

            } catch (saveError: any) {
                console.error('[AnalysisContext] Save error:', saveError);
                addLog('⚠️ Error guardando en nube, intentando local...');
                // Local save fallback
                const existingProfiles = await storage.getItem('exSimulator_allProfiles');
                const profiles = JSON.parse(existingProfiles || '[]');
                profiles.push(profileData);
                await storage.setItem('exSimulator_allProfiles', JSON.stringify(profiles));
            }

            setProgress(100);
            setResult(profile);
            addLog('🎉 Análisis completado exitosamente');

        } catch (err: any) {
            console.error('[AnalysisContext] Analysis failed:', err);
            setError(err.message || 'Error desconocido durante el análisis');
            addLog(`❌ Error: ${err.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    }, [isAnalyzing, addLog]);

    return (
        <AnalysisContext.Provider value={{
            isAnalyzing,
            progress,
            currentLogs,
            error,
            result,
            startAnalysis,
            resetAnalysis,
            addLog
        }}>
            {children}
        </AnalysisContext.Provider>
    );
};
