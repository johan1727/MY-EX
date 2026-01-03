/**
 * ANALYSIS PROGRESS INDICATOR
 * 
 * Floating banner that shows analysis progress when running in background.
 * Allows user to see details or cancel the analysis.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BackgroundAnalysisManager, type AnalysisState } from '@/lib/BackgroundAnalysisManager';
import { useRouter } from 'expo-router';

interface Props {
    onDismiss?: () => void;
}

export function AnalysisProgressIndicator({ onDismiss }: Props) {
    const [state, setState] = useState<AnalysisState | null>(null);
    const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
    const [slideAnim] = useState(new Animated.Value(-100));
    const router = useRouter();

    // Auto-detect active analyses
    useEffect(() => {
        const checkForActiveAnalysis = async () => {
            const activeList = await BackgroundAnalysisManager.getActiveAnalyses();

            if (activeList.length > 0) {
                // Show the first active analysis
                const profileId = activeList[0];
                setCurrentProfileId(profileId);

                const analysisState = await BackgroundAnalysisManager.getState(profileId);
                if (analysisState) {
                    setState(analysisState);

                    // Slide in
                    Animated.timing(slideAnim, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                }
            } else {
                setCurrentProfileId(null);
                setState(null);
            }
        };

        checkForActiveAnalysis();
        const interval = setInterval(checkForActiveAnalysis, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);

    // Subscribe to progress updates when we have a profile ID
    useEffect(() => {
        if (!currentProfileId) return;

        // Load initial state for the currentProfileId
        BackgroundAnalysisManager.getState(currentProfileId).then(setState);

        const unsubscribe = BackgroundAnalysisManager.onProgressUpdate(currentProfileId, (newState) => {
            setState(newState);

            // Auto-dismiss when completed
            if (newState.status === 'completed' || newState.status === 'error') {
                setTimeout(() => {
                    slideOut();
                }, 3000);
            }
        });

        return unsubscribe;
    }, [currentProfileId]);

    const slideOut = () => {
        Animated.timing(slideAnim, {
            toValue: -100,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            onDismiss?.();
            // After sliding out, clear the current analysis state
            setCurrentProfileId(null);
            setState(null);
        });
    };

    const handleCancel = async () => {
        if (!currentProfileId) return;
        await BackgroundAnalysisManager.cancelAnalysis(currentProfileId);
        slideOut();
    };

    const handleViewDetails = () => {
        // Navigate to analysis screen or show modal with logs
        router.push('/tools/ex-simulator/analysis');
    };

    if (!state || state.status === 'paused') return null;

    const getStatusIcon = () => {
        switch (state.status) {
            case 'running': return '🤖';
            case 'completed': return '✅';
            case 'error': return '❌';
            default: return '⏳';
        }
    };

    const getStatusText = () => {
        switch (state.status) {
            case 'running':
                if (state.currentPhase === 'personality') return 'Analizando personalidad...';
                if (state.currentPhase === 'master_prompt') return 'Generando Master Prompt...';
                if (state.currentPhase === 'saving') return 'Guardando perfil...';
                return 'Procesando...';
            case 'completed': return `¡Análisis de ${state.exName} completo!`;
            case 'error': return 'Error en el análisis';
            default: return 'Analizando...';
        }
    };

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateY: slideAnim }] }
            ]}
        >
            <View style={styles.content}>
                {/* Status line */}
                <View style={styles.topRow}>
                    <Text style={styles.statusText}>
                        {getStatusIcon()} {getStatusText()}
                    </Text>

                    <View style={styles.actions}>
                        {state.status === 'running' && (
                            <TouchableOpacity onPress={handleViewDetails} style={styles.button}>
                                <Text style={styles.buttonText}>Ver</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            onPress={handleCancel}
                            style={[styles.button, styles.cancelButton]}
                        >
                            <Text style={styles.buttonText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Progress bar */}
                {state.status === 'running' && (
                    <View style={styles.progressContainer}>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${state.progress}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{Math.round(state.progress)}%</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 80, // Above tab bar
        left: 16,
        right: 16,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 1000,
    },
    content: {
        gap: 8,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        gap: 8,
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#333',
    },
    cancelButton: {
        backgroundColor: '#ff4444',
    },
    buttonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressTrack: {
        flex: 1,
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    progressText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },
});
