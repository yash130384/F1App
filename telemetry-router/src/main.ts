import { app, Tray, Menu, nativeImage, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import isDev from 'electron-is-dev';
import AutoLaunch from 'auto-launch';
import { ConfigManager } from './config';
import { startUdpListener } from './udpListener';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TelemetryApp {
    private tray: Tray | null = null;
    private configManager: ConfigManager;
    private autoLauncher: AutoLaunch;
    private settingsWindow: BrowserWindow | null = null;

    private getIcon(name: string) {
        // use __dirname to be absolute relative to the source file
        const iconPath = path.resolve(__dirname, '..', 'assets', `${name}.png`);
        if (fs.existsSync(iconPath)) {
            const icon = nativeImage.createFromPath(iconPath);
            return icon.resize({ width: 16, height: 16 });
        }
        console.error('Icon not found at:', iconPath);
        return nativeImage.createEmpty();
    }

    constructor() {
        this.configManager = new ConfigManager();
        this.autoLauncher = new AutoLaunch({
            name: 'F1 Telemetry Router',
            path: app.getPath('exe'),
        });

        this.initApp();
    }

    private initApp() {
        app.whenReady().then(() => {
            this.createTray();
            this.startServices();
            this.handleAutoStart();
        });

        app.on('window-all-closed', () => {
            // Keep app running in tray
        });

        ipcMain.handle('get-config', () => this.configManager.getConfig());
        ipcMain.handle('save-config', (_, newConfig) => {
            // Map 'url' from 'apiUrl' if UI sends it that way
            const actualConfig = { ...newConfig };
            if (newConfig.apiUrl) {
                actualConfig.url = newConfig.apiUrl;
            }
            this.configManager.setConfig(actualConfig);
            this.handleAutoStart();
            return { success: true };
        });

        ipcMain.on('close-settings', () => {
            if (this.settingsWindow) {
                this.settingsWindow.close();
            }
        });
    }

    private createTray() {
        this.tray = new Tray(this.getIcon('icon_idle'));
        this.updateTrayMenu('Standby (Warte auf Daten...)');
        this.tray.setToolTip('F1 Telemetry Router');
    }

    private updateTrayMenu(statusText: string) {
        const contextMenu = Menu.buildFromTemplate([
            { label: `Status: ${statusText}`, enabled: false },
            { type: 'separator' },
            { label: 'Settings', click: () => this.openSettings() },
            { label: 'Autostart aktivieren', type: 'checkbox', checked: this.configManager.getConfig().autostart, click: (item) => this.toggleAutoStart(item.checked) },
            { type: 'separator' },
            { label: 'Beenden', click: () => app.quit() }
        ]);
        this.tray?.setContextMenu(contextMenu);
    }

    private openSettings() {
        if (this.settingsWindow) {
            this.settingsWindow.focus();
            return;
        }

        const uiPath = path.resolve(__dirname, 'ui');
        const preloadPath = path.join(uiPath, 'preload.cjs');
        
        console.log('Opening settings UI from:', uiPath);
        console.log('Using preload at:', preloadPath);

        this.settingsWindow = new BrowserWindow({
            width: 800,
            height: 600,
            title: 'F1 Telemetry Router Settings',
            webPreferences: {
                preload: preloadPath,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false // needed for ts-node/tsx interaction sometimes
            },
            backgroundColor: '#111111',
            autoHideMenuBar: true
        });

        this.settingsWindow.loadFile(path.join(uiPath, 'index.html'));
        
        this.settingsWindow.on('closed', () => {
            this.settingsWindow = null;
        });
    }

    private startServices() {
        const config = this.configManager.getConfig();
        console.log('Starte UDP-Listener auf Port:', config.port);
        
        try {
            startUdpListener(config, (status) => {
                this.updateStatus(status.isRecording, status.trackName);
            });
        } catch (error) {
            console.error('Fehler beim Starten des UDP-Listeners:', error);
        }
    }

    private async handleAutoStart() {
        const isEnabled = await this.autoLauncher.isEnabled();
        const shouldBeEnabled = this.configManager.getConfig().autostart;

        if (shouldBeEnabled && !isEnabled) {
            this.autoLauncher.enable();
        } else if (!shouldBeEnabled && isEnabled) {
            this.autoLauncher.disable();
        }
    }

    private toggleAutoStart(checked: boolean) {
        this.configManager.setConfig({ autostart: checked });
        this.handleAutoStart();
    }

    // Hilfsmethode für den UDP-Status
    public updateStatus(isRecording: boolean, trackName?: string, sessionType?: string) {
        const statusText = isRecording 
            ? `AKTIV: ${trackName || 'Unbekannt'} (${sessionType || 'Session'})` 
            : 'Standby - Warte auf UDP Daten';
        
        this.updateTrayMenu(statusText);
        
        // Farbe ändern (Grün wenn aktiv, Grau wenn Standby)
        if (isRecording) {
            this.tray?.setToolTip(`F1 Router: ${trackName} - ${sessionType}`);
            this.tray?.setImage(this.getIcon('icon_active'));
        } else {
            this.tray?.setToolTip('F1 Router: Standby');
            this.tray?.setImage(this.getIcon('icon_idle'));
        }
    }
}

// Singleton Instanz
const telemetryApp = new TelemetryApp();
export default telemetryApp;
