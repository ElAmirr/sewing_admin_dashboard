const fs = require('fs');
const path = require('path');

const { getRootDataDir } = require('./utils/config');

const DATA_DIR = getRootDataDir();
const SESSION_FILE = path.join(DATA_DIR, 'machine_sessions.json');

const missingData = [
    {
        "operator_id": 26,
        "machine_id": 10,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T07:00:40.107Z",
        "last_seen": "2026-03-05T07:25:27.428Z"
    },
    {
        "operator_id": 2,
        "machine_id": 10,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T05:14:39.191Z",
        "last_seen": "2026-03-05T05:29:57.247Z"
    },
    {
        "operator_id": 28,
        "machine_id": 11,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T01:00:13.224Z",
        "last_seen": "2026-03-05T01:00:13.224Z"
    },
    {
        "operator_id": 1,
        "machine_id": 11,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T05:34:21.035Z",
        "last_seen": "2026-03-05T05:34:21.035Z"
    },
    {
        "operator_id": 12,
        "machine_id": 14,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T01:04:14.224Z",
        "last_seen": "2026-03-05T01:04:14.224Z"
    },
    {
        "operator_id": 18,
        "machine_id": 4,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T05:08:09.384Z",
        "last_seen": "2026-03-05T05:08:09.384Z"
    },
    {
        "operator_id": 11,
        "machine_id": 5,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T01:00:14.224Z",
        "last_seen": "2026-03-05T01:00:14.224Z"
    },
    {
        "operator_id": 19,
        "machine_id": 5,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T09:18:39.953Z",
        "last_seen": "2026-03-05T09:18:39.953Z"
    },
    {
        "operator_id": 16,
        "machine_id": 6,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T01:02:53.671Z",
        "last_seen": "2026-03-05T01:02:53.671Z"
    },
    {
        "operator_id": 27,
        "machine_id": 7,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T05:34:22.035Z",
        "last_seen": "2026-03-05T05:34:22.035Z"
    },
    {
        "operator_id": 22,
        "machine_id": 9,
        "date": "2026-03-05",
        "first_seen": "2026-03-05T05:12:57.471Z",
        "last_seen": "2026-03-05T05:12:57.471Z"
    }
];

function sync() {
    const sessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));

    missingData.forEach(m => {
        sessions.push({
            machine_id: m.machine_id,
            operator_id: m.operator_id,
            started_at: m.first_seen,
            ended_at: m.last_seen,
            business_date: m.date
        });
    });

    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
    console.log(`Added ${missingData.length} missing sessions.`);
}

sync();
