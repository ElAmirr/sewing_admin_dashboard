const fs = require('fs');
const path = require('path');

const dataDir = '/home/user/Téléchargements/swisstransfer_4d53fe01-c181-4da5-866b-e8c186cecd32/data';
const targetDate = '2026-03-18.json';
const machines = fs.readdirSync(dataDir).filter(f => f.startsWith('machine_'));

machines.forEach(mDir => {
    const sessionPath = path.join(dataDir, mDir, 'sessions', targetDate);
    if (fs.existsSync(sessionPath)) {
        const sessions = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        sessions.sort((a,b) => new Date(a.started_at) - new Date(b.started_at));
        for (let i = 0; i < sessions.length - 1; i++) {
            const s1 = sessions[i];
            const s2 = sessions[i+1];
            if (new Date(s1.ended_at) > new Date(s2.started_at)) {
                console.log(`[OVERLAP] Machine ${mDir} | Session ${s1.session_id} overlaps with ${s2.session_id}`);
            }
        }
    }
});
