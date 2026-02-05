import { db } from './config/db.js';

(async function test() {
  try {
    const [rows] = await db.query('SELECT 1 AS ok');
    console.log('DB OK:', rows);
    process.exit(0);
  } catch (err) {
    console.error('DB ERROR:', err.message || err);
    process.exit(2);
  }
})();
