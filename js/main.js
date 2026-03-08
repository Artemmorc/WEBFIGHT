// ========== GLOBAL STATE ==========
window.playerState = {
    name: 'Mysteria',
    nameColor: '#4ade80',
    selectedIcon: 'Mysteria',
    trophies: 0,
    pp: 0,
    coins: 0,
    gems: 0,
    dailyClaimed: false
};

window.state = {
    screen: 'menu',
    currentBrawler: 'Mysteria',
    starrDropStep: 0,
    starrDropRarity: 'RARE',
    battle: { 
        active: false, 
        joystick: { move: { x: 0, y: 0 }, attack: { x: 0, y: 0 } }
    },
    preBattle: false
};

// ========== SVG ICONS ==========
window.SVG_ICONS = {
    coin: (s=24) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#facc15" stroke="#a16207" stroke-width="6"/><circle cx="50" cy="50" r="32" fill="none" stroke="#a16207" stroke-width="4"/><text x="50" y="68" font-size="50" text-anchor="middle" fill="#a16207" font-family="Luckiest Guy">$</text></svg>`,
    pp: (s=24) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><rect x="15" y="15" width="70" height="70" rx="12" fill="#3b82f6" stroke="#1d4ed8" stroke-width="6"/><path d="M40 30 L70 50 L40 70 Z" fill="white" stroke="white" stroke-width="4" stroke-linejoin="round"/></svg>`,
    gem: (s=24) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M50 10 L85 35 L75 85 L25 85 L15 35 Z" fill="#10b981" stroke="#065f46" stroke-width="6"/><path d="M30 40 L50 25 L70 40" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="4"/></svg>`,
    trophy: (s=24) => `<svg width="${s}" height="${s}" viewBox="0 0 100 100"><path d="M25 25 H75 V45 Q75 70 50 70 Q25 70 25 45 Z" fill="#fbbf24" stroke="#92400e" stroke-width="6"/><path d="M25 35 H15 V45 Q15 55 25 55 M75 35 H85 V45 Q85 55 75 55" fill="none" stroke="#92400e" stroke-width="4"/><rect x="44" y="70" width="12" height="15" fill="#fbbf24"/><rect x="30" y="85" width="40" height="8" rx="4" fill="#fbbf24" stroke="#92400e" stroke-width="4"/></svg>`,
    showdown: `<svg viewBox="0 0 100 100"><rect x="10" y="10" width="80" height="80" rx="15" fill="#9333ea" stroke="white" stroke-width="4"/><path d="M30 50 L45 65 L75 35" fill="none" stroke="white" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

// ========== GAME CONFIG ==========
window.CONFIG = {
    MAP_SIZE: 60,
    TILE_SIZE: 64,
    BRAWLERS: {
        'Mysteria': { color: '#a855f7', hp: 3800, ammo: 3, speed: 6, reload: 1.5, type: 'Shotgun', pfp: 'M', rarity: 'starter', unlocked: true }
    },
    COLORS: ['#4ade80', '#60a5fa', '#f87171', '#facc15', '#fb923c', '#c084fc', '#ffffff', '#9ca3af', '#fb7185', '#2dd4bf']
};

// ========== CUSTOM BRAWLER IMAGES ==========
window.BrawlerImages = {
    menu: null,   // large (200x200) for brawler stand
    icon: null,   // small (80x80) for profile icon and grid
    game: null    // in-game sprite
};

function loadBrawlerImages() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 3;

        function checkAll() {
            loaded++;
            if (loaded === total) resolve();
        }

        // Menu image (large)
        const imgMenu = new Image();
        imgMenu.onload = () => {
            window.BrawlerImages.menu = imgMenu;
            checkAll();
        };
        imgMenu.onerror = () => {
            console.warn('Could not load menu image, using drawn fallback');
            checkAll();
        };
        imgMenu.src = 'images/mysteria_menu.png';

        // Icon image (small)
        const imgIcon = new Image();
        imgIcon.onload = () => {
            window.BrawlerImages.icon = imgIcon;
            checkAll();
        };
        imgIcon.onerror = () => {
            console.warn('Could not load icon image, using drawn fallback');
            checkAll();
        };
        imgIcon.src = 'images/mysteria_icon.png';

        // Game sprite
        const imgGame = new Image();
        imgGame.onload = () => {
            window.BrawlerImages.game = imgGame;
            checkAll();
        };
        imgGame.onerror = () => {
            console.warn('Could not load game image, using drawn fallback');
            checkAll();
        };
        imgGame.src = 'images/mysteria_game.png';
    });
}

// ========== TEXTURES (PRE‑RENDERED CANVAS ELEMENTS) ==========
window.Textures = { 
    floor: null, 
    bush: null, 
    wall: null,
    waterBg: null,
    grassBg: null,
    stoneBg: null
};
window.Textures.generate = function() {
    function createTexture(w, h, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        drawFn(canvas.getContext('2d'));
        return canvas;
    }
    // Wall – brick pattern
    this.wall = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#b87333';
        for (let i = 0; i < 64; i += 32) {
            for (let j = 0; j < 64; j += 16) {
                ctx.fillRect(i+2, j+2, 28, 12);
                ctx.fillStyle = '#6b4f3a';
                ctx.fillRect(i+2, j+2, 28, 2);
            }
        }
        ctx.strokeStyle = '#4a3729';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 64; i += 32) {
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,64); ctx.stroke();
        }
        for (let i = 0; i <= 64; i += 16) {
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(64,i); ctx.stroke();
        }
    });
    // Bush – yellow wheat
    this.bush = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#b45309';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#a16207';
        for (let i = 0; i < 20; i++) {
            ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4);
        }
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        for (let x = 8; x < 64; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 64);
            ctx.lineTo(x, 32);
            ctx.stroke();
        }
    });
    // Default floor (desert)
    this.floor = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 15; i++) {
            ctx.fillStyle = `hsl(30, 50%, ${40 + Math.random()*20}%)`;
            ctx.fillRect(Math.random()*64, Math.random()*64, 3, 2);
        }
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath();
            ctx.arc(5+Math.random()*54, 5+Math.random()*54, 3, 0, Math.PI*2);
            ctx.fill();
        }
    });
    // Water background
    this.waterBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(10, 10 + i*20, 44, 4);
        }
    });
    // Grass background
    this.grassBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#2d6a4f';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#409c5c';
        for (let i = 0; i < 15; i++) {
            ctx.fillRect(Math.random()*64, Math.random()*64, 4, 2);
        }
    });
    // Stone background
    this.stoneBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#6b6b6b';
        for (let i = 0; i < 10; i++) {
            ctx.fillRect(Math.random()*64, Math.random()*64, 8, 2);
        }
    });
};

// ========== MAP EDITOR ==========
let mapData = [];
let mapBackground = 'floor'; // default background
let currentTile = 0;
let mirrorMode = 'none';

async function loadMapList() {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('maps')
        .select('id, name, is_active')
        .order('name');
    if (error) {
        console.error('Error loading maps:', error);
        return;
    }
    const select = document.getElementById('map-list-select');
    select.innerHTML = '<option value="">-- Select a map to load --</option>';
    let activeId = null;
    data.forEach(map => {
        const option = document.createElement('option');
        option.value = map.id;
        option.textContent = map.name + (map.is_active ? ' (active)' : '');
        select.appendChild(option);
        if (map.is_active) activeId = map.id;
    });
    if (activeId) {
        document.getElementById('active-map-indicator').textContent = `Active map ID: ${activeId}`;
    } else {
        document.getElementById('active-map-indicator').textContent = 'No active map';
    }
}

async function saveMapToServer() {
    if (!window.sb) {
        alert('Database not available');
        return;
    }
    const name = document.getElementById('map-name-input').value.trim();
    if (!name) {
        alert('Please enter a map name');
        return;
    }
    const { error } = await window.sb
        .from('maps')
        .insert({
            name: name,
            map_data: mapData,
            background: mapBackground,
            is_active: false
        });
    if (error) {
        alert('Error saving map: ' + error.message);
    } else {
        alert('Map saved successfully');
        loadMapList();
        document.getElementById('map-name-input').value = '';
    }
}

async function loadMapFromServer() {
    if (!window.sb) return;
    const select = document.getElementById('map-list-select');
    const mapId = select.value;
    if (!mapId) return;
    const { data, error } = await window.sb
        .from('maps')
        .select('map_data, background')
        .eq('id', mapId)
        .single();
    if (error) {
        alert('Error loading map: ' + error.message);
        return;
    }
    mapData = data.map_data;
    mapBackground = data.background || 'floor';
    document.getElementById('background-select').value = mapBackground;
    renderEditorGrid();
    alert('Map loaded');
}

async function setActiveMap() {
    if (!window.sb) return;
    const select = document.getElementById('map-list-select');
    const mapId = select.value;
    if (!mapId) return;
    const { error: resetError } = await window.sb
        .from('maps')
        .update({ is_active: false })
        .neq('id', 0);
    if (resetError) {
        alert('Error resetting active map: ' + resetError.message);
        return;
    }
    const { error } = await window.sb
        .from('maps')
        .update({ is_active: true })
        .eq('id', mapId);
    if (error) {
        alert('Error setting active map: ' + error.message);
    } else {
        alert('Active map updated');
        loadMapList();
    }
}

function openMapEditor() {
    document.getElementById('map-editor').classList.remove('hidden');
    initMapData();
    if (window.sb) loadMapList();
    renderEditorGrid();
    highlightSelectedTile(0);
    document.getElementById('background-select').value = mapBackground;
}

function closeMapEditor() {
    document.getElementById('map-editor').classList.add('hidden');
}

function initMapData() {
    mapData = [];
    for (let y = 0; y < 60; y++) {
        let row = [];
        for (let x = 0; x < 60; x++) {
            row.push(0);
        }
        mapData.push(row);
    }
}

function renderEditorGrid() {
    const grid = document.getElementById('editor-grid');
    grid.innerHTML = '';
    for (let y = 0; y < 60; y++) {
        for (let x = 0; x < 60; x++) {
            const cell = document.createElement('div');
            cell.className = 'w-10 h-10 border border-gray-700 cursor-pointer';
            cell.dataset.x = x;
            cell.dataset.y = y;
            updateCellColor(cell, mapData[y][x]);
            cell.onclick = () => placeTile(x, y);
            grid.appendChild(cell);
        }
    }
}

function updateCellColor(cell, type) {
    const colors = ['#d4a373', '#8b5a2b', '#b45309', '#0284c7', '#fbbf24', '#b91c1c', '#22c55e'];
    cell.style.backgroundColor = colors[type] || colors[0];
}

function selectTile(type) {
    currentTile = type;
    highlightSelectedTile(type);
}

function highlightSelectedTile(type) {
    document.querySelectorAll('[id^="palette-"]').forEach(el => {
        el.style.borderColor = 'white';
    });
    const ids = ['erase', 'wall', 'bush', 'water', 'powercube', 'barrel', 'spawn'];
    const id = ids[type];
    const el = document.getElementById(`palette-${id}`);
    if (el) el.style.borderColor = 'yellow';
}

function setMirrorMode(mode) {
    mirrorMode = mode;
}

function placeTile(x, y) {
    const positions = getMirrorPositions(x, y);
    positions.forEach(pos => {
        if (pos.x >= 0 && pos.x < 60 && pos.y >= 0 && pos.y < 60) {
            mapData[pos.y][pos.x] = currentTile;
            const cell = document.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cell) updateCellColor(cell, currentTile);
        }
    });
}

function getMirrorPositions(x, y) {
    const max = 59;
    switch (mirrorMode) {
        case 'none':
            return [{x, y}];
        case 'horizontal':
            return [{x, y}, {x: max - x, y}];
        case 'vertical':
            return [{x, y}, {x, y: max - y}];
        case 'diagonal':
            return [{x, y}, {x: y, y: x}];
        case 'all':
            return [
                {x, y},
                {x: max - x, y},
                {x, y: max - y},
                {x: max - x, y: max - y},
                {x: y, y: x},
                {x: max - y, y: max - x},
                {x: y, y: max - x},
                {x: max - y, y: x}
            ];
        default:
            return [{x, y}];
    }
}

function setMapBackground() {
    const bg = document.getElementById('background-select').value;
    mapBackground = bg;
    alert(`Background set to ${bg}`);
}

function saveMap() {
    localStorage.setItem('customMap', JSON.stringify(mapData));
    alert('Map saved to browser storage');
}

function loadMap() {
    const saved = localStorage.getItem('customMap');
    if (saved) {
        mapData = JSON.parse(saved);
        renderEditorGrid();
        alert('Map loaded');
    } else {
        alert('No saved map found');
    }
}

function testMap() {
    // startBattle will be called from game.js; we need to pass the background as well.
    // We'll modify startBattle in game.js to accept a background parameter.
    // For now, just call startBattle with mapData.
    if (typeof startBattle === 'function') {
        startBattle(mapData);
    }
    closeMapEditor();
}

// ========== NEWS SYSTEM ==========
async function handleNewsClick() {
    await openNewsViewer();
}

async function openNewsViewer() {
    const viewer = document.getElementById('news-viewer');
    viewer.classList.remove('hidden');
    await loadNewsList();
    const createBtn = document.getElementById('news-create-btn');
    if (window.currentProfile?.is_admin) {
        createBtn.classList.remove('hidden');
    } else {
        createBtn.classList.add('hidden');
    }
}

function closeNewsViewer() {
    document.getElementById('news-viewer').classList.add('hidden');
}

async function loadNewsList() {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading news:', error);
        return;
    }
    const container = document.getElementById('news-list');
    container.innerHTML = '';
    data.forEach(news => {
        const card = document.createElement('div');
        card.className = 'news-card bg-black/40 p-6 rounded-xl border-2 border-white/30 cursor-pointer hover:bg-black/60 transition-colors';
        const plainText = news.content.replace(/<[^>]*>/g, '');
        const preview = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
        card.innerHTML = `
            <h3 class="text-3xl text-yellow-400 mb-2">${escapeHTML(news.title)}</h3>
            <div class="text-gray-300 text-sm">${new Date(news.created_at).toLocaleString()}</div>
            <div class="text-white mt-2 line-clamp-2">${escapeHTML(preview)}</div>
        `;
        card.onclick = () => showNewsDetail(news);
        container.appendChild(card);
    });
}

function showNewsDetail(news) {
    document.getElementById('detail-title').innerText = news.title;
    document.getElementById('detail-date').innerText = new Date(news.created_at).toLocaleString();
    document.getElementById('detail-content').innerHTML = news.content;
    document.getElementById('news-detail').classList.remove('hidden');
}

function closeNewsDetail() {
    document.getElementById('news-detail').classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function openNewsEditor() {
    if (!window.currentProfile?.is_admin) return;
    document.getElementById('news-editor').classList.remove('hidden');
}

function closeNewsEditor() {
    document.getElementById('news-editor').classList.add('hidden');
}

function clearNewsEditor() {
    document.getElementById('news-title').value = '';
    document.getElementById('news-content').value = '';
}

async function saveNewsAsDraft() {
    await saveNews(false);
}

async function publishNews() {
    await saveNews(true);
}

async function saveNews(published) {
    if (!window.currentUser) return;
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    if (!title || !content) {
        alert('Title and content required');
        return;
    }
    const { error } = await window.sb
        .from('news')
        .insert({
            title,
            content,
            published,
            author_id: window.currentUser.id
        });
    if (error) {
        alert('Error saving news: ' + error.message);
    } else {
        alert('News saved');
        clearNewsEditor();
        closeNewsEditor();
        if (published) loadNewsList();
    }
}

// ========== MAINTENANCE MODE ==========
let warningTimeout = null;
let timerInterval = null;

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
    const duration = (data.duration_minutes || 10) * 60 * 1000;
    const end = start + duration;

    if (now < start) {
        const minutesUntil = Math.ceil((start - now) / 60000);
        showMaintenanceWarning(minutesUntil);
        document.getElementById('maintenance-overlay').classList.add('hidden');
        return;
    }

    if (now >= start && now < end) {
        if (!window.currentProfile?.is_admin) {
            document.getElementById('maintenance-overlay').classList.remove('hidden');
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('menu-screen').style.display = 'none';
            startMaintenanceTimer(end);
        } else {
            document.getElementById('maintenance-overlay').classList.add('hidden');
        }
        return;
    }

    if (now >= end) {
        await window.sb.from('maintenance').delete().eq('id', 1);
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

function startMaintenanceTimer(endTime) {
    if (timerInterval) clearInterval(timerInterval);
    const timerSpan = document.getElementById('maintenance-timer');
    if (!timerSpan) return;
    timerInterval = setInterval(async () => {
        const now = Date.now();
        if (now >= endTime) {
            timerSpan.innerText = '0:00';
            clearInterval(timerInterval);
            await window.sb.from('maintenance').delete().eq('id', 1);
            document.getElementById('maintenance-overlay').classList.add('hidden');
            return;
        }
        const remaining = endTime - now;
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        timerSpan.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

async function scheduleMaintenance() {
    if (!window.currentProfile?.is_admin) return;
    const startTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
    const { error } = await window.sb
        .from('maintenance')
        .upsert({ id: 1, start_time: startTime, duration_minutes: 10 });
    if (error) {
        alert('Error scheduling maintenance: ' + error.message);
    } else {
        alert('Maintenance scheduled to start in 3 minutes (duration 10 min).');
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

// ========== DAILY RESET ==========
let dailyTimerInterval = null;

async function checkDailyReset() {
    if (!window.currentProfile) return;
    const now = new Date();
    const today9am = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
    
    if (window.currentProfile.last_daily) {
        const last = new Date(window.currentProfile.last_daily);
        playerState.dailyClaimed = last >= today9am;
    } else {
        playerState.dailyClaimed = false;
    }
    
    const claimText = document.getElementById('daily-claim-text');
    if (claimText) {
        claimText.innerText = playerState.dailyClaimed ? 'CLAIMED' : 'CLAIM';
    }
    
    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    dailyTimerInterval = setInterval(updateDailyTimer, 1000);
    updateDailyTimer();
}

function updateDailyTimer() {
    const now = new Date();
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
    if (now >= nextReset) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    const diff = nextReset - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const timerSpan = document.getElementById('daily-timer');
    if (timerSpan) {
        timerSpan.innerText = `Resets in ${hours}h ${minutes}m ${seconds}s`;
    }
}

async function claimDailyReward() {
    if (playerState.dailyClaimed) return;
    if (!window.currentUser || !window.currentProfile) {
        alert('You must be logged in to claim daily reward.');
        return;
    }
    playerState.dailyClaimed = true;
    playerState.coins += 100;
    updateStatsUI();
    
    const now = new Date().toISOString();
    const { error } = await window.sb
        .from('profiles')
        .update({ 
            coins: playerState.coins,
            daily_claimed: true,
            last_daily: now 
        })
        .eq('user_id', window.currentUser.id);
    
    if (error) {
        console.error('Error updating daily claim:', error);
        alert('Failed to save claim. Please try again.');
        playerState.dailyClaimed = false;
        playerState.coins -= 100;
        updateStatsUI();
    } else {
        window.currentProfile.last_daily = now;
        window.currentProfile.daily_claimed = true;
        document.getElementById('daily-claim-text').innerText = 'CLAIMED';
        toggleShop(true);
    }
}

// ========== AUTH FUNCTIONS ==========
async function loadProfile() {
    if (!window.currentUser) return;
    const { data, error } = await window.sb
        .from('profiles')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .single();
    if (error) {
        console.error('Profile load error', error);
        return;
    }
    window.currentProfile = data;
    playerState = {
        name: data.display_name || 'Mysteria',
        nameColor: '#4ade80',
        selectedIcon: 'Mysteria',
        trophies: data.trophies,
        pp: data.pp,
        coins: data.coins,
        gems: data.gems,
        dailyClaimed: data.daily_claimed
    };
    document.getElementById('displayUsername').innerText = data.username;
    document.getElementById('displayAccountId').innerText = '#' + data.account_id;
    if (typeof updateStatsUI === 'function') updateStatsUI();
    if (data.is_admin) {
        document.getElementById('adminBtnContainer').classList.remove('hidden');
    } else {
        document.getElementById('adminBtnContainer').classList.add('hidden');
    }
    checkDailyReset();
}

async function saveProfileToDB() {
    if (!window.currentUser || !window.currentProfile) return;
    const updates = {
        display_name: playerState.name,
        trophies: playerState.trophies,
        pp: playerState.pp,
        coins: playerState.coins,
        gems: playerState.gems,
        daily_claimed: playerState.dailyClaimed
    };
    const { error } = await window.sb
        .from('profiles')
        .update(updates)
        .eq('user_id', window.currentUser.id);
    if (error) console.error('Save error', error);
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }
    const email = username + '@example.com';
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = error.message;
        return;
    }
    window.currentUser = data.user;
    await loadProfile();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

async function handleRegister() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }
    const email = username + '@example.com';
    const { data, error } = await window.sb.auth.signUp({
        email,
        password,
        options: { data: { username } }
    });
    if (error) {
        msg.innerText = error.message;
        return;
    }
    const accountId = generateAccountId();
    const { error: profileError } = await window.sb
        .from('profiles')
        .insert({
            user_id: data.user.id,
            username,
            display_name: username,
            account_id: accountId,
            coins: 0,
            gems: 0,
            pp: 0,
            trophies: 0,
            daily_claimed: false,
            is_admin: false
        });
    if (profileError) {
        msg.innerText = 'Profile creation failed: ' + profileError.message;
        return;
    }
    msg.innerText = 'Registration successful! You can now login.';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function generateAccountId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function logout() {
    await window.sb.auth.signOut();
    window.currentUser = null;
    window.currentProfile = null;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
}

// Admin functions
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
}

async function adminGiveCoins() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminCoins').value);
    playerState.coins += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminGiveGems() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminGems').value);
    playerState.gems += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminGivePp() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminPp').value);
    playerState.pp += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminChangeUsername() {
    if (!window.currentProfile?.is_admin) return;
    const newUsername = document.getElementById('adminNewUsername').value.trim();
    if (!newUsername) return;
    const { error } = await window.sb
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', window.currentUser.id);
    if (!error) {
        window.currentProfile.username = newUsername;
        document.getElementById('displayUsername').innerText = newUsername;
    }
}

// ========== UI FUNCTIONS (with image support) ==========
function initUI() {
    // First load custom images, then generate textures and start UI
    loadBrawlerImages().then(() => {
        window.Textures.generate();
        updateBrawlerMenu();
        updateStatsUI();
        document.getElementById('mode-icon-container').innerHTML = SVG_ICONS.showdown;
        document.getElementById('icon-trophy-sm').innerHTML = SVG_ICONS.trophy(18);
        document.getElementById('icon-pp-sm').innerHTML = SVG_ICONS.pp(18);
        document.getElementById('icon-coins-sm').innerHTML = SVG_ICONS.coin(18);
        document.getElementById('icon-gems-sm').innerHTML = SVG_ICONS.gem(18);
        
        document.getElementById('shop-coins-icon').innerHTML = SVG_ICONS.coin(24);
        document.getElementById('shop-gems-icon').innerHTML = SVG_ICONS.gem(24);
        document.getElementById('daily-reward-icon').innerHTML = SVG_ICONS.coin(100);
        document.getElementById('btn-gem-icon').innerHTML = SVG_ICONS.gem(18);
        document.getElementById('btn-gem-icon-2').innerHTML = SVG_ICONS.gem(18);
        document.getElementById('shop-coins-bundle-icon').innerHTML = SVG_ICONS.coin(80);
        document.getElementById('shop-starr-drop-icon').innerHTML = createStarrDropSVG('RARE', 100);
        
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        }, 1000);
    });
}

function updateStatsUI() {
    document.getElementById('display-player-name').innerText = playerState.name;
    document.getElementById('display-player-name').style.color = playerState.nameColor;
    document.getElementById('val-coins').innerText = playerState.coins.toLocaleString();
    document.getElementById('val-pp').innerText = playerState.pp.toLocaleString();
    document.getElementById('val-gems').innerText = playerState.gems.toLocaleString();
    document.getElementById('trophy-count').innerText = playerState.trophies.toLocaleString();
    document.getElementById('menu-pfp-container').innerHTML = createBrawlerSVG(playerState.selectedIcon, 'small');
    document.getElementById('menu-pfp-container').style.backgroundColor = 'transparent';
    
    if (!document.getElementById('shop-modal').classList.contains('hidden')) {
        document.getElementById('shop-val-coins').innerText = playerState.coins.toLocaleString();
        document.getElementById('shop-val-gems').innerText = playerState.gems.toLocaleString();
    }
    if (window.currentProfile) {
        document.getElementById('profileAccountId').innerText = '#' + window.currentProfile.account_id;
    }
}

function createBrawlerSVG(name, size) {
    // If custom images are loaded
    if (size === 'large' && window.BrawlerImages.menu) {
        return `<img src="images/mysteria_menu.png" style="width: 200px; height: 200px; object-fit: contain;">`;
    }
    if (size === 'small' && window.BrawlerImages.icon) {
        return `<img src="images/mysteria_icon.png" style="width: 80px; height: 80px; object-fit: contain;">`;
    }

    // Fallback to drawn SVG
    const b = CONFIG.BRAWLERS[name];
    const s = size === 'large' ? 200 : 80;
    const strokeWidth = size === 'large' ? 4 : 2;
    return `
    <svg width="${s}" height="${s}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="${b.color}" stroke="black" stroke-width="${strokeWidth}" />
        <circle cx="38" cy="42" r="6" fill="white" stroke="black" stroke-width="2"/>
        <circle cx="62" cy="42" r="6" fill="white" stroke="black" stroke-width="2"/>
        <circle cx="38" cy="44" r="3" fill="black"/>
        <circle cx="62" cy="44" r="3" fill="black"/>
        <circle cx="36" cy="40" r="1.5" fill="white"/>
        <circle cx="60" cy="40" r="1.5" fill="white"/>
        <path d="M30 25 L70 25 L65 35 L35 35 Z" fill="#8b5a2b" stroke="black" stroke-width="2"/>
        <rect x="65" y="42" width="25" height="8" rx="2" fill="#4a3729" stroke="black" stroke-width="2"/>
    </svg>`;
}

function toggleShop(show) {
    const shop = document.getElementById('shop-modal');
    if (show) {
        shop.classList.remove('hidden');
        updateStatsUI();
        if (playerState.dailyClaimed) {
            document.getElementById('daily-reward-card').style.opacity = '0.5';
            document.getElementById('daily-reward-card').onclick = null;
            document.getElementById('daily-claim-text').innerText = 'CLAIMED';
        } else {
            document.getElementById('daily-reward-card').style.opacity = '1';
            document.getElementById('daily-reward-card').onclick = claimDailyReward;
            document.getElementById('daily-claim-text').innerText = 'CLAIM';
        }
    } else {
        shop.classList.add('hidden');
    }
}

async function exchangeGems(cost, amount) {
    if (playerState.gems >= cost) {
        playerState.gems -= cost;
        playerState.coins += amount;
        updateStatsUI();
        await saveProfileToDB();
    } else {
        alert("Not enough gems!");
    }
}

async function purchaseStarrDrop() {
    if (playerState.gems >= 10) {
        playerState.gems -= 10;
        updateStatsUI();
        await saveProfileToDB();
        startStarrDropAnimation();
    } else {
        alert("Not enough gems!");
    }
}

function toggleProfile(show) {
    const modal = document.getElementById('profile-modal');
    if (show) {
        modal.classList.remove('hidden');
        document.getElementById('input-name').value = playerState.name;
        
        const cg = document.getElementById('color-grid');
        cg.innerHTML = '';
        CONFIG.COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = `w-full aspect-square rounded-lg cursor-pointer border-4 ${playerState.nameColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`;
            d.style.backgroundColor = c;
            d.onclick = () => { playerState.nameColor = c; toggleProfile(true); };
            cg.appendChild(d);
        });

        const ig = document.getElementById('icon-grid');
        ig.innerHTML = '';
        Object.keys(CONFIG.BRAWLERS).forEach(name => {
            if (!CONFIG.BRAWLERS[name].unlocked) return;
            const d = document.createElement('div');
            d.className = `p-2 bg-black/40 rounded-xl cursor-pointer border-4 flex items-center justify-center transition-all ${playerState.selectedIcon === name ? 'border-yellow-400 scale-105' : 'border-transparent hover:border-white/20'}`;
            d.style.backgroundColor = CONFIG.BRAWLERS[name].color;
            d.innerHTML = createBrawlerSVG(name, 'small');
            d.onclick = () => { playerState.selectedIcon = name; toggleProfile(true); };
            ig.appendChild(d);
        });
    } else {
        modal.classList.add('hidden');
    }
}

async function saveProfile() {
    playerState.name = document.getElementById('input-name').value || 'Mysteria';
    updateStatsUI();
    await saveProfileToDB();
    toggleProfile(false);
}

function updateBrawlerMenu() {
    document.getElementById('brawler-stand').innerHTML = createBrawlerSVG(state.currentBrawler, 'large');
    document.getElementById('current-brawler-name').innerText = state.currentBrawler;
}

function toggleBrawlers(show) {
    const screen = document.getElementById('brawler-screen');
    if (show) {
        screen.classList.remove('hidden');
        const list = document.getElementById('brawler-list');
        list.innerHTML = '';
        Object.keys(CONFIG.BRAWLERS).forEach(name => {
            const b = CONFIG.BRAWLERS[name];
            const div = document.createElement('div');
            const bgClass = b.rarity === 'starter' ? 'bg-starter' : 'bg-rare-brawler';
            const isUnlocked = b.unlocked;
            
            div.className = `p-4 rounded-xl border-4 ${state.currentBrawler === name ? 'border-yellow-400' : 'border-black'} ${bgClass} cursor-pointer hover:scale-105 transition-all relative ${!isUnlocked ? 'opacity-80' : ''}`;
            div.innerHTML = `
                <div class="h-32 mb-2 flex items-center justify-center ${!isUnlocked ? 'grayscale brightness-50' : ''}">${createBrawlerSVG(name, 'small')}</div>
                <div class="text-center text-xl text-black">${name}</div>
                <div class="text-center text-xs opacity-70 text-black uppercase">${b.rarity}</div>
                ${!isUnlocked ? '<div class="absolute inset-0 flex items-center justify-center text-4xl">🔒</div>' : ''}
            `;
            if (isUnlocked) {
                div.onclick = () => { state.currentBrawler = name; toggleBrawlers(false); updateBrawlerMenu(); };
            }
            list.appendChild(div);
        });
    } else { screen.classList.add('hidden'); }
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initUI();
});

if (window.sb) {
    window.sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('User already logged in', session.user);
            window.currentUser = session.user;
            loadProfile().then(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('menu-screen').style.display = 'flex';
                if (typeof updateStatsUI === 'function') updateStatsUI();
                checkMaintenance();
            });
        }
    });

    window.sb.auth.onAuthStateChange((event, session) => {
        console.log('Auth event:', event, session);
        if (event === 'SIGNED_IN') {
            window.currentUser = session.user;
            loadProfile().then(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('menu-screen').style.display = 'flex';
                if (typeof updateStatsUI === 'function') updateStatsUI();
                checkMaintenance();
            });
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            window.currentProfile = null;
            document.getElementById('menu-screen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
            checkMaintenance();
        }
    });
} else {
    console.warn('Supabase not available – running in guest mode');
}
