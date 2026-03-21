// src/controllers/taskController.js
const db = require('../../database/connection'); // ตรวจสอบ path database ให้ถูกนะครับ

// ดึงงานทั้งหมด
exports.getAllTasks = (req, res) => {
    const sql = `SELECT * FROM tasks ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching tasks:', err.message);
            return res.status(500).json({ error: 'Failed to fetch tasks' });
        }
        res.json({ tasks: rows });
    });
};

// ดึงงานตาม ID
exports.getTaskById = (req, res) => {
    const { id } = req.params;
    const sql = `SELECT * FROM tasks WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to fetch task' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ task: row });
    });
};

// สร้างงานใหม่
exports.createTask = (req, res) => {
    const { title, description, priority } = req.body;
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title is required' });
    }

    const sql = `INSERT INTO tasks (title, description, status, priority) VALUES (?, ?, 'TODO', ?)`;
    const values = [title.trim(), description ? description.trim() : '', priority || 'MEDIUM'];

    db.run(sql, values, function (err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to create task' });
        }
        // ดึงงานที่เพิ่งสร้างส่งกลับไป
        db.get(`SELECT * FROM tasks WHERE id = ?`, [this.lastID], (err2, row) => {
            if (err2) return res.status(500).json({ error: 'Task created but failed to fetch' });
            res.status(201).json({ task: row });
        });
    });
};

// อัปเดตงาน
exports.updateTask = (req, res) => {
    const { id } = req.params;
    const { title, description, status, priority } = req.body;
    
    // Logic การสร้าง SQL Update แบบ Dynamic
    let updates = [];
    let values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    updates.push('updated_at = CURRENT_TIMESTAMP');
    const sql = `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`;
    values.push(id);

    db.run(sql, values, function (err) {
        if (err) return res.status(500).json({ error: 'Failed to update task' });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
        
        db.get(`SELECT * FROM tasks WHERE id = ?`, [id], (err2, row) => {
            res.json({ task: row });
        });
    });
};

// ลบงาน
exports.deleteTask = (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM tasks WHERE id = ?`, [id], function (err) {
        if (err) return res.status(500).json({ error: 'Failed to delete task' });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found' });
        res.json({ success: true });
    });
};