import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config: any) => ipcRenderer.invoke('save-config', config),
    closeWindow: () => ipcRenderer.send('close-settings')
});
