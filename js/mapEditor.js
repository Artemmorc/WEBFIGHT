// ========== MAP EDITOR ==========

window.mapData = [];
window.mapBackground = 'floor';
let currentTile = 0;
let mirrorMode = 'none';

window.loadMapList = async function() {
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
};

window.saveMapToServer = async function() {
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
            map_data: window.mapData,
            background: window.mapBackground,
            is_active: false
        });
    if (error) {
        alert('Error saving map: ' + error.message);
    } else {
        alert('Map saved successfully');
        window.loadMapList();
        document.getElementById('map-name-input').value = '';
    }
};

window.loadMapFromServer = async function() {
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
    window.mapData = data.map_data;
    window.mapBackground = data.background || 'floor';
    document.getElementById('background-select').value = window.mapBackground;
    renderEditorGrid();
    alert('Map loaded');
};

window.setActiveMap = async function() {
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
        window.loadMapList();
    }
};

function openMapEditor() {
    document.getElementById('map-editor').classList.remove('hidden');
    initMapData();
    if (window.sb) window.loadMapList();
    renderEditorGrid();
    highlightSelectedTile(0);
    document.getElementById('background-select').value = window.mapBackground;
}

function closeMapEditor() {
    document.getElementById('map-editor').classList.add('hidden');
}

function initMapData() {
    window.mapData = [];
    for (let y = 0; y < 60; y++) {
        let row = [];
        for (let x = 0; x < 60; x++) {
            row.push(0);
        }
        window.mapData.push(row);
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
            updateCellColor(cell, window.mapData[y][x]);
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
            window.mapData[pos.y][pos.x] = currentTile;
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
    window.mapBackground = bg;
    alert(`Background set to ${bg}`);
}

function saveMap() {
    localStorage.setItem('customMap', JSON.stringify(window.mapData));
    alert('Map saved to browser storage');
}

function loadMap() {
    const saved = localStorage.getItem('customMap');
    if (saved) {
        window.mapData = JSON.parse(saved);
        renderEditorGrid();
        alert('Map loaded');
    } else {
        alert('No saved map found');
    }
}

function testMap() {
    if (typeof startBattle === 'function') {
        startBattle(window.mapData);
    }
    closeMapEditor();
}

// Expose needed functions globally
window.openMapEditor = openMapEditor;
window.closeMapEditor = closeMapEditor;
window.selectTile = selectTile;
window.setMirrorMode = setMirrorMode;
window.setMapBackground = setMapBackground;
window.saveMap = saveMap;
window.loadMap = loadMap;
window.testMap = testMap;
window.saveMapToServer = saveMapToServer;
window.loadMapFromServer = loadMapFromServer;
window.setActiveMap = setActiveMap;
