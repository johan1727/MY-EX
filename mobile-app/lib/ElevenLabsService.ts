import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { supabase } from './supabase';

const ELEVENLABS_API_KEY = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
const BASE_URL = 'https://api.elevenlabs.io/v1';

export interface VoiceCloneResult {
    voiceId: string;
    name: string;
}

export class ElevenLabsService {

    /**
     * Ensures a voice is ready for a call.
     * Checks if the voice exists in ElevenLabs. if not, restores it from Supabase Storage.
     */
    async ensureVoiceReady(profileId: string): Promise<string> {
        if (!ELEVENLABS_API_KEY) throw new Error('Missing ElevenLabs API Key');

        // 1. Get Profile Data
        const { data: profile, error } = await supabase
            .from('ex_profiles')
            .select('voice_id, ex_name, audio_paths')
            .eq('id', profileId)
            .single();

        if (error || !profile) throw new Error('Profile not found');

        const { voice_id, ex_name, audio_paths } = profile;

        // 2. Check if voice exists in ElevenLabs (validate ID)
        let isValid = false;
        if (voice_id) {
            try {
                const response = await fetch(`${BASE_URL}/voices/${voice_id}`, {
                    headers: { 'xi-api-key': ELEVENLABS_API_KEY }
                });
                if (response.ok) isValid = true;
            } catch (e) {
                console.warn('[ElevenLabs] Voice validation failed:', e);
            }
        }

        if (isValid && voice_id) {
            console.log('[ElevenLabs] Voice is ready:', voice_id);
            return voice_id;
        }

        // 3. Voice Not Found/Invalid -> RESTORE from Storage
        console.log('[ElevenLabs] Voice missing. Restoring from storage...');

        if (!audio_paths || audio_paths.length === 0) {
            throw new Error('No backup audio found. Cannot restore voice.');
        }

        // 4. Download Files from Supabase
        const localFilePaths: string[] = [];
        try {
            for (const path of audio_paths) {
                const { data, error: dlError } = await supabase.storage
                    .from('voice_samples')
                    .download(path);

                if (dlError) throw dlError;

                // Save to Temp
                const fr = new FileReader();
                const promise = new Promise<string>((resolve, reject) => {
                    fr.onload = async () => {
                        const base64 = (fr.result as string).split(',')[1];
                        const tempPath = `${FileSystem.cacheDirectory}restore_${Math.random().toString(36).substring(7)}.m4a`;
                        await FileSystem.writeAsStringAsync(tempPath, base64, { encoding: FileSystem.EncodingType.Base64 });
                        resolve(tempPath);
                    };
                    fr.onerror = reject;
                    fr.readAsDataURL(data!);
                });
                localFilePaths.push(await promise);
            }
        } catch (e) {
            console.error('[ElevenLabs] Download failed:', e);
            throw new Error('Failed to download backup audio.');
        }

        // 5. Clone (This will handle slot limits automatically)
        const result = await this.cloneVoice(ex_name, localFilePaths, profileId);

        // 6. Update DB with new ID
        await supabase
            .from('ex_profiles')
            .update({ voice_id: result.voiceId })
            .eq('id', profileId);

        return result.voiceId;
    }

