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

window.brawlerProgress = {};

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
    menu: null,
    icon: null,
    game: null
};

function loadBrawlerImages() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 3;
        function checkAll() { loaded++; if (loaded === total) resolve(); }
        const imgMenu = new Image(); imgMenu.onload = () => { window.BrawlerImages.menu = imgMenu; checkAll(); }; imgMenu.onerror = checkAll; imgMenu.src = 'images/mysteria_menu.png';
        const imgIcon = new Image(); imgIcon.onload = () => { window.BrawlerImages.icon = imgIcon; checkAll(); }; imgIcon.onerror = checkAll; imgIcon.src = 'images/mysteria_icon.png';
        const imgGame = new Image(); imgGame.onload = () => { window.BrawlerImages.game = imgGame; checkAll(); }; imgGame.onerror = checkAll; imgGame.src = 'images/mysteria_game.png';
    });
}

// ========== TEXTURES ==========
window.Textures = { floor: null, bush: null, wall: null, waterBg: null, grassBg: null, stoneBg: null };
window.Textures.generate = function() {
    function createTexture(w, h, drawFn) {
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        drawFn(canvas.getContext('2d'));
        return canvas;
    }
    this.wall = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#b87333';
        for (let i = 0; i < 64; i += 32) {
            for (let j = 0; j < 64; j += 16) {
                ctx.fillRect(i+2, j+2, 28, 12);
                ctx.fillStyle = '#6b4f3a'; ctx.fillRect(i+2, j+2, 28, 2);
            }
        }
        ctx.strokeStyle = '#4a3729'; ctx.lineWidth = 2;
        for (let i = 0; i <= 64; i += 32) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,64); ctx.stroke(); }
        for (let i = 0; i <= 64; i += 16) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(64,i); ctx.stroke(); }
    });
    this.bush = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#b45309'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#a16207';
        for (let i = 0; i < 20; i++) { ctx.fillRect(Math.random()*64, Math.random()*64, 4, 4); }
        ctx.strokeStyle = '#78350f'; ctx.lineWidth = 2;
        for (let x = 8; x < 64; x += 16) { ctx.beginPath(); ctx.moveTo(x, 64); ctx.lineTo(x, 32); ctx.stroke(); }
    });
    this.floor = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#d4a373'; ctx.fillRect(0, 0, 64, 64);
        for (let i = 0; i < 15; i++) {
            ctx.fillStyle = `hsl(30, 50%, ${40 + Math.random()*20}%)`;
            ctx.fillRect(Math.random()*64, Math.random()*64, 3, 2);
        }
        for (let i = 0; i < 3; i++) {
            ctx.fillStyle = '#8b5a2b';
            ctx.beginPath(); ctx.arc(5+Math.random()*54, 5+Math.random()*54, 3, 0, Math.PI*2); ctx.fill();
        }
    });
    this.waterBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#0284c7'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 3; i++) { ctx.fillRect(10, 10 + i*20, 44, 4); }
    });
    this.grassBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#2d6a4f'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#409c5c';
        for (let i = 0; i < 15; i++) { ctx.fillRect(Math.random()*64, Math.random()*64, 4, 2); }
    });
    this.stoneBg = createTexture(64, 64, ctx => {
        ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, 0, 64, 64);
        ctx.fillStyle = '#6b6b6b';
        for (let i = 0; i < 10; i++) { ctx.fillRect(Math.random()*64, Math.random()*64, 8, 2); }
    });
};

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
    initUI();
});

if (window.sb) {
    window.sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
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
