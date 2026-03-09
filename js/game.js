console.log('game.js loaded');

// ========== GLOBAL FALLBACKS ==========
window.keys = window.keys || { w: false, a: false, s: false, d: false };
window.state = window.state || { battle: { active: false } };
window.playerState = window.playerState || { name: 'Mysteria' };
window.CONFIG = window.CONFIG || { 
    MAP_SIZE: 60, 
    TILE_SIZE: 64, 
    BRAWLERS: { 
        Mysteria: { hp: 3800, speed: 6, color: '#a855f7', ammo: 3, reload: 1.5, type: 'Shotgun', unlocked: true } 
    } 
};
window.Textures = window.Textures || { floor: null, bush: null, wall: null };

if (!window.state.currentBrawler) {
    window.state.currentBrawler = 'Mysteria';
}

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

// Cached DOM elements
let brawlersLeftEl = document.getElementById('brawlers-left');
let battleUiEl = document.getElementById('battle-ui');
const superBtn = document.getElementById('super-btn');
const killFeed = document.getElementById('kill-feed');

// ========== AIMING VARIABLES ==========
let mouseInsideCanvas = false;
let mouseAimAngle = 0;
let mouseDown = false;

// ========== KILL FEED QUEUE ==========
let killMessages = [];

function addKillMessage(killerName, victimName) {
    const msg = {
        text: `${killerName} killed ${victimName}`,
        time: Date.now()
    };
    killMessages.push(msg);
    // Remove after 3 seconds
    setTimeout(() => {
        killMessages = killMessages.filter(m => m !== msg);
    }, 3000);
}

// ========== JOYSTICK SETUP (MOUSE + TOUCH) ==========
function setupJoystick(id, stickId, type) {
    const base = document.getElementById(id);
    const stick = document.getElementById(stickId);
    let active = false;
    let rect = base.getBoundingClientRect();

    const updateRect = () => {
        rect = base.getBoundingClientRect();
    };

    const handleStart = (e) => {
        e.preventDefault();
        active = true;
        updateRect();
        handleMove(e);
    };

    const handleMove = (e) => {
        if (!active) return;
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        let dx = clientX - centerX;
        let dy = clientY - centerY;
        const dist = Math.hypot(dx, dy);
        const max = 50;
        if (dist > max) {
            dx = (dx / dist) * max;
            dy = (dy / dist) * max;
        }
        stick.style.transform = `translate(${dx}px, ${dy}px)`;
        const normX = dx / max;
        const normY = dy / max;
        window.state.battle.joystick[type] = { x: normX, y: normY };

        // If this is the attack joystick, update aim direction
        if (type === 'attack' && (normX !== 0 || normY !== 0)) {
            window.state.battle.aimAngle = Math.atan2(normY, normX);
            window.state.battle.isAiming = true;
        }
    };

    const handleEnd = (e) => {
        e.preventDefault();
        if (active && type === 'attack') {
            const joy = window.state.battle.joystick.attack;
            if (Math.hypot(joy.x, joy.y) > 0.5) {
                const ang = Math.atan2(joy.y, joy.x);
                spawnBullet(window.state.battle.player, ang, false);
            }
            // Clear aim
            window.state.battle.isAiming = false;
        }
        active = false;
        stick.style.transform = 'translate(0,0)';
        window.state.battle.joystick[type] = { x: 0, y: 0 };
    };

    // Touch events
    base.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });
    window.addEventListener('touchcancel', handleEnd, { passive: false });

    // Mouse events
    base.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    // Update rect on resize
    window.addEventListener('resize', updateRect);
}

