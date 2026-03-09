import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In a typical setup, setting.json is at the project root
// backend is at project_root/backend
// so setting.json is at ../setting.json relative to backend/config
const settingsPath = path.resolve(__dirname, "../../setting.json");

let dataPathFromSettings = null;

try {
    if (fs.existsSync(settingsPath)) {
        const settingsData = fs.readFileSync(settingsPath, "utf8");
        const settings = JSON.parse(settingsData);
        if (settings.dataPath) {
            // Resolve relative paths relative to the project root (where setting.json lives)
            dataPathFromSettings = path.isAbsolute(settings.dataPath)
                ? settings.dataPath
                : path.resolve(path.dirname(settingsPath), settings.dataPath);
        }
    }
} catch (error) {
    console.error("error reading setting.json in backend:", error);
}

export const DATA_DIR = process.env.DATA_PATH || dataPathFromSettings || path.resolve("data");

console.log(`[Backend Config] Resolved DATA_DIR: ${DATA_DIR}`);
