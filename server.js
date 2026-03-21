// server.js (ฉบับ Layered ของแท้ + แก้ให้เข้าจาก Windows ได้)
require('dotenv').config();
const express = require('express');
const path = require('path');

// Import Layers
const taskController = require('./src/controllers/taskController');
const database = require('./database/connection');
const errorHandler = require('./src/middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // เพิ่มตัวแปรนี้ เพื่อให้รับ connection จากข้างนอกได้

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Layered Architecture API is Ready!' });
});

app.get('/api/tasks', taskController.getAllTasks);
app.get('/api/tasks/:id', taskController.getTaskById);
app.post('/api/tasks', taskController.createTask);
app.put('/api/tasks/:id', taskController.updateTask);
app.delete('/api/tasks/:id', taskController.deleteTask);

// Frontend Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error Handler (ต้องอยู่ท้ายสุด)
app.use(errorHandler);

// Start Server (แก้ไขตรงนี้)
app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`🌐 External Access: http://192.168.56.101:${PORT}`); // เพิ่มบรรทัดนี้ให้คลิกง่ายๆ
    console.log('✅ Architecture: Layered (Correct Version)');
});