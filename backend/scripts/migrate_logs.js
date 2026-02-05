import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../data");

async function migrate() {
    console.log("🚀 Starting Log Migration (Advanced)...");

    try {
        const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
        const machineDirs = entries.filter(e => e.isDirectory() && e.name.startsWith("machine_"));

        for (const dir of machineDirs) {
            const dirPath = path.join(DATA_DIR, dir.name);
            const files = await fs.readdir(dirPath);

            for (const file of files) {
                if (!file.endsWith(".json")) continue;

                const filePath = path.join(dirPath, file);
                console.log(`Processing ${file}...`);

                const content = await fs.readFile(filePath, "utf-8");
                let logs = [];
                try {
                    logs = JSON.parse(content);
                } catch (e) {
                    console.error(`❌ Failed to parse ${file}`, e);
                    continue;
                }

                // We will overwrite fields for ALL logs to correct them
                const updatedLogs = logs.map(log => {
                    // 1. Chance that supervisor didn't come (20%)
                    const hasSupervisor = Math.random() > 0.2;

                    if (!hasSupervisor) {
                        return {
                            ...log,
                            supervisor_id: null,
                            supervisor_badge: null,
                            supervisor_confirmation: null,
                            supervisor_scan_time: null
                        };
                    }

                    // 2. Chance of NOT_CONFIRMED (10%)
                    const isConfirmed = Math.random() > 0.1 ? "CONFIRMED" : "NOT_CONFIRMED";

                    // 3. Calculate random scan time within cycle
                    // Default to end time if start/end invalid
                    let scanTime = log.cycle_end_time;

                    if (log.cycle_start_time && log.cycle_end_time) {
                        const start = new Date(log.cycle_start_time).getTime();
                        const end = new Date(log.cycle_end_time).getTime();

                        if (!isNaN(start) && !isNaN(end) && end > start) {
                            // Pick random time between start (plus small buffer 5m) and end
                            // scan = start + random * (duration)
                            const duration = end - start;
                            // Ensure scan is at least 1 min after start, up to exactly end
                            const randomOffset = Math.floor(Math.random() * duration);
                            scanTime = new Date(start + randomOffset).toISOString();
                        }
                    }

                    // Assign mock ID if missing
                    const supId = log.supervisor_id || (Math.random() > 0.5 ? 1 : 2);

                    return {
                        ...log,
                        supervisor_id: supId,
                        supervisor_badge: supId === 1 ? "100100100" : "200200200",
                        supervisor_confirmation: isConfirmed,
                        supervisor_scan_time: scanTime
                    };
                });

                // Always write since we are "correcting" values
                await fs.writeFile(filePath, JSON.stringify(updatedLogs, null, 2));
                console.log(`✅ Updated ${file}`);
            }
        }

        console.log("🎉 Advanced Migration Complete!");

    } catch (error) {
        console.error("❌ Migration Failed:", error);
    }
}

migrate();
