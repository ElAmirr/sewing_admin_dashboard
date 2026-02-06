import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

async function migrateFilenames() {
    console.log("🚀 Starting Filename Migration...");

    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const machineDirs = entries.filter(e => e.isDirectory() && e.name.startsWith("machine_"));

        for (const dir of machineDirs) {
            const dirPath = path.join(DATA_DIR, dir.name);
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                // Check if file matches DDMMYYYY.json regex
                // DD = 01-31, MM = 01-12, YYYY = 20xx
                const match = file.match(/^(\d{2})(\d{2})(\d{4})\.json$/);

                if (match) {
                    const [_, day, month, year] = match;
                    const newFilename = `${year}-${month}-${day}.json`;
                    const oldPath = path.join(dirPath, file);
                    const newPath = path.join(dirPath, newFilename);

                    console.log(`Renaming: ${file} -> ${newFilename}`);
                    await fs.rename(oldPath, newPath);
                }
            }
        }
        console.log("✅ Migration complete.");
    } catch (error) {
        console.error("❌ Migration failed:", error);
    }
}

migrateFilenames();
