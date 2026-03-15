import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(REPO_ROOT, 'backend', 'data');

/**
 * Standardizes any date string to YYYY-MM-DDTHH:mm:ss+01:00 (Tunisia GMT+1)
 */
function standardize(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    // Tunisia is UTC + 1
    const tunisiaTime = new Date(date.getTime() + 1 * 60 * 60 * 1000);
    return tunisiaTime.toISOString().replace(/\.\d{3}Z$/, '+01:00');
}

async function refineData() {
    console.log("🚀 Starting Data Refinement & Standardization...");

    try {
        const machineDirs = (await fs.readdir(DATA_DIR, { withFileTypes: true }))
            .filter(e => e.isDirectory() && e.name.startsWith('machine_'));

        for (const dir of machineDirs) {
            const machineId = dir.name.split('_')[1];
            const machineDirPath = path.join(DATA_DIR, dir.name);
            const files = (await fs.readdir(machineDirPath)).filter(f => f.endsWith('.json') && f !== 'sessions');

            for (const file of files) {
                const filePath = path.join(machineDirPath, file);
                try {
                    const content = await fs.readFile(filePath, 'utf-8');
                    let logs = JSON.parse(content);
                    let changed = false;

                    // 1. Regular Standardization for all logs
                    for (let log of logs) {
                        const keysToStandardize = ['operator_press_time', 'cycle_start_time', 'cycle_end_time', 'supervisor_scan_time', 'updated_at'];
                        for (let key of keysToStandardize) {
                            if (log[key]) {
                                const original = log[key];
                                const standardized = standardize(original);
                                if (original !== standardized) {
                                    log[key] = standardized;
                                    changed = true;
                                }
                            }
                        }
                    }

                    // 2. Synthesis for March 14th 2026
                    if (file === '2026-03-14.json' && logs.length > 0) {
                        // Find the operator from the latest log (usually 22:00-00:00 or 00:00-02:00)
                        const lastLog = logs[logs.length - 1];
                        const operatorId = lastLog.operator_id;

                        const requiredCycles = [
                            { start: '2026-03-14T02:00:00+01:00', end: '2026-03-14T04:00:00+01:00' },
                            { start: '2026-03-14T04:00:00+01:00', end: '2026-03-14T06:00:00+01:00' }
                        ];

                        for (const cycle of requiredCycles) {
                            const exists = logs.some(l => l.cycle_start_time === cycle.start);
                            if (!exists) {
                                logs.push({
                                    log_id: Date.now() + Math.random(),
                                    machine_id: parseInt(machineId),
                                    operator_id: operatorId,
                                    color: "NONE",
                                    status: "OK",
                                    operator_press_time: cycle.start.replace('00:00+01:00', '10:00+01:00'), // Approx 10 mins in
                                    cycle_start_time: cycle.start,
                                    cycle_end_time: cycle.end,
                                    supervisor_id: null,
                                    supervisor_badge: null,
                                    supervisor_confirmation: null,
                                    supervisor_scan_time: null,
                                    updated_at: new Date().toISOString().replace(/\.\d{3}Z$/, '+01:00'),
                                    migrated: true,
                                    synthesized: true
                                });
                                changed = true;
                                console.log(`✨ Machine ${machineId}: Synthesized ${cycle.start} cycle.`);
                            }
                        }
                    }

                    if (changed) {
                        // Sort by start time
                        logs.sort((a, b) => new Date(a.cycle_start_time) - new Date(b.cycle_start_time));
                        await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
                    }
                } catch (e) {
                    console.error(`Error processing ${filePath}:`, e);
                }
            }
        }

        console.log("\n🎉 Refinement complete.");
    } catch (error) {
        console.error("❌ Critical Failure:", error);
    }
}

refineData();
