// Navigation / Tabs
const navLinks = document.querySelectorAll('.nav-links li');
const views = document.querySelectorAll('.view-section');

function showTab(tabId) {
    // تحديث الأزرار
    navLinks.forEach(link => {
        if(link.dataset.tab === tabId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // تحديث الواجهات
    views.forEach(view => {
        if(view.id === `view-${tabId}`) {
            view.classList.add('active');
        } else {
            view.classList.remove('active');
        }
    });

    // تحميل البيانات بناءً على التبويب
    if(tabId === 'dashboard') loadDashboard();
    if(tabId === 'appointments') loadAppointments();
    if(tabId === 'sessions') loadSessions();
    if(tabId === 'reminders') loadReminders();
}

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        showTab(link.dataset.tab);
    });
});

// Format Date
function formatDate(dateStr) {
    if(!dateStr) return "-";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('ar-SA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
    }).format(d);
}

// Fetch APIs
async function fetchAPI(endpoint) {
    try {
        const res = await fetch(`http://localhost:3020${endpoint}`);
        return await res.json();
    } catch (e) {
        console.error(`Error fetching ${endpoint}:`, e);
        return null;
    }
}

// 1. Load Dashboard
async function loadDashboard() {
    const stats = await fetchAPI('/api/stats');
    if (stats) {
        document.getElementById('stat-appointments').textContent = stats.appts || 0;
        document.getElementById('stat-customers').textContent = stats.newCustomers || 0;
        document.getElementById('stat-messages').textContent = (stats.appts * 3) || 12; // Example static logic if no stats
        document.getElementById('stat-broadcasts').textContent = stats.broadcastMsgs || 0;
    }

    const appts = await fetchAPI('/api/appointments');
    if (appts) {
        const tbody = document.querySelector('#dashboard-recent-appt tbody');
        tbody.innerHTML = '';
        const recent = appts.slice(0, 5); // آخر 5
        recent.forEach(a => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${a.userId.split('@')[0]}</td>
                <td>${formatDate(a.apptDate)}</td>
                <td><span class="badge-status ${a.branch.includes('عسفان') ? 'success' : 'pending'}">${a.branch}</span></td>
                <td>مؤكد</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 2. Load Appointments
async function loadAppointments() {
    const appts = await fetchAPI('/api/appointments');
    if (appts) {
        const tbody = document.querySelector('#table-appointments tbody');
        tbody.innerHTML = '';
        appts.forEach((a, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${a.userId.split('@')[0]}</td>
                <td>${formatDate(a.apptDate)}</td>
                <td>${a.branch}</td>
                <td>${formatDate(a.createdAt)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 3. Load Sessions
async function loadSessions() {
    const sessions = await fetchAPI('/api/sessions');
    if (sessions) {
        const tbody = document.querySelector('#table-sessions tbody');
        tbody.innerHTML = '';
        sessions.forEach(s => {
            const historyCount = s.history ? s.history.length : 0;
            const isStandby = s.isStandby === 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.userId.split('@')[0]}</td>
                <td>${historyCount} رسائل</td>
                <td><span class="badge-status ${isStandby ? 'pending' : 'success'}">${isStandby ? 'يدوي' : 'آلي'}</span></td>
                <td>${formatDate(s.lastUpdate)}</td>
                <td><button class="btn-primary" onclick="alert('عرض التاريخ غير مفعل حالياً')">عرض</button></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// 4. Load Reminders
async function loadReminders() {
    const reminders = await fetchAPI('/api/reminders');
    if (reminders) {
        const tbody = document.querySelector('#table-reminders tbody');
        tbody.innerHTML = '';
        reminders.forEach(r => {
            const isSent = r.isSent === 1;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.userId.split('@')[0]}</td>
                <td>${formatDate(r.apptDate)}</td>
                <td>${formatDate(r.reminderDate)}</td>
                <td><span class="badge-status ${isSent ? 'success' : 'pending'}">${isSent ? 'تم الإرسال' : 'مجول'}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
});
