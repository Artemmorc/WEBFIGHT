// ========== GLOBAL FALLBACKS (USING WINDOW) ==========
// Ensure all required globals exist (config.js should have defined keys, but we're extra safe)
window.keys = window.keys || { w: false, a: false, s: false, d: false };
window.state = window.state || { battle: { active: false } };
window.playerState = window.playerState || { name: 'Mystery' };
window.CONFIG = window.CONFIG || { 
    MAP_SIZE: 40, 
    TILE_SIZE: 64, 
    BRAWLERS: { 
        Mystery: { hp: 3800, speed: 6, color: '#a855f7', ammo: 3, reload: 1.5, type: 'Shotgun', unlocked: true } 
    } 
};
window.Textures = window.Textures || { floor: null, bush: null, wall: null };

console.log('game.js loaded, window.keys =', window.keys);
console.log('window.state =', window.state);
console.log('window.playerState =', window.playerState);

// ========== GAME ENGINE ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameLoopId = null;
let preBattleStart = null;
const fightTextEl = document.getElementById('fight-text');

function checkCollision(x, y, radius) {
    if (!window.state.battle || !window.state.battle.active) return false;
    for (const wall of window.state.battle.walls) {
        if (x + radius > wall.x && x - radius < wall.x + window.CONFIG.TILE_SIZE &&
            y + radius > wall.y && y - radius < wall.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    return false;
}

function startBattlePre() {
    console.log('startBattlePre called');
    startBattle();
    window.state.preBattle = true;
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    window.state.battle.camera.x = fullSize/2 - (canvas.width/2)/window.state.battle.camera.zoom;
    window.state.battle.camera.y = fullSize/2 - (canvas.height/2)/window.state.battle.camera.zoom;
    preBattleStart = Date.now();
    document.getElementById('battle-ui').style.display = 'none';
}

function startBattle() {
    window.state.screen = 'battle';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('battle-screen').classList.remove('hidden');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const bData = window.CONFIG.BRAWLERS[window.state.currentBrawler];
    
    window.state.battle = {
        active: true,
        camera: { x: 0, y: 0, zoom: 0.8 },
        poisonRadius: fullSize / 1.1,
        player: null,
        bullets: [],
        walls: [],
        bushes: [],
        bots: [],
        joystick: { move: { x: 0, y: 0 }, attack: { x: 0, y: 0 } }
    };

    for(let i=0; i<window.CONFIG.MAP_SIZE; i++) {
        for(let j=0; j<window.CONFIG.MAP_SIZE; j++) {
            const rand = Math.random();
            if(rand < 0.08)
                window.state.battle.walls.push({ x: i*window.CONFIG.TILE_SIZE, y: j*window.CONFIG.TILE_SIZE });
            else if(rand < 0.20)
                window.state.battle.bushes.push({ x: i*window.CONFIG.TILE_SIZE, y: j*window.CONFIG.TILE_SIZE });
        }
    }

    function safeSpawn(radius) {
        let x, y, tries = 0;
        do {
            x = Math.random() * fullSize;
            y = Math.random() * fullSize;
            tries++;
            if (tries > 500) break;
        } while (
            window.state.battle.walls.some(w =>
                x + radius > w.x && x - radius < w.x + window.CONFIG.TILE_SIZE &&
                y + radius > w.y && y - radius < w.y + window.CONFIG.TILE_SIZE
            )
        );
        return { x, y };
    }

    const spawn = safeSpawn(25);
    window.state.battle.player = {
        id: 'player',
        name: window.playerState.name,
        x: spawn.x, y: spawn.y,
        hp: bData.hp, maxHp: bData.hp,
        ammo: 3, maxAmmo: 3,
        type: window.state.currentBrawler,
        reloading: 0, angle: 0,
        inBush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() + 3000
    };

    for(let i=0; i<9; i++) {
        const botSpawn = safeSpawn(25);
        window.state.battle.bots.push({
            id: 'bot_'+i, name: 'Bot-'+(i+1),
            x: botSpawn.x, y: botSpawn.y,
            hp: window.CONFIG.BRAWLERS['Mystery'].hp, maxHp: window.CONFIG.BRAWLERS['Mystery'].hp,
            type: 'Mystery', speed: window.CONFIG.BRAWLERS['Mystery'].speed,
            angle: Math.random()*Math.PI*2, lastShot: 0,
            inBush: false, invincibleUntil: Date.now() + 3000
        });
    }

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function gameLoop() {
    if(!window.state.battle || !window.state.battle.active) return;
    updateGame();
    drawGame();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateGame() {
    const battle = window.state.battle;
    const p = battle.player;
    const mapLimit = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;

    if (window.state.preBattle) {
        const elapsed = Date.now() - preBattleStart;
        const duration = 1000;
        if (elapsed < duration) {
            const startX = mapLimit/2 - (canvas.width/2)/battle.camera.zoom;
            const startY = mapLimit/2 - (canvas.height/2)/battle.camera.zoom;
            const targetX = p.x - (canvas.width/2)/battle.camera.zoom;
            const targetY = p.y - (canvas.height/2)/battle.camera.zoom;
            const t = elapsed / duration;
            battle.camera.x = startX + (targetX - startX) * t;
            battle.camera.y = startY + (targetY - startY) * t;
        } else {
            window.state.preBattle = false;
            fightTextEl.style.opacity = '1';
            setTimeout(() => {
                fightTextEl.style.opacity = '0';
                document.getElementById('battle-ui').style.display = 'flex';
            }, 800);
        }
        return;
    }

    updateKeyboardMovement();

    const move = battle.joystick.move;
    const len = Math.hypot(move.x, move.y);

    if (len > 0) {
        const speed = window.CONFIG.BRAWLERS[window.state.currentBrawler].speed;
        let dx = (move.x / len) * speed;
        let dy = (move.y / len) * speed;

        let newX = p.x + dx;
        let newY = p.y;
        if (!checkCollision(newX, newY, 25)) {
            p.x = Math.max(25, Math.min(mapLimit - 25, newX));
        }
        newX = p.x;
        newY = p.y + dy;
        if (!checkCollision(newX, newY, 25)) {
            p.y = Math.max(25, Math.min(mapLimit - 25, newY));
        }
    }

    if (p.ammo < p.maxAmmo) {
        if (Date.now() - p.lastAttackTime > 1500) {
            p.ammo = Math.min(p.maxAmmo, p.ammo + 0.01);
        }
    }

    battle.bullets = battle.bullets.filter(b => {
        const speed = 12;
        const nextX = b.x + Math.cos(b.angle) * speed;
        const nextY = b.y + Math.sin(b.angle) * speed;

        if (checkCollision(nextX, nextY, 8)) {
            return false;
        }
    
        b.x = nextX;
        b.y = nextY;
        b.dist += speed;
    
        if (b.dist > 600) return false;
    
        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0) continue;
            if (Math.hypot(b.x - t.x, b.y - t.y) < 30) {
                if (!t.invincibleUntil || Date.now() > t.invincibleUntil) {
                    t.hp -= 800;
                    if (t.id === 'player') {
                        t.lastDamageTime = Date.now();
                    }
                }
                return false;
            }
        }
        return true;
    });

    battle.bots.forEach(bot => {
        if(bot.hp <= 0) return;
        if (Math.random() < 0.02)
            bot.angle += (Math.random() - 0.5);
        
        let nx = bot.x + Math.cos(bot.angle) * bot.speed;
        let ny = bot.y + Math.sin(bot.angle) * bot.speed;
        
        nx = Math.max(25, Math.min(mapLimit - 25, nx));
        ny = Math.max(25, Math.min(mapLimit - 25, ny));

        if (!checkCollision(nx, ny, 25)) {
            bot.x = nx;
            bot.y = ny;
        } else {
            bot.angle += (Math.random() - 0.5) * Math.PI;
        }
        
        let targets = [p, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0)];
        let closest = null;
        let minDist = Infinity;
        for (let t of targets) {
            const d = Math.hypot(bot.x - t.x, bot.y - t.y);
            if (d < minDist) {
                minDist = d;
                closest = t;
            }
        }
        if (closest && minDist < 400) {
            if (Date.now() - bot.lastShot > 2000) {
                spawnBullet(bot, Math.atan2(closest.y - bot.y, closest.x - bot.x), false);
                bot.lastShot = Date.now();
            }
        }
    });

    const aliveCount = (p.hp > 0 ? 1 : 0) + battle.bots.filter(b => b.hp > 0).length;
    document.getElementById('brawlers-left').innerText = aliveCount;

    battle.poisonRadius -= 0.05;
    const centerX = mapLimit / 2;
    const centerY = mapLimit / 2;
    const allEntities = [p, ...battle.bots];
    allEntities.forEach(ent => {
        if(ent.hp <= 0) return;
        const dist = Math.hypot(ent.x - centerX, ent.y - centerY);
        if (dist > battle.poisonRadius) {
            if (!ent.invincibleUntil || Date.now() > ent.invincibleUntil) {
                ent.hp -= 2;
                if (ent.id === 'player') ent.lastDamageTime = Date.now();
            }
        }
    });

    const now = Date.now();
    if (now - p.lastDamageTime > 3000 && now - p.lastAttackTime > 2000 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 5);
    }

    if (p.hp <= 0) {
        alert("You finished in Rank #" + aliveCount);
        exitBattle();
        return;
    }

    if (aliveCount === 1 && p.hp > 0) {
        alert("Victory! Rank #1");
        window.playerState.coins += 50;
        window.playerState.trophies += 10;
        if (typeof updateStatsUI === 'function') updateStatsUI();
        if (typeof saveProfileToDB === 'function') saveProfileToDB();
        exitBattle();
        return;
    }

    battle.camera.x = p.x - (canvas.width / 2) / battle.camera.zoom;
    battle.camera.y = p.y - (canvas.height / 2) / battle.camera.zoom;
}

