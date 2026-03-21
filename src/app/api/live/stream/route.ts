import { NextResponse } from 'next/server';
import { addSseClient, removeSseClient, getLiveState } from '../store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
    const stream = new ReadableStream({
        start(controller) {
            // Sofort den aktuellen Zustand senden
            const current = getLiveState();
            if (current) {
                const data = `data: ${JSON.stringify(current)}\n\n`;
                controller.enqueue(new TextEncoder().encode(data));
            }

            // Client zur globalen Liste hinzufügen
            addSseClient(controller);

            // Heartbeat alle 10 Sekunden, um die Verbindung am Leben zu halten
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(new TextEncoder().encode(': heartbeat\n\n'));
                } catch {
                    clearInterval(heartbeat);
                    removeSseClient(controller);
                }
            }, 10000);
        },
        cancel(controller) {
            removeSseClient(controller);
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
