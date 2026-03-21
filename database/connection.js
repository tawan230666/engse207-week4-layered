// database/connection.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ตั้งค่า Path ให้ชี้ไปที่ไฟล์ tasks.db ในโฟลเดอร์ database
const dbPath = path.join(__dirname, 'tasks.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database:', dbPath);
    }
});

// สร้างตารางถ้ายังไม่มี
db.run(
    `CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'TODO',
        priority TEXT DEFAULT 'MEDIUM',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
        if (err) console.error('❌ Error creating table:', err.message);
    }
);

module.exports = db;
setInterval(() => {
    // โค้ดนี้จะทำงานทุกๆ 5 นาที เพื่อหลอกให้ Server ตื่นอยู่ตลอด
}, 1000 * 60 * 5);