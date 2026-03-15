import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseISO, isValid } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const REPO_ROOT = path.join(__dirname, '..', '..');
const NEWDATA_DIR = path.join(REPO_ROOT, 'backend', 'newdata');
const DATA_DIR = path.join(REPO_ROOT, 'backend', 'data');

/**
 * Robust Business Date logic (UTC+1, 22:00 rollover)
 */
function getBusinessDate(dateInput) {
    if (!dateInput) return null;
    const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
    if (!isValid(date)) return null;

    // Get hour in Tunisia time (UTC+1)
    const tunisiaHour = new Date(date.getTime() + 1 * 60 * 60 * 1000).getUTCHours();
    const shifted = new Date(date.getTime() + 1 * 60 * 60 * 1000);

    if (tunisiaHour >= 22) {
        shifted.setUTCDate(shifted.getUTCDate() + 1);
    }

    const d = String(shifted.getUTCDate()).padStart(2, '0');
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const y = shifted.getUTCFullYear();
    return `${y}-${m}-${d}`;
}

async function mergeLogs() {
    console.log("🚀 Starting March 13th Log Merge...");

    try {
        const machineDirs = (await fs.readdir(NEWDATA_DIR, { withFileTypes: true }))
            .filter(e => e.isDirectory() && e.name.startsWith('machine_'));

        for (const dir of machineDirs) {
            const machineId = dir.name.split('_')[1];
            const sourceFile = path.join(NEWDATA_DIR, dir.name, '2026-03-13.json');

            try {
                const content = await fs.readFile(sourceFile, 'utf-8');
                const sourceLogs = JSON.parse(content);
                console.log(`\n📦 Processing machine ${machineId}: ${sourceLogs.length} logs found in source.`);

                const groups = {}; // dateStr -> [logs]

                // Group source logs by their production date
                for (const log of sourceLogs) {
                    const bizDate = getBusinessDate(log.cycle_start_time);
                    if (!bizDate) continue;
                    if (!groups[bizDate]) groups[bizDate] = [];
                    groups[bizDate].push(log);
                }

                for (const [dateStr, logsToMerge] of Object.entries(groups)) {
                    const targetDir = path.join(DATA_DIR, `machine_${machineId}`);
                    const targetFile = path.join(targetDir, `${dateStr}.json`);

                    await fs.mkdir(targetDir, { recursive: true });

                    let existingLogs = [];
                    try {
                        const existingContent = await fs.readFile(targetFile, 'utf-8');
                        existingLogs = JSON.parse(existingContent);
                    } catch (e) {
                        // File might not exist, starting fresh
                    }

                    const existingIds = new Set(existingLogs.map(l => String(l.log_id)));
                    let addedCount = 0;

                    for (const log of logsToMerge) {
                        if (!existingIds.has(String(log.log_id))) {
                            existingLogs.push({
                                ...log,
                                migrated: true,
                                updated_at: new Date().toISOString()
                            });
                            addedCount++;
                        }
                    }

                    if (addedCount > 0) {
                        // Sort by start time
                        existingLogs.sort((a, b) => new Date(a.cycle_start_time) - new Date(b.cycle_start_time));
                        await fs.writeFile(targetFile, JSON.stringify(existingLogs, null, 2));
                        console.log(`✅ ${dateStr}.json: Integrated ${addedCount} missing logs.`);
                    } else {
                        console.log(`ℹ️ ${dateStr}.json: No new logs to add (already present).`);
                    }
                }

            } catch (e) {
                // Skip if source file doesn't exist for this machine
                if (e.code !== 'ENOENT') console.error(`Error processing ${machineId}:`, e);
            }
        }

        console.log("\n🎉 Merge process finished.");
    } catch (error) {
        console.error("❌ Critical Failure:", error);
    }
}

mergeLogs();
