/**
 * rebuild_sessions.js
 * 
 * Comprehensive script to detect and fill ALL missing sessions in machine_sessions.json.
 * 
 * Logic:
 *   - For every log entry (across all machines, all dates), group by (operator_id, machine_id, business_date)
 *   - A "business_date" is: hour >= 21 → next calendar day (shift1), else same day
 *   - For each unique group, check if a matching session exists in machine_sessions.json
 *   - If not, create a synthetic session using the first/last log timestamps as started_at/ended_at
 *   - Append all missing sessions with new unique session_ids
 */

const fs = require('fs');
const path = require('path');

const { getRootDataDir } = require('./utils/config');

const DATA_DIR = getRootDataDir();
const SESSION_FILE = path.join(DATA_DIR, 'machine_sessions.json');

function getBusinessDate(isoString) {
    if (!isoString) return null;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    // Shift 1 starts at 21:00 → counted as next calendar day
    const h = d.getHours();
    const target = h >= 21 ? new Date(d.getTime() + 24 * 60 * 60 * 1000) : d;
    const y = target.getFullYear();
    const m = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function main() {
    // --- Load existing sessions ---
    const sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    let maxId = sessions.reduce((m, s) => Math.max(m, s.session_id || 0), 0);

    // Index existing sessions as: "operatorId_machineId_businessDate"
    const existingKeys = new Set();
    sessions.forEach(s => {
        const bd = s.business_date || getBusinessDate(s.started_at);
        if (bd) existingKeys.add(`${s.operator_id}_${s.machine_id}_${bd}`);
    });

    // --- Scan all machine log files ---
    // Groups: key → { machine_id, operator_id, business_date, minTime, maxTime }
    const groups = {};

    const machineDirs = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('machine_') && fs.statSync(path.join(DATA_DIR, f)).isDirectory());

    for (const dir of machineDirs) {
        const machineId = parseInt(dir.replace('machine_', ''), 10);
        const dirPath = path.join(DATA_DIR, dir);
        const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

        for (const file of files) {
            let logs;
            try {
                logs = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf8'));
            } catch (e) { continue; }

            for (const log of logs) {
                const opId = log.operator_id;
                if (!opId) continue;

                const timeRef = log.operator_press_time || log.cycle_start_time;
                if (!timeRef) continue;

                const bd = log.business_date || getBusinessDate(timeRef);
                if (!bd) continue;

                const key = `${opId}_${machineId}_${bd}`;
                if (!groups[key]) {
                    groups[key] = {
                        operator_id: opId,
                        machine_id: machineId,
                        business_date: bd,
                        minTime: timeRef,
                        maxTime: timeRef,
                        badge: log.badge || null
                    };
                } else {
                    // Track earliest and latest timestamps for this session
                    if (timeRef < groups[key].minTime) groups[key].minTime = timeRef;
                    if (timeRef > groups[key].maxTime) groups[key].maxTime = timeRef;
                }
            }
        }
    }

    // --- Identify missing sessions ---
    const missing = [];
    for (const [key, g] of Object.entries(groups)) {
        if (!existingKeys.has(key)) {
            missing.push(g);
        }
    }

    console.log(`Found ${Object.keys(groups).length} unique operator-machine-date groups in logs`);
    console.log(`Existing sessions: ${sessions.length}`);
    console.log(`Missing sessions to add: ${missing.length}`);

    if (missing.length === 0) {
        console.log('✅ No missing sessions — machine_sessions.json is complete!');
        return;
    }

    // Log what we're adding
    missing.forEach(m => {
        console.log(`  + Op=${m.operator_id} Machine=${m.machine_id} Date=${m.business_date} [${m.minTime} → ${m.maxTime}]`);
    });

    // --- Append missing sessions ---
    missing.forEach(m => {
        maxId++;
        sessions.push({
            session_id: maxId,
            machine_id: m.machine_id,
            operator_id: m.operator_id,
            badge: m.badge,
            started_at: m.minTime,
            last_heartbeat: m.maxTime,
            ended_at: m.maxTime,
            business_date: m.business_date
        });
    });

    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
    console.log(`\n✅ Done! machine_sessions.json now has ${sessions.length} sessions.`);
}

main();
