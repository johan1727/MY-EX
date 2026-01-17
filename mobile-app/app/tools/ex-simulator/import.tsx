import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StyleSheet, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, CheckCircle, ArrowLeft, Brain, MessageSquare, X, LogOut, Sparkles, HelpCircle } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import { parseWhatsAppExport, analyzePersonality, ParsedMessage } from '../../../lib/exSimulator';
import { intelligentTokenSampling, aiPoweredSampling } from '../../../lib/messageSampling';
import { validateOneOnOneChat } from '../../../lib/chatValidation';
import { anonymizeMessages } from '../../../lib/anonymization';
import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';
import ExportGuide from '../../../components/ExportGuide';
import { storage } from '../../../lib/storage';
import { saveProfile } from '../../../lib/profileSync';
import { supabase } from '../../../lib/supabase';
import { useAnalysis } from '../../../lib/AnalysisContext';
import { BackgroundAnalysisManager } from '../../../lib/BackgroundAnalysisManager';
import { detectRelationshipType } from '../../../lib/relationshipDetector';
import { useTheme } from '../../../lib/ThemeContext';

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

type ImportStep = 'guide' | 'terms' | 'upload' | 'loading' | 'preview' | 'analyzing' | 'complete' | 'error';

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
    const [truncationInfo, setTruncatedInfo] = useState<{ original: number; used: number } | null>(null);

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

    // Theme
    const { isDark } = useTheme();

    // Custom Alert State
    const [customAlert, setCustomAlert] = useState<{
        visible: boolean;
        title: string;
        message: string;
        type: 'error' | 'success' | 'info';
        buttons?: { text: string; onPress?: () => void; style?: 'cancel' | 'default' }[];
    }>({ visible: false, title: '', message: '', type: 'info' });

    const showPrettyAlert = (title: string, message: string, type: 'error' | 'success' | 'info' = 'info', buttons?: any[]) => {
        setCustomAlert({ visible: true, title, message, type, buttons });
    };

    const closePrettyAlert = () => {
        setCustomAlert(prev => ({ ...prev, visible: false }));
    };



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
    const [suggestedRelationshipType, setSuggestedRelationshipType] = useState<'partner' | 'ex' | 'friend' | 'family' | 'deceased' | null>(null);
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
                                const participantNames = participants.map(p => p.name);
                                setDetectedParticipants(participants);
                                addDebug(`👥 Detectados: ${participantNames.join(', ')}`);

                                // 🛡️ ANONYMIZATION MOVED TO BackgroundAnalysisManager
                                // addDebug('🛡️ Anonimizando datos...');
                                // const anonymizedMessages = anonymizeMessages(finalMessages, participantNames);
                                // setParsedMessages(anonymizedMessages);
                                // setParsedCount(anonymizedMessages.length);

                                setParsedMessages(finalMessages);
                                setParsedCount(finalMessages.length);

                                setStep('preview');
                                addDebug(`✅ ${finalMessages.length.toLocaleString()} mensajes listos (SIN Anonimizar)`);
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

                        // DETECTAR PARTICIPANTES
                        const participants = detectParticipants(finalMessages);
                        const participantNames = participants.map(p => p.name);
                        setDetectedParticipants(participants);
                        addDebug(`👥 Detectados: ${participantNames.join(', ')}`);

                        // AUTO-DETECT RELATIONSHIP (AI Upgrade)
                        // We guess the "Ex" is the second most active participant (assuming user is #1)
                        // or the first one if we can't tell.
                        const likelyExName = participantNames[1] || participantNames[0] || 'La otra persona';
                        addDebug(`🤖 Detectando relación con IA para: ${likelyExName}...`);

                        detectRelationshipType(finalMessages, likelyExName).then(type => {
                            if (type) {
                                addDebug(`🤖 IA sugiere relación: ${type.toUpperCase()}`);
                                setSuggestedRelationshipType(type); // Store suggestion, DON'T auto-select
                                // Optional: You could show a toast or highlight the option
                            } else {
                                addDebug('🤖 IA no pudo determinar relación (usando default)');
                            }
                        });

                        // Set Ex Name candidate if empty
                        if (!exName && participantNames.length > 0) {
                            // Don't auto-set exName blindly, but maybe suggest it?
                            // For now, let's leave exName empty for user to type/select
                        }

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
                        name && (name || '').toLowerCase().endsWith('.txt') && !zip.files[name].dir
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

                // HELPER: Read blob as text (React Native compatible)
                const readBlobAsText = (blob: Blob): Promise<string> => {
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = () => reject(reader.error);
                        reader.readAsText(blob);
                    });
                };

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
                        let startText = await readBlobAsText(startBlob);
                        // Find last complete line in start section
                        const lastNewlineStart = startText.lastIndexOf('\n');
                        if (lastNewlineStart > 0) {
                            startText = startText.slice(0, lastNewlineStart);
                        }
                        addDebug(`📍 Inicio: ${(startText.length / 1024).toFixed(0)}KB`);

                        // 2. READ MIDDLE (random section for relationship evolution)
                        const middleStart = Math.floor(blob.size * 0.3 + Math.random() * blob.size * 0.3);
                        const middleBlob = blob.slice(middleStart, middleStart + MIDDLE_SIZE);
                        let middleText = await readBlobAsText(middleBlob);
                        // Find first and last complete lines
                        const firstNewlineMid = middleText.indexOf('\n');
                        const lastNewlineMid = middleText.lastIndexOf('\n');
                        if (firstNewlineMid > 0 && lastNewlineMid > firstNewlineMid) {
                            middleText = middleText.slice(firstNewlineMid + 1, lastNewlineMid);
                        }
                        addDebug(`🔄 Medio: ${(middleText.length / 1024).toFixed(0)}KB`);

                        // 3. READ END (most recent - most important for simulation)
                        const endBlob = blob.slice(blob.size - END_SIZE);
                        let endText = await readBlobAsText(endBlob);
                        const firstNewlineEnd = endText.indexOf('\n');
                        if (firstNewlineEnd > 0 && firstNewlineEnd < 1000) {
                            endText = endText.slice(firstNewlineEnd + 1);
                        }
                        addDebug(`📍 Final: ${(endText.length / 1024 / 1024).toFixed(1)}MB`);

                        // Combine with separator markers
                        text = startText + '\n\n[...mensajes anteriores...]\n\n' + middleText + '\n\n[...mensajes anteriores...]\n\n' + endText;

                        setTruncatedInfo({ original: blob.size, used: text.length });
                        addDebug(`✅ Sampling: ${(text.length / 1024 / 1024).toFixed(1)}MB de ${fileSizeMB.toFixed(1)}MB`);
                    } catch (samplingError: any) {
                        // FALLBACK: If smart sampling fails, use simple tail method
                        addDebug(`⚠️ Sampling falló: ${samplingError.message || 'Error desconocido'}`);
                        addDebug(`🔄 Intentando método simple...`);
                        try {
                            const tailBlob = blob.slice(blob.size - MAX_READ_SIZE);
                            text = await readBlobAsText(tailBlob);
                            const firstNewline = text.indexOf('\n');
                            if (firstNewline > 0 && firstNewline < 1000) {
                                text = text.slice(firstNewline + 1);
                            }
                            setTruncatedInfo({ original: blob.size, used: text.length });
                            addDebug(`✅ Método simple exitoso: ${(text.length / 1024 / 1024).toFixed(1)}MB`);
                        } catch (fallbackError: any) {
                            addDebug(`❌ Error crítico: ${fallbackError.message}`);
                            throw new Error(`No se pudo leer el archivo: ${fallbackError.message}`);
                        }
                    }
                } else {
                    // NORMAL FILE: Read entire file
                    addDebug(`📖 Leyendo archivo completo...`);
                    try {
                        text = await readBlobAsText(blob);
                        addDebug(`✅ Archivo leído: ${(text.length / 1024 / 1024).toFixed(1)}MB`);
                    } catch (readError: any) {
                        addDebug(`❌ Error leyendo archivo: ${readError.message}`);
                        throw new Error(`No se pudo leer el archivo: ${readError.message}`);
                    }
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

            // WARNING FOR SMALL FILES (< 50 messages)
            if (messages.length < 50) {
                await new Promise<void>((resolve) => {
                    showPrettyAlert(
                        '⚠️ Archivo muy pequeño',
                        `Solo se detectaron ${messages.length} mensajes. Para un buen análisis, recomendamos al menos 100 mensajes.\n\nEl análisis podría fallar o ser poco preciso. ¿Deseas continuar de todas formas?`,
                        'info',
                        [
                            { text: 'Cancelar', style: 'cancel', onPress: () => { setStep('upload'); resolve(); } }, // Go back to upload
                            { text: 'Continuar', onPress: () => resolve() } // Proceed
                        ]
                    );
                });

                // If user cancelled (step set back to upload), stop here
                // Note: Since showPrettyAlert is non-blocking in UI but we wrap it in Promise/resolve flow, 
                // we depend on the state check or we need to handle the flow control better.
                // Actually, the current showPrettyAlert implementation sets state. 
                // We can't easily "await" the user interactions with the current simple implementation.
                // I need to return here if I can't await. 

                // REFACTOR: Since showPrettyAlert is just setting state, we can't await the button press inside this linear function easily without refactoring showPrettyAlert to return a promise (which needs more work) 
                // OR we just return here and let the button callback call a "continue" function.

                // Let's change strategy:
                // If small file, return and show alert. The "Continue" button will Trigger a separate function or continue flow.
                // But handleFileUpload is one big function.

                // BETTER APPROACH for minimal refactor:
                // Use a standard Alert for this specific blocking confirmation if CustomAlert doesn't support async/await awaiting nicely, 
                // OR split the function.

                // User asked for "prettier UI" generally.
                // It is safer to use the CustomAlert.

                // I will interrupt the flow here.
                setCustomAlert({
                    visible: true,
                    title: '⚠️ Archivo muy pequeño',
                    message: `Solo se detectaron ${messages.length} mensajes. Se recomiendan +100 para evitar errores.\n\n¿Continuar bajo tu propio riesgo?`,
                    type: 'error', // Use error color for warning
                    buttons: [
                        {
                            text: 'Buscar otro archivo',
                            style: 'cancel',
                            onPress: () => {
                                setStep('upload');
                                closePrettyAlert();
                            }
                        },
                        {
                            text: 'Continuar igual',
                            onPress: async () => {
                                closePrettyAlert();
                                // We need to continue the logic. 
                                // Since we can't easily resume this function mid-execution, 
                                // I will extract the "post-parsing" logic into a separate helper or just copy-paste the rest (a bit dirty but safe).
                                // Actually, I can just proceed if I wrap the rest in a function `processMessages(messages)`.
                                await processParsedMessages(messages);
                            }
                        }
                    ]
                });
                return; // STOP EXECUTION HERE

            }

            // Proceed normally if enough messages
            await processParsedMessages(messages);

            /* SPLIT FUNCTION logic below */
        } catch (e: any) {
            setStep('error');
            setErrorMessage(e.message);
            showPrettyAlert('Error', e.message, 'error');
        }
    };

    // New helper to continue flow
    const processParsedMessages = async (messages: ParsedMessage[]) => {
        try {
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
                addDebug(`📊 ~${samplingResult.stats?.estimatedTokens?.toLocaleString() || 'N/A'} tokens(optimizado a 250k)`);
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
            const participantNames = participants.map(p => p.name);
            setDetectedParticipants(participants);
            addDebug(`👥 Detectados: ${participantNames.join(', ')} `);

            // 🛡️ ANONYMIZATION MOVED TO BackgroundAnalysisManager
            // We pass RAW messages so the manager can identify the correct Ex name
            // addDebug('🛡️ Anonimizando datos...');
            // await new Promise(resolve => setTimeout(resolve, 50));

            // const anonymizedMessages = anonymizeMessages(finalMessages, participantNames);
            // setParsedMessages(anonymizedMessages);
            // addDebug('✅ Datos anonimizados correctamente');

            // Pass RAW finalMessages
            setParsedMessages(finalMessages);

            setStep('preview');
        } catch (e: any) {
            setStep('error');
            setErrorMessage(e.message);
            showPrettyAlert('Error', e.message, 'error');
        }
    };


    const handleTextPaste = async () => {
        if (!rawText.trim()) { showPrettyAlert('Error', 'Pega el texto', 'error'); return; }
        await new Promise(resolve => setTimeout(resolve, 50));
        const messages = parseWhatsAppExport(rawText);
        if (messages.length < 5) { Alert.alert('Error', 'Mínimo 5 mensajes'); return; }
        const { messages: finalMessages } = intelligentTokenSampling(messages);
        setParsedMessages(finalMessages);
        setStep('preview');
    };

    const handleAnalyze = async () => {
        if (!exName.trim()) {
            showPrettyAlert('Falta información', 'Por favor ingresa el nombre de tu Ex (o como quieres que se llame la IA).', 'error');
            return;
        }

        if (!relationshipType) {
            showPrettyAlert('Falta información', 'Por favor selecciona el tipo de relación.', 'error');
            return;
        }

        // AI SUGGESTION CHECK
        if (suggestedRelationshipType && relationshipType !== suggestedRelationshipType) {
            // User selected something different from AI
            const translateType = (t: string) =>
                t === 'partner' ? 'Pareja Actual' :
                    t === 'ex' ? 'Ex Pareja' :
                        t === 'friend' ? 'Amigo/a' :
                            t === 'family' ? 'Familiar' : 'Fallecido';

            showPrettyAlert(
                '¿Confirmar tipo de relación?',
                `La IA detectó que parece ser "${translateType(suggestedRelationshipType)}", pero tú seleccionaste "${translateType(relationshipType)}".\n\n¿Quieres continuar así ? `,
                'info',
                [
                    { text: 'Corregir', style: 'cancel' }, // Stay
                    {
                        text: 'Sí, estoy seguro',
                        onPress: async () => await executeAnalysis() // Proceed
                    }
                ]
            );
            return; // Stop here, wait for alert response
        }

        await executeAnalysis();
    };

    const executeAnalysis = async () => {
        console.log('[handleAnalyze] 🚀 STARTING ANALYSIS');

        console.log('[handleAnalyze] exName:', exName);
        console.log('[handleAnalyze] parsedMessages count:', parsedMessages.length);

        // GUEST LIMIT CHECK
        console.log('[handleAnalyze] Checking user auth...');
        let user;
        try {
            const userPromise = supabase.auth.getUser();
            const timeoutPromise = new Promise<{ data: { user: any }, error: any }>((_, reject) =>
                setTimeout(() => reject(new Error('Auth check timed out')), 5000)
            );
            const result = await Promise.race([userPromise, timeoutPromise]);
            user = result.data.user;
        } catch (authErr) {
            console.log('[handleAnalyze] Auth check failed/timed out, continuing as guest:', authErr);
            user = null;
        }

        // const { data: { user } } = await supabase.auth.getUser(); // OLD
        console.log('[handleAnalyze] User:', user?.id || 'Guest');
        if (!user) {
            try {
                console.log('[handleAnalyze] Ensuring guest usage check...');
                // Force a small delay to ensure storage is ready
                await new Promise(resolve => setTimeout(resolve, 50));

                const guestUsage = await storage.getItem('guest_analysis_count');
                console.log('[handleAnalyze] Guest usage retrieved:', guestUsage);

                const count = guestUsage ? parseInt(guestUsage) : 0;
                // Only enforce strict limit if NOT in development mode
                if (count > 0 && !__DEV__) {
                    console.log('[handleAnalyze] Guest limit reached');
                    showPrettyAlert(
                        'Límite Gratuito Alcanzado',
                        'Has utilizado tu análisis gratuito como invitado. Por favor regístrate para continuar (es gratis).',
                        'info',
                        [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Registrarme', onPress: () => router.push('/auth') }
                        ]
                    );
                    return;
                }
            } catch (guestErr) {
                console.log('[handleAnalyze] Guest check error (ignoring to proceed):', guestErr);
                // We proceed if check fails to avoid blocking the user
            }
        }



        console.log('[handleAnalyze] Auth check done. Checking existing profile...');

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
            console.log('[handleAnalyze] Existing profile check result:', existingProfile ? 'Found' : 'Null');

            if (existingProfile) {
                // Profile exists - ask user what to do
                return new Promise<void>((resolve) => {
                    showPrettyAlert(
                        '⚠️ Perfil Existente',
                        `Ya existe un perfil llamado "${existingProfile.ex_name}".\n\n¿Qué quieres hacer?`,
                        'info',
                        [
                            {
                                text: 'Cancelar',
                                style: 'cancel',
                                onPress: () => {
                                    closePrettyAlert();
                                    resolve();
                                }
                            },
                            {
                                text: 'Actualizar',
                                onPress: async () => {
                                    closePrettyAlert();
                                    await continueAnalysis(existingProfile.id);
                                    resolve();
                                }
                            },
                            {
                                text: 'Crear Nuevo',
                                onPress: async () => {
                                    closePrettyAlert();
                                    // FORCE NEW: Append suffix to name to avoid analysis.tsx finding the old profile
                                    const suffix = Math.floor(Math.random() * 1000);
                                    const uniqueName = `${exName} (${suffix})`;
                                    await continueAnalysis(null, uniqueName);
                                    resolve();
                                }
                            }
                        ]
                    );
                });
            }
        } catch (err) {
            console.log('[handleAnalyze] Error checking for duplicates:', err);
            // Continue anyway
        }

        console.log('[handleAnalyze] Saving chunks to storage...');

        // Navigate to analysis screen with data for hybrid progress display
        // CHUNKED STORAGE: Split 20k messages into 4 chunks of 5k each
        // This avoids AsyncStorage "Row too big" error on Android
        const messageLimit = 20000;
        const chunkSize = 5000;
        const limitedMessages = parsedMessages.slice(0, messageLimit);
        const totalChunks = Math.ceil(limitedMessages.length / chunkSize);

        try {
            // Store metadata first
            await storage.setItem('exSimulator_analyzeData', JSON.stringify({
                totalChunks,
                totalMessages: limitedMessages.length,
                exName,
                relationshipType
            }));

            // Store each chunk separately
            for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, limitedMessages.length);
                console.log(`[handleAnalyze] Saving chunk ${i + 1}/${totalChunks} (${end - start} msgs)`);
                const chunk = limitedMessages.slice(start, end);
                await storage.setItem(`exSimulator_chunk_${i}`, JSON.stringify(chunk));
                // Anti-freeze yield
                if (i % 2 === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }

            console.log('[handleAnalyze] Chunks saved. Starting background analysis...');

            // Generate valid UUID for profile ID
            const profileId = crypto.randomUUID();

            // Start background analysis (will auto-create profile and master prompt)
            await BackgroundAnalysisManager.startAnalysis(
                profileId,
                limitedMessages,
                exName,
                relationshipType
            );

            // Navigate to analysis screen (with visual progress)
            router.push(`/tools/ex-simulator/analysis?profile_id=${profileId}`);
        } catch (storageErr: any) {
            console.error('[handleAnalyze] Storage error:', storageErr);
            showPrettyAlert('Error', 'No se pudo guardar los datos de análisis: ' + storageErr.message, 'error');
        }
    };

    const continueAnalysis = async (updateId: string | null = null, overrideName: string | null = null) => {
        // Same flow as handleAnalyze but for updates/duplicates
        const messageLimit = 20000;
        const chunkSize = 5000;
        const limitedMessages = parsedMessages.slice(0, messageLimit);
        const totalChunks = Math.ceil(limitedMessages.length / chunkSize);

        // Store metadata first (for resumability if needed)
        await storage.setItem('exSimulator_analyzeData', JSON.stringify({
            totalChunks,
            totalMessages: limitedMessages.length,
            exName: overrideName || exName,
            relationshipType
        }));

        // Store each chunk separately
        for (let i = 0; i < totalChunks; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, limitedMessages.length);
            const chunk = limitedMessages.slice(start, end);
            await storage.setItem(`exSimulator_chunk_${i}`, JSON.stringify(chunk));
        }

        // Generate profile ID (or use updateId for updates)
        const profileId = updateId || crypto.randomUUID();

        // Start background analysis
        await BackgroundAnalysisManager.startAnalysis(
            profileId,
            limitedMessages,
            overrideName || exName,
            relationshipType,
            updateId || undefined // Pass updateId if updating existing profile
        );

        // Navigate to analysis screen (with visual progress)
        router.push(`/tools/ex-simulator/analysis?profile_id=${profileId}${updateId ? `&update_profile_id=${updateId}` : ''}`);
    };

    const handleBack = () => {
        if (step === 'preview') {
            setStep('upload');
            router.back();
        }
    };

    // Validates one-on-one chat
    const validateChat = async (messages: ParsedMessage[]) => {
        // Simple check: > 75% messages should come from top 2 participants
        // This is now handled in 'detectParticipants' roughly
        return true;
    };

    const pickDocument = async () => {
        try {
            console.log('[pickDocument] Opening document picker');
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/plain', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'],
                copyToCacheDirectory: true
            });

            if (result.canceled) {
                console.log('[pickDocument] Cancelled');
                return;
            }

            const asset = result.assets[0];
            console.log('[pickDocument] File picked:', asset.name, asset.size);

            setStep('loading');
            addDebug(`📂 Archivo: ${asset.name}`);
            addDebug('⏳ Leyendo archivo...');

            // Allow UI to update
            await new Promise(resolve => setTimeout(resolve, 100));

            let content: string | null = null;

            // WEB vs NATIVE file reading
            if (Platform.OS === 'web') {
                // WEB: Use FileReader API
                console.log('[pickDocument] Web platform detected, using FileReader');

                const file = (asset as any).file; // On web, DocumentPicker returns a File object

                if (!file) {
                    throw new Error("No se pudo acceder al archivo en Web");
                }

                if (asset.name.endsWith('.zip')) {
                    addDebug('📦 Descomprimiendo ZIP...');
                    // Read as ArrayBuffer for ZIP
                    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as ArrayBuffer);
                        reader.onerror = reject;
                        reader.readAsArrayBuffer(file);
                    });

                    // Convert to base64 for JSZip
                    const bytes = new Uint8Array(arrayBuffer);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    content = await extractTextFromZip(base64);
                    if (!content) throw new Error("No se encontró archivo .txt válido en el ZIP");
                } else {
                    // Read as text
                    content = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsText(file);
                    });
                }
            } else {
                // NATIVE: Use FileSystem
                console.log('[pickDocument] Native platform, using FileSystem');

                if (asset.name.endsWith('.zip')) {
                    addDebug('📦 Descomprimiendo ZIP...');
                    const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
                    content = await extractTextFromZip(base64);
                    if (!content) throw new Error("No se encontró archivo .txt válido en el ZIP");
                } else {
                    content = await FileSystem.readAsStringAsync(asset.uri);
                }
            }

            if (!content) throw new Error("El archivo parece estar vacío");

            addDebug('🧠 Procesando mensajes...');
            await new Promise(resolve => setTimeout(resolve, 50));

            const messages = parseWhatsAppExport(content);
            if (messages.length === 0) throw new Error("No se encontraron mensajes válidos de WhatsApp");

            // Validate strict one-on-one if needed, or just warn
            // For now we accept groups but simplistic analysis

            // Call process flow
            await processParsedMessages(messages);

        } catch (err: any) {
            console.error('[pickDocument] Error:', err);
            setStep('error');
            setErrorMessage(err.message);
            showPrettyAlert('Error al leer archivo', err.message, 'error');
        }
    };

    // Validation is now handled in analysis.tsx with progress display

    if (step === 'guide') {
        return <ExportGuide onClose={() => setStep('terms')} onBack={() => router.replace('/(tabs)')} />;
    }

    if (step === 'terms') {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#111' : '#fff', borderBottomWidth: 1, borderBottomColor: isDark ? '#222' : '#e5e5e5' }]}>
                    <TouchableOpacity onPress={() => setStep('guide')} style={styles.backButton}>
                        <ArrowLeft size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>Términos de Uso</Text>
                </View>

                <ScrollView style={{ flex: 1, padding: 24 }}>
                    <View style={[styles.termsCard, { backgroundColor: isDark ? '#1a1a1a' : '#fff', borderWidth: 1, borderColor: isDark ? '#333' : '#e5e5e5' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(239, 68, 68, 0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <FileText size={18} color="#EF4444" />
                            </View>
                            <Text style={[styles.termsTitle, { color: isDark ? '#EF4444' : '#dc2626', fontWeight: '700' }]}>Responsabilidad Legal</Text>
                        </View>

                        <Text style={[styles.termsText, { color: isDark ? '#ccc' : '#374151', lineHeight: 22 }]}>
                            Esta herramienta es solo para fines terapéuticos y de auto-análisis ("Coaching").
                            {"\n\n"}
                            Al continuar, declaras bajo protesta de decir verdad que:
                        </Text>

                        <View style={styles.checkItem}>
                            <CheckCircle size={20} color="#a855f7" />
                            <Text style={[styles.checkText, { color: isDark ? '#ddd' : '#1f2937', lineHeight: 20 }]}>Tienes permiso explícito de los participantes para procesar este chat.</Text>
                        </View>
                        <View style={styles.checkItem}>
                            <CheckCircle size={20} color="#a855f7" />
                            <Text style={[styles.checkText, { color: isDark ? '#ddd' : '#1f2937', lineHeight: 20 }]}>El chat será anonimizado automáticamente antes de enviarse a la IA.</Text>
                        </View>
                        <View style={styles.checkItem}>
                            <CheckCircle size={20} color="#a855f7" />
                            <Text style={[styles.checkText, { color: isDark ? '#ddd' : '#1f2937', lineHeight: 20 }]}>Asumes total responsabilidad legal por el uso de esta información.</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.acceptButton, { backgroundColor: isDark ? '#fff' : '#000', marginTop: 24 }]}
                        onPress={() => setStep('upload')}
                    >
                        <Text style={[styles.acceptButtonText, { color: isDark ? '#000' : '#fff' }]}>ACEPTO Y CONTINUAR</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    if (step === 'upload') {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
                <View style={[styles.header, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <ArrowLeft size={24} color={isDark ? "#fff" : "#000"} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#000' }]}>Nuevo Análisis</Text>
                    <Text style={[styles.headerSubtitle, { color: isDark ? '#888' : '#666' }]}>REMI</Text>
                </View>

                <ScrollView style={styles.scrollView}>
                    <Text style={[styles.sectionLabel, { color: isDark ? '#888' : '#666' }]}>SELECCIONA FUENTE DE DATOS</Text>

                    <TouchableOpacity
                        style={[styles.sourceCard, styles.sourceCardFull, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9', borderColor: isDark ? '#333' : '#e0e0e0' }]}
                        onPress={() => setStep('guide')}
                    >
                        <View style={[styles.sourceIcon, styles.sourceIconWhatsApp]}>
                            <MessageSquare size={28} color="#22c55e" />
                        </View>
                        <Text style={[styles.sourceTitle, { color: isDark ? '#fff' : '#000' }]}>WhatsApp</Text>
                        <Text style={[styles.sourceSubtitle, { color: isDark ? '#999' : '#666' }]}>Archivo .txt exportado</Text>
                    </TouchableOpacity>

                    <View style={{ height: 24 }} />

                    <TouchableOpacity
                        style={[styles.sourceCard, styles.sourceCardFull, { backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9', borderColor: isDark ? '#333' : '#e0e0e0' }]}
                        onPress={pickDocument}
                    >
                        <View style={styles.sourceIcon}>
                            <Upload size={28} color={isDark ? '#fff' : '#000'} />
                        </View>
                        <Text style={[styles.sourceTitle, { color: isDark ? '#fff' : '#000' }]}>Subir Archivo .txt</Text>
                        <Text style={[styles.sourceSubtitle, { color: isDark ? '#999' : '#666' }]}>Soporta historiales completos (10k - 200k+ msgs). Analizamos todo automáticamente.</Text>
                    </TouchableOpacity>

                    {/* Debug Button (Hidden in production) */}
                    {__DEV__ && (
                        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginTop: 40, opacity: 0.3, alignSelf: 'center' }}>
                            <Text style={{ color: 'white', fontSize: 10 }}>[DEV: Skip to Analysis]</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
        );
    }


    if (step === 'loading' || step === 'analyzing') {
        // Mensajes emocionales
        const stages = [
            { label: 'Conectando con tu historia...', threshold: 0 },
            { label: 'Escuchando lo que no se dijo...', threshold: 20 },
            { label: 'Entendiendo los lazos del corazón...', threshold: 60 },
            { label: 'Preparando tu espacio seguro...', threshold: 90 }
        ];

        // Display progress - show at least 1% if we're in analyzing mode
        const displayProgress = step === 'analyzing' && progress === 0 ? 1 : progress;

        return (
            <LinearGradient
                colors={isDark ? ['#1a1a2e', '#050505'] : ['#f5f3ff', '#ffffff']}
                style={[styles.loadingContainer, Platform.OS === 'web' && { alignItems: 'center', justifyContent: 'center' }]}
            >
                <View style={[
                    Platform.OS === 'web' && {
                        width: '100%',
                        maxWidth: 500,
                        backgroundColor: isDark ? 'transparent' : 'transparent', // Let gradient show
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }
                ]}>
                    <View style={styles.loadingIcon}>
                        <Brain size={64} color={isDark ? "#ffffff" : "#7c3aed"} />
                    </View>
                    <Text style={[styles.loadingTitle, !isDark && { color: '#111827' }]}>
                        {step === 'loading' ? 'Procesando' : 'Analizando'}
                    </Text>
                    <Text style={[styles.loadingSubtitle, !isDark && { color: '#6b7280' }]}>Esto puede tomar hasta 5 minutos...</Text>

                    {/* Progress Bar */}
                    <View style={[styles.progressBarContainer, !isDark && { backgroundColor: '#e5e7eb', borderColor: '#d1d5db' }]}>
                        <View style={[styles.progressBarFill, { width: `${Math.max(displayProgress, 3)}%` }]} />
                    </View>
                    <Text style={styles.progressPercentage}>
                        {displayProgress === 0 ? 'Iniciando...' : `${displayProgress}%`}
                    </Text>

                    <View style={[styles.stagesCard, !isDark && { backgroundColor: '#ffffff', borderColor: '#e5e7eb', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }]}>
                        {stages.map((stage, index) => {
                            const isActive = displayProgress >= stage.threshold && (index === stages.length - 1 || displayProgress < stages[index + 1].threshold);
                            const isCompleted = displayProgress >= (index === stages.length - 1 ? 100 : stages[index + 1].threshold);

                            return (
                                <View key={index} style={styles.stageRow}>
                                    <View style={[
                                        styles.stageIndicator,
                                        !isDark && { borderColor: '#d1d5db' },
                                        isCompleted && styles.stageIndicatorCompleted,
                                        isActive && styles.stageIndicatorActive
                                    ]}>
                                        {isCompleted ? (
                                            <CheckCircle size={14} color="white" />
                                        ) : isActive ? (
                                            <ActivityIndicator size={12} color="#a855f7" />
                                        ) : (
                                            <View style={[styles.stageDot, !isDark && { backgroundColor: '#d1d5db' }]} />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.stageLabel,
                                        !isDark && { color: '#9ca3af' },
                                        (isCompleted || isActive) && styles.stageLabelActive,
                                        (isCompleted || isActive) && !isDark && { color: '#111827' }
                                    ]}>
                                        {stage.label}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <Text style={[styles.engineLabel, !isDark && { color: '#93c5fd' }]}>REMI AI ENGINE 2.0</Text>

                    {/* Debug panel para ver estado del procesamiento */}
                    {/* Debug panel - HIDDEN for users */}
                    {__DEV__ && debugLog.length > 0 && (
                        <View style={{ marginTop: 20, padding: 15, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderRadius: 10, maxWidth: '90%' }}>
                            <Text style={{ color: '#a855f7', fontWeight: 'bold', marginBottom: 8 }}>📋 Estado (DEV):</Text>
                            {debugLog.slice(-5).map((log, i) => (
                                <Text key={i} style={{ color: isDark ? '#888' : '#666', fontSize: 11, marginBottom: 2 }}>{log}</Text>
                            ))}
                        </View>
                    )}
                </View>
            </LinearGradient>
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
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#F9FAFB' }]}>
            <LinearGradient
                colors={isDark ? ['#000000', '#1c1c1e', '#2e1065'] : ['#ffffff', '#eff6ff', '#e0e7ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity onPress={handleBack} style={[styles.backButton, !isDark && { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    <ArrowLeft size={20} color={isDark ? "white" : "#111827"} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.headerTitle, !isDark && { color: '#111827' }]}>Nuevo Análisis</Text>
                    <Text style={[styles.headerSubtitle, !isDark && { color: '#6b7280' }]}>REMI AI ENGINE</Text>
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
                            style={[
                                styles.uploadArea,
                                !isDark && {
                                    backgroundColor: '#ffffff',
                                    borderColor: '#e5e7eb',
                                    borderStyle: 'dashed'
                                }
                            ]}
                        >
                            <View style={[styles.uploadIcon, !isDark && { backgroundColor: '#f3f4f6' }]}>
                                <Upload size={24} color={isDark ? "white" : "#4b5563"} />
                            </View>
                            <Text style={[styles.uploadTitle, !isDark && { color: '#111827' }]}>Subir Archivo .txt</Text>
                            <Text style={[styles.uploadSubtitle, !isDark && { color: '#6b7280' }]}>
                                Soporta historiales completos (10k - 200k+ msgs). Analizamos todo automáticamente.
                            </Text>
                        </TouchableOpacity>
                    </>
                )}

                {step === 'preview' && (
                    <View>
                        <Text style={styles.sectionLabel}>CONFIRMAR IDENTIDAD</Text>

                        <View style={[styles.statsCard, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb',
                            borderWidth: 1,
                            borderRadius: 20
                        }]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View>
                                    <Text style={[styles.statsTitle, { color: isDark ? '#a3a3a3' : '#111827', textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 }]}>CONVERSACIÓN DETECTADA</Text>
                                    <Text style={[styles.statsValue, { color: isDark ? '#fff' : '#059669', fontSize: 32, fontWeight: '700', letterSpacing: -1 }]}>{parsedCount.toLocaleString()}</Text>
                                    <Text style={{ color: isDark ? '#4fd1c5' : '#059669', fontSize: 13, fontWeight: '600', marginTop: 2 }}>
                                        Mensajes totales
                                    </Text>
                                </View>
                                <View style={{ padding: 12, backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 50 }}>
                                    <MessageSquare size={24} color="#22c55e" />
                                </View>
                            </View>
                            <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6', marginVertical: 16 }} />
                            <Text style={{ color: isDark ? '#888' : '#6b7280', fontSize: 13 }}>
                                Participantes: <Text style={{ color: isDark ? '#e5e5e5' : '#111' }}>{detectedParticipants.map(p => p.name).join(' y ')}</Text>
                            </Text>
                        </View>

                        <View style={styles.roleSelectionContainer}>
                            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>¿Quién eres tú?</Text>
                            <Text style={[styles.sectionSubtitle, { color: isDark ? '#aaa' : '#666' }]}>Selecciona tu nombre para que la IA simule a la otra persona.</Text>

                            {detectedParticipants.map((participant, index) => {
                                const isMe = userRole === 'me' && exName !== participant.name;
                                const isEx = exName === participant.name;

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => {
                                            // "Yo soy este"
                                            const other = detectedParticipants.find(p => p.name !== participant.name);
                                            if (other) {
                                                setExName(other.name);
                                                setUserRole('me');
                                            }
                                        }}
                                        style={[
                                            styles.roleButton,
                                            // Base style updates
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
                                                borderColor: isMe ? '#a855f7' : (isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb'),
                                                borderWidth: isMe ? 2 : 1,
                                                paddingVertical: 16,
                                                paddingHorizontal: 16,
                                                borderRadius: 16
                                            },
                                            isMe && { backgroundColor: isDark ? 'rgba(168, 85, 247, 0.08)' : '#f3e8ff' }
                                        ]}
                                    >
                                        <View style={[styles.avatarPlaceholder, {
                                            backgroundColor: isMe ? '#a855f7' : (isDark ? '#333' : '#f3f4f6')
                                        }]}>
                                            <Text style={[styles.avatarText, { color: isMe ? '#fff' : (isDark ? '#888' : '#6b7280'), fontSize: 18 }]}>
                                                {participant.name.substring(0, 1).toUpperCase()}
                                            </Text>
                                        </View>

                                        <View style={styles.roleInfo}>
                                            <Text style={[styles.roleName, { color: isDark ? '#fff' : '#111827', fontSize: 18, fontWeight: '600' }]}>
                                                {participant.name}
                                            </Text>
                                            <Text style={[styles.roleCount, { color: isDark ? '#888' : '#6b7280', fontSize: 13 }]}>
                                                {participant.count.toLocaleString()} mensajes
                                            </Text>
                                        </View>

                                        {isMe && (
                                            <View style={{
                                                width: 24, height: 24, borderRadius: 12,
                                                backgroundColor: '#a855f7',
                                                alignItems: 'center', justifyContent: 'center',
                                                marginLeft: 16
                                            }}>
                                                <CheckCircle size={14} color="white" />
                                            </View>
                                        )}
                                        {/* Empty circle for unselected state to balance UI */}
                                        {!isMe && (
                                            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#444' : '#d1d5db', marginRight: 1, marginLeft: 16 }} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            {/* Fallback manual input if detection fails or users wants to override */}
                            <TouchableOpacity
                                style={{ marginTop: 16, padding: 10, alignItems: 'center' }}
                                onPress={() => setShowManualInput(!showManualInput)}
                            >
                                <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12, textDecorationLine: 'underline' }}>
                                    ¿No aparecen los nombres correctos? Ingresar manualmente
                                </Text>
                            </TouchableOpacity>

                            {showManualInput && (
                                <View style={{ marginTop: 12, backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.08)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)' }}>
                                    <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 14, marginBottom: 8 }}>Escribe el nombre exacto:</Text>
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
                                <View style={[styles.confirmationBox, {
                                    backgroundColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(139, 92, 246, 0.08)',
                                    borderColor: isDark ? 'rgba(168, 85, 247, 0.3)' : 'rgba(139, 92, 246, 0.2)'
                                }]}>
                                    <Text style={[styles.confirmationText, {
                                        color: isDark ? '#fff' : '#000'
                                    }]}>
                                        🔮 Creando simulación de: <Text style={{ fontWeight: 'bold', color: isDark ? '#fff' : '#000' }}>{exName}</Text>
                                    </Text>
                                </View>
                            )}

                            {/* 🕊️ SELECTOR DE TIPO DE RELACIÓN - Para evitar confusiones */}
                            {exName && (
                                <View style={{ marginTop: 20, marginBottom: 10 }}>
                                    <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>¿Qué relación tienes con {exName}?</Text>
                                    <Text style={{ color: isDark ? '#888' : '#666', fontSize: 12, marginBottom: 12, textAlign: 'center' }}>
                                        Esto ayuda a la IA a ser más precisa y respetuosa
                                    </Text>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
                                        {/* Pareja Actual */}
                                        {/* Pareja Actual */}
                                        <TouchableOpacity
                                            style={[
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                    borderRadius: 16,
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    minWidth: '45%',
                                                    flexGrow: 1,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'row',
                                                    marginBottom: 8
                                                },
                                                relationshipType === 'partner' && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' }
                                            ]}
                                            onPress={() => setRelationshipType('partner')}
                                        >
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>❤️</Text>
                                            <Text style={{
                                                color: isDark ? '#fff' : '#000',
                                                fontWeight: relationshipType === 'partner' ? '700' : '500'
                                            }}>Pareja</Text>
                                        </TouchableOpacity>

                                        {/* Ex-Pareja */}
                                        <TouchableOpacity
                                            style={[
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                    borderRadius: 16,
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    minWidth: '45%',
                                                    flexGrow: 1,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'row',
                                                    marginBottom: 8
                                                },
                                                relationshipType === 'ex' && { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderColor: '#a855f7' }
                                            ]}
                                            onPress={() => setRelationshipType('ex')}
                                        >
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>💔</Text>
                                            <Text style={{
                                                color: isDark ? '#fff' : '#000',
                                                fontWeight: relationshipType === 'ex' ? '700' : '500'
                                            }}>Ex-Pareja</Text>
                                        </TouchableOpacity>

                                        {/* Amigo/a */}
                                        <TouchableOpacity
                                            style={[
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                    borderRadius: 16,
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    minWidth: '45%',
                                                    flexGrow: 1,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'row',
                                                    marginBottom: 8
                                                },
                                                relationshipType === 'friend' && { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: '#3b82f6' }
                                            ]}
                                            onPress={() => setRelationshipType('friend')}
                                        >
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>👫</Text>
                                            <Text style={{
                                                color: isDark ? '#fff' : '#000',
                                                fontWeight: relationshipType === 'friend' ? '700' : '500'
                                            }}>Amigo/a</Text>
                                        </TouchableOpacity>

                                        {/* Familiar */}
                                        <TouchableOpacity
                                            style={[
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                    borderRadius: 16,
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    minWidth: '45%',
                                                    flexGrow: 1,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'row',
                                                    marginBottom: 8
                                                },
                                                relationshipType === 'family' && { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }
                                            ]}
                                            onPress={() => setRelationshipType('family')}
                                        >
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>👨‍👩‍👧</Text>
                                            <Text style={{
                                                color: isDark ? '#fff' : '#000',
                                                fontWeight: relationshipType === 'family' ? '700' : '500'
                                            }}>Familiar</Text>
                                        </TouchableOpacity>

                                        {/* Fallecido */}
                                        <TouchableOpacity
                                            style={[
                                                {
                                                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
                                                    borderRadius: 16,
                                                    paddingVertical: 12,
                                                    paddingHorizontal: 16,
                                                    minWidth: '90%', // Full width for this one
                                                    flexGrow: 1,
                                                    borderWidth: 1,
                                                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'row',
                                                    marginBottom: 8
                                                },
                                                relationshipType === 'deceased' && { backgroundColor: 'rgba(124, 58, 237, 0.1)', borderColor: '#7c3aed' }
                                            ]}
                                            onPress={() => setRelationshipType('deceased')}
                                        >
                                            <Text style={{ fontSize: 20, marginRight: 8 }}>🕊️</Text>
                                            <Text style={{
                                                color: isDark ? '#fff' : '#000',
                                                fontWeight: relationshipType === 'deceased' ? '700' : '500'
                                            }}>Fallecido/a</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Mensaje especial para fallecidos */}
                                    {relationshipType === 'deceased' && (
                                        <View style={{
                                            marginTop: 12,
                                            padding: 16,
                                            backgroundColor: 'rgba(124, 58, 237, 0.1)',
                                            borderRadius: 16,
                                            borderWidth: 1,
                                            borderColor: 'rgba(124, 58, 237, 0.3)',
                                            alignItems: 'center'
                                        }}>
                                            <Sparkles size={20} color="#a78bfa" style={{ marginBottom: 8 }} />
                                            <Text style={{ color: '#c4b5fd', fontSize: 13, textAlign: 'center', lineHeight: 20, fontWeight: '500' }}>
                                                Entendemos lo difícil que es. Esta simulación puede ayudarte a procesar emociones y recordar momentos especiales con respeto y empatía.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={{
                                backgroundColor: isDark ? '#fff' : '#000',
                                paddingVertical: 20,
                                borderRadius: 24, // Pill shape
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 32,
                                marginBottom: 40,
                                shadowColor: isDark ? "#fff" : "#000",
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.2,
                                shadowRadius: 12,
                                elevation: 5,
                                opacity: (isAnalyzing || !exName || !relationshipType) ? 0.5 : 1
                            }}
                            disabled={isAnalyzing || !exName || !relationshipType} // Use global isAnalyzing
                            onPress={handleAnalyze}
                        >
                            {isAnalyzing ? (
                                <ActivityIndicator color={isDark ? "#000" : "#fff"} />
                            ) : (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Brain color={isDark ? "#000" : "#fff"} size={22} style={{ marginRight: 10 }} strokeWidth={2.5} />
                                    <Text style={{ color: isDark ? '#000' : '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 }}>
                                        COMENZAR ANÁLISIS
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )
                }

            </ScrollView >

            {/* Custom Pretty Alert Modal (Modern) */}
            < Modal
                transparent
                visible={customAlert.visible}
                animationType="fade"
                onRequestClose={closePrettyAlert}
            >
                <View style={styles.alertBackdrop}>
                    <View style={styles.alertCard}>
                        <View style={[
                            styles.alertIcon,
                            (customAlert.type as any) === 'error' ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                (customAlert.type as any) === 'warning' ? { backgroundColor: 'rgba(245, 158, 11, 0.1)' } :
                                    (customAlert.type as any) === 'success' ? { backgroundColor: 'rgba(34, 197, 94, 0.1)' } :
                                        { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                        ]}>
                            {(customAlert.type as any) === 'error' && <X size={24} color="#EF4444" />}
                            {(customAlert.type as any) === 'warning' && <LogOut size={24} color="#F59E0B" />}
                            {(customAlert.type as any) === 'success' && <Sparkles size={24} color="#10B981" />}
                            {(customAlert.type as any) === 'info' && <HelpCircle size={24} color="#3B82F6" />}
                        </View>

                        <Text style={styles.alertHeader}>{customAlert.title}</Text>
                        <Text style={styles.alertBody}>{customAlert.message}</Text>

                        <View style={styles.alertActions}>
                            {(!customAlert.buttons || customAlert.buttons.length === 0) ? (
                                <TouchableOpacity style={[styles.btn, { backgroundColor: '#fff' }]} onPress={closePrettyAlert}>
                                    <Text style={[styles.btnText, { color: '#000' }]}>OK</Text>
                                </TouchableOpacity>
                            ) : (
                                customAlert.buttons.map((btn, i) => {
                                    const isDestructive = (btn.style as any) === 'destructive' || (btn.text && btn.text.toLowerCase().includes('eliminar'));
                                    const isCancel = btn.style === 'cancel';

                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.btn,
                                                isCancel ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#333' } :
                                                    isDestructive ? { backgroundColor: 'rgba(239, 68, 68, 0.1)' } :
                                                        { backgroundColor: '#fff' }
                                            ]}
                                            onPress={() => { if (btn.onPress) btn.onPress(); else closePrettyAlert(); }}
                                        >
                                            <Text style={[
                                                styles.btnText,
                                                isCancel ? { color: '#fff' } :
                                                    isDestructive ? { color: '#EF4444' } :
                                                        { color: '#000' }
                                            ]}>
                                                {btn.text}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </View>
                </View>
            </Modal >

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
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
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
    // Terms Styles
    termsCard: {
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#333',
    },
    termsTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ff6b6b',
        marginBottom: 16,
    },
    termsText: {
        fontSize: 16,
        color: '#d1d5db',
        lineHeight: 24,
        marginBottom: 24,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    checkText: {
        fontSize: 15,
        color: '#fff',
        flex: 1,
        lineHeight: 22,
    },
    acceptButton: {
        backgroundColor: '#a855f7',
        paddingVertical: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#a855f7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 1,
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
    // Modern Alert Styles
    alertBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        zIndex: 9999, // Ensure on top
    },
    alertCard: {
        width: '100%',
        maxWidth: 340,
        backgroundColor: '#1E1E1E',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 20,
    },
    alertIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    alertHeader: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    alertBody: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    alertActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    btn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnText: {
        fontWeight: '600',
        fontSize: 14,
    },
});

