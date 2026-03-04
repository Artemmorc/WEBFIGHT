// ========== GLOBAL FALLBACKS ==========
window.keys = window.keys || { w: false, a: false, s: false, d: false };
window.state = window.state || { battle: { active: false } };
window.playerState = window.playerState || { name: 'Mystery' };
window.CONFIG = window.CONFIG || { 
    MAP_SIZE: 60, 
    TILE_SIZE: 64, 
    BRAWLERS: { 
        Mystery: { hp: 3800, speed: 6, color: '#a855f7', ammo: 3, reload: 1.5, type: 'Shotgun', unlocked: true } 
    } 
};
window.Textures = window.Textures || { floor: null, bush: null, wall: null };

if (!window.state.currentBrawler) {
    window.state.currentBrawler = 'Mystery';
}

console.log('game.js loaded, window.keys =', window.keys);

// ========== GAME ENGINE ==========
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let gameLoopId = null;
let preBattleStart = null;
const fightTextEl = document.getElementById('fight-text');

let powerCubesCollected = 0;
let deathAnimationStart = 0;
let deathAnimationDuration = 1500;
let playerDead = false;

function checkCollision(x, y, radius) {
    if (!window.state.battle || !window.state.battle.active) return false;
    for (const wall of window.state.battle.walls) {
        if (x + radius > wall.x && x - radius < wall.x + window.CONFIG.TILE_SIZE &&
            y + radius > wall.y && y - radius < wall.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const water of window.state.battle.water || []) {
        if (x + radius > water.x && x - radius < water.x + window.CONFIG.TILE_SIZE &&
            y + radius > water.y && y - radius < water.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const barrel of window.state.battle.barrels || []) {
        if (x + radius > barrel.x && x - radius < barrel.x + window.CONFIG.TILE_SIZE &&
            y + radius > barrel.y && y - radius < barrel.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const box of window.state.battle.boxes || []) {
        if (box.hp > 0 && x + radius > box.x && x - radius < box.x + window.CONFIG.TILE_SIZE &&
            y + radius > box.y && y - radius < box.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    return false;
}

async function startBattlePre() {
    console.log('startBattlePre called');
    document.getElementById('prematch-loading').classList.add('active');
    
    let customMap = null;
    if (typeof window.sb !== 'undefined') {
        try {
            const { data, error } = await window.sb
                .from('maps')
                .select('map_data')
                .eq('is_active', true)
                .maybeSingle();
            if (!error && data) {
                customMap = data.map_data;
                console.log('Loaded active map from server');
            }
        } catch (e) {
            console.warn('Could not load active map, using random', e);
        }
    }
    
    setTimeout(() => {
        document.getElementById('prematch-loading').classList.remove('active');
        startBattle(customMap);
        window.state.preBattle = true;
        const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
        window.state.battle.camera.x = fullSize/2 - (canvas.width/2)/window.state.battle.camera.zoom;
        window.state.battle.camera.y = fullSize/2 - (canvas.height/2)/window.state.battle.camera.zoom;
        preBattleStart = Date.now();
        document.getElementById('battle-ui').style.display = 'none';
    }, 500);
}

function startBattle(customMap = null) {
    window.state.screen = 'battle';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('battle-screen').classList.remove('hidden');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const brawlerName = window.state.currentBrawler || 'Mystery';
    const bData = window.CONFIG.BRAWLERS[brawlerName];
    if (!bData) {
        console.error('Brawler data not found for', brawlerName);
        return;
    }
    
    powerCubesCollected = 0;
    
    window.state.battle = {
        active: true,
        camera: { x: 0, y: 0, zoom: 0.8 },
        poisonRadius: fullSize / 1.1,
        player: null,
        bullets: [],
        walls: [],
        bushes: [],
        water: [],
        boxes: [],
        powerCubes: [],
        barrels: [],
        spawnPoints: [],
        bots: [],
        joystick: { move: { x: 0, y: 0 }, attack: { x: 0, y: 0 } }
    };

    if (customMap) {
        for (let y = 0; y < window.CONFIG.MAP_SIZE; y++) {
            for (let x = 0; x < window.CONFIG.MAP_SIZE; x++) {
                const type = customMap[y][x];
                const worldX = x * window.CONFIG.TILE_SIZE;
                const worldY = y * window.CONFIG.TILE_SIZE;
                if (type === 1) window.state.battle.walls.push({ x: worldX, y: worldY });
                else if (type === 2) window.state.battle.bushes.push({ x: worldX, y: worldY });
                else if (type === 3) window.state.battle.water.push({ x: worldX, y: worldY });
                else if (type === 4) window.state.battle.boxes.push({ x: worldX, y: worldY, hp: 6000 });
                else if (type === 5) window.state.battle.barrels.push({ x: worldX, y: worldY });
                else if (type === 6) window.state.battle.spawnPoints.push({ x: worldX + 32, y: worldY + 32 });
            }
        }
    } else {
        for(let i=0; i<window.CONFIG.MAP_SIZE; i++) {
            for(let j=0; j<window.CONFIG.MAP_SIZE; j++) {
                const rand = Math.random();
                if(rand < 0.08)
                    window.state.battle.walls.push({ x: i*window.CONFIG.TILE_SIZE, y: j*window.CONFIG.TILE_SIZE });
                else if(rand < 0.20)
                    window.state.battle.bushes.push({ x: i*window.CONFIG.TILE_SIZE, y: j*window.CONFIG.TILE_SIZE });
            }
        }
    }

    function isInBush(x, y) {
        for (let bush of window.state.battle.bushes) {
            if (x >= bush.x && x < bush.x + window.CONFIG.TILE_SIZE &&
                y >= bush.y && y < bush.y + window.CONFIG.TILE_SIZE) {
                return true;
            }
        }
        return false;
    }

    function canSee(observer, target, currentTime) {
        if (target.revealUntil && target.revealUntil > currentTime) return true;
        if (!isInBush(target.x, target.y)) return true;
        const distance = Math.hypot(observer.x - target.x, observer.y - target.y);
        return distance < 3 * window.CONFIG.TILE_SIZE;
    }

    function pickSpawnPoint(excludeList = []) {
        if (window.state.battle.spawnPoints.length === 0) return safeSpawn(25);
        const shuffled = [...window.state.battle.spawnPoints].sort(() => Math.random() - 0.5);
        for (let spawn of shuffled) {
            const used = excludeList.some(u => u.x === spawn.x && u.y === spawn.y);
            if (!used) return spawn;
        }
        return safeSpawn(25);
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
            ) ||
            window.state.battle.water.some(w =>
                x + radius > w.x && x - radius < w.x + window.CONFIG.TILE_SIZE &&
                y + radius > w.y && y - radius < w.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.barrels.some(b =>
                x + radius > b.x && x - radius < b.x + window.CONFIG.TILE_SIZE &&
                y + radius > b.y && y - radius < b.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.boxes.some(b =>
                b.hp > 0 && x + radius > b.x && x - radius < b.x + window.CONFIG.TILE_SIZE &&
                y + radius > b.y && y - radius < b.y + window.CONFIG.TILE_SIZE
            )
        );
        return { x, y };
    }

    const usedSpawns = [];
    const playerSpawn = pickSpawnPoint(usedSpawns);
    usedSpawns.push(playerSpawn);
    window.state.battle.player = {
        id: 'player',
        name: window.playerState.name,
        x: playerSpawn.x,
        y: playerSpawn.y,
        hp: bData.hp, 
        maxHp: bData.hp,
        ammo: 3, maxAmmo: 3,
        type: brawlerName,
        reloading: 0, angle: 0,
        inBush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() + 3000,
        power: 0,
        revealUntil: 0
    };

    for(let i=0; i<9; i++) {
        const botSpawn = pickSpawnPoint(usedSpawns);
        usedSpawns.push(botSpawn);
        window.state.battle.bots.push({
            id: 'bot_'+i, name: 'Bot-'+(i+1),
            x: botSpawn.x, y: botSpawn.y,
            hp: window.CONFIG.BRAWLERS['Mystery'].hp, 
            maxHp: window.CONFIG.BRAWLERS['Mystery'].hp,
            type: 'Mystery', speed: window.CONFIG.BRAWLERS['Mystery'].speed,
            angle: Math.random()*Math.PI*2, lastShot: 0,
            inBush: false, invincibleUntil: Date.now() + 3000,
            power: 0,
            revealUntil: 0
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
    const now = Date.now();

    if (playerDead) {
        const elapsed = now - deathAnimationStart;
        if (elapsed < deathAnimationDuration) {
            const t = elapsed / deathAnimationDuration;
            battle.camera.zoom = 0.8 + (0.5 - 0.8) * t;
            battle.camera.x = p.x - (canvas.width/2)/battle.camera.zoom;
            battle.camera.y = p.y - (canvas.height/2)/battle.camera.zoom;
        } else {
            playerDead = false;
            battle.active = false;
            showAfterGame(window.state.lastRank, window.state.lastCoins);
            exitBattle();
        }
        return;
    }

    if (window.state.preBattle) {
        const elapsed = now - preBattleStart;
        if (elapsed < 1000) {
            const t = elapsed / 1000;
            const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
            const startX = fullSize/2 - (canvas.width/2)/battle.camera.zoom;
            const startY = fullSize/2 - (canvas.height/2)/battle.camera.zoom;
            const targetX = p.x - (canvas.width/2)/battle.camera.zoom;
            const targetY = p.y - (canvas.height/2)/battle.camera.zoom;
            battle.camera.x = startX + (targetX - startX) * t;
            battle.camera.y = startY + (targetY - startY) * t;
        } else {
            window.state.preBattle = false;
            // Show FIGHT! text
            if (fightTextEl) {
                fightTextEl.style.opacity = '1';
                setTimeout(() => {
                    fightTextEl.style.opacity = '0';
                    document.getElementById('battle-ui').style.display = 'flex';
                }, 800);
            } else {
                document.getElementById('battle-ui').style.display = 'flex';
            }
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
        if (!checkCollision(newX, newY, 25)) p.x = Math.max(25, Math.min(mapLimit - 25, newX));
        newX = p.x;
        newY = p.y + dy;
        if (!checkCollision(newX, newY, 25)) p.y = Math.max(25, Math.min(mapLimit - 25, newY));
        p.angle = Math.atan2(dy, dx);
    }

    // Box destruction
    battle.bullets = battle.bullets.filter(b => {
        const speed = 12;
        const nextX = b.x + Math.cos(b.angle) * speed;
        const nextY = b.y + Math.sin(b.angle) * speed;

        for (let box of battle.boxes) {
            if (box.hp <= 0) continue;
            if (nextX + 8 > box.x && nextX - 8 < box.x + 64 &&
                nextY + 8 > box.y && nextY - 8 < box.y + 64) {
                box.hp -= 800;
                if (box.hp <= 0) {
                    battle.powerCubes.push({ x: box.x + 32, y: box.y + 32, collected: false });
                }
                return false;
            }
        }

        if (checkCollision(nextX, nextY, 8)) return false;

        b.x = nextX;
        b.y = nextY;
        b.dist += speed;
        if (b.dist > 600) return false;

        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0) continue;
            if (Math.hypot(b.x - t.x, b.y - t.y) < 30) {
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    let damage = 800;
                    if (b.ownerId === 'player' && p.power > 0) {
                        damage += p.power * 200;
                    }
                    t.hp -= damage;
                    if (t.id === 'player') {
                        t.lastDamageTime = now;
                    }
                }
                return false;
            }
        }
        return true;
    });

    // Power cube collection
    for (let i = battle.powerCubes.length - 1; i >= 0; i--) {
        const cube = battle.powerCubes[i];
        if (!cube.collected && Math.hypot(p.x - cube.x, p.y - cube.y) < 30) {
            cube.collected = true;
            p.power++;
            p.maxHp += 500;
            p.hp = Math.min(p.hp + 500, p.maxHp);
            powerCubesCollected++;
        }
    }

    if (p.ammo < p.maxAmmo && now - p.lastAttackTime > 1500) {
        p.ammo = Math.min(p.maxAmmo, p.ammo + 0.01);
    }

    // Bot AI
    battle.bots.forEach(bot => {
        if(bot.hp <= 0) return;
        if (Math.random() < 0.02) bot.angle += (Math.random() - 0.5);
        
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
        let visibleTargets = targets.filter(t => canSee(bot, t, now));
        let closest = null, minDist = Infinity;
        for (let t of visibleTargets) {
            const d = Math.hypot(bot.x - t.x, bot.y - t.y);
            if (d < minDist) { minDist = d; closest = t; }
        }
        if (closest && minDist < 400 && now - bot.lastShot > 2000) {
            spawnBullet(bot, Math.atan2(closest.y - bot.y, closest.x - bot.x), false);
            bot.lastShot = now;
            bot.revealUntil = now + 500;
        }
    });

    const aliveCount = (p.hp > 0 ? 1 : 0) + battle.bots.filter(b => b.hp > 0).length;
    document.getElementById('brawlers-left').innerText = aliveCount;

    battle.poisonRadius -= 0.05;
    const centerX = mapLimit / 2, centerY = mapLimit / 2;
    [...battle.bots, p].forEach(ent => {
        if(ent.hp <= 0) return;
        const dist = Math.hypot(ent.x - centerX, ent.y - centerY);
        if (dist > battle.poisonRadius && (!ent.invincibleUntil || now > ent.invincibleUntil)) {
            ent.hp -= 2;
            if (ent.id === 'player') ent.lastDamageTime = now;
        }
    });

    // Faster HP regen
    if (now - p.lastDamageTime > 2000 && now - p.lastAttackTime > 1500 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 10);
    }

    if (p.hp <= 0) {
        playerDead = true;
        deathAnimationStart = now;
        window.state.lastRank = aliveCount;
        window.state.lastCoins = 0;
        return;
    }

    if (aliveCount === 1 && p.hp > 0) {
        const coinsEarned = 50 + Math.floor(Math.random() * 30) + p.power * 10;
        window.playerState.coins += coinsEarned;
        window.playerState.trophies += 10;
        if (typeof updateStatsUI === 'function') updateStatsUI();
        if (typeof saveProfileToDB === 'function') saveProfileToDB();
        showAfterGame(1, coinsEarned);
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
    window.keys = { w: false, a: false, s: false, d: false };
}

function showAfterGame(rank, coins) {
    const menu = document.getElementById('aftergame-menu');
    document.getElementById('aftergame-rank').innerText = `Rank #${rank}`;
    document.getElementById('aftergame-reward').innerText = `+${coins} coins`;
    menu.style.opacity = '0';
    menu.style.display = 'flex';
    setTimeout(() => menu.style.opacity = '1', 50);
}

function hideAfterGame() {
    const menu = document.getElementById('aftergame-menu');
    menu.style.opacity = '0';
    setTimeout(() => {
        menu.style.display = 'none';
        document.getElementById('menu-screen').style.display = 'flex';
    }, 300);
}

// ========== DRAWING FUNCTIONS ==========
function drawBrawler(ctx, type, x, y, size = 80, angle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;
    
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 20, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-4, -22, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -22, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2d1b0e';
    ctx.beginPath(); ctx.arc(-4, -21, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -21, 1.2, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = '#5d3a1a';
    ctx.beginPath(); ctx.ellipse(0, -30, 14, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-8, -32, 16, 4);
    
    ctx.fillStyle = '#4a2e1e';
    ctx.beginPath(); ctx.ellipse(-14, -5, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(14, -5, 6, 8, 0, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = '#4a3729';
    ctx.fillRect(10, -3, 24, 5);
    ctx.fillRect(28, -6, 5, 11);
    ctx.restore();
}

function drawBox(ctx, x, y) {
    ctx.save();
    ctx.translate(x + 32, y + 32);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(-25, -25, 50, 50);
    ctx.strokeStyle = '#4a3729';
    ctx.lineWidth = 2;
    ctx.strokeRect(-25, -25, 50, 50);
    
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(-25, -10, 50, 5);
    ctx.fillRect(-25, 5, 50, 5);
    ctx.restore();
}

function drawPowerCube(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(-5, -5, 10, 10);
    ctx.restore();
}

function drawBarrel(ctx, x, y) {
    ctx.save();
    ctx.translate(x + 32, y + 32);
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 25, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#4a3729';
    ctx.fillRect(-22, -15, 44, 6);
    ctx.fillRect(-22, 10, 44, 6);
    ctx.restore();
}

function isInBush(x, y) {
    for (let bush of window.state.battle.bushes) {
        if (x >= bush.x && x < bush.x + window.CONFIG.TILE_SIZE &&
            y >= bush.y && y < bush.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    return false;
}

function canSee(observer, target, currentTime) {
    if (target.revealUntil && target.revealUntil > currentTime) return true;
    if (!isInBush(target.x, target.y)) return true;
    const distance = Math.hypot(observer.x - target.x, observer.y - target.y);
    return distance < 3 * window.CONFIG.TILE_SIZE;
}

function drawGame() {
    ctx.clearRect(0,0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    
    ctx.scale(window.state.battle.camera.zoom, window.state.battle.camera.zoom);
    ctx.translate(-window.state.battle.camera.x, -window.state.battle.camera.y);
    
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const startCol = Math.max(0, Math.floor(window.state.battle.camera.x / 64));
    const endCol = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.x + canvas.width/window.state.battle.camera.zoom) / 64));
    const startRow = Math.max(0, Math.floor(window.state.battle.camera.y / 64));
    const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.y + canvas.height/window.state.battle.camera.zoom) / 64));
    const now = Date.now();
    const p = window.state.battle.player;
    
    // Floor
    for(let i=startCol; i<endCol; i++) {
        for(let j=startRow; j<endRow; j++) {
            ctx.drawImage(window.Textures.floor, i*64, j*64, 64, 64);
        }
    }
    
    // Bushes (solid)
    window.state.battle.bushes.forEach(b => {
        ctx.drawImage(window.Textures.bush, b.x, b.y, 64, 64);
    });
    
    // Water
    window.state.battle.water?.forEach(w => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(w.x, w.y, 64, 64);
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(w.x + 10, w.y + 10 + i*20, 44, 4);
        }
    });
    
    // Boxes
    window.state.battle.boxes?.forEach(b => {
        if (b.hp > 0) {
            drawBox(ctx, b.x, b.y);
            if (b.hp < 6000) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(b.x + 5, b.y - 10, 54, 8);
                ctx.fillStyle = '#f97316';
                ctx.fillRect(b.x + 5, b.y - 10, (b.hp / 6000) * 54, 8);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Luckiest Guy';
                ctx.shadowColor = 'black';
                ctx.shadowBlur = 4;
                ctx.fillText(`${Math.ceil(b.hp)}`, b.x + 25, b.y - 15);
            }
        }
    });
    
    // Power cubes
    window.state.battle.powerCubes?.forEach(p => {
        if (!p.collected) drawPowerCube(ctx, p.x, p.y);
    });
    
    // Barrels
    window.state.battle.barrels?.forEach(b => drawBarrel(ctx, b.x, b.y));
    
    // Walls
    window.state.battle.walls.forEach(w => {
        ctx.drawImage(window.Textures.wall, w.x, w.y, 64, 64);
    });

    const drawChar = (c, isPlayer, viewer) => {
        if(c.hp <= 0) return;
        
        if (!isPlayer && !canSee(viewer, c, now)) return;
        
        ctx.save();
        ctx.translate(c.x, c.y);

        if (isPlayer && isInBush(c.x, c.y)) {
            ctx.globalAlpha = 0.75;
        }

        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Luckiest Guy';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, 0, -70);

        drawBrawler(ctx, c.type, 0, 0, 80, c.angle);

        if (isPlayer && c.power > 0) {
            ctx.save();
            ctx.translate(40, -60);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -5, 10, 10);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Luckiest Guy';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = 4;
            ctx.fillText(`x${c.power}`, 15, 5);
            ctx.restore();
        }

        const bw = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-bw/2, -50, bw, 12);
        ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
        const hpPercent = c.hp / c.maxHp;
        ctx.fillRect(-bw/2, -50, bw * hpPercent, 12);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Luckiest Guy';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;
        ctx.fillText(`${Math.ceil(c.hp)}/${c.maxHp}`, -bw/2, -55);
        
        if (isPlayer) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-bw/2, -36, bw, 6);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-bw/2, -36, (c.ammo / c.maxAmmo) * bw, 6);
        }
        ctx.restore();
        ctx.globalAlpha = 1;
    };

    if (playerDead) {
        ctx.globalAlpha = 1 - Math.min(1, (now - deathAnimationStart) / deathAnimationDuration);
        drawChar(p, true, p);
        ctx.globalAlpha = 1;
    } else {
        drawChar(p, true, p);
        window.state.battle.bots.forEach(b => drawChar(b, false, p));
    }

    window.state.battle.bullets.forEach(b => {
        ctx.fillStyle = b.super ? '#fbbf24' : 'white';
        ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI*2); ctx.fill();
    });

    // Poison gas
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.rect(-2000, -2000, fullSize+4000, fullSize+4000);
    ctx.arc(fullSize/2, fullSize/2, window.state.battle.poisonRadius, 0, Math.PI*2, true);
    ctx.fill();

    ctx.restore();
}

