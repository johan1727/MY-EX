import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, CheckCircle, ArrowLeft, Brain, MessageSquare } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { parseWhatsAppExport, analyzePersonality, ParsedMessage } from '../../../lib/exSimulator';
import { intelligentTokenSampling } from '../../../lib/messageSampling';
import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';
import ExportGuide from '../../../components/ExportGuide';
import { storage } from '../../../lib/storage';
import { saveProfile } from '../../../lib/profileSync';
import { supabase } from '../../../lib/supabase';

// Helper to extract text from ZIP file (WhatsApp exports as ZIP with media)
async function extractTextFromZip(zipData: string): Promise<string | null> {
    try {
        // Convert base64 to array buffer
        const zip = new JSZip();
        await zip.loadAsync(zipData, { base64: true });

        // Find the .txt file in the ZIP
        const txtFiles = Object.keys(zip.files).filter(name => name.endsWith('.txt'));
        if (txtFiles.length === 0) {
            console.log('[ZIP] No .txt files found in ZIP');
            return null;
        }

        // Read the first .txt file
        const txtContent = await zip.file(txtFiles[0])?.async('string');
        console.log('[ZIP] Extracted text from:', txtFiles[0], 'length:', txtContent?.length);
        return txtContent || null;
    } catch (error) {
        console.error('[ZIP] Error extracting:', error);
        return null;
    }
}

type ImportStep = 'guide' | 'upload' | 'loading' | 'preview' | 'analyzing' | 'complete' | 'error';

