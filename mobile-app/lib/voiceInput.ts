import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

interface VoiceInputResult {
    text: string;
    confidence: number;
    error?: string;
}

export class VoiceInputService {
    private recording: Audio.Recording | null = null;
    private isRecording: boolean = false;

    async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            return status === 'granted';
        } catch (error) {
            console.error('Error requesting audio permissions:', error);
            return false;
        }
    }

    async startRecording(): Promise<boolean> {
        try {
            const hasPermission = await this.requestPermissions();
            if (!hasPermission) {
                console.log('Audio recording permission not granted');
                return false;
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const { recording } = await Audio.Recording.createAsync(
                Audio.RecordingOptionsPresets.HIGH_QUALITY
            );

            this.recording = recording;
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Error starting recording:', error);
            return false;
        }
    }

    async stopRecording(): Promise<string | null> {
        try {
            if (!this.recording) {
                return null;
            }

            await this.recording.stopAndUnloadAsync();
            const uri = this.recording.getURI();
            this.recording = null;
            this.isRecording = false;

            return uri;
        } catch (error) {
            console.error('Error stopping recording:', error);
            return null;
        }
    }

    async transcribeAudio(audioUri: string): Promise<VoiceInputResult> {
        try {
            // Note: This is a placeholder. In production, you would:
            // 1. Upload the audio file to a cloud storage
            // 2. Call a speech-to-text API (Google Cloud Speech-to-Text, OpenAI Whisper, etc.)
            // 3. Return the transcribed text

            // For now, we'll return a mock response
            // In production, replace this with actual API call

            console.log('Transcribing audio from:', audioUri);

            // Example with OpenAI Whisper API (you'd need to implement this)
            // const formData = new FormData();
            // formData.append('file', {
            //     uri: audioUri,
            //     type: 'audio/m4a',
            //     name: 'recording.m4a',
            // });
            // formData.append('model', 'whisper-1');
            // 
            // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            //     method: 'POST',
            //     headers: {
            //         'Authorization': `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
            //     },
            //     body: formData,
            // });
            // 
            // const data = await response.json();
            // return {
            //     text: data.text,
            //     confidence: 0.95,
            // };

            return {
                text: 'Función de voz en desarrollo. Por favor usa el teclado por ahora.',
                confidence: 0,
                error: 'Voice transcription not yet implemented'
            };
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return {
                text: '',
                confidence: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    getIsRecording(): boolean {
        return this.isRecording;
    }

    async cancelRecording(): Promise<void> {
        try {
            if (this.recording) {
                await this.recording.stopAndUnloadAsync();
                this.recording = null;
                this.isRecording = false;
            }
        } catch (error) {
            console.error('Error canceling recording:', error);
        }
    }
}

// Text-to-Speech functionality
export async function speakText(
    text: string,
    language: 'es' | 'en' = 'es',
    rate: number = 1.0
): Promise<void> {
    try {
        const languageCode = language === 'es' ? 'es-ES' : 'en-US';

        await Speech.speak(text, {
            language: languageCode,
            pitch: 1.0,
            rate: rate,
        });
    } catch (error) {
        console.error('Error speaking text:', error);
    }
}

export async function stopSpeaking(): Promise<void> {
    try {
        await Speech.stop();
    } catch (error) {
        console.error('Error stopping speech:', error);
    }
}

export async function isSpeaking(): Promise<boolean> {
    try {
        return await Speech.isSpeakingAsync();
    } catch (error) {
        console.error('Error checking if speaking:', error);
        return false;
    }
}

// Singleton instance
export const voiceInputService = new VoiceInputService();