function exitBattle() {
    window.state.battle.active = false;
    window.state.screen = 'menu';
    document.getElementById('battle-screen').classList.add('hidden');
    document.getElementById('menu-screen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

function drawBrawler(ctx, type, x, y, size = 80, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const grad = ctx.createRadialGradient(-10, -10, 10, 0, 0, 40);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(1, '#4a1d6d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 32, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-12, -8, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -8, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2d1b0e';
    ctx.beginPath(); ctx.arc(-12, -6, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, -6, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-14, -10, 1.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, -10, 1.5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#5d3a1a';
    ctx.beginPath(); ctx.ellipse(0, -28, 22, 10, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#8b5a2b';
    ctx.beginPath(); ctx.rect(-20, -38, 40, 10); ctx.fill();
    ctx.fillStyle = '#4a3729';
    ctx.fillRect(20, -10, 30, 8);
    ctx.fillRect(45, -14, 6, 16);
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawGame() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    
    ctx.scale(window.state.battle.camera.zoom, window.state.battle.camera.zoom);
    ctx.translate(-window.state.battle.camera.x, -window.state.battle.camera.y);
    
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    
    const startCol = Math.max(0, Math.floor(window.state.battle.camera.x / window.CONFIG.TILE_SIZE));
    const endCol = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.x + canvas.width/window.state.battle.camera.zoom) / window.CONFIG.TILE_SIZE));
    const startRow = Math.max(0, Math.floor(window.state.battle.camera.y / window.CONFIG.TILE_SIZE));
    const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.y + canvas.height/window.state.battle.camera.zoom) / window.CONFIG.TILE_SIZE));
    
    for(let i=startCol; i<endCol; i++) {
        for(let j=startRow; j<endRow; j++) {
            ctx.drawImage(window.Textures.floor, i*64, j*64, 64, 64);
        }
    }
    
    window.state.battle.bushes.forEach(b => {
        if (b.x + 64 > window.state.battle.camera.x && b.x < window.state.battle.camera.x + canvas.width/window.state.battle.camera.zoom &&
            b.y + 64 > window.state.battle.camera.y && b.y < window.state.battle.camera.y + canvas.height/window.state.battle.camera.zoom) {
            ctx.drawImage(window.Textures.bush, b.x, b.y, 64, 64);
        }
    });
    
    window.state.battle.walls.forEach(w => {
        if (w.x + 64 > window.state.battle.camera.x && w.x < window.state.battle.camera.x + canvas.width/window.state.battle.camera.zoom &&
            w.y + 64 > window.state.battle.camera.y && w.y < window.state.battle.camera.y + canvas.height/window.state.battle.camera.zoom) {
            ctx.drawImage(window.Textures.wall, w.x, w.y, 64, 64);
        }
    });

    const drawChar = (c, isPlayer) => {
        if(c.hp <= 0) return;
        
        ctx.save();
        ctx.translate(c.x, c.y);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Luckiest Guy';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, 0, -70);

        drawBrawler(ctx, c.type, 0, 0, 80, c.angle);

        const bw = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-bw/2, -50, bw, 12);
        ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
        ctx.fillRect(-bw/2, -50, (c.hp/c.maxHp)*bw, 12);
        
        if (isPlayer) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-bw/2, -36, bw, 6);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-bw/2, -36, (c.ammo / c.maxAmmo) * bw, 6);
        }
        ctx.restore();
    };

    drawChar(window.state.battle.player, true);
    window.state.battle.bots.forEach(b => drawChar(b, false));

    window.state.battle.bullets.forEach(b => {
        ctx.fillStyle = b.super ? '#fbbf24' : 'white';
        ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI*2); ctx.fill();
    });

    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.rect(-2000, -2000, fullSize+4000, fullSize+4000);
    const mapCenter = fullSize / 2;
    ctx.arc(mapCenter, mapCenter, window.state.battle.poisonRadius, 0, Math.PI*2, true);
    ctx.fill();
    ctx.restore();
}

