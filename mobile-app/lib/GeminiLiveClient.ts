import { EventEmitter } from 'eventemitter3';

type GeminiConfig = {
    apiKey: string;
    model?: string;
    systemInstruction?: string;
    voiceSettings?: {
        // Gemini sadly doesn't support custom voice output in the same way, 
        // but we receive text and use ElevenLabs for that.
        // We configure it to NOT return audio if possible, or we ignore it.
        // Actually Gemini Multimodal Live DOES return audio by default.
        // We will request TEXT output primarily.
    };
};

export class GeminiLiveClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: GeminiConfig;
    private url: string;
    private isConnected: boolean = false;

    constructor(config: GeminiConfig) {
        super();
        this.config = config;
        const model = config.model || 'gemini-2.0-flash-exp';
        // WebSocket URL
        this.url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${config.apiKey}`;
    }

    connect() {
        if (this.ws) {
            console.log('[GeminiLive] Already connected/connecting');
            return;
        }

        console.log('[GeminiLive] Connecting to:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('[GeminiLive] Connected');
            this.isConnected = true;
            this.emit('connected');
            this.sendSetup();
        };

        this.ws.onmessage = async (event) => {
            try {
                let data = event.data;

                // Handle Blob (RN/Browser often sends Blob for binary frames)
                if (typeof data === 'object' && data.constructor.name === 'Blob') {
                    data = await new Response(data).text();
                }

                if (typeof data === 'string') {
                    try {
                        const msg = JSON.parse(data);
                        this.handleMessage(msg);
                    } catch (e) {
                        // If it's not JSON, it might be raw text or something else
                        // But Gemini protocol is JSON.
                        // Sometimes connection preamble is not JSON?
                        console.log('[GeminiLive] Received non-JSON string:', data.substring(0, 100));
                    }
                } else {
                    console.log('[GeminiLive] Received binary/unknown message type:', typeof data);
                }
            } catch (e) {
                console.error('[GeminiLive] Error processing message:', e);
            }
        };

        this.ws.onerror = (e) => {
            console.error('[GeminiLive] Error:', e);
            this.emit('error', e);
        };

        this.ws.onclose = (e) => {
            console.log('[GeminiLive] Closed:', e.code, e.reason);
            this.isConnected = false;
            this.ws = null;
            this.emit('disconnected');
        };
    }

    private sendSetup() {
        if (!this.ws) return;

        const setupMsg = {
            setup: {
                model: `models/${this.config.model || 'gemini-2.0-flash-exp'}`,
                generation_config: {
                    response_modalities: ["TEXT"], // We mostly want TEXT so we can TTS it with ElevenLabs
                    // We can ask for AUDIO too if we wanted Gemini's voice, but plan says ElevenLabs.
                },
                system_instruction: {
                    parts: [{ text: this.config.systemInstruction || "You are a helpful assistant." }]
                }
            }
        };

        this.ws.send(JSON.stringify(setupMsg));
    }

    sendAudioChunk(base64Audio: string, mimeType: string = "audio/pcm;rate=16000") {
        if (!this.ws || !this.isConnected) {
            console.log('[GeminiLive] Cannot send chunk: Disconnected');
            return;
        }

        // console.log('[GeminiLive] Sending audio payload...'); // Commenting out to avoid huge spam, but enabling for now

        const msg = {
            realtime_input: {
                media_chunks: [{
                    mime_type: mimeType,
                    data: base64Audio
                }]
            }
        };

        this.ws.send(JSON.stringify(msg));
    }

    sendMessage(text: string) {
        if (!this.ws || !this.isConnected) return;
        const msg = {
            client_content: {
                turns: [{
                    role: "user",
                    parts: [{ text }]
                }],
                turn_complete: true
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    private handleMessage(msg: any) {
        // Handle server_content
        if (msg.serverContent) {
            const turn = msg.serverContent.modelTurn;
            if (turn && turn.parts) {
                for (const part of turn.parts) {
                    if (part.text) {
                        this.emit('text', part.text); // Stream text delta
                    }
                }
            }
            if (msg.serverContent.turnComplete) {
                this.emit('turnComplete');
            }
        }

        // Handle tool use if we added it later
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