// ========== INPUT HANDLING (with input field detection) ==========
window.onkeydown = (e) => {
    if (!e) return;
    // If an input or textarea is focused, don't prevent default
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return; // allow typing
    }
    switch (e.code) {
        case 'KeyW': window.keys.w = true; e.preventDefault(); break;
        case 'KeyA': window.keys.a = true; e.preventDefault(); break;
        case 'KeyS': window.keys.s = true; e.preventDefault(); break;
        case 'KeyD': window.keys.d = true; e.preventDefault(); break;
    }
};

window.onkeyup = (e) => {
    if (!e) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
    }
    switch (e.code) {
        case 'KeyW': window.keys.w = false; e.preventDefault(); break;
        case 'KeyA': window.keys.a = false; e.preventDefault(); break;
        case 'KeyS': window.keys.s = false; e.preventDefault(); break;
        case 'KeyD': window.keys.d = false; e.preventDefault(); break;
    }
};

function updateKeyboardMovement() {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
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
            const joy = window.state.battle.joystick.attack;
            if (Math.hypot(joy.x, joy.y) > 0.5) {
                const ang = Math.atan2(joy.y, joy.x);
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
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    spawnBullet(p, Math.atan2(worldY - p.y, worldX - p.x), false);
});

document.getElementById('super-btn').onclick = (e) => {
    e.stopPropagation();
    if (window.state.battle && window.state.battle.player && !window.state.preBattle && !playerDead) {
        spawnBullet(window.state.battle.player, window.state.battle.player.angle, true);
    }
};

function spawnBullet(owner, angle, isSuper) {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    if (owner.id === 'player') {
        owner.lastAttackTime = Date.now();
        owner.angle = angle;
        owner.revealUntil = Date.now() + 500;
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
