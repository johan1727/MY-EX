import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, CheckCircle, ArrowLeft, Brain, MessageSquare } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { parseWhatsAppExport, analyzePersonality, ParsedMessage } from '../../../lib/exSimulator';
import { intelligentTokenSampling, aiPoweredSampling } from '../../../lib/messageSampling';
import { validateOneOnOneChat } from '../../../lib/chatValidation';
import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';
import ExportGuide from '../../../components/ExportGuide';
import { storage } from '../../../lib/storage';
import { saveProfile } from '../../../lib/profileSync';
import { supabase } from '../../../lib/supabase';
import { useAnalysis } from '../../../lib/AnalysisContext';
import { BackgroundAnalysisManager } from '../../../lib/BackgroundAnalysisManager';

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

/**
 * Detecta los participantes más activos en el chat
 */
const detectParticipants = (messages: ParsedMessage[]) => {
    const counts: Record<string, number> = {};
    messages.forEach(msg => {
        counts[msg.sender] = (counts[msg.sender] || 0) + 1;
    });

    // Convertir a array y ordenar por frecuencia
    const sorted = Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 2); // Tomar los top 2

    return sorted;
};

type ImportStep = 'guide' | 'upload' | 'loading' | 'preview' | 'analyzing' | 'complete' | 'error';

