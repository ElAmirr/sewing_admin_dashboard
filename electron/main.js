const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

/**
 * Recursively copies a directory or file.
 */
function copyRecursiveSync(src, dest) {
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
        const sourceDataPath = path.join(process.resourcesPath, "backend/data");
        if (fs.existsSync(sourceDataPath) && !fs.existsSync(dataPath)) {
            console.log("Initializing data folder from:", sourceDataPath);
            try {
                copyRecursiveSync(sourceDataPath, dataPath);
                console.log("✅ Data folder initialized successfully.");
            } catch (err) {
                console.error("❌ Failed to initialize data folder:", err);
            }
        }
    }
}


// Determine if we are in development mode
const isDev = process.env.NODE_ENV === "development";

// Define paths
// In production, backend is likely inside 'resources' folder
const backendPath = isDev
    ? path.join(__dirname, "../backend")
    : path.join(process.resourcesPath, "backend");

const serverScript = path.join(backendPath, "server.js");

// Define Data Path (AppData)
// We want data to persist in User Data folder
const userDataPath = app.getPath("userData");
const dataPath = path.join(userDataPath, "data");

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
    initializeData();
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
