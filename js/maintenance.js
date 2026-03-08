// ========== MAINTENANCE MODE ==========

let warningTimeout = null;

async function checkMaintenance() {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('maintenance')
        .select('*')
        .eq('id', 1)
        .single();
    if (error || !data || !data.start_time) {
        document.getElementById('maintenance-overlay').classList.add('hidden');
        return;
    }

    const start = new Date(data.start_time).getTime();
    const now = Date.now();

    if (now < start) {
        const minutesUntil = Math.ceil((start - now) / 60000);
        showMaintenanceWarning(minutesUntil);
        document.getElementById('maintenance-overlay').classList.add('hidden');
        return;
    }

    if (!window.currentProfile?.is_admin) {
        document.getElementById('maintenance-overlay').classList.remove('hidden');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('menu-screen').style.display = 'none';
        const timerSpan = document.getElementById('maintenance-timer');
        if (timerSpan) timerSpan.innerText = '--:--';
    } else {
        document.getElementById('maintenance-overlay').classList.add('hidden');
    }
}

function showMaintenanceWarning(minutes) {
    if (warningTimeout) clearTimeout(warningTimeout);
    const old = document.querySelector('.fixed.top-4.left-1\\/2');
    if (old) old.remove();
    const warning = document.createElement('div');
    warning.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-6 py-4 rounded-xl text-2xl z-[1100] animate-bounce shadow-2xl border-4 border-white';
    warning.innerText = `⚠️ MAINTENANCE IN ${minutes} MINUTE${minutes > 1 ? 'S' : ''} ⚠️`;
    document.body.appendChild(warning);
    warningTimeout = setTimeout(() => warning.remove(), 5000);
}

async function scheduleMaintenance() {
    if (!window.currentProfile?.is_admin) return;
    const startTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    const { error } = await window.sb
        .from('maintenance')
        .upsert({ id: 1, start_time: startTime });
    if (error) {
        alert('Error scheduling maintenance: ' + error.message);
    } else {
        alert('Maintenance scheduled to start in 3 minutes.');
        toggleAdminPanel();
    }
}

async function scheduleMaintenanceWithDuration() {
    if (!window.currentProfile?.is_admin) return;
    const minutesInput = document.getElementById('maintenance-minutes');
    let duration = parseInt(minutesInput.value, 10);
    if (isNaN(duration) || duration < 1) duration = 5;
    const startTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    const { error } = await window.sb
        .from('maintenance')
        .upsert({ id: 1, start_time: startTime, duration_minutes: duration });
    if (error) {
        alert('Error scheduling maintenance: ' + error.message);
    } else {
        alert(`Maintenance scheduled to start in 3 minutes (duration ${duration} min).`);
        toggleAdminPanel();
    }
}

async function cancelMaintenance() {
    if (!window.currentProfile?.is_admin) return;
    const { error } = await window.sb.from('maintenance').delete().eq('id', 1);
    if (error) {
        alert('Error cancelling maintenance: ' + error.message);
    } else {
        alert('Maintenance cancelled.');
        toggleAdminPanel();
    }
}

function hardRefresh() {
    location.reload(true);
}

// Expose
window.checkMaintenance = checkMaintenance;
window.scheduleMaintenance = scheduleMaintenance;
window.scheduleMaintenanceWithDuration = scheduleMaintenanceWithDuration;
window.cancelMaintenance = cancelMaintenance;
window.hardRefresh = hardRefresh;
