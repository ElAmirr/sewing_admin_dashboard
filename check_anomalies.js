const fs = require('fs');
const path = require('path');

const dataDir = './backend/data';
const machines = fs.readdirSync(dataDir).filter(f => f.startsWith('machine_'));

function getShift(dateStr) {
    const h = new Date(dateStr).getHours();
    if (h >= 22 || h < 6) return "shift1";
    if (h >= 6 && h < 14) return "shift2";
    if (h >= 14 && h < 22) return "shift3";
    return "unknown";
}

function countOverlapWindows(startStr, endStr) {
    if (!startStr) return 0;
    const s = new Date(startStr);
    const e = endStr ? new Date(endStr) : new Date();
    if (e <= s) return 0;
    let count = 0;
    let current = new Date(s);
    current.setMinutes(0, 0, 0);
    if (current.getHours() % 2 !== 0) {
        current.setHours(current.getHours() - 1);
    }
    while (current < e) {
        const wS = current.getTime();
        const wE = wS + 2 * 60 * 60 * 1000;
        if (Math.max(wS, s.getTime()) < Math.min(wE, e.getTime())) {
            count++;
        }
        current = new Date(wE);
    }
    return count;
}

machines.forEach(mDir => {
    const mPath = path.join(dataDir, mDir);
    const files = fs.readdirSync(mPath).filter(f => f.match(/^\d{4}-\d{2}-\d{2}\.json$/));
    
    files.forEach(f => {
        const filePath = path.join(mPath, f);
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        const sessionPath = path.join(mPath, 'sessions', f);
        if (!fs.existsSync(sessionPath)) return;
        const sessions = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        
        const stats = {}; // date_shift -> {ok, delay, virtual}
        
        logs.forEach(log => {
            const date = f.replace('.json', '');
            const shift = getShift(log.cycle_start_time || log.operator_press_time);
            const key = `${date}_${shift}`;
            if (!stats[key]) stats[key] = { ok: 0, delay: 0, virtual: 0 };
            if (log.status === 'OK') stats[key].ok++;
            else if (log.status === 'DELAY') stats[key].delay++;
        });
        
        sessions.forEach(s => {
            const date = s.business_date || f.replace('.json', '');
            const shift = getShift(s.started_at);
            const key = `${date}_${shift}`;
            if (!stats[key]) stats[key] = { ok: 0, delay: 0, virtual: 0 };
            stats[key].virtual += countOverlapWindows(s.started_at, s.ended_at);
        });
        
        Object.entries(stats).forEach(([key, val]) => {
            const actual = val.ok + val.delay;
            if (actual > val.virtual) {
                console.log(`Anomaly in ${filePath} shift ${key}: Actual(${actual}) > Virtual(${val.virtual})`);
            }
        });
    });
});
