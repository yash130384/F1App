import fs from 'fs';
import path from 'path';

export interface CurveData {
    name: string;
    start: number; // percentage (0.0 - 1.0)
    end: number;   // percentage (0.0 - 1.0)
    marker: number;
}

export interface TrackMetadata {
    name: string;
    trackId: string;
    length: number;
    pitEntry: number; // fractional
    pitExit: number;  // fractional
    turns: CurveData[];
}

const TRACK_ID_TO_FILE: Record<number, string> = {
    0: 'melbourne.json',
    1: 'shanghai.json',
    2: 'suzuka.json',
    3: 'sakhir-bahrain.json',
    4: 'jeddah.json',
    5: 'miami.json',
    6: 'imola.json',
    7: 'monaco.json',
    8: 'catalunya.json',
    9: 'montreal.json',
    10: 'austria.json',
    11: 'silverstone.json',
    12: 'spa.json',
    13: 'hungaroring.json',
    14: 'zandvoort.json',
    15: 'monza.json',
    16: 'baku-azerbaijan.json',
    17: 'singapore.json',
    18: 'texas.json',
    19: 'mexico.json',
    20: 'brazil.json',
    21: 'las-vegas.json',
    22: 'losail.json',
    23: 'abu-dhabi.json',
};

export class TrackIntel {
    private metadata: TrackMetadata | null = null;
    private currentTrackId: number = -1;
    private trackDataPath: string;

    constructor() {
        // Wir nutzen den relativen Pfad zu den im Repo hinterlegten Lovely-Track-Daten
        this.trackDataPath = path.join(__dirname, '..', '..', 'src', 'lib', 'data', 'tracks');
    }

    /**
     * Lädt die Metadaten für eine Strecke basierend auf der F1 Track-ID.
     */
    public loadTrack(f1TrackId: number) {
        if (this.currentTrackId === f1TrackId) return;

        const fileName = TRACK_ID_TO_FILE[f1TrackId];
        if (!fileName) {
            this.metadata = null;
            return;
        }

        const filePath = path.join(this.trackDataPath, fileName);
        if (fs.existsSync(filePath)) {
            try {
                const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                this.metadata = {
                    name: raw.name,
                    trackId: raw.trackId,
                    length: raw.length,
                    pitEntry: raw.pitentry,
                    pitExit: raw.pitexit,
                    turns: raw.turn.map((t: any) => ({
                        name: t.name,
                        start: t.start,
                        end: t.end,
                        marker: t.marker
                    }))
                };
                this.currentTrackId = f1TrackId;
            } catch (e) {
                console.error(`Fehler beim Laden der Track-Daten für ID ${f1TrackId}:`, e);
                this.metadata = null;
            }
        }
    }

    /**
     * Gibt den Namen der aktuellen Kurve basierend auf der Distanz zurück.
     * 
     * @param distanceInMeters Aktuelle Distanz des Fahrzeugs auf der Runde.
     * @param trackLength Gesamtlänge der Strecke.
     */
    public getTurnName(distanceInMeters: number, trackLength: number): string | null {
        if (!this.metadata || trackLength <= 0) return null;

        const progress = distanceInMeters / trackLength;
        const turn = this.metadata.turns.find(t => progress >= t.start && progress <= t.end);
        
        return turn ? turn.name : null;
    }

    /**
     * Gibt alle Kurven-Metadaten zurück (für DB-Synchronisation).
     */
    public getMetadata(): TrackMetadata | null {
        return this.metadata;
    }
}
