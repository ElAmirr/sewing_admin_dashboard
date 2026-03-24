const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18.json';
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

let totalOk = 0;
let totalDelay = 0;
let totalVirtual = 0;

machines.forEach(mDir => {
    const mPath = path.join(dataDir, mDir);
    const filePath = path.join(mPath, targetDate);
    
    if (fs.existsSync(filePath)) {
        const logs = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        logs.forEach(log => {
            if (getShift(log.cycle_start_time || log.operator_press_time) === 'shift2') {
                if (log.status === 'OK') totalOk++;
                else if (log.status === 'DELAY') totalDelay++;
            }
        });
        
        const sessionPath = path.join(mPath, 'sessions', targetDate);
        if (fs.existsSync(sessionPath)) {
            const sessions = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            sessions.forEach(s => {
                if (getShift(s.started_at) === 'shift2') {
                    totalVirtual += countOverlapWindows(s.started_at, s.ended_at);
                }
            });
        }
    }
});

const totalActual = totalOk + totalDelay;
const totalNone = Math.max(0, totalVirtual - totalActual);
const totalBase = totalVirtual;

console.log(`Total OK: ${totalOk} | Total Delay: ${totalDelay} | Total Virtual: ${totalVirtual}`);
console.log(`OK %: ${((totalOk / totalBase) * 100).toFixed(1)}%`);
console.log(`Delay %: ${((totalDelay / totalBase) * 100).toFixed(1)}%`);
console.log(`NONE %: ${((totalNone / totalBase) * 100).toFixed(1)}%`);
console.log(`Sum: ${(((totalOk + totalDelay + totalNone) / totalBase) * 100).toFixed(1)}%`);