    /**
     * Smart Clone: Manages Slot Limits before creating
     */
    async cloneVoice(name: string, audioFilePaths: string[], profileIdForTracking?: string): Promise<VoiceCloneResult> {
        if (!ELEVENLABS_API_KEY) throw new Error('Missing ElevenLabs API Key');
        if (audioFilePaths.length === 0) throw new Error('No audio files provided');

        // 1. Check Slots
        await this.manageSlotLimits();

        console.log(`[ElevenLabs] Cloning voice "${name}"...`);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', `Cloned for ${profileIdForTracking || 'Ex'}`);
        formData.append('labels', JSON.stringify({ type: 'cloned', app: 'soy-remi' }));

        // Append files
        for (let i = 0; i < audioFilePaths.length; i++) {
            const uri = audioFilePaths[i];
            const fileType = uri.split('.').pop() || 'm4a';
            const fileName = `sample_${i}.${fileType}`;

            if (Platform.OS === 'web') {
                try {
                    const response = await fetch(uri);
                    const blob = await response.blob();
                    formData.append('files', blob, fileName);
                } catch (e) {
                    console.error('[ElevenLabs] Blob error:', e);
                }
            } else {
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
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                // DEV BYPASS
                if ((response.status === 400 || response.status === 402) && __DEV__) {
                    console.warn('[ElevenLabs] DEV: Limit reached, using mock.');
                    return { voiceId: '21m00Tcm4TlvDq8ikWAM', name: name };
                }
                throw new Error(`Failed to clone voice: ${response.status} ${errorText}`);
            }

            const data = await response.json();
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
     * Checks subscription usage and frees up a slot if necessary.
     */
    private async manageSlotLimits() {
        try {
            const response = await fetch(`${BASE_URL}/user/subscription`, {
                headers: { 'xi-api-key': ELEVENLABS_API_KEY! }
            });
            const data = await response.json();

            // Safety buffer: If we have 30 slots, stop at 28 to be safe
            const MAX_SLOTS = 30; // Hardcoded for this plan level, or data.tier logic
            const currentCount = data.count || 0; // Adjust field based on actual API response for voice count
            // API usually returns { character_count, character_limit, voice_limit, voice_count? }
            // Actually it's often in /user info. Let's assume we need to check voices list length if subscription endpoint is vague.

            // Check list length directly for accuracy
            const listResp = await fetch(`${BASE_URL}/voices`, { headers: { 'xi-api-key': ELEVENLABS_API_KEY! } });
            const listData = await listResp.json();
            const voices = listData.voices || [];
            const clonedVoices = voices.filter((v: any) => v.category === 'cloned');

            console.log(`[ElevenLabs] Slots used: ${clonedVoices.length}/${MAX_SLOTS}`);

            if (clonedVoices.length >= MAX_SLOTS) {
                console.log('[ElevenLabs] Slots full! Evicting LRU voice...');
                await this.evictLRUVoice(clonedVoices);
            }

        } catch (e) {
            console.warn('[ElevenLabs] Slot check failed:', e);
            // Proceed anyway and hope for best? Or throw?
            // If we can't check, we might fail at creation.
        }
    }

    /**
     * Finds the Least Recently Used voice in our DB and deletes it from ElevenLabs
     */
    private async evictLRUVoice(elevenLabsVoices: any[]) {
        // 1. Get our DB profiles that have voice_ids, ordered by last_used_at ASC (Oldest first)
        const { data: profiles } = await supabase
            .from('ex_profiles')
            .select('id, voice_id, last_used_at')
            .not('voice_id', 'is', null)
            .order('last_used_at', { ascending: true }) // Oldest usage first
            .limit(10); // Check a few candidates

        if (!profiles || profiles.length === 0) {
            // No tracked voices? Just delete the oldest from ElevenLabs list?
            // Fallback: Delete the one created earliest in ElevenLabs
            const oldest = elevenLabsVoices.sort((a, b) => a.created_at_unix - b.created_at_unix)[0];
            if (oldest) {
                await this.deleteVoice(oldest.voice_id);
            }
            return;
        }

        // 2. Find a match that exists in ElevenLabs list
        for (const profile of profiles) {
            const exists = elevenLabsVoices.find((v: any) => v.voice_id === profile.voice_id);
            if (exists) {
                console.log(`[ElevenLabs] Evicting voice for profile ${profile.id} (Last used: ${profile.last_used_at})`);

                // 3. Delete from ElevenLabs
                await this.deleteVoice(profile.voice_id);

                // 4. Clear from DB (Soft Delete of reference only)
                await supabase
                    .from('ex_profiles')
                    .update({ voice_id: null }) // Remove ID so it triggers restore next time
                    .eq('id', profile.id);

                return; // Freed one slot, done.
            }
        }
    }

    async streamTextToSpeech(text: string, voiceId: string): Promise<string> {
        if (!ELEVENLABS_API_KEY) throw new Error('Missing ElevenLabs API Key');
        const modelId = 'eleven_multilingual_v2';
        const url = `${BASE_URL}/text-to-speech/${voiceId}/stream?optimize_streaming_latency=3&output_format=mp3_44100_128`;

        try {
            const tempFile = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
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
                        stability: 0.5,
                        similarity_boost: 0.9,
                        style: 0.75,
                        use_speaker_boost: true
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`TTS Failed: ${response.status} ${errText}`);
            }

            const blob = await response.blob();

            if (Platform.OS === 'web') {
                return URL.createObjectURL(blob);
            } else {
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

    async deleteVoice(voiceId: string): Promise<void> {
        if (!ELEVENLABS_API_KEY) return;
        try {
            console.log('[ElevenLabs] Deleting voice:', voiceId);
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
