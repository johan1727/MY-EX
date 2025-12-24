import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, Image as ImageIcon, CheckCircle, ArrowLeft, Brain, MessageSquare } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { parseWhatsAppExport, parseTelegramExport, analyzePersonality, ParsedMessage, extractChatFromImages } from '../../../lib/exSimulator';
import { intelligentTokenSampling } from '../../../lib/messageSampling';
import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';
import ExportGuide from '../../../components/ExportGuide';
import { storage } from '../../../lib/storage';

type ImportStep = 'guide' | 'upload' | 'loading' | 'preview' | 'analyzing' | 'complete' | 'error';

export default function ImportChat() {
    const router = useRouter();
    const [step, setStep] = useState<ImportStep>('guide');
    const [importType, setImportType] = useState<'whatsapp' | 'telegram' | 'text' | 'screenshots'>('whatsapp');
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
    const [exName, setExName] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [parsedCount, setParsedCount] = useState(0);
    const [truncatedInfo, setTruncatedInfo] = useState<{ original: number; used: number } | null>(null);
    const [progress, setProgress] = useState(0);
    const [debugLog, setDebugLog] = useState<string[]>([]);

    // Debug helper to log steps visually
    const addDebug = (msg: string) => {
        console.log(`[DEBUG] ${msg}`);
        setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
    };


    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: importType === 'telegram' ? 'application/json' : 'text/plain',
                copyToCacheDirectory: true
            });
            if (result.canceled) return;
            setStep('loading');
            setTruncatedInfo(null);
            addDebug('📂 Archivo seleccionado');
            const file = result.assets[0];

            const response = await fetch(file.uri);
            let text = await response.text();
            addDebug(`📏 Tamaño: ${(text.length / 1024 / 1024).toFixed(1)}MB`);

            // LIMIT: Use last 4MB max (stable limit)
            // This prevents Android from freezing on massive files
            const MAX_TEXT_SIZE = 4 * 1024 * 1024; // 4MB - stable
            if (text.length > MAX_TEXT_SIZE) {
                const originalSize = text.length;
                addDebug(`⚠️ Archivo muy grande, optimizando...`);
                // Take only the LAST 2MB (most recent messages)
                text = text.slice(-MAX_TEXT_SIZE);
                // Find first complete line
                const firstNewline = text.indexOf('\n');
                if (firstNewline > 0) {
                    text = text.slice(firstNewline + 1);
                }
                setTruncatedInfo({ original: originalSize, used: text.length });
                addDebug(`✂️ Optimizado: ${(text.length / 1024 / 1024).toFixed(1)}MB`);
            }

            setRawText(text);

            // Let UI update before heavy parsing
            await new Promise(resolve => setTimeout(resolve, 100));
            addDebug('🔍 Parseando mensajes...');
            await new Promise(resolve => setTimeout(resolve, 50)); // Force UI update

            let messages: ParsedMessage[] = [];
            if (importType === 'whatsapp') messages = parseWhatsAppExport(text);
            else if (importType === 'telegram') messages = parseTelegramExport(JSON.parse(text));

            addDebug(`📨 Encontrados: ${messages.length} mensajes`);

            if (messages.length === 0) {
                setStep('error');
                setErrorMessage('No se encontraron mensajes.');
                return;
            }
            const { messages: finalMessages } = intelligentTokenSampling(messages);

            setParsedMessages(finalMessages);
            setParsedCount(finalMessages.length);
            setStep('preview');
        } catch (e: any) {
            setStep('error');
            setErrorMessage(e.message);
        }
    };

    const handleImageUpload = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                base64: true,
            });
            if (result.canceled) return;
            setAnalyzing(true);
            const base64Images = result.assets.map(asset => asset.base64).filter(Boolean) as string[];
            if (base64Images.length === 0) { Alert.alert('Error', 'Error procesando imágenes'); setAnalyzing(false); return; }
            Alert.alert('Procesando', 'Analizando capturas...');
            const messages = await extractChatFromImages(base64Images);
            setParsedMessages(messages);
            setStep('preview');
        } catch (error) { Alert.alert('Error', 'Falló la carga de imágenes'); } finally { setAnalyzing(false); }
    };

    const handleTextPaste = async () => {
        if (!rawText.trim()) { Alert.alert('Error', 'Pega el texto'); return; }
        await new Promise(resolve => setTimeout(resolve, 50));
        const messages = parseWhatsAppExport(rawText);
        if (messages.length < 5) { Alert.alert('Error', 'Mínimo 5 mensajes'); return; }
        const { messages: finalMessages } = intelligentTokenSampling(messages);
        setParsedMessages(finalMessages);
        setStep('preview');
    };

    const handleAnalyze = async () => {
        console.log('[handleAnalyze] 🚀 STARTING ANALYSIS');

        console.log('[handleAnalyze] exName:', exName);
        console.log('[handleAnalyze] parsedMessages count:', parsedMessages.length);

        if (!exName.trim()) {
            Alert.alert('Error', 'Ingresa nombre');
            return;
        }

        // Helper to force UI update on Android
        const forceProgressUpdate = async (value: number) => {
            setProgress(value);
            addDebug(`Progress: ${value}%`);
            await new Promise(resolve => setTimeout(resolve, 50));
        };

        // Set step and initial progress IMMEDIATELY
        setDebugLog([]); // Clear debug log FIRST
        setStep('analyzing');
        setAnalyzing(true);

        // Now add debug AFTER clearing
        addDebug('🚀 Análisis iniciado');
        addDebug(`Ex: ${exName}`);
        await forceProgressUpdate(1);


        try {
            if (!parsedMessages || parsedMessages.length === 0) {
                throw new Error('No hay mensajes para analizar. Sube un archivo primero.');
            }

            addDebug(`Mensajes a analizar: ${parsedMessages.length}`);
            await forceProgressUpdate(5);

            // Stage 1: Analyze personality (5-60%) with timeout
            let profile;
            try {
                addDebug('Iniciando analyzePersonality...');

                // Timeout promise - 3 minutes max
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('TIMEOUT: El análisis tardó más de 3 minutos. Intenta con un archivo más pequeño.')), 180000);
                });

                // Race between analysis and timeout
                profile = await Promise.race([
                    analyzePersonality(parsedMessages, exName, (p, s) => {
                        const mapped = Math.round(5 + (p * 0.55));
                        setProgress(mapped);
                        if (p % 20 === 0) addDebug(`AI Progress: ${p}%`);
                    }),
                    timeoutPromise
                ]);

                addDebug('✅ analyzePersonality completado');
            } catch (analyzeError: any) {
                addDebug(`❌ ERROR: ${analyzeError.message}`);
                console.error('[handleAnalyze] ❌ analyzePersonality FAILED:', analyzeError);
                throw new Error(`${analyzeError.message || 'Error de conexión. Verifica tu internet e intenta de nuevo.'}`);

            }

            await forceProgressUpdate(65);

            // Find the sender name that matches exName
            const senderCounts = new Map<string, number>();
            parsedMessages.forEach(msg => {
                senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
            });

            // Find the ex sender name (matching exName)
            const exNameLower = exName.toLowerCase().trim();
            const exSenderName = Array.from(senderCounts.keys()).find(name => {
                const nameLower = name.toLowerCase().trim();
                return nameLower === exNameLower ||
                    nameLower.includes(exNameLower) ||
                    exNameLower.includes(nameLower);
            }) || exName;

            const profileData: any = {
                id: `local_${Date.now()}`,
                exName,
                profile,
                messageCount: parsedMessages.length,
                createdAt: new Date().toISOString(),
            };

            // Stage 2: Generate Master Prompt (65-95%)
            await forceProgressUpdate(70);
            try {
                console.log('[handleAnalyze] Generating master prompt...');
                console.log('[handleAnalyze] exSenderName:', exSenderName, 'exName:', exName);

                const masterPromptResult = await generateMasterPrompt(
                    parsedMessages,
                    exSenderName,  // Correct: sender name from chat
                    exName,        // Correct: display name
                    (p, s, t) => {
                        // p is 0-100, map to 70-95%
                        setProgress(Math.round(70 + (p * 0.25)));
                        console.log(`[MasterPrompt Progress] ${p}% - ${s}`);
                    }
                );
                profileData.tokenCount = masterPromptResult.tokenCount;
                profileData.masterPrompt = masterPromptResult.masterPrompt;
                console.log('[handleAnalyze] Master prompt generated:', masterPromptResult.tokenCount, 'tokens');
            } catch (err: any) {
                console.error('[handleAnalyze] Master prompt failed:', err);
                // Continue without master prompt - basic analysis still works
            }

            // Stage 3: Save profile (95-100%)
            console.log('[handleAnalyze] Saving profile...');
            await forceProgressUpdate(96);
            setParsedMessages([]);

            try {
                console.log('[handleAnalyze] Profile data keys:', Object.keys(profileData));
                console.log('[handleAnalyze] Profile has masterPrompt:', !!profileData.masterPrompt);

                await storage.setItem('exSimulator_currentProfile', JSON.stringify(profileData));
                console.log('[handleAnalyze] ✅ Current profile saved');

                const existingProfiles = await storage.getItem('exSimulator_profiles');
                const profiles = JSON.parse(existingProfiles || '[]');
                profiles.push(profileData);
                await storage.setItem('exSimulator_profiles', JSON.stringify(profiles));
                console.log('[handleAnalyze] ✅ Profile added to list, total profiles:', profiles.length);
            } catch (saveError: any) {
                console.error('[handleAnalyze] ❌ Save error:', saveError);
                // Try to save at least the basic profile
                try {
                    const minimalProfile = { name: profileData.name, id: profileData.id };
                    await storage.setItem('exSimulator_currentProfile', JSON.stringify(minimalProfile));
                    console.log('[handleAnalyze] ⚠️ Saved minimal profile due to error');
                } catch (e) {
                    console.error('[handleAnalyze] ❌❌ Even minimal save failed:', e);
                }
            }

            setProgress(100);
            console.log('[handleAnalyze] 🎉 ANALYSIS COMPLETE! Setting step to complete...');
            setStep('complete');
            console.log('[handleAnalyze] Redirecting to home in 1.5s...');
            setTimeout(() => router.replace('/(tabs)' as any), 1500);

        } catch (error: any) {
            console.error('[handleAnalyze] Analysis failed:', error);
            Alert.alert('Error en el análisis', error.message || 'Ocurrió un error inesperado. Intenta de nuevo.');
            setStep('preview');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('upload');
            return;
        }
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    if (step === 'guide') {
        return <ExportGuide onClose={() => setStep('upload')} onBack={() => router.replace('/(tabs)')} />;
    }


    if (step === 'loading' || step === 'analyzing') {
        const stages = [
            { label: 'Iniciando análisis...', threshold: 0 },
            { label: 'Analizando psicología...', threshold: 20 },
            { label: 'Generando sistema maestro...', threshold: 70 },
            { label: 'Guardando perfil...', threshold: 95 }
        ];

        // Display progress - show at least 1% if we're in analyzing mode
        const displayProgress = step === 'analyzing' && progress === 0 ? 1 : progress;

        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingIcon}>
                    <Brain size={48} color="white" />
                </View>
                <Text style={styles.loadingTitle}>
                    {step === 'loading' ? 'Procesando' : 'Analizando'}
                </Text>
                <Text style={styles.loadingSubtitle}>Esto puede tomar hasta 2 minutos...</Text>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBarFill, { width: `${Math.max(displayProgress, 3)}%` }]} />
                </View>
                <Text style={styles.progressPercentage}>
                    {displayProgress === 0 ? 'Iniciando...' : `${displayProgress}%`}
                </Text>

                <View style={styles.stagesCard}>
                    {stages.map((stage, index) => {
                        const isActive = displayProgress >= stage.threshold && (index === stages.length - 1 || displayProgress < stages[index + 1].threshold);
                        const isCompleted = displayProgress >= (index === stages.length - 1 ? 100 : stages[index + 1].threshold);

                        return (
                            <View key={index} style={styles.stageRow}>
                                <View style={[styles.stageIndicator, isCompleted && styles.stageIndicatorCompleted, isActive && styles.stageIndicatorActive]}>
                                    {isCompleted ? (
                                        <CheckCircle size={14} color="white" />
                                    ) : isActive ? (
                                        <ActivityIndicator size={12} color="#a855f7" />
                                    ) : (
                                        <View style={styles.stageDot} />
                                    )}
                                </View>
                                <Text style={[styles.stageLabel, (isCompleted || isActive) && styles.stageLabelActive]}>
                                    {stage.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                <Text style={styles.engineLabel}>REMI AI ENGINE 2.0</Text>

                {/* Debug panel removido - análisis ya funciona correctamente */}

            </View>
        );
    }


    if (step === 'complete') {
        return (
            <View style={styles.completeContainer}>
                <View style={styles.completeIcon}>
                    <CheckCircle size={48} color="black" />
                </View>
                <Text style={styles.completeTitle}>¡Análisis Listo!</Text>
                <Text style={styles.completeSubtitle}>Generando simulación...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1a1a2e', '#050505']} style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <ArrowLeft size={20} color="white" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Nuevo Análisis</Text>
                    <Text style={styles.headerSubtitle}>REMI</Text>
                </View>
            </LinearGradient>

            <ScrollView style={styles.scrollView}>
                {step === 'upload' && (
                    <>
                        <Text style={styles.sectionLabel}>SELECCIONA FUENTE DE DATOS</Text>

                        <View style={styles.sourceRow}>
                            <TouchableOpacity
                                onPress={() => setImportType('whatsapp')}
                                style={[styles.sourceCard, importType === 'whatsapp' && styles.sourceCardActive]}
                            >
                                <View style={[styles.sourceIcon, importType === 'whatsapp' && styles.sourceIconWhatsApp]}>
                                    <MessageSquare size={24} color={importType === 'whatsapp' ? '#22c55e' : 'white'} />
                                </View>
                                <Text style={styles.sourceTitle}>WhatsApp</Text>
                                <Text style={styles.sourceSubtitle}>Recomendado</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setImportType('screenshots')}
                                style={[styles.sourceCard, importType === 'screenshots' && styles.sourceCardScreenshots]}
                            >
                                <View style={[styles.sourceIcon, importType === 'screenshots' && styles.sourceIconScreenshots]}>
                                    <ImageIcon size={24} color={importType === 'screenshots' ? '#a855f7' : 'white'} />
                                </View>
                                <Text style={styles.sourceTitle}>Capturas</Text>
                                <Text style={styles.sourceSubtitle}>OCR IA</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={() => setImportType('text')}
                            style={[styles.textOption, importType === 'text' && styles.textOptionActive]}
                        >
                            <View style={[styles.textOptionIcon, importType === 'text' && styles.textOptionIconActive]}>
                                <FileText size={20} color={importType === 'text' ? '#3b82f6' : 'white'} />
                            </View>
                            <View style={styles.textOptionContent}>
                                <Text style={styles.textOptionTitle}>Pegar Texto Manualmente</Text>
                                <Text style={styles.textOptionSubtitle}>Mejor para fragmentos o historiales cortos</Text>
                            </View>
                            {importType === 'text' && <View style={styles.textOptionDot} />}
                        </TouchableOpacity>

                        {importType === 'text' ? (
                            <View style={styles.textInputSection}>
                                <View style={styles.textAreaContainer}>
                                    <TextInput
                                        style={styles.textArea}
                                        multiline
                                        placeholder="Pega la conversación aquí..."
                                        placeholderTextColor="#666"
                                        value={rawText}
                                        onChangeText={setRawText}
                                    />
                                </View>
                                <TouchableOpacity onPress={handleTextPaste} style={styles.primaryButton}>
                                    <Text style={styles.primaryButtonText}>Procesar Texto</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                onPress={importType === 'screenshots' ? handleImageUpload : handleFileUpload}
                                style={styles.uploadArea}
                            >
                                <View style={styles.uploadIcon}>
                                    <Upload size={24} color="white" />
                                </View>
                                <Text style={styles.uploadTitle}>Subir Archivo</Text>
                                <Text style={styles.uploadSubtitle}>
                                    {importType === 'whatsapp'
                                        ? 'Soporta historiales completos (10k - 200k+ msgs). Analizamos todo automáticamente.'
                                        : 'Selecciona múltiples capturas de pantalla'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {step === 'preview' && (
                    <>
                        <Text style={styles.sectionLabel}>CONFIGURACIÓN DE ANÁLISIS</Text>

                        <View style={styles.nameCard}>
                            <Text style={styles.nameLabel}>¿Cómo se llama la persona?</Text>
                            <TextInput
                                style={styles.nameInput}
                                placeholder="Ej: Alex"
                                placeholderTextColor="#444"
                                value={exName}
                                onChangeText={setExName}
                            />
                        </View>

                        {truncatedInfo && (
                            <View style={styles.truncationNotice}>
                                <Text style={styles.truncationIcon}>✂️</Text>
                                <View style={styles.truncationTextContainer}>
                                    <Text style={styles.truncationTitle}>Archivo optimizado</Text>
                                    <Text style={styles.truncationDesc}>
                                        Usamos los mensajes más recientes ({(truncatedInfo.used / 1024 / 1024).toFixed(1)}MB de {(truncatedInfo.original / 1024 / 1024).toFixed(1)}MB)
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.previewHeader}>
                            <Text style={styles.previewTitle}>Vista Previa</Text>
                            <View style={styles.previewBadge}>
                                <Text style={styles.previewBadgeText}>{parsedMessages.length} msgs</Text>
                            </View>
                        </View>

                        <View style={styles.previewCard}>
                            <ScrollView nestedScrollEnabled style={styles.previewScroll}>
                                {parsedMessages.slice(0, 10).map((msg, i) => (
                                    <View key={i} style={[styles.previewMessage, msg.sender === 'user' ? styles.previewMessageUser : styles.previewMessageEx]}>
                                        <View style={[styles.previewBubble, msg.sender === 'user' ? styles.previewBubbleUser : styles.previewBubbleEx]}>
                                            <Text style={styles.previewText}>{msg.content.substring(0, 100)}</Text>
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>

                        <TouchableOpacity onPress={handleAnalyze} style={styles.primaryButton}>
                            <Text style={styles.primaryButtonText}>INICIAR ANÁLISIS</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050505',
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 20,
    },
    headerSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 32,
    },
    sectionLabel: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 24,
        textAlign: 'center',
    },
    sourceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    sourceCard: {
        width: '48%',
        backgroundColor: '#0f0f11',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    sourceCardActive: {
        borderColor: 'rgba(34,197,94,0.5)',
    },
    sourceCardScreenshots: {
        borderColor: 'rgba(168,85,247,0.5)',
    },
    sourceIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    sourceIconWhatsApp: {
        backgroundColor: 'rgba(34,197,94,0.2)',
    },
    sourceIconScreenshots: {
        backgroundColor: 'rgba(168,85,247,0.2)',
    },
    sourceTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 4,
    },
    sourceSubtitle: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    textOption: {
        backgroundColor: '#0f0f11',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 32,
    },
    textOptionActive: {
        borderColor: 'rgba(59,130,246,0.5)',
    },
    textOptionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    textOptionIconActive: {
        backgroundColor: 'rgba(59,130,246,0.2)',
    },
    textOptionContent: {
        flex: 1,
    },
    textOptionTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    textOptionSubtitle: {
        color: '#6b7280',
        fontSize: 12,
    },
    textOptionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
        marginRight: 8,
    },
    textInputSection: {
        marginBottom: 32,
    },
    textAreaContainer: {
        backgroundColor: '#0f0f11',
        borderRadius: 32,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    textArea: {
        backgroundColor: 'transparent',
        padding: 24,
        color: '#fff',
        fontSize: 16,
        minHeight: 200,
        textAlignVertical: 'top',
    },
    uploadArea: {
        backgroundColor: '#0f0f11',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 32,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    uploadIcon: {
        width: 64,
        height: 64,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    uploadTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 4,
    },
    uploadSubtitle: {
        color: '#6b7280',
        fontSize: 12,
        textAlign: 'center',
        maxWidth: 240,
        lineHeight: 20,
    },
    primaryButton: {
        backgroundColor: '#fff',
        paddingVertical: 20,
        borderRadius: 999,
        alignItems: 'center',
        marginBottom: 40,
    },
    primaryButtonText: {
        color: '#000',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 2,
    },
    nameCard: {
        backgroundColor: '#0f0f11',
        borderRadius: 32,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 24,
    },
    nameLabel: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 18,
        marginBottom: 12,
        marginLeft: 4,
    },
    nameInput: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 20,
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    previewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    previewTitle: {
        color: '#fff',
        fontWeight: '700',
    },
    previewBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 999,
    },
    previewBadgeText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
        fontWeight: '700',
    },
    previewCard: {
        backgroundColor: '#0f0f11',
        borderRadius: 24,
        padding: 16,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        maxHeight: 250,
    },
    previewScroll: {
        paddingRight: 8,
    },
    previewMessage: {
        marginBottom: 12,
        flexDirection: 'row',
    },
    previewMessageUser: {
        justifyContent: 'flex-end',
    },
    previewMessageEx: {
        justifyContent: 'flex-start',
    },
    previewBubble: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        maxWidth: '85%',
    },
    previewBubbleUser: {
        backgroundColor: 'rgba(34,197,94,0.2)',
        borderTopRightRadius: 4,
    },
    previewBubbleEx: {
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 4,
    },
    previewText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    loadingIcon: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#1c1c1e',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        alignSelf: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    loadingTitle: {
        color: '#fff',
        fontSize: 30,
        fontWeight: '900',
        marginBottom: 8,
        textAlign: 'center',
    },
    loadingSubtitle: {
        color: '#9ca3af',
        textAlign: 'center',
        fontWeight: '500',
        marginBottom: 40,
    },
    stagesCard: {
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    stageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    stageIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        marginRight: 16,
    },
    stageIndicatorCompleted: {
        backgroundColor: '#9333ea',
        borderColor: '#9333ea',
    },
    stageIndicatorActive: {
        borderColor: '#a855f7',
    },
    stageDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    stageLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#4b5563',
    },
    stageLabelActive: {
        color: '#fff',
    },
    engineLabel: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 32,
    },
    completeContainer: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    completeIcon: {
        width: 96,
        height: 96,
        backgroundColor: '#fff',
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    completeTitle: {
        color: '#fff',
        fontSize: 40,
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: 8,
    },
    completeSubtitle: {
        color: '#6b7280',
        fontWeight: '700',
        letterSpacing: 2,
    },
    truncationNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },
    truncationIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    truncationTextContainer: {
        flex: 1,
    },
    truncationTitle: {
        color: '#a78bfa',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    truncationDesc: {
        color: '#9ca3af',
        fontSize: 12,
    },
    progressBarContainer: {
        width: '80%',
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        marginTop: 24,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#a855f7',
        borderRadius: 4,
    },
    progressPercentage: {
        color: '#a855f7',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 16,
    },
    debugPanel: {
        marginTop: 20,
        padding: 12,
        backgroundColor: 'rgba(255,0,0,0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.3)',
        width: '90%',
    },
    debugTitle: {
        color: '#ff6b6b',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
    },
    debugLine: {
        color: '#ffa726',
        fontSize: 10,
        fontFamily: 'monospace',
        marginBottom: 2,
    },
});