// ========== INPUT HANDLING (with safety checks) ==========
window.onkeydown = (e) => { 
    // Guard against missing event or key property
    if (!e || typeof e.key !== 'string') return;
    const key = e.key.toLowerCase();
    // Ensure window.keys exists (it should, but double-check)
    if (window.keys && key in window.keys) {
        window.keys[key] = true;
    } else {
        console.warn('Key event ignored: keys not ready or key not tracked', key);
    }
};

window.onkeyup = (e) => { 
    if (!e || typeof e.key !== 'string') return;
    const key = e.key.toLowerCase();
    if (window.keys && key in window.keys) {
        window.keys[key] = false;
    }
};

function updateKeyboardMovement() {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle) return;
    let kx = 0, ky = 0;
    if (window.keys.w) ky -= 1;
    if (window.keys.s) ky += 1;
    if (window.keys.a) kx -= 1;
    if (window.keys.d) kx += 1;
    if (kx !== 0 || ky !== 0) {
        const mag = Math.hypot(kx, ky);
        window.state.battle.joystick.move.x = kx / mag;
        window.state.battle.joystick.move.y = ky / mag;
    } else {
        window.state.battle.joystick.move.x = 0;
        window.state.battle.joystick.move.y = 0;
    }
}

function setupJoystick(id, stickId, type) {
    const base = document.getElementById(id);
    const stick = document.getElementById(stickId);
    let active = false;
    const handleInput = (e) => {
        if (!active) return;
        const touch = e.touches ? e.touches[0] : e;
        const rect = base.getBoundingClientRect();
        const centerX = rect.left + rect.width/2;
        const centerY = rect.top + rect.height/2;
        let dx = touch.clientX - centerX;
        let dy = touch.clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const max = 50;
        if (dist > max) { dx *= max/dist; dy *= max/dist; }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        window.state.battle.joystick[type] = { x: dx/max, y: dy/max };
    };
    base.addEventListener('touchstart', (e) => { active = true; handleInput(e); });
    window.addEventListener('touchmove', handleInput);
    window.addEventListener('touchend', () => { 
        if(active && type === 'attack') {
            if(Math.hypot(window.state.battle.joystick.attack.x, window.state.battle.joystick.attack.y) > 0.5) {
                const ang = Math.atan2(window.state.battle.joystick.attack.y, window.state.battle.joystick.attack.x);
                spawnBullet(window.state.battle.player, ang, false);
            }
        }
        active = false; 
        stick.style.transform = 'translate(0,0)';
        window.state.battle.joystick[type] = { x: 0, y: 0 };
    });
}

setupJoystick('move-joy-base', 'move-joy-stick', 'move');
setupJoystick('attack-joy-base', 'attack-joy-stick', 'attack');

canvas.addEventListener('mousedown', (e) => {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    const ang = Math.atan2(worldY - p.y, worldX - p.x);
    spawnBullet(p, ang, false);
});

document.getElementById('super-btn').onclick = (e) => {
    e.stopPropagation();
    if (window.state.battle && window.state.battle.player && !window.state.preBattle) {
        spawnBullet(window.state.battle.player, window.state.battle.player.angle, true);
    }
};

function spawnBullet(owner, angle, isSuper) {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle) return;
    if (owner.id === 'player') {
        owner.lastAttackTime = Date.now();
        owner.angle = angle;
    }
    if (owner.id === 'player' && !isSuper && owner.ammo <= 0.9) return;
    if (owner.id === 'player' && !isSuper) owner.ammo--;
    const count = (owner.type === 'Mystery') ? 5 : 1;
    for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.15;
        window.state.battle.bullets.push({
            x: owner.x,
            y: owner.y,
            angle: angle + spread,
            dist: 0,
            super: isSuper,
            ownerId: owner.id
        });
    }
}
