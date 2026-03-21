const taskRepository = require('../repositories/taskRepository');
const Task = require('../models/Task');

class TaskService {
    async getAllTasks(filters = {}) {
        return await taskRepository.findAll(filters);
    }

    async getTaskById(id) {
        const task = await taskRepository.findById(id);
        if (!task) {
            throw new Error(`ไม่พบ task ที่มี ID ${id}`);
        }
        return task;
    }

    async createTask(taskData) {
        const task = new Task(taskData);

        const validation = task.isValid();
        if (!validation.valid) {
            throw new Error(`ข้อมูลไม่ถูกต้อง: ${validation.errors.join(', ')}`);
        }

        if (task.priority === 'HIGH' && !task.description) {
            throw new Error('งานลำดับความสำคัญสูงต้องมีรายละเอียด');
        }

        const createdTask = await taskRepository.create(task);
        
        if (createdTask.priority === 'HIGH') {
            console.log(`🔥 สร้างงานลำดับความสำคัญสูง: ${createdTask.title}`);
        }

        return createdTask;
    }

    async updateTask(id, updates) {
        const existingTask = await this.getTaskById(id);

        if (updates.title !== undefined) {
            const tempTask = new Task({ ...existingTask, ...updates });
            const validation = tempTask.isValid();
            if (!validation.valid) {
                throw new Error(`ข้อมูลไม่ถูกต้อง: ${validation.errors.join(', ')}`);
            }
        }

        if (existingTask.status === 'DONE' && updates.status === 'TODO') {
            throw new Error('ไม่สามารถเปลี่ยนงานที่เสร็จแล้วกลับไปเป็น TODO ได้');
        }

        if (updates.priority === 'HIGH' && !existingTask.description && !updates.description) {
            throw new Error('งานลำดับความสำคัญสูงต้องมีรายละเอียด');
        }

        const updatedTask = await taskRepository.update(id, updates);

        if (updates.status && updates.status !== existingTask.status) {
            console.log(`📝 เปลี่ยนสถานะ task ${id}: ${existingTask.status} → ${updates.status}`);
        }

        return updatedTask;
    }

    async deleteTask(id) {
        const task = await this.getTaskById(id);
        if (task.priority === 'HIGH') {
            console.log(`⚠️ กำลังลบงานลำดับความสำคัญสูง: ${task.title}`);
        }
        return await taskRepository.delete(id);
    }

    async getStatistics() {
        const counts = await taskRepository.countByStatus();
        const allTasks = await taskRepository.findAll();

        return {
            total: allTasks.length,
            byStatus: {
                TODO: counts.TODO || 0,
                IN_PROGRESS: counts.IN_PROGRESS || 0,
                DONE: counts.DONE || 0
            },
            byPriority: {
                LOW: allTasks.filter(t => t.priority === 'LOW').length,
                MEDIUM: allTasks.filter(t => t.priority === 'MEDIUM').length,
                HIGH: allTasks.filter(t => t.priority === 'HIGH').length
            }
        };
    }

    async moveToNextStatus(id) {
        const task = await this.getTaskById(id);
        
        const statusFlow = {
            'TODO': 'IN_PROGRESS',
            'IN_PROGRESS': 'DONE',
            'DONE': 'DONE'
        };

        const nextStatus = statusFlow[task.status];
        
        if (nextStatus === task.status) {
            throw new Error('งานนี้เสร็จสมบูรณ์แล้ว');
        }

        return await this.updateTask(id, { status: nextStatus });
    }
}

module.exports = new TaskService();