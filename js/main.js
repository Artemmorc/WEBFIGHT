// ========== GLOBAL STATE ==========
window.playerState = {
    name: 'Mystery',
    nameColor: '#4ade80',
    selectedIcon: 'Mystery',
    trophies: 0,
    pp: 0,
    coins: 0,
    gems: 0,
    dailyClaimed: false
};

window.state = {
    screen: 'menu',
    currentBrawler: 'Mystery',
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
        'Mystery': { color: '#a855f7', hp: 3800, ammo: 3, speed: 6, reload: 1.5, type: 'Shotgun', pfp: 'M', rarity: 'starter', unlocked: true }
    },
    COLORS: ['#4ade80', '#60a5fa', '#f87171', '#facc15', '#fb923c', '#c084fc', '#ffffff', '#9ca3af', '#fb7185', '#2dd4bf']
};

// ========== TEXTURES ==========
window.Textures = { wall: null, bush: null, floor: null };
window.Textures.generate = function() {
    const createTex = (w, h, drawFn) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        drawFn(c.getContext('2d'));
        return c;
    };
    this.wall = createTex(64, 64, ctx => {
        ctx.fillStyle = '#c19a6b';
        ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#a17a4b';
        for (let i = 0; i < 64; i += 32) {
            for (let j = 0; j < 64; j += 16) {
                ctx.fillRect(i+2, j+2, 28, 12);
                ctx.fillStyle = '#8b5a2b';
                ctx.fillRect(i+2, j+2, 28, 2);
            }
        }
        ctx.strokeStyle = '#6b4f3a';
        ctx.lineWidth = 2;
        for (let i = 0; i <= 64; i += 32) ctx.beginPath(), ctx.moveTo(i,0), ctx.lineTo(i,64), ctx.stroke();
        for (let i = 0; i <= 64; i += 16) ctx.beginPath(), ctx.moveTo(0,i), ctx.lineTo(64,i), ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, 0, 64, 32);
    });
    this.bush = createTex(64, 64, ctx => {
        // Solid yellow wheat field covering entire tile
        ctx.fillStyle = '#fde047';
        ctx.fillRect(0, 0, 64, 64);
        // Add some texture
        ctx.fillStyle = '#eab308';
        for (let i = 0; i < 20; i++) {
            ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4);
        }
        // Wheat stalks
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 2;
        for (let x = 8; x < 64; x += 16) {
            ctx.beginPath();
            ctx.moveTo(x, 64);
            ctx.lineTo(x, 32);
            ctx.stroke();
        }
    });
    this.floor = createTex(64, 64, ctx => {
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
};

// ========== MAP EDITOR WITH SERVER STORAGE ==========
let mapData = [];
let currentTile = 0; // 0=empty, 1=wall, 2=bush, 3=water, 4=powercube, 5=barrel, 6=spawn
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
        .select('map_data')
        .eq('id', mapId)
        .single();
    if (error) {
        alert('Error loading map: ' + error.message);
        return;
    }
    mapData = data.map_data;
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
    const colors = ['#d4a373', '#8b5a2b', '#2d6a4f', '#0284c7', '#fbbf24', '#b91c1c', '#22c55e'];
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
    startBattle(mapData);
    closeMapEditor();
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    if (typeof initUI === 'function') {
        initUI();
    } else {
        console.warn('initUI not yet defined, retrying...');
        setTimeout(() => {
            if (typeof initUI === 'function') initUI();
        }, 500);
    }
});

// Check if user is already logged in
if (window.sb) {
    window.sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            console.log('User already logged in', session.user);
            window.currentUser = session.user;
            loadProfile().then(() => {
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('menu-screen').style.display = 'flex';
                if (typeof updateStatsUI === 'function') updateStatsUI();
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
            });
        } else if (event === 'SIGNED_OUT') {
            window.currentUser = null;
            window.currentProfile = null;
            document.getElementById('menu-screen').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
        }
    });
} else {
    console.warn('Supabase not available – running in guest mode');
}
