import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppConfig } from './types/config';

const DEFAULT_CONFIG: AppConfig = {
    leagueId: 'MyLeague',
    url: 'https://f1-app-lknx.vercel.app/api/telemetry',
    port: 20777,
    intervalMs: 5000,
    autostart: true,
    transmissionMode: 'Balanced (5s)'
};

export class ConfigManager {
    private configPath: string;
    private currentConfig: AppConfig;

    constructor() {
        const userDataPath = app.getPath('userData');
        this.configPath = path.join(userDataPath, 'config.json');
        this.currentConfig = this.loadConfig();
    }

    private loadConfig(): AppConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const data = fs.readFileSync(this.configPath, 'utf8');
                return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
            }
        } catch (error) {
            console.error('Fehler beim Laden der Konfiguration:', error);
        }
        return { ...DEFAULT_CONFIG };
    }

    public getConfig(): AppConfig {
        return this.currentConfig;
    }

    public setConfig(newConfig: Partial<AppConfig>): void {
        this.currentConfig = { ...this.currentConfig, ...newConfig };
        this.saveConfig();
    }

    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.currentConfig, null, 2));
        } catch (error) {
            console.error('Fehler beim Speichern der Konfiguration:', error);
        }
    }
}
