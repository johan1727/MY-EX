import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Upload, FileText, Image as ImageIcon, ArrowRight, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../../lib/supabase';
import { parseWhatsAppExport, parseTelegramExport, analyzePersonality, ParsedMessage, extractChatFromImages } from '../../../lib/exSimulator';
import { intelligentMessageSampling } from '../../../lib/messageSampling';
import ExportGuide from '../../../components/ExportGuide';

type ImportStep = 'guide' | 'upload' | 'loading' | 'preview' | 'analyzing' | 'complete' | 'error';
type LoadingPhase = 'selecting' | 'reading' | 'parsing' | 'sampling' | 'done';

export default function ImportChat() {
    const router = useRouter();
    const [step, setStep] = useState<ImportStep>('guide');
    const [importType, setImportType] = useState<'whatsapp' | 'telegram' | 'text' | 'screenshots'>('whatsapp');
    const [rawText, setRawText] = useState('');
    const [parsedMessages, setParsedMessages] = useState<ParsedMessage[]>([]);
    const [exName, setExName] = useState('');
    const [userName, setUserName] = useState('');
    const [analyzing, setAnalyzing] = useState(false);

    // Loading states
    const [loadingPhase, setLoadingPhase] = useState<LoadingPhase>('selecting');
    const [loadingMessage, setLoadingMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleFileUpload = async () => {
        try {
            console.log('Starting file upload...');

            const result = await DocumentPicker.getDocumentAsync({
                type: importType === 'telegram' ? 'application/json' : 'text/plain',
                copyToCacheDirectory: true
            });

            console.log('DocumentPicker result:', result);

            if (result.canceled) {
                console.log('User canceled file selection');
                return;
            }

            // Switch to loading screen
            setStep('loading');
            setLoadingPhase('reading');

            const file = result.assets[0];
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            console.log('Selected file:', file.name, file.size, 'bytes', `(${sizeMB}MB)`);

            setLoadingMessage(`Leyendo ${file.name} (${sizeMB}MB)...`);

            // Read file content
            const response = await fetch(file.uri);
            const text = await response.text();

            console.log('File content length:', text.length, 'characters');
            console.log('First 100 chars:', text.substring(0, 100));

            setRawText(text);
            setLoadingPhase('parsing');
            setLoadingMessage('Buscando mensajes en el archivo...');

            // Small delay to allow UI to update
            await new Promise(resolve => setTimeout(resolve, 100));

            // Parse based on type
            let messages: ParsedMessage[] = [];
            console.log('[FileUpload] Parsing as', importType);

            try {
                if (importType === 'whatsapp') {
                    messages = parseWhatsAppExport(text);
                } else if (importType === 'telegram') {
                    const jsonData = JSON.parse(text);
                    messages = parseTelegramExport(jsonData);
                }
            } catch (parseError: any) {
                console.error('[FileUpload] Parse error:', parseError);
                setStep('error');
                setErrorMessage(`El archivo no tiene el formato correcto de ${importType === 'whatsapp' ? 'WhatsApp' : 'Telegram'}.\n\nVerifica que exportaste correctamente.`);
                return;
            }

            console.log('[FileUpload] Total parsed messages:', messages.length);

            if (messages.length === 0) {
                console.error('[FileUpload] No messages parsed');
                setStep('error');
                setErrorMessage('No se encontraron mensajes en el archivo.\n\n¿Es un archivo de WhatsApp exportado correctamente?\n\nAsegúrate de exportar "Sin archivos multimedia".');
                return;
            }

            // Apply intelligent message sampling
            setLoadingPhase('sampling');
            setLoadingMessage(`Procesando ${messages.length.toLocaleString()} mensajes...`);

            await new Promise(resolve => setTimeout(resolve, 100));

            const { messages: finalMessages, wasLimited, samplingInfo } = intelligentMessageSampling(messages);

            if (finalMessages.length < 10) {
                // Still allow to continue with few messages
                setLoadingMessage(`Solo ${finalMessages.length} mensajes encontrados (mínimo recomendado: 10)`);
            }

            setLoadingPhase('done');
            setLoadingMessage(`¡${finalMessages.length.toLocaleString()} mensajes listos!`);

            await new Promise(resolve => setTimeout(resolve, 500));

            console.log('Success! Moving to preview...');
            setParsedMessages(finalMessages);
            setStep('preview');
        } catch (error: any) {
            console.error('Error uploading file:', error);
            console.error('Error stack:', error.stack);
            Alert.alert(
                '❌ Error',
                `No se pudo procesar el archivo.\n\nError: ${error.message}\n\n¿Es un archivo de WhatsApp exportado correctamente?`
            );
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

            if (base64Images.length === 0) {
                Alert.alert('Error', 'No se pudieron procesar las imágenes');
                setAnalyzing(false);
                return;
            }

            Alert.alert('Procesando', 'Analizando capturas... Esto puede tardar unos segundos.');

            const messages = await extractChatFromImages(base64Images);

            if (messages.length < 5) {
                Alert.alert('Aviso', 'Se encontraron pocos mensajes. Intenta subir más capturas para un mejor análisis.');
            }

            setParsedMessages(messages);
            setStep('preview');
        } catch (error) {
            console.error('Error uploading images:', error);
            Alert.alert('Error', 'No se pudieron procesar las capturas.');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleTextPaste = () => {
        if (!rawText.trim()) {
            Alert.alert('Error', 'Por favor pega el contenido del chat');
            return;
        }

        const messages = parseWhatsAppExport(rawText);

        // Automatically limit to 1000 most recent messages
        let finalMessages = messages;
        let wasLimited = false;

        if (messages.length > 1000) {
            finalMessages = messages.slice(-1000);
            wasLimited = true;
        }

        if (finalMessages.length < 10) {
            Alert.alert('Error', 'Se necesitan al menos 10 mensajes para crear un perfil.');
            return;
        }

        setParsedMessages(finalMessages);
        setStep('preview');

        if (wasLimited) {
            Alert.alert('✅ Listo', `Se encontraron ${messages.length} mensajes. Usaremos los últimos ${finalMessages.length}.`);
        }
    };

    const handleAnalyze = async () => {
        if (!exName.trim()) {
            Alert.alert('Error', 'Por favor ingresa el nombre de tu ex');
            return;
        }

        setStep('analyzing');
        setAnalyzing(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuario no autenticado');

            const profile = await analyzePersonality(parsedMessages, exName);

            const { data: exProfile, error: profileError } = await supabase
                .from('ex_profiles')
                .insert({
                    user_id: user.id,
                    ex_name: exName,
                    profile_data: profile,
                    message_count: parsedMessages.length,
                    date_range_start: parsedMessages[0]?.timestamp,
                    date_range_end: parsedMessages[parsedMessages.length - 1]?.timestamp
                })
                .select()
                .single();

            if (profileError) throw profileError;

            await supabase.from('chat_imports').insert({
                ex_profile_id: exProfile.id,
                import_type: importType,
                raw_data: rawText.substring(0, 10000),
                processed_messages: parsedMessages.slice(0, 100)
            });

            setStep('complete');

            setTimeout(() => {
                router.replace('/tools/ex-simulator' as any);
            }, 2000);
        } catch (error) {
            console.error('Error analyzing:', error);
            Alert.alert('Error', 'No se pudo analizar el perfil. Intenta de nuevo.');
            setStep('preview');
        } finally {
            setAnalyzing(false);
        }
    };

    if (step === 'guide') {
        return (
            <ExportGuide onClose={() => setStep('upload')} />
        );
    }

    // Visual loading screen with progress
    if (step === 'loading') {
        const getProgressWidth = () => {
            switch (loadingPhase) {
                case 'selecting': return '10%';
                case 'reading': return '30%';
                case 'parsing': return '60%';
                case 'sampling': return '85%';
                case 'done': return '100%';
                default: return '0%';
            }
        };

        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-8">
                <LinearGradient
                    colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                    className="absolute inset-0"
                />

                <View className="w-24 h-24 rounded-full bg-purple-500/20 items-center justify-center mb-8">
                    <ActivityIndicator size="large" color="#a855f7" />
                </View>

                <Text className="text-white text-2xl font-bold text-center mb-2">
                    Procesando Conversación
                </Text>

                <Text className="text-gray-400 text-center text-lg mb-8">
                    {loadingMessage || 'Preparando...'}
                </Text>

                <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                    <View
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: getProgressWidth() }}
                    />
                </View>

                <View className="flex-row justify-between w-full px-2">
                    <Text className={`text-xs ${loadingPhase === 'reading' ? 'text-purple-400' : 'text-gray-500'}`}>
                        Leyendo
                    </Text>
                    <Text className={`text-xs ${loadingPhase === 'parsing' ? 'text-purple-400' : 'text-gray-500'}`}>
                        Buscando
                    </Text>
                    <Text className={`text-xs ${loadingPhase === 'sampling' ? 'text-purple-400' : 'text-gray-500'}`}>
                        Procesando
                    </Text>
                    <Text className={`text-xs ${loadingPhase === 'done' ? 'text-green-400' : 'text-gray-500'}`}>
                        ¡Listo!
                    </Text>
                </View>
            </View>
        );
    }

    // Error screen with retry
    if (step === 'error') {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-8">
                <LinearGradient
                    colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                    className="absolute inset-0"
                />

                <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center mb-6">
                    <AlertCircle size={48} color="#ef4444" />
                </View>

                <Text className="text-white text-2xl font-bold text-center mb-4">
                    ¡Ups! Algo salió mal
                </Text>

                <Text className="text-gray-400 text-center text-base mb-8 leading-6">
                    {errorMessage}
                </Text>

                <TouchableOpacity
                    onPress={() => {
                        setStep('upload');
                        setErrorMessage('');
                    }}
                    className="bg-purple-600 px-8 py-4 rounded-2xl flex-row items-center"
                >
                    <RefreshCw size={20} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">
                        Intentar de Nuevo
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => setStep('guide')}
                    className="mt-4 py-3"
                >
                    <Text className="text-purple-400 font-medium">
                        Ver guía de exportación
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (step === 'analyzing') {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
                <ActivityIndicator size="large" color="#a855f7" />
                <Text className="text-white text-xl font-bold mt-6 text-center">
                    Analizando personalidad...
                </Text>
                <Text className="text-gray-400 text-center mt-2">
                    Esto puede tardar unos segundos
                </Text>
            </View>
        );
    }

    if (step === 'complete') {
        return (
            <View className="flex-1 bg-[#0a0a0a] items-center justify-center px-6">
                <CheckCircle size={80} color="#22c55e" />
                <Text className="text-white text-2xl font-bold mt-6 text-center">
                    ¡Perfil Creado!
                </Text>
                <Text className="text-gray-400 text-center mt-2">
                    Redirigiendo...
                </Text>
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#0a0a0a]">
            <LinearGradient
                colors={['#1a1a2e', '#16213e', '#0a0a0a']}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-6 pt-6">
                    {step === 'upload' && (
                        <>
                            <Text className="text-white text-3xl font-bold mb-2">
                                Importar Conversación
                            </Text>
                            <Text className="text-gray-400 mb-6">
                                Sube tu archivo completo - la app automáticamente usará los mensajes más recientes
                            </Text>

                            {/* Info card */}
                            <View className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-6">
                                <Text className="text-blue-400 font-bold mb-2">✨ Procesamiento Inteligente Basado en Tokens</Text>
                                <Text className="text-gray-300 text-sm leading-6">
                                    • Sube tu archivo completo (cualquier tamaño){'\n'}
                                    • La app extrae automáticamente hasta ~500K tokens{'\n'}
                                    • Más mensajes cortos o menos mensajes largos{'\n'}
                                    • Muestreo de toda la relación (inicio, medio, recientes){'\n'}
                                    • No necesitas editar nada manualmente
                                </Text>
                            </View>

                            {/* Format Selector */}
                            <View className="mb-6">
                                <TouchableOpacity
                                    onPress={() => setImportType('whatsapp')}
                                    className={`border rounded-2xl p-4 mb-3 ${importType === 'whatsapp'
                                        ? 'bg-green-500/20 border-green-500'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <Text className={`font-bold text-lg ${importType === 'whatsapp' ? 'text-green-400' : 'text-white'
                                        }`}>
                                        📱 WhatsApp (.txt)
                                    </Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        Sube tu archivo completo - extrae automáticamente los últimos 1000 mensajes
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setImportType('telegram')}
                                    className={`border rounded-2xl p-4 mb-3 ${importType === 'telegram'
                                        ? 'bg-blue-500/20 border-blue-500'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <Text className={`font-bold text-lg ${importType === 'telegram' ? 'text-blue-400' : 'text-white'
                                        }`}>
                                        ✈️ Telegram (.json)
                                    </Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        Archivo JSON exportado de Telegram
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setImportType('screenshots')}
                                    className={`border rounded-2xl p-4 ${importType === 'screenshots'
                                        ? 'bg-pink-500/20 border-pink-500'
                                        : 'bg-white/5 border-white/10'
                                        }`}
                                >
                                    <Text className={`font-bold text-lg ${importType === 'screenshots' ? 'text-pink-400' : 'text-white'
                                        }`}>
                                        📸 Capturas de Pantalla
                                    </Text>
                                    <Text className="text-gray-400 text-sm mt-1">
                                        Sube capturas de tu conversación
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Upload Area */}
                            {importType === 'screenshots' && (
                                <TouchableOpacity
                                    onPress={handleImageUpload}
                                    className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-8 items-center mb-6"
                                >
                                    <ImageIcon size={48} color="#ec4899" />
                                    <Text className="text-white font-bold text-lg mt-4">
                                        Seleccionar Capturas
                                    </Text>
                                    <Text className="text-gray-400 text-center mt-2">
                                        Sube capturas de tu chat
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {(importType === 'whatsapp' || importType === 'telegram') && (
                                <TouchableOpacity
                                    onPress={handleFileUpload}
                                    className="bg-white/5 border-2 border-dashed border-white/20 rounded-2xl p-8 items-center mb-6"
                                >
                                    <Upload size={48} color="#a855f7" />
                                    <Text className="text-white font-bold text-lg mt-4">
                                        Subir Archivo
                                    </Text>
                                    <Text className="text-gray-400 text-center mt-2">
                                        {importType === 'whatsapp' ? 'Archivo .txt de WhatsApp (cualquier tamaño)' : 'Archivo .json de Telegram'}
                                    </Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                onPress={() => setStep('guide')}
                                className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-4"
                            >
                                <Text className="text-blue-400 text-center font-semibold">
                                    📚 Ver Guía de Exportación
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <Text className="text-white text-3xl font-bold mb-2">
                                Vista Previa
                            </Text>
                            <Text className="text-gray-400 mb-6">
                                {parsedMessages.length} mensajes detectados
                            </Text>

                            <View className="mb-6">
                                <Text className="text-white font-semibold mb-2">
                                    Nombre de tu ex:
                                </Text>
                                <TextInput
                                    className="bg-white/5 border border-white/10 rounded-2xl p-4 text-white mb-4"
                                    placeholder="Ej: María"
                                    placeholderTextColor="#6b7280"
                                    value={exName}
                                    onChangeText={setExName}
                                />
                            </View>

                            <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                                <Text className="text-white font-semibold mb-3">
                                    Primeros mensajes:
                                </Text>
                                {parsedMessages.slice(0, 5).map((msg, idx) => (
                                    <Text key={idx} className="text-gray-300 text-sm mb-2">
                                        {msg.sender === 'user' ? '👤' : '💬'} {msg.content.substring(0, 50)}...
                                    </Text>
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={handleAnalyze}
                                className="bg-purple-600 rounded-2xl py-4 flex-row items-center justify-center"
                            >
                                <Text className="text-white font-bold text-lg mr-2">
                                    Analizar Personalidad
                                </Text>
                                <ArrowRight size={20} color="white" />
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </LinearGradient>
        </View>
    );
}
