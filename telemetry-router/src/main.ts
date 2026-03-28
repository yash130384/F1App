import { app, Tray, Menu, nativeImage, ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import isDev from 'electron-is-dev';
import AutoLaunch from 'auto-launch';
import { ConfigManager } from './config';
import { startUdpListener } from './udpListener';

class TelemetryApp {
    private tray: Tray | null = null;
    private configManager: ConfigManager;
    private autoLauncher: AutoLaunch;
    private settingsWindow: BrowserWindow | null = null;

    // Einfache farbige Icons als Base64 (16x16 Pixel)
    private iconIdle = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABMSURBVHgB7ZJBCsAwCAT9/6f7gaLQS8FCH8p6McYSu8Ym0fX0vAn67p4A8Id9AnatS9oK/AbcAhS9CggKKCAooICggAKCAv7iAnw9LgF0l96K9B60tAAAAABJRU5ErkJggg==');
    private iconActive = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAABMSURBVHgB7ZJBCsAwCAT9/6f7gaLQS8FCH8p6McYSu8Ym0fX0vAn67p4A8Id9AnatS9oK/AbcAhS9CggKKCAooICggAKCAv7iAnw9LgFv29+KzO68HAAAAABJRU5ErkJggg==');
    // Note: These are base64 placeholders. In a real build, we'd use themed PNG files.

    constructor() {
        this.configManager = new ConfigManager();
        this.autoLauncher = new AutoLaunch({
            name: 'F1 Telemetry Router',
            path: app.getPath('exe'),
        });

        this.initApp();
    }

    private initApp() {
        // App Lifecycle
        app.whenReady().then(() => {
            this.createTray();
            this.startServices();
            this.handleAutoStart();
        });

        app.on('window-all-closed', () => {
            // Verhindert das Beenden der App, wenn Fenster geschlossen werden (Tray-Modus)
            if (process.platform !== 'darwin') {
                // Auf Windows/Linux bleiben wir im Tray
            }
        });

        // IPC Handlers for Settings GUI
        ipcMain.handle('get-config', () => this.configManager.getConfig());
        ipcMain.handle('save-config', (_, newConfig) => {
            this.configManager.setConfig(newConfig);
            this.handleAutoStart(); // Update Autostart if changed
            return { success: true };
        });

        ipcMain.on('close-settings', () => {
            if (this.settingsWindow) {
                this.settingsWindow.close();
            }
        });
    }

    private createTray() {
        this.tray = new Tray(this.iconIdle);
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

        this.settingsWindow = new BrowserWindow({
            width: 800,
            height: 600,
            title: 'F1 Telemetry Router Settings',
            webPreferences: {
                preload: path.join(__dirname, 'ui', 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            },
            backgroundColor: '#111111',
            // icon: path.join(__dirname, 'assets', 'icon.png')
        });

        this.settingsWindow.loadFile(path.join(__dirname, 'ui', 'index.html'));
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
            this.tray?.setImage(this.iconActive);
        } else {
            this.tray?.setToolTip('F1 Router: Standby');
            this.tray?.setImage(this.iconIdle);
        }
    }
}

// Singleton Instanz
const telemetryApp = new TelemetryApp();
export default telemetryApp;
