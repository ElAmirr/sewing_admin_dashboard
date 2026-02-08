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
const exeDir = path.dirname(app.getPath("exe")); // Directory of the executable
const configPath = path.join(exeDir, 'config.json');

try {
    if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configData);
        if (config.dataPath) {
            dataPath = config.dataPath;
            console.log(`Using configured data path: ${dataPath}`);
        }
    }
} catch (error) {
    console.error("Error reading config.json:", error);
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
    console.log("Starting backend from:", serverScript);
    console.log("Data Path:", dataPath);

    // Spawn node process for backend
    // We pass DATA_PATH environment variable
    // In production, we use the Electron executable as the node runtime
    const env = {
        ...process.env,
        DATA_PATH: dataPath,
        PORT: 3001,
        ELECTRON_RUN_AS_NODE: "1"
    };

    backendProcess = spawn(process.execPath, [serverScript], {
        env,
        cwd: backendPath,
    });

    backendProcess.stdout.on("data", (data) => {
        console.log(`Backend stdout: ${data}`);
    });

    backendProcess.stderr.on("data", (data) => {
        console.error(`Backend stderr: ${data}`);
    });

    backendProcess.on("close", (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
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