export default function ImportChat() {
    const router = useRouter();
    const [step, setStep] = useState<ImportStep>('guide');
    const [importType, setImportType] = useState<'whatsapp' | 'text'>('whatsapp');
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
    const [exName, setExName] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [parsedCount, setParsedCount] = useState(0);
    const [truncatedInfo, setTruncatedInfo] = useState<{ original: number; used: number } | null>(null);
    const [progress, setProgress] = useState(0);
    const [debugLog, setDebugLog] = useState<string[]>([]);
    const [showRegistrationReminder, setShowRegistrationReminder] = useState(false);

    // Debug helper to log steps visually
    const addDebug = (msg: string) => {
        console.log(`[DEBUG] ${msg}`);
        setDebugLog(prev => [...prev.slice(-10), `${new Date().toLocaleTimeString()}: ${msg}`]);
    };

    // Check for shared file on mount
    useEffect(() => {
        const checkSharedFile = async () => {
            try {
                addDebug('🔍 Buscando archivos compartidos...');
                const sharedFileUri = await storage.getItem('sharedFileUri');
                const sharedText = await storage.getItem('sharedText');

                if (sharedFileUri) {
                    console.log('[Import] Found shared file:', sharedFileUri);
                    addDebug('📂 Archivo encontrado: ' + sharedFileUri.substring(0, 50) + '...');

                    // Set loading immediately
                    setStep('loading');

                    // Clear the stored value
                    await storage.removeItem('sharedFileUri');
                    await storage.removeItem('sharedFileName');

                    try {
                        addDebug('📖 Leyendo archivo...');
                        let text = '';

                        // For content:// URIs, we need to copy to cache first
                        const cacheUri = FileSystem.cacheDirectory + 'shared_chat_' + Date.now();

                        if (sharedFileUri.startsWith('content://')) {
                            addDebug('📋 Copiando desde content:// a cache...');
                            await FileSystem.copyAsync({ from: sharedFileUri, to: cacheUri });
                        } else {
                            await FileSystem.copyAsync({ from: sharedFileUri, to: cacheUri });
                        }

                        // CRITICAL FIX: Check file size FIRST before reading anything
                        const fileInfo = await FileSystem.getInfoAsync(cacheUri);
                        const fileSizeBytes = (fileInfo as any).size || 0;
                        const fileSizeMB = fileSizeBytes / 1024 / 1024;
                        addDebug(`📏 Tamaño: ${fileSizeMB.toFixed(1)}MB`);
                        await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

                        // For ZIP detection, we only need the first few bytes
                        // ZIP files start with "PK" (0x504B)
                        // Read only first 4 bytes as base64 to detect file type
                        addDebug('🔍 Detectando tipo de archivo...');
                        await new Promise(resolve => setTimeout(resolve, 50));

                        // Use fetch + blob.slice to read only first bytes
                        const headerResponse = await fetch(cacheUri);
                        const headerBlob = await headerResponse.blob();
                        const headerSlice = headerBlob.slice(0, 100); // Just first 100 bytes
                        const headerArrayBuffer = await headerSlice.arrayBuffer();
                        const headerBytes = new Uint8Array(headerArrayBuffer);

                        // Check for ZIP signature: 0x50 0x4B (PK)
                        const isZip = headerBytes[0] === 0x50 && headerBytes[1] === 0x4B;
                        addDebug(isZip ? '📦 ZIP detectado' : '📄 Texto detectado');
                        await new Promise(resolve => setTimeout(resolve, 50));

                        if (isZip) {
                            addDebug('📦 Extrayendo contenido del ZIP...');
                            await new Promise(resolve => setTimeout(resolve, 50));

                            // For ZIP, we need to read the whole file but warn user
                            if (fileSizeMB > 15) {
                                addDebug(`⚠️ ZIP muy grande (${fileSizeMB.toFixed(0)}MB), puede tardar...`);
                            }

                            const base64Data = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                            const extractedText = await extractTextFromZip(base64Data);

                            if (extractedText) {
                                text = extractedText;
                                // Apply tail limit if text is too large
                                const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
                                if (text.length > MAX_TEXT_SIZE) {
                                    addDebug(`✂️ Optimizando texto extraído...`);
                                    text = text.slice(-MAX_TEXT_SIZE);
                                    const firstNewline = text.indexOf('\n');
                                    if (firstNewline > 0 && firstNewline < 1000) {
                                        text = text.slice(firstNewline + 1);
                                    }
                                }
                                addDebug(`✅ Texto extraído: ${(text.length / 1024 / 1024).toFixed(1)}MB`);
                            } else {
                                setStep('error');
                                setErrorMessage('No se encontró archivo de chat (.txt) dentro del ZIP. Intenta exportar sin medios.');
                                addDebug('❌ No se encontró .txt en el ZIP');
                                return;
                            }
                        } else {
                            // Regular text file - use optimized reading
                            addDebug('📄 Leyendo archivo de texto...');

                            // Use shared fileSizeBytes from above
                            const MAX_READ_SIZE = 10 * 1024 * 1024; // 10MB for 500k tokens

                            if (fileSizeBytes > MAX_READ_SIZE) {
                                // LARGE FILE: Read file as blob and take only tail
                                addDebug(`📦 Archivo grande - optimizando...`);
                                await new Promise(resolve => setTimeout(resolve, 50));

                                const response = await fetch(cacheUri);
                                const blob = await response.blob();
                                const tailBlob = blob.slice(blob.size - MAX_READ_SIZE);
                                text = await tailBlob.text();

                                // Find first complete line
                                const firstNewline = text.indexOf('\n');
                                if (firstNewline > 0 && firstNewline < 1000) {
                                    text = text.slice(firstNewline + 1);
                                }
                                addDebug(`✂️ Usando últimos ${(text.length / 1024 / 1024).toFixed(1)}MB`);
                            } else {
                                // Normal file - read entire thing
                                text = await FileSystem.readAsStringAsync(cacheUri);
                            }
                        }

                        addDebug(`📄 Texto final: ${(text.length / 1024 / 1024).toFixed(2)}MB`);
                        await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

                        if (text && text.length > 50) {
                            setRawText(text);
                            addDebug('🔍 Parseando mensajes de WhatsApp...');
                            await new Promise(resolve => setTimeout(resolve, 100)); // Force UI update

                            const messages = parseWhatsAppExport(text);
                            addDebug(`📨 Mensajes encontrados: ${messages.length.toLocaleString()}`);
                            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

                            if (messages.length > 0) {
                                addDebug('⚙️ Optimizando muestra (500k tokens)...');
                                await new Promise(resolve => setTimeout(resolve, 50));

                                let finalMessages;
                                try {
                                    const { messages: sampledMessages, stats } = intelligentTokenSampling(messages, 500000);
                                    finalMessages = sampledMessages;
                                    addDebug(`📊 ~${stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens`);
                                } catch (samplingError) {
                                    addDebug('⚠️ Fallback: últimos 25k mensajes');
                                    finalMessages = messages.slice(-25000);
                                }

                                setParsedMessages(finalMessages);
                                setParsedCount(finalMessages.length);
                                setStep('preview');
                                addDebug(`✅ ${finalMessages.length.toLocaleString()} mensajes listos`);
                            } else {
                                setStep('error');
                                setErrorMessage('No se encontraron mensajes de WhatsApp. Asegúrate de exportar el chat como texto (.txt).');
                                addDebug('❌ No se encontraron mensajes');
                            }
                        } else {
                            setStep('error');
                            setErrorMessage('El archivo está vacío o es muy corto (' + (text?.length || 0) + ' caracteres).');
                            addDebug('❌ Archivo muy corto');
                        }
                    } catch (fileError: any) {
                        console.error('[Import] File read error:', fileError);
                        setStep('error');
                        setErrorMessage('Error al leer el archivo: ' + (fileError?.message || 'Error desconocido'));
                        addDebug('❌ Error: ' + fileError?.message);
                    }
                } else if (sharedText) {
                    console.log('[Import] Found shared text, length:', sharedText.length);
                    setStep('loading');
                    addDebug('📝 Texto compartido encontrado: ' + sharedText.length + ' caracteres');
                    await storage.removeItem('sharedText');

                    setRawText(sharedText);
                    const messages = parseWhatsAppExport(sharedText);
                    if (messages.length > 0) {
                        const { messages: finalMessages } = intelligentTokenSampling(messages);
                        setParsedMessages(finalMessages);
                        setParsedCount(finalMessages.length);
                        setStep('preview');
                        addDebug(`✅ ${finalMessages.length} mensajes cargados`);
                    } else {
                        setStep('error');
                        setErrorMessage('No se encontraron mensajes en el texto compartido.');
                        addDebug('❌ No se encontraron mensajes');
                    }
                } else {
                    addDebug('ℹ️ No hay archivos compartidos');
                }
            } catch (error: any) {
                console.error('[Import] Error processing shared file:', error);
                setStep('error');
                setErrorMessage('Error procesando archivo: ' + (error?.message || 'Error desconocido'));
                addDebug('❌ Error general: ' + error?.message);
            }
        };

        checkSharedFile();
    }, []);


    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/plain',
                copyToCacheDirectory: true
            });
            if (result.canceled) return;
            setStep('loading');
            setTruncatedInfo(null);
            addDebug('📂 Archivo seleccionado');
            const file = result.assets[0];

            // SMART FILE READING: Support ANY file size using blob.slice
            const response = await fetch(file.uri);
            const blob = await response.blob();
            const fileSizeMB = blob.size / 1024 / 1024;
            addDebug(`📏 Tamaño: ${fileSizeMB.toFixed(1)}MB`);
            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

            // For 500k tokens, we need ~2 million chars (~10MB text max)
            const MAX_READ_SIZE = 10 * 1024 * 1024; // 10MB
            let text: string;

            if (blob.size > MAX_READ_SIZE) {
                // LARGE FILE: Read only the TAIL (most recent messages)
                addDebug(`📦 Archivo grande - optimizando...`);
                await new Promise(resolve => setTimeout(resolve, 50));

                const tailBlob = blob.slice(blob.size - MAX_READ_SIZE);
                text = await tailBlob.text();

                // Find first complete line
                const firstNewline = text.indexOf('\n');
                if (firstNewline > 0 && firstNewline < 1000) {
                    text = text.slice(firstNewline + 1);
                }

                setTruncatedInfo({ original: blob.size, used: text.length });
                addDebug(`✂️ Usando últimos ${(text.length / 1024 / 1024).toFixed(1)}MB (mensajes recientes)`);
            } else {
                // NORMAL FILE: Read entire file
                text = await blob.text();
            }
            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

            setRawText(text);

            // Let UI update before heavy parsing
            await new Promise(resolve => setTimeout(resolve, 100));
            addDebug('🔍 Parseando mensajes...');
            await new Promise(resolve => setTimeout(resolve, 50)); // Force UI update

            // CRITICAL FIX: Use requestAnimationFrame-style yielding to prevent freeze
            // Parse in chunks to allow UI to stay responsive
            let messages: ParsedMessage[] = [];
            try {
                // Parse synchronously but with a timeout wrapper to catch hangs
                const parsePromise = new Promise<ParsedMessage[]>((resolve, reject) => {
                    try {
                        const result = parseWhatsAppExport(text);
                        resolve(result);
                    } catch (e) {
                        reject(e);
                    }
                });

                // Add a 30 second timeout for parsing
                const timeoutPromise = new Promise<ParsedMessage[]>((_, reject) => {
                    setTimeout(() => reject(new Error('Parsing timeout - archivo muy grande')), 30000);
                });

                messages = await Promise.race([parsePromise, timeoutPromise]);
            } catch (parseError: any) {
                addDebug(`❌ Error parsing: ${parseError.message}`);
                throw new Error('Error al procesar el archivo. Intenta con un archivo más pequeño.');
            }

            addDebug(`📨 Encontrados: ${messages.length} mensajes`);
            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

            if (messages.length === 0) {
                setStep('error');
                setErrorMessage('No se encontraron mensajes.');
                return;
            }

            addDebug('⚙️ Optimizando muestra (500k tokens)...');
            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

            // CRITICAL: Add timeout for sampling too
            let finalMessages: ParsedMessage[];
            try {
                const samplingPromise = new Promise<{ messages: ParsedMessage[]; stats: any }>((resolve) => {
                    const result = intelligentTokenSampling(messages, 500000); // Explicit 500k tokens
                    resolve(result);
                });

                const samplingTimeout = new Promise<{ messages: ParsedMessage[]; stats: any }>((_, reject) => {
                    setTimeout(() => reject(new Error('Sampling timeout')), 30000); // 30s timeout
                });

                const samplingResult = await Promise.race([samplingPromise, samplingTimeout]);
                finalMessages = samplingResult.messages;
                addDebug(`📊 ~${samplingResult.stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens`);
            } catch (samplingError: any) {
                addDebug(`⚠️ Sampling falló, usando mensajes recientes`);
                // Fallback: take last 25000 messages (enough for good analysis)
                finalMessages = messages.slice(-25000);
            }

            addDebug(`✅ Listo: ${finalMessages.length.toLocaleString()} mensajes`);
            setParsedMessages(finalMessages);
            setParsedCount(finalMessages.length);
            setStep('preview');
        } catch (e: any) {
            setStep('error');
            setErrorMessage(e.message);
        }
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

        // Check for existing profile with same name
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingProfile } = await supabase
                    .from('ex_profiles')
                    .select('id, ex_name')
                    .eq('user_id', user.id)
                    .ilike('ex_name', exName)
                    .maybeSingle();

                if (existingProfile) {
                    // Profile exists - ask user what to do
                    return new Promise<void>((resolve) => {
                        Alert.alert(
                            '⚠️ Perfil Existente',
                            `Ya existe un perfil llamado "${existingProfile.ex_name}".\\n\\n¿Qué quieres hacer?`,
                            [
                                {
                                    text: '🔄 Actualizar Existente',
                                    onPress: async () => {
                                        // Set a flag to update instead of create
                                        (window as any).__updateProfileId = existingProfile.id;
                                        await continueAnalysis();
                                        resolve();
                                    }
                                },
                                {
                                    text: '➕ Crear Nuevo',
                                    onPress: async () => {
                                        // Clear flag to create new
                                        delete (window as any).__updateProfileId;
                                        await continueAnalysis();
                                        resolve();
                                    }
                                },
                                { text: 'Cancelar', style: 'cancel', onPress: () => resolve() }
                            ]
                        );
                    });
                }
            }
        } catch (err) {
            console.log('[handleAnalyze] Error checking for duplicates:', err);
            // Continue anyway
        }

        // No duplicate - proceed normally
        await continueAnalysis();
    };

    const continueAnalysis = async () => {
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
        const isUpdate = !!(window as any).__updateProfileId;
        addDebug(isUpdate ? '🔄 Actualizando perfil' : '🚀 Análisis iniciado');
        addDebug(`Ex: ${exName}`);
        await forceProgressUpdate(1);

        try {
            if (!parsedMessages || parsedMessages.length === 0) {
                throw new Error('No hay mensajes para analizar. Sube un archivo primero.');
            }

            // NEW: Validate minimum messages from target person
            const MINIMUM_EX_MESSAGES = 30;
            const exMessages = parsedMessages.filter(m =>
                m.sender.toLowerCase().includes(exName.toLowerCase()) ||
                exName.toLowerCase().includes(m.sender.toLowerCase())
            );

            if (exMessages.length < MINIMUM_EX_MESSAGES) {
                Alert.alert(
                    '📊 Pocos mensajes',
                    `Para un análisis preciso necesitamos al menos ${MINIMUM_EX_MESSAGES} mensajes de "${exName}".\n\nEncontramos solo ${exMessages.length} mensajes.\n\n💡 Tip: Asegúrate de que el nombre coincida exactamente con el chat o sube una conversación más larga.`,
                    [
                        {
                            text: 'Cancelar', style: 'cancel', onPress: () => {
                                setAnalyzing(false);
                                setStep('upload');
                            }
                        },
                        { text: 'Continuar igual', onPress: () => { } }
                    ]
                );
                // Don't return - let them continue if they want
            }

            addDebug(`✅ Mensajes a analizar: ${parsedMessages.length}`);
            addDebug(`📨 De ${exName}: ${exMessages.length} mensajes`);
            await forceProgressUpdate(5);
            addDebug('🧠 Preparando IA...');
            await forceProgressUpdate(8);

            // Stage 1: Analyze personality (5-60%) with timeout
            let profile;
            try {
                addDebug('🚀 Enviando a Gemini AI...');
                await forceProgressUpdate(10);

                // REDUCED timeout - 2 minutes max
                const timeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('TIMEOUT: El análisis tardó más de 2 minutos. Intenta con menos mensajes.')), 120000);
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

            // Find the user's name (the OTHER participant, not the ex)
            const allParticipants = Array.from(senderCounts.keys());
            const detectedUserName = allParticipants.find(name =>
                name.toLowerCase().trim() !== exSenderName.toLowerCase().trim()
            ) || 'Usuario';

            console.log('[handleAnalyze] 👤 Detected user name:', detectedUserName);

            const profileData: any = {
                id: `local_${Date.now()}`,
                exName,
                userName: detectedUserName, // NEW: Save user's name for personalization
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

            // Get current user ID for cloud sync - defined here so it's in scope for reminder check
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;
            console.log('[handleAnalyze] User ID for sync:', userId || 'guest');

            try {
                console.log('[handleAnalyze] Profile data keys:', Object.keys(profileData));
                console.log('[handleAnalyze] Profile has masterPrompt:', !!profileData.masterPrompt);

                // Check if we're updating an existing profile
                const updateProfileId = (window as any).__updateProfileId;

                if (updateProfileId && userId) {
                    // UPDATE existing profile
                    console.log('[handleAnalyze] 🔄 Updating existing profile:', updateProfileId);

                    await supabase
                        .from('ex_profiles')
                        .update({
                            profile_data: profileData.profile,
                            message_count: profileData.messageCount,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', updateProfileId)
                        .eq('user_id', userId);

                    // Clean up flag
                    delete (window as any).__updateProfileId;
                    console.log('[handleAnalyze] ✅ Profile updated successfully');
                } else {
                    // CREATE new profile
                    await saveProfile(profileData, userId);
                    console.log('[handleAnalyze] ✅ Profile saved (local + cloud)');
                }

            } catch (saveError: any) {
                console.error('[handleAnalyze] ❌ Save error:', saveError);
                // Try to save at least the basic profile locally
                try {
                    await storage.setItem('exSimulator_currentProfile', JSON.stringify(profileData));
                    const existingProfiles = await storage.getItem('exSimulator_allProfiles');
                    const profiles = JSON.parse(existingProfiles || '[]');
                    profiles.push(profileData);
                    await storage.setItem('exSimulator_allProfiles', JSON.stringify(profiles));
                    console.log('[handleAnalyze] ⚠️ Saved locally only due to cloud error');
                } catch (e) {
                    console.error('[handleAnalyze] ❌❌ Even local save failed:', e);
                }
            }

            setProgress(100);
            console.log('[handleAnalyze] 🎉 ANALYSIS COMPLETE! Setting step to complete...');
            setStep('complete');
            console.log('[handleAnalyze] Checking if should show registration reminder...');

            // Show registration reminder for guest users
            if (!userId) {
                console.log('[handleAnalyze] Guest user - showing registration reminder');
                setShowRegistrationReminder(true);
                // Don't auto-redirect for guests - let them see the reminder
            } else {
                console.log('[handleAnalyze] Logged in user - redirecting to home...');
                setTimeout(() => router.replace('/(tabs)' as any), 1500);
            }

        } catch (error: any) {
            console.error('[handleAnalyze] Analysis failed:', error);

            // Friendly error messages
            let errorMsg = error.message || 'Ocurrió un error inesperado.';
            let title = '❌ Error en el análisis';

            if (errorMsg.includes('No se pudo identificar') || errorMsg.includes('Participantes detectados')) {
                title = '👤 Nombre no encontrado';
                errorMsg = `${errorMsg}\n\n💡 Tip: Usa el nombre EXACTO como aparece en el chat exportado.`;
            } else if (errorMsg.includes('JSON') || errorMsg.includes('parse')) {
                title = '🔄 Error de procesamiento';
                errorMsg = 'Hubo un problema procesando el archivo. Intenta de nuevo.';
            } else if (errorMsg.includes('timeout') || errorMsg.includes('TIMEOUT')) {
                title = '⏱️ Tiempo agotado';
                errorMsg = 'El análisis tardó demasiado. Intenta con un archivo más pequeño.';
            }

            Alert.alert(title, errorMsg);
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

                {/* Debug panel para ver estado del procesamiento */}
                {debugLog.length > 0 && (
                    <View style={{ marginTop: 20, padding: 15, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, maxWidth: '90%' }}>
                        <Text style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: 8 }}>📋 Estado:</Text>
                        {debugLog.slice(-5).map((log, i) => (
                            <Text key={i} style={{ color: '#888', fontSize: 11, marginBottom: 2 }}>{log}</Text>
                        ))}
                    </View>
                )}

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
                <Text style={styles.completeSubtitle}>
                    {showRegistrationReminder
                        ? 'Tu perfil se guardó localmente'
                        : 'Generando simulación...'}
                </Text>

                {showRegistrationReminder && (
                    <View style={{ marginTop: 24, alignItems: 'center' }}>
                        <Text style={{ color: '#fbbf24', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                            💡 Crea una cuenta para guardar tu perfil en la nube y no perderlo
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/auth' as any)}
                            style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginBottom: 12 }}
                        >
                            <Text style={{ color: 'white', fontWeight: 'bold' }}>Crear cuenta gratis</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => router.replace('/(tabs)' as any)}
                            style={{ padding: 8 }}
                        >
                            <Text style={{ color: '#9ca3af' }}>Continuar sin cuenta →</Text>
                        </TouchableOpacity>
                    </View>
                )}
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
                                style={[styles.sourceCard, styles.sourceCardFull, importType === 'whatsapp' && styles.sourceCardActive]}
                            >
                                <View style={[styles.sourceIcon, importType === 'whatsapp' && styles.sourceIconWhatsApp]}>
                                    <MessageSquare size={24} color={importType === 'whatsapp' ? '#22c55e' : 'white'} />
                                </View>
                                <Text style={styles.sourceTitle}>WhatsApp</Text>
                                <Text style={styles.sourceSubtitle}>Archivo .txt exportado</Text>
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
                                onPress={handleFileUpload}
                                style={styles.uploadArea}
                            >
                                <View style={styles.uploadIcon}>
                                    <Upload size={24} color="white" />
                                </View>
                                <Text style={styles.uploadTitle}>Subir Archivo .txt</Text>
                                <Text style={styles.uploadSubtitle}>
                                    Soporta historiales completos (10k - 200k+ msgs). Analizamos todo automáticamente.
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
                            <Text style={styles.nameHint}>
                                ⚠️ Escribe el nombre EXACTO como aparece en el chat exportado (el nombre del contacto). Si no coincide, el análisis no funcionará.
                            </Text>
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
    sourceCardFull: {
        width: '100%',
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
        marginBottom: 8,
        marginLeft: 4,
    },
    nameHint: {
        color: '#f59e0b',
        fontSize: 12,
        marginBottom: 12,
        marginLeft: 4,
        lineHeight: 18,
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

