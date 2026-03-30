import { IncidentEntry, SafetyCarEvent } from './types';

/**
 * Der IncidentManager ist verantwortlich für die Protokollierung und Verwaltung
 * von Sondersituationen während eines Rennens (Strafen, Unfälle, Safety-Car-Phasen).
 * Er entlastet die SessionState-Klasse von der detaillierten Event-Logik.
 */
export class IncidentManager {
    /** Liste der Safety-Car Statusänderungen (wird nach Übermittlung geleert). */
    private safetyCarEvents: SafetyCarEvent[] = [];
    /** Chronologisches Log aller Vorfälle für die Anzeige im Admin-Hub oder Protokoll. */
    private incidentLog: IncidentEntry[] = [];

    /**
     * Registriert eine Statusänderung des Safety-Cars und fügt diese dem allgemeinen Protokoll hinzu.
     * 
     * @param safetyCarType Typ des Fahrzeugs (0=Keines, 1=Full SC, 2=VSC).
     * @param eventType Art des Ereignisses (0=Deployed, 1=Returning, etc.).
     * @param currentLap Die Runde, in der das Ereignis aufgetreten ist.
     */
    public addSafetyCarEvent(safetyCarType: number, eventType: number, currentLap: number) {
        this.safetyCarEvents.push({ safetyCarType, eventType, lapNumber: currentLap });
        
        const types = ['Keines', 'Full SC', 'VSC', 'Formation Lap'];
        const events = ['Deployed', 'Returning', 'Returned', 'Rennen freigegeben'];
        
        this.addIncident({
            type: 'SAFETY_CAR',
            details: `${types[safetyCarType]} ${events[eventType] || 'Status '+eventType}`,
            lapNum: currentLap
        });
    }

    /**
     * Fügt einen Vorfall (Penalty, Kollision, DNF) zum Protokoll hinzu.
     * Das Log ist auf die letzten 50 Einträge begrenzt, um Speicher zu sparen.
     * 
     * @param incident Daten des Vorfalls ohne Zeitstempel (wird automatisch ergänzt).
     */
    public addIncident(incident: Omit<IncidentEntry, 'timestamp'>) {
        this.incidentLog.push({
            ...incident,
            timestamp: Date.now()
        });
        
        // Begrenzung des Protokolls auf die aktuellsten 50 Ereignisse
        if (this.incidentLog.length > 50) {
            this.incidentLog.shift();
        }
    }

    /**
     * Extrahiert die seit dem letzten Aufruf gesammelten Safety-Car-Events.
     * Leert den internen Buffer, um Doppelsendungen an das Frontend zu vermeiden.
     * 
     * @returns Array der neuen Safety-Car-Ereignisse.
     */
    public fetchAndClearEvents() {
        const events = [...this.safetyCarEvents];
        this.safetyCarEvents = [];
        return events;
    }

    /**
     * Gibt das gesamte chronologische Protokoll der Session zurück.
     * 
     * @returns Array aller geloggten Vorfälle.
     */
    public getIncidentLog(): IncidentEntry[] {
        return this.incidentLog;
    }
}
