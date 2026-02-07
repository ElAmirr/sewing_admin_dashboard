const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    getSettings: () => ipcRenderer.invoke("get-settings"),
    saveSettings: (settings) => ipcRenderer.invoke("save-settings", settings),
    selectFolder: () => ipcRenderer.invoke("select-folder"),
    getBackendLogs: () => ipcRenderer.invoke("get-backend-logs"),
    restartApp: () => ipcRenderer.send("restart-app")
});
