import { AppConfig } from './types/config';
import { SessionState } from './state';
import fetch from 'node-fetch';

/**
 * Hilfsklasse zum Senden der Session-Daten an die API.
 * Die API nutzt nun einen Background-Worker, was Timeouts verhindert.
 */
class TelemetrySender {
    private config: AppConfig;
    private state: SessionState;
    private isSending: boolean = false;
    private logger?: (msg: string, type?: 'info' | 'error' | 'success') => void;

    constructor(config: AppConfig, state: SessionState) {
        this.config = config;
        this.state = state;
    }

    public setLogger(logger: (msg: string, type?: 'info' | 'error' | 'success') => void) {
        this.logger = logger;
    }

    private log(msg: string, type: 'info' | 'error' | 'success' = 'info') {
        if (this.logger) {
            this.logger(msg, type);
        } else {
            const icons = { info: 'ℹ️', error: '❌', success: '✅' };
            console.log(`${icons[type]} ${msg}`);
        }
    }

    /**
     * Sendet Daten an die API. Der Server sollte dank Background-Queuing sofort antworten.
     */
    public async send() {
        if (this.isSending) return;
        this.isSending = true;

        try {
            let drainIteration = 0;
            // DRAIN-LOOP: Verarbeitet alle gepufferten Runden
            while (this.state.hasPendingData() || drainIteration === 0) {
                drainIteration++;
                const fullPayload = this.state.buildPayloadAndClear();

                if (fullPayload.participants.length === 0 && !fullPayload.isSessionEnded) {
                    if (!this.state.hasPendingData()) break;
                    continue;
                }

                const participants = fullPayload.participants;
                const totalParticipants = participants.length;
                let currentChunk: any[] = [];
                let currentChunkSize = 0;
                // 125KB ist eine sichere Grenze für Neon-HTTP Payloads (Limit liegt bei knapp 150KB)
                const MAX_CHUNK_BYTES = 125 * 1024; 

                for (let i = 0; i < totalParticipants; i++) {
                    const p = participants[i];
                    const pSize = JSON.stringify(p).length;

                    // Wenn der nächste Teilnehmer den Chunk sprengt, senden wir den aktuellen
                    if (currentChunk.length > 0 && (currentChunkSize + pSize) > MAX_CHUNK_BYTES) {
                        await this.sendChunkBundle(currentChunk, fullPayload, drainIteration);
                        currentChunk = [];
                        currentChunkSize = 0;
                    }

                    currentChunk.push(p);
                    currentChunkSize += pSize;
                }

                // Restlichen Teilnehmer im letzten Chunk senden
                if (currentChunk.length > 0 || (totalParticipants === 0 && fullPayload.isSessionEnded)) {
                    await this.sendChunkBundle(currentChunk, fullPayload, drainIteration, true);
                }

                if (!this.state.hasPendingData()) break;
                // Kurze Pause vor dem nächsten Drain-Zyklus
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (e: any) {
            this.log(`Kritischer Fehler im Sender: ${e.message}`, 'error');
        } finally {
            this.isSending = false;
        }
    }

    private async sendChunkBundle(chunk: any[], fullPayload: any, drainIteration: number, isLastOfIteration = false) {
        const body = {
            leagueId: this.config.leagueId,
            packet: {
                ...fullPayload,
                participants: chunk,
                trackMetadata: (drainIteration === 1 && chunk === fullPayload.participants.slice(0, chunk.length)) ? fullPayload.trackMetadata : undefined,
                isSessionEnded: fullPayload.isSessionEnded && isLastOfIteration
            }
        };

        const sizeKb = Math.round(JSON.stringify(body).length / 1024);
        const responseData = await this.sendRequest(body, 1, 1, sizeKb);
        
        // BACKPRESSURE
        let serverQueueSize = responseData?.queue || 0;
        if (serverQueueSize > 100) {
            this.log(`Server-Queue hoch (${serverQueueSize}), polle auf Leerlauf...`, 'info');
            while (serverQueueSize > 10) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                try {
                    const pollRes = await fetch(this.config.url!);
                    if (pollRes.ok) {
                        const pollData = await pollRes.json() as any;
                        serverQueueSize = pollData.queue;
                    }
                } catch (e) { break; }
            }
            this.log(`Queue abgearbeitet (${serverQueueSize}), fahre fort.`, 'success');
        }
    }

    private async sendRequest(body: any, chunkIdx: number, total: number, sizeKb: number, maxRetries = 3): Promise<any> {
        let attempt = 1;
        while (attempt <= maxRetries) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            try {
                const targetUrl = this.config.url || '';
                const res = await fetch(targetUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    signal: controller.signal as any
                });
                
                clearTimeout(timeoutId);

                if (res.ok) {
                    const data = await res.json() as any;
                    this.log(`Chunk ${chunkIdx}/${total} (${sizeKb} KB, Queue: ${data.queue || 0})`, 'success');
                    return data;
                }

                throw new Error(`HTTP Status ${res.status}`);
            } catch (err: any) {
                clearTimeout(timeoutId);
                const isAbort = err.name === 'AbortError' || err.message?.includes('aborted');
                const errMsg = isAbort ? 'Server Timeout (20s)' : err.message;

                if (attempt < maxRetries) {
                    this.log(`Chunk retry ${attempt}/${maxRetries} (${errMsg})`, 'error');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempt++;
                } else {
                    this.log(`Chunk gescheitert: ${errMsg}`, 'error');
                    break;
                }
            }
        }
        return null;
    }
}

let globalSender: TelemetrySender | null = null;
let globalState: SessionState | null = null;
let currentSessionUID: string | null = null;

export function startSender(config: AppConfig, state: SessionState) {
    globalSender = new TelemetrySender(config, state);
    globalState = state;
}

export function setSenderLogger(logger: (msg: string, type?: 'info' | 'error' | 'success') => void) {
    globalSender?.setLogger(logger);
}

export function stopSender() {}

export function getGlobalState(): SessionState | null {
    return globalState;
}

export function setSessionUID(uid: string) {
    if (currentSessionUID && currentSessionUID !== uid) {
        globalState?.reset();
    }
    currentSessionUID = uid;
}

export async function triggerImmediateSend() {
    if (globalSender) {
        await globalSender.send();
    }
}

export function resetAccumulatedData() {
    globalState?.reset();
}
