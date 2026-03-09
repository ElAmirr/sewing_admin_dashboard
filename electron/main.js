const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

// Determine if we are in development mode
const isDev = process.env.NODE_ENV === "development";

// Define paths
// In production, backend is likely inside 'resources' folder
const backendPath = isDev
    ? path.join(__dirname, "../backend")
    : path.join(process.resourcesPath, "backend");

const serverScript = path.join(backendPath, "server.js");

// Define Data Path (AppData)
// We want data to persist in User Data folder or config file
let dataPath;
const fs = require('fs');
const exeDir = isDev ? __dirname : path.dirname(app.getPath("exe"));
const settingsPath = isDev
    ? path.join(__dirname, '../setting.json')
    : path.join(exeDir, 'setting.json');

console.log(`Checking for settings file at: ${settingsPath}`);

try {
    if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, 'utf8');
        const settings = JSON.parse(settingsData);
        if (settings.dataPath) {
            // Resolve relative paths relative to the settings file or exe dir
            dataPath = path.isAbsolute(settings.dataPath)
                ? settings.dataPath
                : path.resolve(isDev ? path.join(__dirname, '..') : exeDir, settings.dataPath);
            console.log(`Using configured data path: ${dataPath}`);
        }
    }
} catch (error) {
    console.error("Error reading setting.json:", error);
}

if (!dataPath) {
    const userDataPath = app.getPath("userData");
    dataPath = path.join(userDataPath, "data");
    console.log(`Using default data path: ${dataPath}`);
}

let mainWindow;
let backendProcess;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
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

function startBackend() {
    console.log("--- Starting Backend ---");
    console.log("Script:", serverScript);
    console.log("CWD:", backendPath);
    console.log("Data:", dataPath);
    console.log("Node Runtime:", process.execPath);

    const env = {
        ...process.env,
        DATA_PATH: dataPath,
        PORT: 3001,
        ELECTRON_RUN_AS_NODE: "1"
    };

    try {
        backendProcess = spawn(process.execPath, [serverScript], {
            env,
            cwd: backendPath,
        });

        backendProcess.stdout.on("data", (data) => {
            console.log(`[Backend STDOUT]: ${data}`);
        });

        backendProcess.stderr.on("data", (data) => {
            console.error(`[Backend STDERR]: ${data}`);
        });

        backendProcess.on("error", (err) => {
            console.error(`[Backend SPAWN ERROR]:`, err);
        });

        backendProcess.on("close", (code) => {
            console.log(`[Backend PROCESS EXIT] code: ${code}`);
        });
    } catch (err) {
        console.error("Failed to spawn backend process:", err);
    }
}

app.whenReady().then(() => {
    startBackend();
    createWindow();

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
