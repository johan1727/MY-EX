import { EventEmitter } from 'eventemitter3';

type ElevenLabsConfig = {
    apiKey: string;
    voiceId: string;
    model?: string; // e.g. 'eleven_turbo_v2_5'
};

export class ElevenLabsStreamClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private config: ElevenLabsConfig;
    private url: string;
    private isConnected: boolean = false;

    constructor(config: ElevenLabsConfig) {
        super();
        this.config = config;
        const model = config.model || 'eleven_turbo_v2_5';
        this.url = `wss://api.elevenlabs.io/v1/text-to-speech/${config.voiceId}/stream-input?model_id=${model}`;
    }

    private connectionPromise: Promise<void> | null = null;

    connect(): Promise<void> {
        if (this.connectionPromise) {
            console.log('[ElevenLabs] Connection already in progress, returning existing promise.');
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise((resolve, reject) => {
            if (this.ws) {
                if (this.isConnected) {
                    this.connectionPromise = null;
                    resolve();
                    return;
                }
                // If ws exists but not connected, maybe in weird state? Close it.
                try {
                    this.ws.close();
                } catch (e) { }
                this.ws = null;
            }

            console.log('[ElevenLabs] Connecting...');
            try {
                this.ws = new WebSocket(this.url);
            } catch (e) {
                this.connectionPromise = null;
                reject(e);
                return;
            }

            this.ws.onopen = () => {
                console.log('[ElevenLabs] Connected');
                this.isConnected = true;
                this.emit('connected');
                // Send initial BOS message
                this.send({
                    text: " ",
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.8
                    },
                    xi_api_key: this.config.apiKey
                });
                this.connectionPromise = null;
                resolve();
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data as string);

                    // Log partial data to avoid spamming base64
                    const debugData = { ...data };
                    if (debugData.audio) debugData.audio = '(Base64 data...)';
                    console.log('[ElevenLabs] Msg received:', JSON.stringify(debugData));

                    if (data.audio) {
                        console.log('[ElevenLabs] Received audio chunk, length:', data.audio.length);
                        this.emit('audio', data.audio);
                    }

                    if (data.isFinal) {
                        // Current generation finished
                    }

                    if (data.alignment) {
                        // Alignment info
                    }
                } catch (e) {
                    console.error('[ElevenLabs] Parse error:', e);
                }
            };

            this.ws.onerror = (e) => {
                console.error('[ElevenLabs] Error:', e);
                this.emit('error', e);
                this.connectionPromise = null;
            };

            this.ws.onclose = (event) => {
                console.log(`[ElevenLabs] Closed. Code: ${event.code}, Reason: ${event.reason}`);
                this.isConnected = false;
                this.ws = null;
                this.emit('disconnected', `Code: ${event.code}`);
                this.connectionPromise = null; // Ensure promise is cleared on close
            };
        });

        return this.connectionPromise;
    }

    async sendText(text: string) {
        console.log(`[ElevenLabs] Sending text: "${text.substring(0, 20)}..."`);

        if (!this.ws || !this.isConnected) {
            console.log('[ElevenLabs] Socket disconnected. Reconnecting before sending...');
            try {
                await this.connect();
            } catch (e) {
                console.error('[ElevenLabs] Reconnection failed:', e);
                return;
            }
        }

        // Double check after connect attempt
        if (!this.ws || !this.isConnected) {
            console.error('[ElevenLabs] Still disconnected after reconnect attempt. Dropping text.');
            return;
        }

        // We send text chunks. 
        // "try_trigger_generation": true makes it try to generate immediately if possible
        this.send({
            text: text + " ", // Append space to help VAD/Text boundary
            try_trigger_generation: true,
            xi_api_key: this.config.apiKey // Sending key in payload just in case
        });
    }

    sendEnd() {
        if (!this.ws || !this.isConnected) return;
        this.send({ text: "" }); // BOS? actually EOS is usually just closing or empty string
    }

    private send(payload: any) {
        // Auth workaround: Include key in first packet if headers failed (RN supports headers though)
        // Let's rely on standard msg structure
        // But to be safe, we might need to modify URL in constructor to include Auth if header not supported?
        // Actually RN WebSocket supports headers as 2nd arg.

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        } else {
            console.warn('[ElevenLabs] Buffer send failed: WebSocket not OPEN');
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
