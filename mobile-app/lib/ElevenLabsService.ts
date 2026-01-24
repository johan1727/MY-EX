import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

export interface VoiceCloneResult {
    voiceId: string;
    name: string;
}

export class ElevenLabsService {
    /**
     * Clone a voice from audio files
     * @param name Name of the voice (e.g., Ex Name)
     * @param audioFilePaths Array of local file URIs (file://...)
     */
    async cloneVoice(name: string, audioFilePaths: string[]): Promise<VoiceCloneResult> {
        if (!ELEVENLABS_API_KEY) throw new Error('Missing ElevenLabs API Key');
        if (audioFilePaths.length === 0) throw new Error('No audio files provided');

        console.log(`[ElevenLabs] Cloning voice "${name}" from ${audioFilePaths.length} files...`);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', 'Voice cloned via My Ex Coach App');
        // Labels helps identifying it in dashboard
        formData.append('labels', JSON.stringify({ type: 'cloned', app: 'soy-remi' }));

        // Append files
        for (let i = 0; i < audioFilePaths.length; i++) {
            const uri = audioFilePaths[i];
            const fileType = uri.split('.').pop() || 'm4a';
            const fileName = `sample_${i}.${fileType}`;

            if (Platform.OS === 'web') {
                // WEB: Fetch blob from URI (blob: or data:)
                try {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('files', blob, fileName);
                } catch (e) {
                    console.error('[ElevenLabs] Failed to convert URI to Blob:', e);
                }
            } else {
                // NATIVE: Append object with uri/name/type
                formData.append('files', {
                    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
                    name: fileName,
                    type: `audio/${fileType}`
                } as any);
            }
        }

        try {
            const response = await fetch(`${BASE_URL}/voices/add`, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Accept': 'application/json',
                    // 'Content-Type': 'multipart/form-data' // Let fetch set boundary automatically
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Check for Plan Limit (400)
                if ((response.status === 400 || response.status === 402) && __DEV__) {
                    console.warn('[ElevenLabs] DEV BYPASS: Plan limit reached. Using Mock Voice (Rachel).');
                    return {
                        voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel Voice ID
                        name: name
                    };
                }

                console.error('[ElevenLabs] Clone Error:', errorText);
                throw new Error(`Failed to clone voice: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log('[ElevenLabs] Voice Cloned:', data);
            return {
                voiceId: data.voice_id,
                name: name
            };

        } catch (error) {
            console.error('[ElevenLabs] Service Error:', error);
            throw error;
        }
    }

    /**
     * Stream text to speech using Turbo v2.5 (Low Latency)
     * @param text Text to speak
     * @param voiceId Voice ID to use
     * @returns Path to the downloaded audio file
     */
    async streamTextToSpeech(text: string, voiceId: string): Promise<string> {
        if (!ELEVENLABS_API_KEY) throw new Error('Missing ElevenLabs API Key');

        // Use Multilingual v2 for BEST QUALITY + Natural Expression
        // (Turbo v2.5 is faster but can sound robotic)
        const modelId = 'eleven_multilingual_v2';
        // Optimize for quality over latency for more natural conversation
        const url = `${BASE_URL}/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;

        console.log(`[ElevenLabs] Streaming TTS (${text.length} chars) for voice ${voiceId} using ${modelId}...`);

        try {
            // Using FileSystem.downloadAsync to stream directly to file is cleaner for caching
            // but for truly instant feedback, we might want to play stream.
            // For React Native, downloading to a temp file and playing is robust.

            const tempFile = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;

            // Fix: httpMethod is not valid in DownloadOptions. Use FileSystem.createDownloadResumable or just custom fetch for POST if needed.
            // But FileSystem.downloadAsync only supports GET easily.
            // WORKAROUND: Use fetch + writeAsStringAsync for POST request, then return URI.

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'xi-api-key': ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: modelId,
                    voice_settings: {
                        stability: 0.5,        // Lower stability for more dynamic/expressive voice
                        similarity_boost: 0.9, // Very high similarity for accurate voice cloning
                        style: 0.75,           // Higher style for natural expressiveness (less robotic!)
                        use_speaker_boost: true // Boost speaker clarity
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`TTS Failed: ${response.status} ${errText}`);
            }

            const blob = await response.blob();

            if (Platform.OS === 'web') {
                // WEB: Create Blob URL for playback
                return URL.createObjectURL(blob);
            } else {
                // NATIVE: Save to file
                const reader = new FileReader();
                return new Promise((resolve, reject) => {
                    reader.onloadend = async () => {
                        const base64data = (reader.result as string).split(',')[1];
                        await FileSystem.writeAsStringAsync(tempFile, base64data, { encoding: FileSystem.EncodingType.Base64 });
                        resolve(tempFile);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

        } catch (error) {
            console.error('[ElevenLabs] TTS Error:', error);
            throw error;
        }
    }

    /**
     * Delete a voice (cleanup)
     */
    async deleteVoice(voiceId: string): Promise<void> {
        if (!ELEVENLABS_API_KEY) return;
        try {
            await fetch(`${BASE_URL}/voices/${voiceId}`, {
                method: 'DELETE',
                headers: { 'xi-api-key': ELEVENLABS_API_KEY }
            });
        } catch (e) {
            console.warn('[ElevenLabs] Cleanup failed', e);
        }
    }
}

export const elevenLabsService = new ElevenLabsService();