// ========== UPDATE MOVE JOYSTICK VISUAL FROM KEYBOARD ==========
function updateMoveJoystickVisual() {
    const stick = document.getElementById('move-joy-stick');
    if (!stick) return;
    const joy = window.state.battle.joystick.move;
    const max = 50;
    const dx = joy.x * max;
    const dy = joy.y * max;
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

// ========== MOUSE AIMING (PC) ==========
canvas.addEventListener('mouseenter', () => {
    if (window.state.battle && window.state.battle.active) {
        mouseInsideCanvas = true;
    }
});

canvas.addEventListener('mouseleave', () => {
    mouseInsideCanvas = false;
    // Optionally clear aim flag
    if (window.state.battle) {
        window.state.battle.isAiming = false;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    if (p) {
        const angle = Math.atan2(worldY - p.y, worldX - p.x);
        window.state.battle.aimAngle = angle;
        window.state.battle.isAiming = true;
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    mouseDown = true;
    // Fire main attack on click
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    spawnBullet(p, Math.atan2(worldY - p.y, worldX - p.x), false);
});

window.addEventListener('mouseup', (e) => {
    mouseDown = false;
    // Don't clear aim on mouse up – we keep showing line while mouse is inside
});

// ========== BUSH VISIBILITY FUNCTIONS ==========
function isInBush(x, y) {
    const battle = window.state.battle;
    if (!battle) return false;
    for (let bush of battle.bushes) {
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

// ========== COLLISION ==========
function checkCollision(x, y, radius) {
    if (!window.state.battle || !window.state.battle.active) return false;
    const battle = window.state.battle;
    for (const wall of battle.walls) {
        if (x + radius > wall.x && x - radius < wall.x + window.CONFIG.TILE_SIZE &&
            y + radius > wall.y && y - radius < wall.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const water of battle.water || []) {
        if (x + radius > water.x && x - radius < water.x + window.CONFIG.TILE_SIZE &&
            y + radius > water.y && y - radius < water.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const barrel of battle.barrels || []) {
        if (x + radius > barrel.x && x - radius < barrel.x + window.CONFIG.TILE_SIZE &&
            y + radius > barrel.y && y - radius < barrel.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const box of battle.boxes || []) {
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
    let mapBackground = 'floor';
    if (typeof window.sb !== 'undefined') {
        try {
            const { data, error } = await window.sb
                .from('maps')
                .select('map_data, background')
                .eq('is_active', true)
                .maybeSingle();
            if (!error && data) {
                customMap = data.map_data;
                mapBackground = data.background || 'floor';
                console.log('Loaded active map from server, background:', mapBackground);
            }
        } catch (e) {
            console.warn('Could not load active map, using random', e);
        }
    }
    
    setTimeout(() => {
        document.getElementById('prematch-loading').classList.remove('active');
        startBattle(customMap, mapBackground);
        window.state.preBattle = true;
        const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
        if (window.state.battle && window.state.battle.camera) {
            window.state.battle.camera.x = fullSize/2 - (canvas.width/2)/window.state.battle.camera.zoom;
            window.state.battle.camera.y = fullSize/2 - (canvas.height/2)/window.state.battle.camera.zoom;
        }
        preBattleStart = Date.now();
        battleUiEl.style.display = 'none';
    }, 500);
}

function startBattle(customMap = null, background = 'floor') {
    window.state.screen = 'battle';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('battle-screen').classList.remove('hidden');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const brawlerName = window.state.currentBrawler || 'Mysteria';
    const bData = window.CONFIG.BRAWLERS[brawlerName];
    if (!bData) {
        console.error('Brawler data not found for', brawlerName);
        return;
    }
    
    const progress = (window.brawlerProgress && window.brawlerProgress[brawlerName]) || { level: 1 };
    const level = progress.level;
    const stats = typeof window.getBrawlerStats === 'function' 
        ? window.getBrawlerStats(brawlerName, level) 
        : { health: bData.hp, damage: 800, superDamage: 1200 };
    const maxHp = stats.health;
    
    powerCubesCollected = 0;
    killMessages = []; // clear kill feed
    
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
        joystick: { move: { x: 0, y: 0 }, attack: { x: 0, y: 0 } },
        background: background,
        isAiming: false,
        aimAngle: 0,
        deaths: [] // track dying bots
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
        hp: maxHp, 
        maxHp: maxHp,
        level: level,
        ammo: 3, maxAmmo: 3,
        type: brawlerName,
        reloading: 0, angle: 0,
        inBush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() + 3000,
        power: 0,
        revealUntil: 0,
        superCharge: 0,
        superMax: 100,
        dying: false,
        deathTime: 0
    };

    for(let i=0; i<9; i++) {
        const botSpawn = pickSpawnPoint(usedSpawns);
        usedSpawns.push(botSpawn);
        const botLevel = 1;
        const botStats = typeof window.getBrawlerStats === 'function'
            ? window.getBrawlerStats('Mysteria', botLevel)
            : { health: 3800, damage: 800, superDamage: 1200 };
        window.state.battle.bots.push({
            id: 'bot_'+i, 
            name: 'Bot-'+(i+1),
            x: botSpawn.x, y: botSpawn.y,
            hp: botStats.health, 
            maxHp: botStats.health,
            level: botLevel,
            type: 'Mysteria', 
            speed: window.CONFIG.BRAWLERS['Mysteria'].speed,
            angle: Math.random()*Math.PI*2, 
            lastShot: 0,
            inBush: false, 
            invincibleUntil: Date.now() + 3000,
            power: 0,
            revealUntil: 0,
            superCharge: 0,
            superMax: 100,
            dying: false,
            deathTime: 0
        });
    }

    if (gameLoopId) cancelAnimationFrame(gameLoopId);
    gameLoop();
}

function gameLoop() {
    if (!window.state.battle || !window.state.battle.active) {
        return;
    }
    updateGame();
    drawGame();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function updateGame() {
    const battle = window.state.battle;
    const p = battle.player;
    const mapLimit = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const now = Date.now();

    // Handle player death animation
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
            if (window.state.lastMatch) {
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned);
            }
            exitBattle();
        }
        return;
    }

    // Handle bot death animations (remove after short delay)
    battle.bots = battle.bots.filter(bot => {
        if (bot.dying) {
            const elapsed = now - bot.deathTime;
            return elapsed < 800; // keep for 800ms to show animation
        }
        return true;
    });

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
            if (fightTextEl) {
                fightTextEl.style.opacity = '1';
                setTimeout(() => {
                    fightTextEl.style.opacity = '0';
                    battleUiEl.style.display = 'flex';
                }, 800);
            } else {
                battleUiEl.style.display = 'flex';
            }
        }
        return;
    }

    updateKeyboardMovement();

    const move = battle.joystick.move;
    const len = Math.hypot(move.x, move.y);

    if (len > 0 && !p.dying) {
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

    // Process bullets
    battle.bullets = battle.bullets.filter(b => {
        const speed = 12;
        const nextX = b.x + Math.cos(b.angle) * speed;
        const nextY = b.y + Math.sin(b.angle) * speed;

        // Check box destruction
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
            if (t.id === b.ownerId || t.hp <= 0 || t.dying) continue;
            if (Math.hypot(b.x - t.x, b.y - t.y) < 30) {
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    const attackerType = 'Mysteria';
                    const stats = typeof window.getBrawlerStats === 'function'
                        ? window.getBrawlerStats(attackerType, b.level)
                        : { damage: 800, superDamage: 1200 };
                    let damage = b.super ? stats.superDamage : stats.damage;
                    if (b.ownerId === 'player' && p.power > 0) {
                        damage += p.power * 200;
                    }
                    t.hp -= damage;
                    t.revealUntil = now + 1000;
                    if (t.id === 'player') {
                        t.lastDamageTime = now;
                    }

                    // Super charge for player when dealing damage with normal attack
                    if (b.ownerId === 'player' && !b.super) {
                        p.superCharge = Math.min(p.superMax, p.superCharge + 10);
                    }

                    // Check if target died
                    if (t.hp <= 0 && !t.dying) {
                        t.dying = true;
                        t.deathTime = now;
                        // Determine killer name
                        let killerName = 'Unknown';
                        if (b.ownerId === 'player') {
                            killerName = p.name;
                        } else {
                            const killerBot = battle.bots.find(bot => bot.id === b.ownerId);
                            killerName = killerBot ? killerBot.name : 'Unknown';
                        }
                        addKillMessage(killerName, t.name);
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

    // Ammo recharge – constant, no delay after shooting
    if (p.ammo < p.maxAmmo && !p.dying) {
        p.ammo = Math.min(p.maxAmmo, p.ammo + 0.01);
    }

    // Bot AI (only if not dying)
    for (let bot of battle.bots) {
        if(bot.hp <= 0 || bot.dying) continue;
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
        
        let targets = [p, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0 && !b.dying)];
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
    }

    const aliveBots = battle.bots.filter(b => b.hp > 0 && !b.dying).length;
    const aliveCount = (p.hp > 0 && !p.dying ? 1 : 0) + aliveBots;
    brawlersLeftEl.innerText = aliveCount;

    // Poison gas
    battle.poisonRadius -= 0.05;
    const centerX = mapLimit / 2, centerY = mapLimit / 2;
    [...battle.bots, p].forEach(ent => {
        if(ent.hp <= 0 || ent.dying) return;
        const dist = Math.hypot(ent.x - centerX, ent.y - centerY);
        if (dist > battle.poisonRadius && (!ent.invincibleUntil || now > ent.invincibleUntil)) {
            ent.hp -= 2;
            if (ent.id === 'player') ent.lastDamageTime = now;
        }
    });

    // Natural regen (health)
    if (!p.dying && now - p.lastDamageTime > 2000 && now - p.lastAttackTime > 1500 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 10);
    }

    if (p.hp <= 0 && !p.dying) {
        p.dying = true;
        p.deathTime = now;
        playerDead = true;
        deathAnimationStart = now;
        window.state.lastMatch = {
            rank: aliveCount + 1, // +1 because player is dying but not yet removed
            coinsEarned: 0,
            starrdropEarned: false
        };
        return;
    }

    if (aliveCount === 1 && p.hp > 0 && !p.dying) {
        const coinsEarned = 50 + Math.floor(Math.random() * 30) + p.power * 10;
        window.playerState.coins += coinsEarned;
        
        const brawlerName = window.state.currentBrawler;
        const currentTrophies = (window.brawlerProgress[brawlerName]?.trophies) || 0;
        const trophyGain = 10;
        if (!window.brawlerProgress[brawlerName]) {
            window.brawlerProgress[brawlerName] = { trophies: 0, level: 1 };
        }
        window.brawlerProgress[brawlerName].trophies = currentTrophies + trophyGain;
        window.playerState.trophies = Object.values(window.brawlerProgress).reduce((a, b) => a + b.trophies, 0);
        
        let starrdropEarned = false;
        if (window.playerState.dailyWins < 3) {
            window.playerState.dailyWins++;
            if (window.currentProfile) window.currentProfile.daily_wins = window.playerState.dailyWins;
            starrdropEarned = true;
        }
        
        if (typeof saveProfileToDB === 'function') saveProfileToDB();
        if (typeof saveBrawlerProgress === 'function') {
            saveBrawlerProgress(brawlerName, window.brawlerProgress[brawlerName].trophies, window.brawlerProgress[brawlerName].level);
        }
        
        window.state.lastMatch = {
            rank: 1,
            coinsEarned: coinsEarned,
            starrdropEarned: starrdropEarned
        };
        
        showAfterGame(1, coinsEarned, starrdropEarned);
        exitBattle();
        return;
    }

    battle.camera.x = p.x - (canvas.width / 2) / battle.camera.zoom;
    battle.camera.y = p.y - (canvas.height / 2) / battle.camera.zoom;
}

function exitBattle() {
    console.log('exitBattle called');
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
    if (window.state.battle) {
        window.state.battle.active = false;
    }
    window.state.screen = 'menu';
    
    const battleScreen = document.getElementById('battle-screen');
    battleScreen.classList.add('hidden');
    document.getElementById('menu-screen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

function showAfterGame(rank, coins, starrdropEarned = false) {
    const menu = document.getElementById('aftergame-menu');
    if (!menu) {
        console.error('aftergame-menu not found');
        return;
    }
    document.getElementById('aftergame-rank').innerText = `Rank #${rank}`;
    document.getElementById('aftergame-reward').innerText = `+${coins} coins`;
    
    const dailyWinsEl = document.getElementById('aftergame-daily-wins');
    if (dailyWinsEl) {
        dailyWinsEl.innerHTML = `Daily Wins: ${window.playerState.dailyWins}/3`;
        if (starrdropEarned) {
            dailyWinsEl.innerHTML += ' <span style="color:#fbbf24;">+1</span>';
        }
    }
    
    const starrdropEl = document.getElementById('aftergame-starrdrop');
    if (starrdropEl) {
        if (starrdropEarned && typeof createStarrDropSVG === 'function') {
            starrdropEl.innerHTML = createStarrDropSVG('RARE', 64);
            starrdropEl.classList.remove('hidden');
        } else {
            starrdropEl.classList.add('hidden');
        }
    }
    
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
        if (window.state.lastMatch && window.state.lastMatch.starrdropEarned && typeof startStarrDropAnimation === 'function') {
            startStarrDropAnimation();
            window.state.lastMatch.starrdropEarned = false;
        }
    }, 300);
}

// ========== DRAWING ==========
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();

    const bg = window.state.battle.background || 'floor';
    let bgColor = '#d4a373';
    if (bg === 'water') bgColor = '#0284c7';
    else if (bg === 'grass') bgColor = '#2d6a4f';
    else if (bg === 'stone') bgColor = '#4a4a4a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.scale(window.state.battle.camera.zoom, window.state.battle.camera.zoom);
    ctx.translate(-window.state.battle.camera.x, -window.state.battle.camera.y);

    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const startCol = Math.max(0, Math.floor(window.state.battle.camera.x / 64));
    const endCol = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.x + canvas.width / window.state.battle.camera.zoom) / 64));
    const startRow = Math.max(0, Math.floor(window.state.battle.camera.y / 64));
    const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.camera.y + canvas.height / window.state.battle.camera.zoom) / 64));
    const now = Date.now();
    const p = window.state.battle.player;

    const floorTexture = window.Textures.floor;
    for (let i = startCol; i < endCol; i++) {
        for (let j = startRow; j < endRow; j++) {
            if (floorTexture) {
                ctx.drawImage(floorTexture, i * 64, j * 64, 64, 64);
            } else {
                ctx.fillStyle = '#d4a373';
                ctx.fillRect(i * 64, j * 64, 64, 64);
            }
        }
    }

    window.state.battle.bushes.forEach(b => {
        if (window.Textures.bush) {
            ctx.drawImage(window.Textures.bush, b.x, b.y, 64, 64);
        } else {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(b.x, b.y, 64, 64);
        }
    });

    window.state.battle.water?.forEach(w => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(w.x, w.y, 64, 64);
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(w.x + 10, w.y + 10 + i * 20, 44, 4);
        }
    });

    window.state.battle.boxes?.forEach(b => {
        if (b.hp > 0) {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(b.x, b.y, 64, 64);
            ctx.strokeStyle = '#4a3729';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, 64, 64);
            if (b.hp < 6000) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(b.x + 5, b.y - 10, 54, 8);
                ctx.fillStyle = '#f97316';
                ctx.fillRect(b.x + 5, b.y - 10, (b.hp / 6000) * 54, 8);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Luckiest Guy';
                ctx.fillText(`${Math.ceil(b.hp)}`, b.x + 25, b.y - 15);
            }
        }
    });

    window.state.battle.powerCubes?.forEach(p => {
        if (!p.collected) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        }
    });

    window.state.battle.barrels?.forEach(b => {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(b.x, b.y, 64, 64);
        ctx.fillStyle = '#4a3729';
        ctx.fillRect(b.x + 8, b.y + 8, 48, 48);
    });

    window.state.battle.walls.forEach(w => {
        if (window.Textures.wall) {
            ctx.drawImage(window.Textures.wall, w.x, w.y, 64, 64);
        } else {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(w.x, w.y, 64, 64);
        }
    });

    const drawChar = (c, isPlayer, viewer) => {
        if (c.hp <= 0 && !c.dying) return;
        if (!isPlayer && !canSee(viewer, c, now) && !c.dying) return;

        // If dying, apply fade/scale effect
        let alpha = 1;
        let scale = 1;
        if (c.dying) {
            const elapsed = now - c.deathTime;
            const progress = Math.min(1, elapsed / 800);
            alpha = 1 - progress;
            scale = 1 - progress * 0.5;
        }

        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        drawBrawler(ctx, c.type, 0, 0, c.angle);

        ctx.restore();

        // Name and UI (not rotated, but also faded)
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Luckiest Guy';
        ctx.textAlign = 'center';
        ctx.fillText(c.name, 0, -70);

        if (isPlayer && c.power > 0 && !c.dying) {
            ctx.save();
            ctx.translate(40, -60);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-10, -10, 20, 20);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(-5, -5, 10, 10);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Luckiest Guy';
            ctx.fillText(`x${c.power}`, 15, 5);
            ctx.restore();
        }

        if (!c.dying) {
            const bw = 70;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-bw / 2, -50, bw, 12);
            ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
            ctx.fillRect(-bw / 2, -50, (c.hp / c.maxHp) * bw, 12);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Luckiest Guy';
            ctx.fillText(`${Math.ceil(c.hp)}/${c.maxHp}`, -bw / 2, -55);

            // Ammo bar for player
            if (isPlayer) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(-bw / 2, -36, bw, 6);
                ctx.fillStyle = '#f97316';
                ctx.fillRect(-bw / 2, -36, (c.ammo / c.maxAmmo) * bw, 6);

                // Super charge bar
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(-bw / 2, -28, bw, 4);
                ctx.fillStyle = '#fbbf24';
                ctx.fillRect(-bw / 2, -28, (c.superCharge / c.superMax) * bw, 4);
            }
        }
        ctx.restore();
    };

    if (isInBush(p.x, p.y)) {
        ctx.globalAlpha = 0.75;
    }
    drawChar(p, true, p);
    ctx.globalAlpha = 1;

    window.state.battle.bots.forEach(b => {
        if (canSee(p, b, now) || b.dying) {
            drawChar(b, false, p);
        }
    });

    window.state.battle.bullets.forEach(b => {
        ctx.fillStyle = b.super ? '#fbbf24' : 'white';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
        ctx.fill();
    });

    // ========== DRAW AIMING LINE ==========
    if (mouseInsideCanvas && p && window.state.battle.isAiming && !p.dying) {
        const angle = window.state.battle.aimAngle;
        const startX = p.x;
        const startY = p.y;
        const lineLength = 300;
        const spreadAngle = 0.15;

        ctx.save();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.4;

        for (let i = -2; i <= 2; i++) {
            const lineAngle = angle + i * spreadAngle;
            const endX = startX + Math.cos(lineAngle) * lineLength;
            const endY = startY + Math.sin(lineAngle) * lineLength;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        const centerEndX = startX + Math.cos(angle) * lineLength;
        const centerEndY = startY + Math.sin(angle) * lineLength;
        ctx.fillStyle = 'white';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.translate(centerEndX, centerEndY);
        ctx.rotate(angle);
        ctx.moveTo(0, 0);
        ctx.lineTo(-10, -5);
        ctx.lineTo(-10, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.globalAlpha = 1;
    }

    // Poison gas
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.rect(-2000, -2000, fullSize + 4000, fullSize + 4000);
    ctx.arc(fullSize / 2, fullSize / 2, window.state.battle.poisonRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.restore();

    // Update super button appearance
    if (p && p.superCharge >= p.superMax && !p.dying) {
        superBtn.style.opacity = '1';
        superBtn.style.backgroundColor = '#fbbf24';
    } else {
        superBtn.style.opacity = '0.5';
        superBtn.style.backgroundColor = '';
    }

    // Draw kill feed
    if (killFeed) {
        killFeed.innerHTML = '';
        killMessages.slice(-5).forEach(msg => {
            const el = document.createElement('div');
            el.className = 'kill-message';
            el.textContent = msg.text;
            killFeed.appendChild(el);
        });
    }
}

function drawBrawler(ctx, type, x, y, angle) {
    if (window.BrawlerImages && window.BrawlerImages.game) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(window.BrawlerImages.game, -40, -40, 80, 80);
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
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
    
    ctx.fillStyle = '#4a3729';
    ctx.fillRect(10, -3, 24, 5);
    ctx.fillRect(28, -6, 5, 11);
    
    ctx.restore();
}

// ========== INPUT HANDLING ==========
window.onkeydown = (e) => {
    if (!e) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
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
    updateMoveJoystickVisual();
}

// Initialize joysticks with mouse support
setupJoystick('move-joy-base', 'move-joy-stick', 'move');
setupJoystick('attack-joy-base', 'attack-joy-stick', 'attack');

// Super button: aimable
document.getElementById('super-btn').onclick = (e) => {
    e.stopPropagation();
    if (window.state.battle && window.state.battle.player && !window.state.preBattle && !playerDead) {
        const p = window.state.battle.player;
        if (p.superCharge >= p.superMax && !p.dying) {
            // Use aim angle if available, otherwise player's facing angle
            let angle = p.angle;
            if (window.state.battle.isAiming) {
                angle = window.state.battle.aimAngle;
            }
            spawnBullet(p, angle, true);
            p.superCharge = 0; // Consume super
        }
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
    const count = (owner.type === 'Mysteria') ? 5 : 1;
    const attackerLevel = owner.level || 1;
    for (let i = 0; i < count; i++) {
        const spread = (i - (count - 1) / 2) * 0.15;
        window.state.battle.bullets.push({
            x: owner.x,
            y: owner.y,
            angle: angle + spread,
            dist: 0,
            super: isSuper,
            ownerId: owner.id,
            level: attackerLevel
        });
    }
}

// ========== VISIBILITY CHANGE HANDLER ==========
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        if (window.state.battle && window.state.battle.active) {
            console.log('Tab visible, battle active – forcing battle screen');
            const battleScreen = document.getElementById('battle-screen');
            battleScreen.classList.remove('hidden');
            battleScreen.style.zIndex = '10000';
            battleScreen.style.display = 'block';
            document.getElementById('menu-screen').style.display = 'none';
            if (canvas) {
                const oldWidth = canvas.width;
                canvas.width = oldWidth + 1;
                canvas.width = oldWidth;
            }
        }
    }
});

// Expose functions
window.startBattlePre = startBattlePre;
window.showAfterGame = showAfterGame;
window.hideAfterGame = hideAfterGame;
window.exitBattle = exitBattle;
