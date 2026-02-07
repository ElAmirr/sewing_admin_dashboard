const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === "development";

// Define paths
const userDataPath = app.getPath("userData");
const settingsPath = path.join(userDataPath, "settings.json");
const backendLogPath = path.join(userDataPath, "backend.log");

// Clear log file on startup
fs.writeFileSync(backendLogPath, `Backend Log Started: ${new Date().toISOString()}\n`, "utf-8");

function logToBackendFile(data) {
    try {
        fs.appendFileSync(backendLogPath, data.toString(), "utf-8");
    } catch (err) {
        console.error("Failed to write to backend log file:", err);
    }
}

/**
 * Load settings from settings.json
 */
function loadSettings() {
    if (fs.existsSync(settingsPath)) {
        try {
            return JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
        } catch (err) {
            console.error("Failed to load settings:", err);
        }
    }
    return { dataPath: path.join(userDataPath, "data") };
}

/**
 * Save settings to settings.json
 */
function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
    } catch (err) {
        console.error("Failed to save settings:", err);
    }
}

let settings = loadSettings();
let dataPath = settings.dataPath;

// In production, backend is likely inside 'resources' folder
const backendPath = isDev
    ? path.join(__dirname, "../backend")
    : path.join(process.resourcesPath, "backend");

const serverScript = isDev
    ? path.join(backendPath, "server.js")
    : path.join(backendPath, "dist/server.bundle.js");

let mainWindow;
let backendProcess;

/**
 * Recursively copies a directory or file.
 */
function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    const isDirectory = stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

/**
 * Initializes the data folder in userData if it doesn't exist.
 * This copies default data from the app package on first run.
 */
function initializeData() {
    if (!isDev) {
        logToBackendFile(`[Main] Initializing data. current dataPath: ${dataPath}\n`);
        const sourceDataPath = path.join(process.resourcesPath, "backend/data");
        // Only initialize if the target dataPath doesn't exist or is empty
        if (fs.existsSync(sourceDataPath) && (!fs.existsSync(dataPath) || fs.readdirSync(dataPath).length === 0)) {
            logToBackendFile(`[Main] Initializing data folder from: ${sourceDataPath} to: ${dataPath}\n`);
            try {
                copyRecursiveSync(sourceDataPath, dataPath);
                logToBackendFile("✅ [Main] Data folder initialized successfully.\n");
            } catch (err) {
                logToBackendFile(`❌ [Main] Failed to initialize data folder: ${err}\n`);
            }
        } else {
            logToBackendFile(`[Main] Skipping initialization. Source exists: ${fs.existsSync(sourceDataPath)}, Target empty: ${!fs.existsSync(dataPath) || fs.readdirSync(dataPath).length === 0}\n`);
        }
    }
}


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js")
        },
        icon: path.join(__dirname, "../frontend/public/forvia_log.png")
    });

    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the built index.html
        mainWindow.loadFile(path.join(__dirname, "../frontend/dist/index.html"));
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

// IPC Handlers
ipcMain.handle("get-settings", () => {
    return loadSettings();
});

ipcMain.handle("save-settings", (event, newSettings) => {
    saveSettings(newSettings);
    settings = newSettings;
    dataPath = settings.dataPath; // Note: This only affects the next backend start
    return { success: true };
});

ipcMain.handle("select-folder", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ["openDirectory"]
    });
    if (result.canceled) {
        return null;
    } else {
        return result.filePaths[0];
    }
});

ipcMain.handle("get-backend-logs", () => {
    if (fs.existsSync(backendLogPath)) {
        return fs.readFileSync(backendLogPath, "utf-8");
    }
    return "Log file not found.";
});

ipcMain.on("restart-app", () => {
    app.relaunch();
    app.exit();
});

function startBackend() {
    logToBackendFile(`[Main] Attempting to start backend...\n`);
    logToBackendFile(`[Main] Backend Path: ${backendPath}\n`);
    logToBackendFile(`[Main] Server Script: ${serverScript}\n`);
    logToBackendFile(`[Main] Exec Path: ${process.execPath}\n`);

    if (!fs.existsSync(serverScript)) {
        logToBackendFile(`❌ [Main] ERROR: Server script NOT found at ${serverScript}\n`);
        return;
    }

    const nodeModulesPath = path.join(backendPath, "node_modules");
    if (!fs.existsSync(nodeModulesPath)) {
        logToBackendFile(`⚠️ [Main] WARNING: node_modules NOT found at ${nodeModulesPath}. Backend might fail to start.\n`);
    } else {
        logToBackendFile(`[Main] node_modules found at ${nodeModulesPath}\n`);
    }

    // Spawn node process for backend
    const env = {
        ...process.env,
        DATA_PATH: dataPath,
        PORT: 3001,
        ELECTRON_RUN_AS_NODE: "1",
        NODE_ENV: isDev ? "development" : "production"
    };

    const isWindows = process.platform === "win32";

    try {
        logToBackendFile(`[Main] Spawning backend with shell: ${isWindows}\n`);

        backendProcess = spawn(process.execPath, [path.resolve(serverScript)], {
            env,
            cwd: path.resolve(backendPath),
            shell: isWindows // Use shell on Windows for better path handling
        });

        backendProcess.on("error", (err) => {
            logToBackendFile(`❌ [Main] BACKEND SPAWN ERROR: ${err.message}\n`);
            logToBackendFile(`[Main] Error details: ${JSON.stringify(err)}\n`);
        });

        backendProcess.stdout.on("data", (data) => {
            logToBackendFile(data);
        });

        backendProcess.stderr.on("data", (data) => {
            logToBackendFile(`ERROR: ${data}`);
        });

        backendProcess.on("close", (code, signal) => {
            logToBackendFile(`[Main] Backend process closed with code ${code} and signal ${signal}\n`);
        });

        backendProcess.on("exit", (code, signal) => {
            logToBackendFile(`[Main] Backend process exited with code ${code} and signal ${signal}\n`);
            if (code !== 0 && code !== null) {
                logToBackendFile(`⚠️ [Main] Backend exited unexpectedly. Check for missing dependencies or port conflicts.\n`);
            }
        });

        if (backendProcess.pid) {
            logToBackendFile(`[Main] Backend process spawned with PID: ${backendProcess.pid}\n`);
        }

    } catch (err) {
        logToBackendFile(`❌ [Main] FATAL: Failed to spawn backend process: ${err.message}\n`);
    }
}

app.whenReady().then(() => {
    initializeData();
    startBackend();

    // Wait 5 seconds for backend to fully start before opening window
    logToBackendFile("[Main] Waiting 5 seconds for backend to initialize...\n");
    setTimeout(() => {
        logToBackendFile("[Main] Creating window now.\n");
        createWindow();
    }, 5000);

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
    if (backendProcess) {
        backendProcess.kill();
    }
});
