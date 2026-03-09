const fs = require('fs');
const path = require('path');

const { getRootDataDir } = require('./utils/config');

const DATA_DIR = getRootDataDir();
const SESSION_FILE = path.join(DATA_DIR, 'machine_sessions.json');
const MISSING_FILE = './scripts/missing_sessions.json';

function sync() {
    const sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    const missing = JSON.parse(fs.readFileSync(MISSING_FILE, 'utf8'));

    let maxId = 0;
    sessions.forEach(s => {
        if (s.session_id > maxId) maxId = s.session_id;
    });

    missing.forEach(m => {
        maxId++;
        sessions.push({
            session_id: maxId,
            machine_id: m.machine_id,
            operator_id: m.operator_id,
            started_at: m.started_at,
            last_heartbeat: m.started_at,
            ended_at: m.ended_at,
            business_date: m.business_date
        });
    });

    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
    console.log(`Successfully merged ${missing.length} missing sessions. Total sessions now: ${sessions.length}`);
}

sync();
