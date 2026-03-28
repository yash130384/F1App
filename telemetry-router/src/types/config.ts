export interface AppConfig {
    leagueId: string;
    url: string;
    port: number;
    intervalMs: number;
    autostart: boolean;
    transmissionMode: 'Live (60Hz)' | 'Balanced (5s)' | 'Results Only (60s)';
    mode?: 'Live Telemetry' | 'Fast Process Recordings' | 'Playback Recording (Legacy)' | 'Settings' | 'Local Recording';
}
