// ---- State + DOM refs ----
let allTasks = [];
let currentSearch = '';

const addTaskForm = document.getElementById('addTaskForm');
const titleInput = document.getElementById('taskTitle');
const descInput = document.getElementById('taskDescription');
const prioritySelect = document.getElementById('taskPriority');
const statusFilter = document.getElementById('statusFilter');
const linkInput = document.getElementById('taskLink');
const assigneesInput = document.getElementById('taskAssignees');

const todoTasks = document.getElementById('todoTasks');
const progressTasks = document.getElementById('progressTasks');
const doneTasks = document.getElementById('doneTasks');

const todoCount = document.getElementById('todoCount');
const progressCount = document.getElementById('progressCount');
const doneCount = document.getElementById('doneCount');

// ---- Utilities ----
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (c) {
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('th-TH'); // ปรับเป็นเวลาไทย
}

function showLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'flex';
}
function hideLoading() {
    const el = document.getElementById('loadingOverlay');
    if (el) el.style.display = 'none';
}

// ---- Ready state (client-side, persisted in localStorage) ----
function isTaskReady(id) {
    try {
        return localStorage.getItem(`task_ready_${id}`) === '1';
    } catch (e) {
        return false;
    }
}

function setTaskReady(id, ready) {
    try {
        if (ready) localStorage.setItem(`task_ready_${id}`, '1');
        else localStorage.removeItem(`task_ready_${id}`);
    } catch (e) {
        console.warn('Could not persist ready state', e);
    }
}

let _lastReadyToastAt = 0;
let _readyAlertShown = false;

function renderReadyIndicator() {
    const header = document.querySelector('header');
    if (!header) return;
    const inprog = allTasks.filter(t => t.status === 'IN_PROGRESS');
    const readyCount = inprog.filter(t => isTaskReady(t.id)).length;

    let el = document.getElementById('readyIndicator');
    if (!el) {
        el = document.createElement('div');
        el.id = 'readyIndicator';
        el.style.marginTop = '8px';
        el.style.fontWeight = '600';
        el.style.color = 'rgba(255,255,255,0.95)';
        header.appendChild(el);
    }

    if (inprog.length === 0) {
        el.textContent = 'ไม่มีงานในสถานะ In Progress';
        return;
    }

    el.textContent = `In Progress ready: ${readyCount} / ${inprog.length}`;

    // notify when all in-progress tasks are ready
    if (inprog.length > 0 && readyCount === inprog.length) {
        const now = Date.now();
        if (now - _lastReadyToastAt > 10000) {
            _lastReadyToastAt = now;
            showToast('🚀 ทุกงานใน In Progress พร้อมส่งแล้ว!');
        }
    }
}

function renderHeaderSummary() {
    const header = document.querySelector('header');
    if (!header) return;
    let summary = document.getElementById('headerSummary');
    const counts = {
        TODO: allTasks.filter(t => t.status === 'TODO').length,
        IN_PROGRESS: allTasks.filter(t => t.status === 'IN_PROGRESS').length,
        DONE: allTasks.filter(t => t.status === 'DONE').length
    };
    if (!summary) {
        summary = document.createElement('div');
        summary.id = 'headerSummary';
        summary.style.marginTop = '12px';
        summary.style.display = 'flex';
        summary.style.gap = '12px';
        summary.style.justifyContent = 'center';
        header.appendChild(summary);
    }
    summary.innerHTML = `
        <div class="hdr-badge hdr-todo">📝 ${counts.TODO}</div>
        <div class="hdr-badge hdr-progress">🔄 ${counts.IN_PROGRESS}</div>
        <div class="hdr-badge hdr-done">✅ ${counts.DONE}</div>
    `;
}

function showToast(message, timeout = 4000) {
    const t = document.createElement('div');
    t.className = 'app-toast';
    t.textContent = message;
    Object.assign(t.style, {
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        background: '#333',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        zIndex: 2000,
        fontWeight: 600,
        borderLeft: '5px solid #00d2d3'
    });
    document.body.appendChild(t);
    setTimeout(() => {
        t.style.transition = 'opacity 0.4s';
        t.style.opacity = '0';
    }, timeout - 400);
    setTimeout(() => t.remove(), timeout);
}