export default function ImportChat() {
    const router = useRouter();
    const [step, setStep] = useState<ImportStep>('guide');
    const [importType, setImportType] = useState<'whatsapp' | 'text'>('whatsapp');
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
    const [exName, setExName] = useState('');
    // const [analyzing, setAnalyzing] = useState(false); // Removed in favor of Context
    const [errorMessage, setErrorMessage] = useState('');
    const [parsedCount, setParsedCount] = useState(0);
    const [truncatedInfo, setTruncatedInfo] = useState<{ original: number; used: number } | null>(null);
    // const [progress, setProgress] = useState(0); // Removed in favor of Context
    // const [debugLog, setDebugLog] = useState<string[]>([]); // Removed in favor of Context


    // Use Context
    const {
        isAnalyzing,
        progress,
        currentLogs: debugLog, // Map to existing name for minimal refactor
        result,
        error: contextError,
        startAnalysis,
        resetAnalysis
    } = useAnalysis();

    // Sync context state
    useEffect(() => {
        if (isAnalyzing && step !== 'analyzing') {
            setStep('analyzing');
        }
        if (result && !isAnalyzing && step === 'analyzing') {
            setStep('complete');
            // Check for guest/user redirect
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (!user) {
                    setShowRegistrationReminder(true);
                } else {
                    setTimeout(() => router.replace('/(tabs)' as any), 1500);
                }
            });
        }
    }, [isAnalyzing, result, step]);



    const [showRegistrationReminder, setShowRegistrationReminder] = useState(false);

    // UI Improvements: Auto-detect participants
    const [detectedParticipants, setDetectedParticipants] = useState<{ name: string; count: number }[]>([]);
    const [userRole, setUserRole] = useState<'me' | 'ex' | null>(null);

    // 🕊️ Selector de tipo de relación (evitar confusiones entre ex y fallecidos)
    const [relationshipType, setRelationshipType] = useState<'partner' | 'ex' | 'friend' | 'family' | 'deceased' | null>(null);
    const [showManualInput, setShowManualInput] = useState(false);

    // Debug helper to log steps visually (mapped to console for background compat)
    const addDebug = (msg: string) => {
        console.log(`[Import] ${msg}`);
        // Optional: sync with context logs if needed, but context has its own log
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

                        // Detect file type by reading first bytes as base64
                        addDebug('🔍 Detectando tipo de archivo...');
                        await new Promise(resolve => setTimeout(resolve, 50));

                        // Read as base64 to detect file type
                        const base64Data = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.Base64 });
                        addDebug(`📦 Datos leídos: ${(base64Data.length / 1024).toFixed(0)}KB`);
                        await new Promise(resolve => setTimeout(resolve, 50));

                        // Check for ZIP signature (base64 of "PK" = "UEs")
                        const isZip = base64Data.startsWith('UEs') || base64Data.startsWith('UEsD');
                        addDebug(isZip ? '📦 ZIP detectado' : '📄 Texto detectado');
                        await new Promise(resolve => setTimeout(resolve, 50));

                        if (isZip) {
                            addDebug('📦 Extrayendo contenido del ZIP...');
                            await new Promise(resolve => setTimeout(resolve, 50));

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
                            // Regular text file - decode from base64
                            addDebug('📄 Leyendo archivo de texto...');

                            try {
                                // Decode base64 to text
                                text = atob(base64Data);
                            } catch (decodeError) {
                                // If atob fails, try reading as UTF-8 directly
                                addDebug('⚠️ Intentando lectura directa...');
                                text = await FileSystem.readAsStringAsync(cacheUri, { encoding: FileSystem.EncodingType.UTF8 });
                            }

                            // Apply tail limit if text is too large
                            const MAX_TEXT_SIZE = 10 * 1024 * 1024; // 10MB
                            if (text.length > MAX_TEXT_SIZE) {
                                addDebug(`✂️ Optimizando (${fileSizeMB.toFixed(1)}MB → 10MB)...`);
                                text = text.slice(-MAX_TEXT_SIZE);
                                const firstNewline = text.indexOf('\n');
                                if (firstNewline > 0 && firstNewline < 1000) {
                                    text = text.slice(firstNewline + 1);
                                }
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

                            // ✅ VALIDAR QUE SEA CHAT 1-A-1 (nuevo)
                            const validation = validateOneOnOneChat(messages);

                            if (!validation.valid) {
                                setStep('error');
                                setErrorMessage(validation.error || 'Error al validar el chat');
                                addDebug('❌ ' + validation.error);
                                return;
                            }

                            addDebug(`✅ Chat validado: ${validation.participants?.join(' y ')}`);
                            await new Promise(resolve => setTimeout(resolve, 50));

                            if (messages.length > 0) {
                                addDebug('⚙️ Optimizando muestra (500k tokens)...');
                                await new Promise(resolve => setTimeout(resolve, 50));

                                let finalMessages;
                                try {
                                    // 🤖 NUEVO: Usar muestreo con IA como default
                                    addDebug('🤖 Muestreando con IA...');
                                    const { messages: sampledMessages, stats } = await aiPoweredSampling(messages, 500000);
                                    finalMessages = sampledMessages;
                                    addDebug(`📊 ~${stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens (IA)`);
                                } catch (samplingError) {
                                    addDebug('⚠️ Fallback: muestreo algorítmico');
                                    const { messages: sampledMessages, stats } = intelligentTokenSampling(messages, 500000);
                                    finalMessages = sampledMessages;
                                    addDebug(`📊 ~${stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens`);
                                }

                                setParsedMessages(finalMessages);
                                setParsedCount(finalMessages.length);

                                // DETECTAR PARTICIPANTES
                                const participants = detectParticipants(finalMessages);
                                setDetectedParticipants(participants);
                                addDebug(`👥 Detectados: ${participants.map(p => p.name).join(', ')}`);

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
                type: ['text/plain', 'application/zip', 'application/x-zip-compressed'],
                copyToCacheDirectory: true
            });
            if (result.canceled) return;
            setStep('loading');
            setTruncatedInfo(null);
            addDebug('📂 Archivo seleccionado');
            const file = result.assets[0];

            // Check if it's a ZIP file
            const isZip = file.name.toLowerCase().endsWith('.zip');
            let text = ''; // Initialize here so it's accessible after if/else

            if (isZip) {
                addDebug('📦 Detectado archivo ZIP, extrayendo...');
                await new Promise(resolve => setTimeout(resolve, 50));

                try {
                    // Read ZIP file
                    const response = await fetch(file.uri);
                    const blob = await response.blob();
                    const zip = await JSZip.loadAsync(blob);

                    // Find first .txt file
                    const txtFiles = Object.keys(zip.files).filter(name =>
                        name.toLowerCase().endsWith('.txt') && !zip.files[name].dir
                    );

                    if (txtFiles.length === 0) {
                        throw new Error('No se encontró archivo .txt dentro del ZIP');
                    }

                    addDebug(`📄 Encontrado: ${txtFiles[0]}`);
                    const txtFile = zip.files[txtFiles[0]];
                    text = await txtFile.async('text');

                    // Apply same size limits as normal files
                    const MAX_READ_SIZE = 10 * 1024 * 1024;
                    if (text.length > MAX_READ_SIZE) {
                        addDebug(`✂️ Archivo muy grande, aplicando sampling...`);
                        // Apply 3-part sampling
                        const START_SIZE = 512 * 1024;
                        const MIDDLE_SIZE = 1 * 1024 * 1024;
                        const END_SIZE = 8.5 * 1024 * 1024;

                        const startText = text.slice(0, START_SIZE);
                        const middleStart = Math.floor(text.length * 0.3 + Math.random() * text.length * 0.3);
                        const middleText = text.slice(middleStart, middleStart + MIDDLE_SIZE);
                        const endText = text.slice(text.length - END_SIZE);

                        text = startText + '\n\n[...mensajes anteriores...]\n\n' + middleText + '\n\n[...mensajes anteriores...]\n\n' + endText;
                        setTruncatedInfo({ original: text.length, used: text.length });
                    }
                } catch (zipError: any) {
                    setStep('error');
                    setErrorMessage(`Error al extraer ZIP: ${zipError.message}`);
                    return;
                }
            } else {

                // SMART FILE READING: Support ANY file size using blob.slice
                const response = await fetch(file.uri);
                const blob = await response.blob();
                const fileSizeMB = blob.size / 1024 / 1024;
                addDebug(`📏 Tamaño: ${fileSizeMB.toFixed(1)}MB`);
                await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

                // For 500k tokens, we need ~2 million chars (~10MB text max)
                const MAX_READ_SIZE = 10 * 1024 * 1024; // 10MB total
                // Using outer 'text' variable declared at line 311
                if (blob.size > MAX_READ_SIZE) {
                    // SMART SAMPLING: Read START + MIDDLE + END for better context
                    addDebug(`📦 Archivo grande (${fileSizeMB.toFixed(1)}MB) - sampling inteligente...`);
                    await new Promise(resolve => setTimeout(resolve, 50));

                    try {
                        // Distribute 10MB across 3 sections
                        const START_SIZE = 512 * 1024;      // 512KB - primeros mensajes (contexto inicial)
                        const MIDDLE_SIZE = 1 * 1024 * 1024; // 1MB - evolución de la relación
                        const END_SIZE = 8.5 * 1024 * 1024;  // 8.5MB - mensajes más recientes (más importantes)

                        // 1. READ START (context of how relationship began)
                        const startBlob = blob.slice(0, START_SIZE);
                        let startText = await startBlob.text();
                        // Find last complete line in start section
                        const lastNewlineStart = startText.lastIndexOf('\n');
                        if (lastNewlineStart > 0) {
                            startText = startText.slice(0, lastNewlineStart);
                        }
                        addDebug(`📍 Inicio: ${(startText.length / 1024).toFixed(0)}KB`);

                        // 2. READ MIDDLE (random section for relationship evolution)
                        const middleStart = Math.floor(blob.size * 0.3 + Math.random() * blob.size * 0.3);
                        const middleBlob = blob.slice(middleStart, middleStart + MIDDLE_SIZE);
                        let middleText = await middleBlob.text();
                        // Find first and last complete lines
                        const firstNewlineMid = middleText.indexOf('\n');
                        const lastNewlineMid = middleText.lastIndexOf('\n');
                        if (firstNewlineMid > 0 && lastNewlineMid > firstNewlineMid) {
                            middleText = middleText.slice(firstNewlineMid + 1, lastNewlineMid);
                        }
                        addDebug(`🔄 Medio: ${(middleText.length / 1024).toFixed(0)}KB`);

                        // 3. READ END (most recent - most important for simulation)
                        const endBlob = blob.slice(blob.size - END_SIZE);
                        let endText = await endBlob.text();
                        const firstNewlineEnd = endText.indexOf('\n');
                        if (firstNewlineEnd > 0 && firstNewlineEnd < 1000) {
                            endText = endText.slice(firstNewlineEnd + 1);
                        }
                        addDebug(`📍 Final: ${(endText.length / 1024 / 1024).toFixed(1)}MB`);

                        // Combine with separator markers
                        text = startText + '\n\n[...mensajes anteriores...]\n\n' + middleText + '\n\n[...mensajes anteriores...]\n\n' + endText;

                        setTruncatedInfo({ original: blob.size, used: text.length });
                        addDebug(`✅ Sampling: ${(text.length / 1024 / 1024).toFixed(1)}MB de ${fileSizeMB.toFixed(1)}MB`);
                    } catch (samplingError) {
                        // FALLBACK: If smart sampling fails, use simple tail method
                        addDebug(`⚠️ Sampling falló, usando método simple...`);
                        const tailBlob = blob.slice(blob.size - MAX_READ_SIZE);
                        text = await tailBlob.text();
                        const firstNewline = text.indexOf('\n');
                        if (firstNewline > 0 && firstNewline < 1000) {
                            text = text.slice(firstNewline + 1);
                        }
                        setTruncatedInfo({ original: blob.size, used: text.length });
                    }
                } else {
                    // NORMAL FILE: Read entire file
                    text = await blob.text();
                }
            } // Close the if(isZip) / else block
            await new Promise(resolve => setTimeout(resolve, 50)); // Yield to UI

            setRawText(text);

            // Let UI update before heavy parsing
            await new Promise(resolve => setTimeout(resolve, 100));
            addDebug('🔍 Parseando mensajes...');
            await new Promise(resolve => setTimeout(resolve, 50)); // Force UI update

            // CRITICAL FIX: Use requestAnimationFrame-style yielding to prevent freeze
            // Parse in chunks to allow UI to stay responsive

            // Capture text value before async operations to prevent scope issues
            const textToProcess = text;
            addDebug(`🔍 Texto a procesar: ${textToProcess.length} caracteres`);

            let messages: ParsedMessage[] = [];
            try {
                // Parse synchronously but with a timeout wrapper to catch hangs
                const parsePromise = new Promise<ParsedMessage[]>((resolve, reject) => {
                    try {
                        const result = parseWhatsAppExport(textToProcess);
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
                    const result = intelligentTokenSampling(messages, 250000); // Reduced to 250k tokens for cost optimization
                    resolve(result);
                });

                const samplingTimeout = new Promise<{ messages: ParsedMessage[]; stats: any }>((_, reject) => {
                    setTimeout(() => reject(new Error('Sampling timeout')), 30000); // 30s timeout
                });

                const samplingResult = await Promise.race([samplingPromise, samplingTimeout]);
                finalMessages = samplingResult.messages;
                addDebug(`📊 ~${samplingResult.stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens (optimizado a 250k)`);
            } catch (samplingError: any) {
                addDebug(`⚠️ Sampling falló, usando mensajes recientes`);
                // Fallback: take last 25000 messages (enough for good analysis)
                finalMessages = messages.slice(-25000);
            }

            addDebug(`✅ Listo: ${finalMessages.length.toLocaleString()} mensajes`);
            setParsedMessages(finalMessages);
            setParsedCount(finalMessages.length);

            // DETECTAR PARTICIPANTES (same as checkSharedFile)
            const participants = detectParticipants(finalMessages);
            setDetectedParticipants(participants);
            addDebug(`👥 Detectados: ${participants.map(p => p.name).join(', ')}`);

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

        // GUEST LIMIT CHECK
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            const guestUsage = await storage.getItem('guest_analysis_count');
            const count = guestUsage ? parseInt(guestUsage) : 0;
            if (count > 0) {
                Alert.alert(
                    'Límite Gratuito Alcanzado',
                    'Has utilizado tu análisis gratuito como invitado. Por favor regístrate para continuar (es gratis).',
                    [
                        { text: 'Registrarme', onPress: () => router.push('/auth') },
                        { text: 'Cancelar', style: 'cancel' }
                    ]
                );
                return;
            }
        }

        // Check for existing profile with same name (with timeout)
        try {
            const checkPromise = async () => {
                if (user) {
                    const { data: existingProfile } = await supabase
                        .from('ex_profiles')
                        .select('id, ex_name')
                        .eq('user_id', user.id)
                        .ilike('ex_name', exName)
                        .maybeSingle();
                    return existingProfile;
                }
                return null;
            };

            const timeoutPromise = new Promise<any>((_, reject) =>
                setTimeout(() => reject(new Error('Duplicate check timeout')), 5000)
            );

            // Race query against timeout
            const existingProfile = await Promise.race([checkPromise(), timeoutPromise]);

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
        } catch (err) {
            console.log('[handleAnalyze] Error checking for duplicates:', err);
            // Continue anyway
        }

        // Navigate to analysis screen with data for hybrid progress display
        // Limit to 20,000 messages for local storage to prevent QuotaExceededError (approx 2MB)
        // The background analysis will likely have access to more if needed via other means,
        // but for the UI progress and initial prompt this should be enough.
        await storage.setItem('exSimulator_analyzeData', JSON.stringify({
            parsedMessages: parsedMessages.slice(0, 20000),
            exName,
            relationshipType
        }));

        router.push('/tools/ex-simulator/analysis');
    };

    const continueAnalysis = async () => {
        // Navigate to analysis screen with data for hybrid progress display
        // Navigate to analysis screen with data for hybrid progress display
        await storage.setItem('exSimulator_analyzeData', JSON.stringify({
            parsedMessages: parsedMessages.slice(0, 20000),
            exName,
            relationshipType
        }));

        router.push('/tools/ex-simulator/analysis');
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('upload');
        } else if (step === 'upload') {
            router.back();
        }
    };

    // Validation is now handled in analysis.tsx with progress display

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
                <Text style={styles.loadingSubtitle}>Esto puede tomar hasta 5 minutos...</Text>

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

                        {/* Old Paste Option Removed as requested */}

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
                    </>
                )}

                {step === 'preview' && (
                    <View>
                        <Text style={styles.sectionLabel}>CONFIRMAR IDENTIDAD</Text>

                        <View style={styles.statsCard}>
                            <Text style={styles.statsTitle}>Conversación detectada</Text>
                            <Text style={styles.statsValue}>{parsedCount.toLocaleString()} mensajes</Text>
                            <Text style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
                                Entre: {detectedParticipants.map(p => p.name).join(' y ')}
                            </Text>
                        </View>

                        <View style={styles.roleSelectionContainer}>
                            <Text style={styles.sectionTitle}>¿Quién eres tú?</Text>
                            <Text style={styles.sectionSubtitle}>Selecciona tu nombre para que la IA simule a la otra persona.</Text>

                            {detectedParticipants.map((participant, index) => {
                                const isMe = userRole === 'me' && exName !== participant.name;
                                const isEx = exName === participant.name;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.roleButton,
                                            isMe && styles.roleButtonActive,
                                            isEx && { opacity: 0.5 } // Gray out if selected as ex
                                        ]}
                                        onPress={() => {
                                            // "Yo soy este"
                                            const other = detectedParticipants.find(p => p.name !== participant.name);
                                            if (other) {
                                                setExName(other.name);
                                                setUserRole('me');
                                            }
                                        }}
                                    >
                                        <View style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarText}>{participant.name.charAt(0)}</Text>
                                        </View>
                                        <View style={styles.roleInfo}>
                                            <Text style={styles.roleName}>
                                                {participant.name}
                                                {isMe && <Text style={{ color: '#4fd1c5' }}> (Tú)</Text>}
                                                {isEx && <Text style={{ color: '#a855f7' }}> (Simulación)</Text>}
                                            </Text>
                                            <Text style={styles.roleCount}>{participant.count} mensajes</Text>
                                        </View>
                                        {isMe && (
                                            <View style={styles.checkIcon}>
                                                <CheckCircle color="#4fd1c5" size={24} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Fallback manual input if detection fails or users wants to override */}
                            <TouchableOpacity
                                style={{ marginTop: 16, padding: 10, alignItems: 'center' }}
                                onPress={() => setShowManualInput(!showManualInput)}
                            >
                                <Text style={{ color: '#666', fontSize: 12, textDecorationLine: 'underline' }}>
                                    ¿No aparecen los nombres correctos? Ingresar manualmente
                                </Text>
                            </TouchableOpacity>

                            {showManualInput && (
                                <View style={{ marginTop: 12, backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: 12, padding: 16 }}>
                                    <Text style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Escribe el nombre exacto:</Text>
                                    <TextInput
                                        style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                            borderRadius: 8,
                                            padding: 12,
                                            color: '#fff',
                                            fontSize: 16,
                                            borderWidth: 1,
                                            borderColor: '#a855f7'
                                        }}
                                        placeholder="ej: María García"
                                        placeholderTextColor="#666"
                                        value={exName}
                                        onChangeText={setExName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}

                            {exName && (
                                <View style={styles.confirmationBox}>
                                    <Text style={styles.confirmationText}>
                                        🔮 Creando simulación de: <Text style={{ fontWeight: 'bold', color: '#fff' }}>{exName}</Text>
                                    </Text>
                                </View>
                            )}

                            {/* 🕊️ SELECTOR DE TIPO DE RELACIÓN - Para evitar confusiones */}
                            {exName && (
                                <View style={{ marginTop: 20, marginBottom: 10 }}>
                                    <Text style={styles.sectionTitle}>¿Qué relación tienes con {exName}?</Text>
                                    <Text style={{ color: '#888', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                                        Esto ayuda a la IA a ser más precisa y respetuosa
                                    </Text>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                                        {/* Pareja Actual */}
                                        <TouchableOpacity
                                            style={[
                                                styles.relationTypeButton,
                                                relationshipType === 'partner' && styles.relationTypeButtonActive
                                            ]}
                                            onPress={() => setRelationshipType('partner')}
                                        >
                                            <Text style={styles.relationTypeEmoji}>❤️</Text>
                                            <Text style={[
                                                styles.relationTypeText,
                                                relationshipType === 'partner' && styles.relationTypeTextActive
                                            ]}>Pareja</Text>
                                        </TouchableOpacity>

                                        {/* Ex-Pareja */}
                                        <TouchableOpacity
                                            style={[
                                                styles.relationTypeButton,
                                                relationshipType === 'ex' && styles.relationTypeButtonActive
                                            ]}
                                            onPress={() => setRelationshipType('ex')}
                                        >
                                            <Text style={styles.relationTypeEmoji}>💔</Text>
                                            <Text style={[
                                                styles.relationTypeText,
                                                relationshipType === 'ex' && styles.relationTypeTextActive
                                            ]}>Ex-Pareja</Text>
                                        </TouchableOpacity>

                                        {/* Amigo/a */}
                                        <TouchableOpacity
                                            style={[
                                                styles.relationTypeButton,
                                                relationshipType === 'friend' && styles.relationTypeButtonActive
                                            ]}
                                            onPress={() => setRelationshipType('friend')}
                                        >
                                            <Text style={styles.relationTypeEmoji}>👫</Text>
                                            <Text style={[
                                                styles.relationTypeText,
                                                relationshipType === 'friend' && styles.relationTypeTextActive
                                            ]}>Amigo/a</Text>
                                        </TouchableOpacity>

                                        {/* Familiar */}
                                        <TouchableOpacity
                                            style={[
                                                styles.relationTypeButton,
                                                relationshipType === 'family' && styles.relationTypeButtonActive
                                            ]}
                                            onPress={() => setRelationshipType('family')}
                                        >
                                            <Text style={styles.relationTypeEmoji}>👨‍👩‍👧</Text>
                                            <Text style={[
                                                styles.relationTypeText,
                                                relationshipType === 'family' && styles.relationTypeTextActive
                                            ]}>Familiar</Text>
                                        </TouchableOpacity>

                                        {/* Fallecido - UI sensible */}
                                        <TouchableOpacity
                                            style={[
                                                styles.relationTypeButton,
                                                relationshipType === 'deceased' && styles.relationTypeButtonDeceased
                                            ]}
                                            onPress={() => setRelationshipType('deceased')}
                                        >
                                            <Text style={styles.relationTypeEmoji}>🕊️</Text>
                                            <Text style={[
                                                styles.relationTypeText,
                                                relationshipType === 'deceased' && styles.relationTypeTextActive
                                            ]}>Fallecido/a</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Mensaje especial para fallecidos */}
                                    {relationshipType === 'deceased' && (
                                        <View style={{
                                            marginTop: 12,
                                            padding: 12,
                                            backgroundColor: 'rgba(147, 112, 219, 0.15)',
                                            borderRadius: 12,
                                            borderWidth: 1,
                                            borderColor: 'rgba(147, 112, 219, 0.3)'
                                        }}>
                                            <Text style={{ color: '#b8a9c9', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                                                💜 Entendemos lo difícil que es. Esta simulación puede ayudarte a procesar emociones,
                                                recordar momentos o tener conversaciones que quedaron pendientes.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.primaryButton,
                                (isAnalyzing || !exName || !relationshipType) && styles.disabledButton // Use global isAnalyzing
                            ]}
                            disabled={isAnalyzing || !exName || !relationshipType} // Use global isAnalyzing
                            onPress={handleAnalyze}
                        >
                            {isAnalyzing ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Brain color="#000" size={20} style={{ marginRight: 8 }} />
                                    <Text style={styles.primaryButtonText}>Comenzar Análisis IA</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        paddingTop: 48,
        paddingHorizontal: 24,
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        flexDirection: 'row',
        alignItems: 'center',
    },
    backButton: {
        width: 40,
        height: 40,
        backgroundColor: '#1A1A1A',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#333',
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
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        shadowColor: '#7c3aed',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 2,
        borderColor: '#2a2a2a',
    },
    loadingTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    loadingSubtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 40,
        letterSpacing: 0.3,
    },
    progressBarContainer: {
        width: '100%',
        height: 6,
        backgroundColor: '#1a1a1a',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#10b981',
        borderRadius: 3,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
    },
    progressText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10b981',
        marginBottom: 32,
        letterSpacing: 0.5,
    },
    stepsList: {
        width: '100%',
        marginTop: 8,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2a2a2a',
    },
    stepCheckmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#10b981',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    stepText: {
        flex: 1,
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
        letterSpacing: 0.2,
    },
    brandingText: {
        position: 'absolute',
        bottom: 40,
        fontSize: 13,
        color: 'rgba(124, 58, 237, 0.6)',
        fontWeight: '600',
        letterSpacing: 1,
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
    // New Role Selection Styles
    roleSelectionContainer: { marginTop: 24, marginBottom: 24 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
    sectionSubtitle: { color: '#666', fontSize: 13, marginBottom: 16 },
    roleButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1c1c1e', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
    roleButtonActive: { borderColor: '#4fd1c5', backgroundColor: 'rgba(79, 209, 197, 0.1)' },
    avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    roleInfo: { flex: 1 },
    roleName: { color: '#fff', fontSize: 16, fontWeight: '600' },
    roleCount: { color: '#666', fontSize: 12, marginTop: 2 },
    checkIcon: { marginLeft: 16 },
    confirmationBox: { marginTop: 16, padding: 16, backgroundColor: 'rgba(168, 85, 247, 0.2)', borderRadius: 12, borderWidth: 1, borderColor: '#a855f7', alignItems: 'center' },
    confirmationText: { color: '#d8b4fe', fontSize: 14 },
    statsCard: { backgroundColor: '#1c1c1e', padding: 16, borderRadius: 12, marginBottom: 24, borderColor: '#333', borderWidth: 1 },
    statsTitle: { color: '#666', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    statsValue: { color: '#fff', fontSize: 24, fontWeight: '900' },
    disabledButton: { opacity: 0.5 },

    // 🕊️ Estilos para selector de tipo de relación
    relationTypeButton: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        minWidth: 70,
    },
    relationTypeButtonActive: {
        borderColor: '#4fd1c5',
        backgroundColor: 'rgba(79, 209, 197, 0.15)',
    },
    relationTypeButtonDeceased: {
        borderColor: '#9370DB',
        backgroundColor: 'rgba(147, 112, 219, 0.2)',
    },
    relationTypeEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    relationTypeText: {
        color: '#888',
        fontSize: 11,
        textAlign: 'center',
    },
    relationTypeTextActive: {
        color: '#fff',
        fontWeight: '600',
    },
});