// ---- API ----
// (ใช้ Relative Path เพื่อให้ทำงานได้ทั้ง Localhost และ IP)
async function fetchTasks() {
    try {
        showLoading();
        const res = await fetch('/api/tasks');
        const data = await res.json();
        allTasks = data.tasks || [];
        renderTasks();
    } catch (err) {
        console.error(err);
        showToast('❌ ไม่สามารถโหลดข้อมูลได้');
    } finally {
        hideLoading();
    }
}

async function createTaskAPI(taskData) {
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
    });
    if (!res.ok) throw new Error('Failed to create task');
    return res.json();
}

async function updateTaskStatusAPI(id, status) {
    const res = await fetch(`/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
}

async function deleteTaskAPI(id) {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete task');
    return res.json();
}

// ---- Rendering ----
function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
}

function renderTasks() {
    const filter = statusFilter ? statusFilter.value : 'ALL';

    clearChildren(todoTasks);
    clearChildren(progressTasks);
    clearChildren(doneTasks);

    const searchTerm = currentSearch ? currentSearch.trim().toLowerCase() : '';
    const filtered = allTasks.filter(t => {
        const statusMatch = filter === 'ALL' ? true : t.status === filter;
        if (!statusMatch) return false;
        if (!searchTerm) return true;
        const inTitle = t.title && t.title.toLowerCase().includes(searchTerm);
        const inDesc = t.description && t.description.toLowerCase().includes(searchTerm);
        return inTitle || inDesc;
    });

    const todo = filtered.filter(t => t.status === 'TODO');
    const inprog = filtered.filter(t => t.status === 'IN_PROGRESS');
    const done = filtered.filter(t => t.status === 'DONE');

    if (todo.length === 0) todoTasks.innerHTML = `<div class="empty-placeholder">${searchTerm ? 'ไม่พบงานที่ค้นหา' : 'ว่างเปล่า'}</div>`;
    else todo.forEach(t => todoTasks.appendChild(createTaskCard(t)));

    if (inprog.length === 0) progressTasks.innerHTML = `<div class="empty-placeholder">${searchTerm ? 'ไม่พบงานที่ค้นหา' : 'ว่างเปล่า'}</div>`;
    else inprog.forEach(t => progressTasks.appendChild(createTaskCard(t)));

    if (done.length === 0) doneTasks.innerHTML = `<div class="empty-placeholder">${searchTerm ? 'ไม่พบงานที่ค้นหา' : 'ว่างเปล่า'}</div>`;
    else done.forEach(t => doneTasks.appendChild(createTaskCard(t)));

    todoCount.textContent = todo.length;
    progressCount.textContent = inprog.length;
    doneCount.textContent = done.length;

    setupDragAndDrop();
    renderReadyIndicator();
    renderHeaderSummary();
}

function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = 'task-card';
    card.draggable = true;
    card.dataset.taskId = task.id;

    // เพิ่ม Class พิเศษถ้างานนี้ "พร้อมส่ง" (เอาไว้แต่ง CSS ได้)
    if (task.status === 'IN_PROGRESS' && isTaskReady(task.id)) {
        card.classList.add('task-ready-highlight');
    }

    if (task.status === 'DONE') {
        card.draggable = false;
        card.classList.add('done-locked');
    }

    const title = document.createElement('div');
    title.className = 'task-header';
    title.innerHTML = `
        <div class="task-title">${escapeHtml(task.title)}</div>
        <span class="priority-badge priority-${(task.priority||'MEDIUM').toLowerCase()}">${escapeHtml(task.priority||'MEDIUM')}</span>
    `;

    const desc = document.createElement('div');
    desc.className = 'task-description';
    desc.textContent = task.description || '';

    // Link display
    if (task.link) {
        const linkEl = document.createElement('div');
        linkEl.className = 'task-link';
        linkEl.innerHTML = `<a href="${task.link}" target="_blank">🔗 Link</a>`;
        card.appendChild(linkEl);
    }

    const meta = document.createElement('div');
    meta.className = 'task-meta';
    meta.textContent = `สร้างเมื่อ: ${formatDate(task.created_at)}`;

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    // Assignees display
    if (task.assignees) {
        const assWrap = document.createElement('div');
        assWrap.className = 'assignees-wrap';
        assWrap.style.display = 'flex';
        assWrap.style.gap = '4px';
        assWrap.style.marginBottom = '8px';
        
        let list = task.assignees;
        if (typeof list === 'string') {
            try { list = JSON.parse(list); } catch (e) { list = list.split(',').map(s=>s.trim()).filter(Boolean); }
        }
        
        (list || []).slice(0,3).forEach(name => {
            const av = document.createElement('span');
            av.className = 'badge bg-info text-dark';
            av.style.fontSize = '10px';
            av.style.marginRight = '2px';
            av.textContent = name;
            assWrap.appendChild(av);
        });
        card.appendChild(assWrap);
    }

    // Buttons
    if (task.status === 'TODO') {
        const btn = document.createElement('button');
        btn.className = 'btn btn-secondary btn-sm';
        btn.textContent = 'เริ่มทำ →';
        btn.onclick = () => window.updateTaskStatus(task.id, 'IN_PROGRESS');
        actions.appendChild(btn);
    } else if (task.status === 'IN_PROGRESS') {
        const readyWrap = document.createElement('div');
        readyWrap.style.display = 'flex';
        readyWrap.style.alignItems = 'center';
        readyWrap.style.gap = '5px';

        const readyCheckbox = document.createElement('input');
        readyCheckbox.type = 'checkbox';
        readyCheckbox.checked = isTaskReady(task.id);
        readyCheckbox.id = `ready_chk_${task.id}`;
        
        readyCheckbox.onchange = (e) => {
            setTaskReady(task.id, e.target.checked);
            // Re-render เฉพาะ Card นี้เพื่อเปลี่ยนสี หรือ Re-render ทั้งหมดก็ได้
            renderTasks(); 
        };

        const readyLabel = document.createElement('label');
        readyLabel.setAttribute('for', `ready_chk_${task.id}`);
        readyLabel.textContent = 'พร้อมส่ง';
        readyLabel.style.fontSize = '12px';
        readyLabel.style.cursor = 'pointer';

        readyWrap.appendChild(readyCheckbox);
        readyWrap.appendChild(readyLabel);
        actions.appendChild(readyWrap);

        const btn = document.createElement('button');
        btn.className = 'btn btn-success btn-sm';
        btn.textContent = 'เสร็จสิ้น →';
        if (isTaskReady(task.id)) {
            btn.onclick = () => window.updateTaskStatus(task.id, 'DONE');
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
        actions.appendChild(btn);
    }

    const del = document.createElement('button');
    del.className = 'btn btn-danger btn-sm';
    del.innerHTML = '🗑️';
    del.onclick = () => window.deleteTask(task.id);
    actions.appendChild(del);

    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    card.appendChild(actions);

    // Drag event
    card.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('taskId', task.id);
        card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
    });

    // Click to view detail
    card.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) return;
        openTaskModal(task);
    });

    return card;
}

// ---- Drag and Drop (Fixed) ----
function setupDragAndDrop() {
    const columns = [todoTasks, progressTasks, doneTasks];
    const statusMap = {
        'todoTasks': 'TODO',
        'progressTasks': 'IN_PROGRESS',
        'doneTasks': 'DONE'
    };

    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            const taskId = e.dataTransfer.getData('taskId');
            const newStatus = statusMap[column.id];
            
            if (taskId && newStatus) {
                const taskObj = allTasks.find(t => String(t.id) === String(taskId));
                
                // ห้ามย้ายงานที่เสร็จแล้ว
                if (taskObj && taskObj.status === 'DONE') {
                    showToast('⛔ งานที่เสร็จแล้วแก้ไขไม่ได้');
                    return;
                }

                // ห้ามย้ายไป Done ถ้ายังไม่พร้อม
                if (taskObj && taskObj.status === 'IN_PROGRESS' && newStatus === 'DONE' && !isTaskReady(taskId)) {
                    showToast('⚠️ ต้องติ๊ก "พร้อมส่ง" ก่อนย้ายไป Done');
                    return;
                }

                // ใช้ window.updateTaskStatus แทนการเรียก API ตรงๆ 
                // เพื่อให้ Logic การเคลียร์ Flag ทำงานเหมือนกันกับการกดปุ่ม
                await window.updateTaskStatus(taskId, newStatus);
            }
        });
    });
}

// ---- Global Helpers ----
window.updateTaskStatus = async function(id, status) {
    try {
        showLoading();
        // ถ้าสถานะเปลี่ยน ให้เคลียร์ค่า Ready ทิ้งเสมอ เพื่อเริ่ม Flow ใหม่
        if (status !== 'IN_PROGRESS') {
            setTaskReady(id, false);
        }
        
        await updateTaskStatusAPI(id, status);
        await fetchTasks();
    } catch (err) {
        console.error(err);
        showToast('❌ อัปเดตสถานะไม่สำเร็จ');
    } finally {
        hideLoading();
    }
};

window.deleteTask = async function(id) {
    if (!confirm('ต้องการลบงานนี้ใช่ไหม?')) return;
    try {
        showLoading();
        await deleteTaskAPI(id);
        await fetchTasks();
        showToast('🗑️ ลบงานเรียบร้อย');
    } catch (err) {
        console.error(err);
        showToast('❌ ลบงานไม่สำเร็จ');
    } finally {
        hideLoading();
    }
};

// ---- Modal & Init ----
function openTaskModal(task) {
    closeTaskModal();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'taskModalOverlay';
    
    // ... (ส่วน Modal HTML เหมือนเดิม แต่ปรับให้สวยขึ้นได้) ...
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-header"><h3>${escapeHtml(task.title)}</h3></div>
        <div class="modal-body">
            <p><strong>รายละเอียด:</strong> ${escapeHtml(task.description || '-')}</p>
            <p><strong>ผู้รับผิดชอบ:</strong> ${task.assignees ? escapeHtml(String(task.assignees)) : '-'}</p>
            <p><strong>สถานะ:</strong> <span class="badge badge-${task.status}">${task.status}</span></p>
        </div>
        <div class="modal-actions">
            <button class="btn btn-secondary" onclick="closeTaskModal()">ปิดหน้าต่าง</button>
        </div>
    `;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    overlay.onclick = (e) => { if(e.target === overlay) closeTaskModal(); };
}

function closeTaskModal() {
    const el = document.getElementById('taskModalOverlay');
    if (el) el.remove();
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    fetchTasks();
    
    // Add Task Event
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = titleInput.value.trim();
            if (!title) return alert('กรุณาใส่งาน');

            const payload = {
                title,
                description: descInput.value.trim(),
                priority: prioritySelect.value,
                link: linkInput ? linkInput.value.trim() : '',
                assignees: assigneesInput ? assigneesInput.value.split(',').map(s=>s.trim()).filter(Boolean) : []
            };

            try {
                showLoading();
                await createTaskAPI(payload);
                addTaskForm.reset();
                
                // Clear Search เพื่อให้เห็นงานที่เพิ่งสร้าง
                if(document.getElementById('taskSearch')) {
                    document.getElementById('taskSearch').value = '';
                    currentSearch = '';
                }
                
                await fetchTasks();
                showToast('✅ สร้างงานใหม่สำเร็จ');
            } catch (err) {
                console.error(err);
                showToast('❌ สร้างงานไม่สำเร็จ');
            } finally {
                hideLoading();
            }
        });
    }

    // Search Event
    const searchInput = document.getElementById('taskSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value || '';
            renderTasks();
        });
    }
});