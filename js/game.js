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
let killFeed = document.getElementById('kill-feed');

// ========== FLAG TO PREVENT VISIBILITY FORCE AFTER GAME ENDS ==========
let gameEnded = false;

// ========== AIMING VARIABLES ==========
let mouseInsideCanvas = false;
let mouseAimAngle = 0;
let mouseDown = false;
let superAiming = false;

// ========== KILL FEED QUEUE ==========
let killMessages = [];

function addKillMessage(killerName, victimName) {
    const msg = {
        text: `${killerName} killed ${victimName}`,
        time: Date.now()
    };
    killMessages.push(msg);
    console.log('KILL FEED: added message', msg.text);
    setTimeout(() => {
        killMessages = killMessages.filter(m => m !== msg);
        console.log('KILL FEED: removed message', msg.text);
    }, 3000);
}

// ========== CREATE KILL FEED IF MISSING ==========
function ensureKillFeed() {
    if (!killFeed) {
        console.warn('Kill feed element not found, creating it now');
        const battleScreen = document.getElementById('battle-screen');
        if (battleScreen) {
            killFeed = document.createElement('div');
            killFeed.id = 'kill-feed';
            killFeed.className = 'absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-none z-[100000]';
            killFeed.style.maxWidth = '300px';
            battleScreen.appendChild(killFeed);
            console.log('Kill feed created dynamically');
        }
    }
    return killFeed;
}

// ========== JOYSTICK SETUP (MOUSE + TOUCH) ==========
function setupJoystick(id, stickId, type, onRelease) {
    const base = document.getElementById(id);
    const stick = document.getElementById(stickId);
    if (!base || !stick) {
        console.error(`Joystick elements not found: ${id}, ${stickId}`);
        return;
    }
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

        if (type === 'attack' || type === 'super') {
            if (normX !== 0 || normY !== 0) {
                window.state.battle.aimAngle = Math.atan2(normY, normX);
                window.state.battle.isAiming = true;
            }
        }
    };

    const handleEnd = (e) => {
        e.preventDefault();
        if (active) {
            const joy = window.state.battle.joystick[type];
            if (Math.hypot(joy.x, joy.y) > 0.5) {
                const ang = Math.atan2(joy.y, joy.x);
                onRelease(ang);
            }
            if (type !== 'attack' && type !== 'super') {
                window.state.battle.isAiming = false;
            }
        }
        active = false;
        stick.style.transform = 'translate(0,0)';
        window.state.battle.joystick[type] = { x: 0, y: 0 };
    };

    base.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd, { passive: false });
    window.addEventListener('touchcancel', handleEnd, { passive: false });

    base.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    window.addEventListener('resize', updateRect);
}

function updateMoveJoystickVisual() {
    const stick = document.getElementById('move-joy-stick');
    if (!stick) return;
    const joy = window.state.battle.joystick.move;
    const max = 50;
    const dx = joy.x * max;
    const dy = joy.y * max;
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

// Mouse aiming
canvas.addEventListener('mouseenter', () => {
    if (window.state.battle && window.state.battle.active) {
        mouseInsideCanvas = true;
    }
});

canvas.addEventListener('mouseleave', () => {
    mouseInsideCanvas = false;
    if (window.state.battle) {
        window.state.battle.isAiming = false;
        superAiming = false;
        window.state.battle.superTarget = null;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    if (p) {
        if (superAiming && p.type === 'Anthony') {
            // Update Anthony's super target
            const dx = worldX - p.x;
            const dy = worldY - p.y;
            const dist = Math.hypot(dx, dy);
            const maxDist = 1600; // 25 tiles
            const targetDist = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);
            window.state.battle.superTarget = {
                x: p.x + Math.cos(angle) * targetDist,
                y: p.y + Math.sin(angle) * targetDist
            };
            window.state.battle.isAiming = true;
        } else {
            const angle = Math.atan2(worldY - p.y, worldX - p.x);
            window.state.battle.aimAngle = angle;
            window.state.battle.isAiming = true;
        }
    }
});

canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

canvas.addEventListener('mousedown', (e) => {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || playerDead) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
    const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
    const p = window.state.battle.player;
    
    if (e.button === 0) { // Left click – main attack
        spawnBullet(p, Math.atan2(worldY - p.y, worldX - p.x), false);
    } else if (e.button === 2) { // Right click – super
        if (p.type === 'Anthony') {
            if (!superAiming) {
                // First right-click: enter aiming mode for Anthony's bomb
                superAiming = true;
                window.state.battle.isAiming = true;
                // Set initial target at max distance along mouse direction
                const dx = worldX - p.x;
                const dy = worldY - p.y;
                const dist = Math.hypot(dx, dy);
                const maxDist = 1600; // 25 tiles
                const targetDist = Math.min(dist, maxDist);
                const angle = Math.atan2(dy, dx);
                window.state.battle.superTarget = {
                    x: p.x + Math.cos(angle) * targetDist,
                    y: p.y + Math.sin(angle) * targetDist
                };
            } else {
                // Second right-click: throw bomb
                if (p.superCharge >= p.superMax && !p.dying) {
                    if (window.state.battle.superTarget) {
                        // Create a bomb projectile
                        const bomb = {
                            x: p.x,
                            y: p.y,
                            targetX: window.state.battle.superTarget.x,
                            targetY: window.state.battle.superTarget.y,
                            startTime: Date.now(),
                            duration: 400, // ms to reach target
                            owner: p,
                            level: p.level
                        };
                        window.state.battle.bombs.push(bomb);
                        p.superCharge = 0;
                    }
                }
                superAiming = false;
                window.state.battle.isAiming = false;
                window.state.battle.superTarget = null;
            }
        } else {
            // Other brawlers: normal two-step super (aim then fire)
            if (!superAiming) {
                superAiming = true;
                window.state.battle.isAiming = true;
                window.state.battle.aimAngle = Math.atan2(worldY - p.y, worldX - p.x);
            } else {
                if (p.superCharge >= p.superMax && !p.dying) {
                    spawnBullet(p, window.state.battle.aimAngle, true);
                    p.superCharge = 0;
                }
                superAiming = false;
                window.state.battle.isAiming = false;
            }
        }
    }
});

// ========== BUSH VISIBILITY ==========
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

// ========== ANTHONY BOMB EXPLOSION ==========
function createBombExplosion(centerX, centerY, battle, now, owner) {
    const radius = 192; // 3 tiles
    const pushForce = 200;

    // Add explosion effect
    battle.explosions.push({
        x: centerX,
        y: centerY,
        startTime: now,
        duration: 500
    });

    // Destroy walls
    battle.walls = battle.walls.filter(w => {
        const dx = w.x + 32 - centerX;
        const dy = w.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

    // Destroy bushes
    battle.bushes = battle.bushes.filter(b => {
        const dx = b.x + 32 - centerX;
        const dy = b.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

    // Destroy barrels
    battle.barrels = battle.barrels.filter(b => {
        const dx = b.x + 32 - centerX;
        const dy = b.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

    // Damage and push enemies
    const targets = [battle.player, ...battle.bots];
    targets.forEach(t => {
        if (t.hp <= 0 || t.dying) return;
        const dx = t.x - centerX;
        const dy = t.y - centerY;
        const dist = Math.hypot(dx, dy);
        if (dist < radius) {
            if (!t.invincibleUntil || now > t.invincibleUntil) {
                const stats = window.getBrawlerStats('Anthony', owner.level);
                let damage = stats.superDamage;
                t.hp -= damage;
                t.revealUntil = now + 1000;
                if (t.id === 'player') t.lastDamageTime = now;

                // Push away from center
                if (dist > 1) {
                    const pushX = (dx / dist) * pushForce;
                    const pushY = (dy / dist) * pushForce;
                    t.x = Math.max(25, Math.min(window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE - 25, t.x + pushX));
                    t.y = Math.max(25, Math.min(window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE - 25, t.y + pushY));
                }

                if (t.hp <= 0 && !t.dying) {
                    t.dying = true;
                    t.deathTime = now;
                    let killerName = owner.name;
                    addKillMessage(killerName, t.name);
                }
            }
        }
    });
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
    gameEnded = false;
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
    killMessages = [];
    
    window.state.battle = {
        active: true,
        camera: { x: 0, y: 0, zoom: 0.8 },
        poisonRadius: fullSize / 1.1,
        player: null,
        bullets: [],
        bombs: [], // Anthony's bomb projectiles
        explosions: [], // visual effects
        walls: [],
        bushes: [],
        water: [],
        boxes: [],
        powerCubes: [],
        barrels: [],
        spawnPoints: [],
        bots: [],
        joystick: { move: { x: 0, y: 0 }, attack: { x: 0, y: 0 }, super: { x: 0, y: 0 } },
        background: background,
        isAiming: false,
        aimAngle: 0,
        superTarget: null
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
        ammo: bData.ammo, 
        maxAmmo: bData.ammo,
        type: brawlerName,
        reloading: 0, angle: 0,
        inBush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() + 3000,
        power: 0,
        revealUntil: 0,
        superCharge: 0,
        superMax: 100,
        dying: false,
        deathTime: 0,
        slowUntil: 0
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
            deathTime: 0,
            slowUntil: 0
        });
    }

    ensureKillFeed();

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
    console.log('updateGame running, playerDead:', playerDead, 'battle.active:', window.state.battle?.active);
    const battle = window.state.battle;
    const p = battle.player;
    const mapLimit = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const now = Date.now();

    // Update bombs
    battle.bombs = battle.bombs.filter(bomb => {
        const elapsed = now - bomb.startTime;
        if (elapsed >= bomb.duration) {
            // Bomb reached target, explode
            createBombExplosion(bomb.targetX, bomb.targetY, battle, now, bomb.owner);
            return false;
        }
        // Update bomb position (linear interpolation)
        const t = elapsed / bomb.duration;
        bomb.currentX = bomb.x + (bomb.targetX - bomb.x) * t;
        bomb.currentY = bomb.y + (bomb.targetY - bomb.y) * t;
        return true;
    });

    // Remove old explosions after duration
    battle.explosions = battle.explosions.filter(exp => now - exp.startTime < exp.duration);

    if (playerDead) {
        console.log('In playerDead block, elapsed:', now - deathAnimationStart);
        const elapsed = now - deathAnimationStart;
        if (elapsed < deathAnimationDuration) {
            const t = elapsed / deathAnimationDuration;
            battle.camera.zoom = 0.8 + (0.5 - 0.8) * t;
            battle.camera.x = p.x - (canvas.width/2)/battle.camera.zoom;
            battle.camera.y = p.y - (canvas.height/2)/battle.camera.zoom;
        } else {
            console.log('Death animation finished, deactivating battle and showing menu');
            playerDead = false;
            battle.active = false;
            if (window.state.lastMatch) {
                console.log('Calling showAfterGame with rank:', window.state.lastMatch.rank);
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned);
            } else {
                console.error('No lastMatch set on death!');
            }
        }
        return;
    }

    battle.bots = battle.bots.filter(bot => {
        if (bot.dying) {
            const elapsed = now - bot.deathTime;
            return elapsed < 800;
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
        let currentSpeed = window.CONFIG.BRAWLERS[window.state.currentBrawler].speed;
        if (p.slowUntil > now) currentSpeed *= 0.95;
        let dx = (move.x / len) * currentSpeed;
        let dy = (move.y / len) * currentSpeed;

        let newX = p.x + dx;
        let newY = p.y;
        if (!checkCollision(newX, newY, 25)) p.x = Math.max(25, Math.min(mapLimit - 25, newX));
        newX = p.x;
        newY = p.y + dy;
        if (!checkCollision(newX, newY, 25)) p.y = Math.max(25, Math.min(mapLimit - 25, newY));
        p.angle = Math.atan2(dy, dx);
    }

    battle.bullets = battle.bullets.filter(b => {
        const bulletSpeed = (b.ownerType === 'Anthony' && !b.super) ? 18 : 12;
        const nextX = b.x + Math.cos(b.angle) * bulletSpeed;
        const nextY = b.y + Math.sin(b.angle) * bulletSpeed;

        // Box destruction
        for (let box of battle.boxes) {
            if (box.hp <= 0) continue;
            if (nextX + 8 > box.x && nextX - 8 < box.x + 64 &&
                nextY + 8 > box.y && nextY - 8 < box.y + 64) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                    return false;
                }
                box.hp -= 800;
                if (box.hp <= 0) {
                    battle.powerCubes.push({ x: box.x + 32, y: box.y + 32, collected: false });
                }
                return false;
            }
        }

        // Wall collision
        for (const wall of battle.walls) {
            if (nextX + 8 > wall.x && nextX - 8 < wall.x + 64 &&
                nextY + 8 > wall.y && nextY - 8 < wall.y + 64) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                }
                return false;
            }
        }

        // Water collision
        for (const water of battle.water || []) {
            if (nextX + 8 > water.x && nextX - 8 < water.x + 64 &&
                nextY + 8 > water.y && nextY - 8 < water.y + 64) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                }
                return false;
            }
        }

        // Barrel collision
        for (const barrel of battle.barrels || []) {
            if (nextX + 8 > barrel.x && nextX - 8 < barrel.x + 64 &&
                nextY + 8 > barrel.y && nextY - 8 < barrel.y + 64) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                }
                return false;
            }
        }

        b.x = nextX;
        b.y = nextY;
        b.dist += bulletSpeed;
        const maxRange = (b.ownerType === 'Anthony' && !b.super) ? 600 : 300;
        if (b.dist > maxRange) return false;

        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0 || t.dying) continue;
            const hitRadius = (b.ownerType === 'Anthony' && !b.super) ? 32 : 30; // 2x larger for Anthony's laser
            if (Math.hypot(b.x - t.x, b.y - t.y) < hitRadius) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                    return false;
                }
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    const stats = typeof window.getBrawlerStats === 'function'
                        ? window.getBrawlerStats(b.ownerType, b.level)
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

                    // Anthony's normal attack applies slow
                    if (b.ownerType === 'Anthony' && !b.super) {
                        t.slowUntil = now + 1000;
                    }

                    // Super charge for player when dealing damage with normal attack
                    if (b.ownerId === 'player' && !b.super) {
                        let chargeAmount = 10;
                        if (p.type === 'Anthony') chargeAmount = 40; // 4x faster
                        p.superCharge = Math.min(p.superMax, p.superCharge + chargeAmount);
                    }

                    if (t.hp <= 0 && !t.dying) {
                        t.dying = true;
                        t.deathTime = now;
                        let killerName = 'Unknown';
                        if (b.ownerId === 'player') {
                            killerName = p.name;
                        } else {
                            const killerBot = battle.bots.find(bot => bot.id === b.ownerId);
                            killerName = killerBot ? killerBot.name : 'Unknown';
                        }
                        console.log('DEATH DETECTED: killer', killerName, 'victim', t.name);
                        addKillMessage(killerName, t.name);

                        if (t.id === 'player') {
                            console.log('PLAYER DIED, starting death animation');
                            playerDead = true;
                            deathAnimationStart = now;
                            const aliveBots = battle.bots.filter(b => b.hp > 0 && !b.dying).length;
                            const aliveCount = 0 + aliveBots;
                            window.state.lastMatch = {
                                rank: aliveCount + 1,
                                coinsEarned: 0,
                                starrdropEarned: false
                            };
                        }
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

    // Ammo recharge
    if (p.ammo < p.maxAmmo && !p.dying) {
        p.ammo = Math.min(p.maxAmmo, p.ammo + 0.01);
    }

    // Bot AI
    for (let bot of battle.bots) {
        if(bot.hp <= 0 || bot.dying) continue;
        if (Math.random() < 0.02) bot.angle += (Math.random() - 0.5);
        
        let botSpeed = bot.speed;
        if (bot.slowUntil > now) botSpeed *= 0.95;
        let nx = bot.x + Math.cos(bot.angle) * botSpeed;
        let ny = bot.y + Math.sin(bot.angle) * botSpeed;
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

    // Player death (safety net)
    if (p.hp <= 0 && !p.dying) {
        console.log('Player HP <= 0 (safety), setting death state');
        p.dying = true;
        p.deathTime = now;
        playerDead = true;
        deathAnimationStart = now;
        window.state.lastMatch = {
            rank: aliveCount + 1,
            coinsEarned: 0,
            starrdropEarned: false
        };
        console.log('PLAYER DIED (safety), starting death animation, rank:', aliveCount+1);
        return;
    }

    // Victory condition
    if (aliveCount === 1 && p.hp > 0 && !p.dying) {
        const coinsEarned = 50 + Math.floor(Math.random() * 30) + p.power * 10;
        window.playerState.coins += coinsEarned;
        
        const brawlerName = window.state.currentBrawler;
        if (!window.brawlerProgress[brawlerName]) {
            window.brawlerProgress[brawlerName] = { unlocked: true, trophies: 0, level: 1 };
        }
        const currentTrophies = window.brawlerProgress[brawlerName].trophies || 0;
        const trophyGain = 10;
        window.brawlerProgress[brawlerName].trophies = currentTrophies + trophyGain;
        
        // Update total trophies
        window.playerState.trophies = Object.values(window.brawlerProgress).reduce((a, b) => a + (b.trophies || 0), 0);
        
        console.log(`Trophies: ${brawlerName} now has ${window.brawlerProgress[brawlerName].trophies}, total ${window.playerState.trophies}`);
        
        let starrdropEarned = false;
        if (window.playerState.dailyWins < 3) {
            window.playerState.dailyWins++;
            if (window.currentProfile) window.currentProfile.daily_wins = window.playerState.dailyWins;
            starrdropEarned = true;
        }
        
        if (typeof saveProfileToDB === 'function') saveProfileToDB();
        if (typeof saveBrawlerProgress === 'function') {
            saveBrawlerProgress();
        }
        
        window.state.lastMatch = {
            rank: 1,
            coinsEarned: coinsEarned,
            starrdropEarned: starrdropEarned
        };
        
        console.log('VICTORY! aliveCount === 1, calling showAfterGame');
        showAfterGame(1, coinsEarned, starrdropEarned);
        return;
    }

    battle.camera.x = p.x - (canvas.width / 2) / battle.camera.zoom;
    battle.camera.y = p.y - (canvas.height / 2) / battle.camera.zoom;
}

function exitBattle() {
    console.log('exitBattle called');
    gameEnded = true;
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
    battleScreen.style.zIndex = '';
    battleScreen.style.display = '';
    
    document.getElementById('menu-screen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

function showAfterGame(rank, coins, starrdropEarned = false) {
    console.log('showAfterGame called with rank:', rank, 'coins:', coins, 'starrdrop:', starrdropEarned);
    const menu = document.getElementById('aftergame-menu');
    if (!menu) {
        console.error('aftergame-menu not found!');
        return;
    }
    menu.style.display = 'flex';
    menu.style.opacity = '1';
    menu.style.zIndex = '100000';
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
    
    const battleScreen = document.getElementById('battle-screen');
    battleScreen.style.zIndex = '1000';
    battleScreen.style.display = 'block';
}

function hideAfterGame() {
    const menu = document.getElementById('aftergame-menu');
    menu.style.opacity = '0';
    setTimeout(() => {
        menu.style.display = 'none';
        exitBattle();
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

            if (isPlayer) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(-bw / 2, -36, bw, 6);
                ctx.fillStyle = '#f97316';
                ctx.fillRect(-bw / 2, -36, (c.ammo / c.maxAmmo) * bw, 6);
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

    // Draw bombs (Anthony's super projectiles)
    window.state.battle.bombs.forEach(bomb => {
        ctx.save();
        ctx.translate(bomb.currentX, bomb.currentY);
        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B4513'; // brown
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw explosions
    window.state.battle.explosions.forEach(exp => {
        const elapsed = now - exp.startTime;
        const progress = elapsed / exp.duration;
        const radius = 192 * progress; // expanding
        const alpha = 1 - progress;
        ctx.save();
        ctx.translate(exp.x, exp.y);
        ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Draw bullets with brawler-specific colors and sizes
    window.state.battle.bullets.forEach(b => {
        let bulletColor = 'white';
        let bulletRadius = 8;
        if (b.ownerType === 'Anthony' && !b.super) {
            bulletColor = '#ff0000'; // red for laser
            bulletRadius = 32; // 2x size (previously 16, now 32)
        } else if (b.super) {
            bulletColor = '#fbbf24'; // yellow for super
        }
        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bulletRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    // ========== DRAW AIMING LINES ==========
    if (mouseInsideCanvas && p && !p.dying) {
        if (superAiming && p.type === 'Anthony' && window.state.battle.superTarget) {
            // Draw Anthony's bomb reticle
            const target = window.state.battle.superTarget;
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(target.x, target.y, 192, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        } else if (window.state.battle.isAiming) {
            const angle = window.state.battle.aimAngle;
            const startX = p.x;
            const startY = p.y;
            const lineLength = 300;

            if (p.type === 'Anthony') {
                // Anthony's laser: single red line (double length)
                ctx.save();
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX + Math.cos(angle) * 600, startY + Math.sin(angle) * 600);
                ctx.stroke();
                ctx.restore();
            } else {
                // Mysteria's shotgun: 5 white lines
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

                // Arrowhead on center line
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
            }
            ctx.globalAlpha = 1;
        }
    }

    // Poison gas
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.rect(-2000, -2000, fullSize + 4000, fullSize + 4000);
    ctx.arc(fullSize / 2, fullSize / 2, window.state.battle.poisonRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.restore();

    if (!killFeed) {
        killFeed = ensureKillFeed();
    }

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
    if (window.BrawlerImages && window.BrawlerImages[type] && window.BrawlerImages[type].game) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(window.BrawlerImages[type].game, -40, -40, 80, 80);
        ctx.restore();
        return;
    }

    // Fallback drawing
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const brawlerData = window.CONFIG.BRAWLERS[type];
    ctx.fillStyle = brawlerData ? brawlerData.color : '#a855f7';
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

setupJoystick('move-joy-base', 'move-joy-stick', 'move', () => {});
setupJoystick('attack-joy-base', 'attack-joy-stick', 'attack', (ang) => {
    const p = window.state.battle.player;
    if (p && !p.dying) {
        spawnBullet(p, ang, false);
    }
});
setupJoystick('super-joy-base', 'super-joy-stick', 'super', (ang) => {
    const p = window.state.battle.player;
    if (p && !p.dying && p.superCharge >= p.superMax) {
        if (p.type === 'Anthony') {
            // For joystick, throw bomb at a point in front of the player
            const targetX = p.x + Math.cos(ang) * 800;
            const targetY = p.y + Math.sin(ang) * 800;
            const bomb = {
                x: p.x,
                y: p.y,
                targetX: targetX,
                targetY: targetY,
                startTime: Date.now(),
                duration: 400,
                owner: p,
                level: p.level
            };
            window.state.battle.bombs.push(bomb);
            p.superCharge = 0;
        } else {
            spawnBullet(p, ang, true);
            p.superCharge = 0;
        }
    }
});

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
            level: attackerLevel,
            ownerType: owner.type
        });
    }
}

// ========== VISIBILITY CHANGE HANDLER ==========
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        const afterGameMenu = document.getElementById('aftergame-menu');
        const menuVisible = afterGameMenu && (afterGameMenu.style.display === 'flex' || window.getComputedStyle(afterGameMenu).display === 'flex');
        const menuScreen = document.getElementById('menu-screen');
        const mainMenuVisible = menuScreen && (menuScreen.style.display === 'flex' || window.getComputedStyle(menuScreen).display === 'flex');
        console.log('Tab became visible, battle active:', window.state.battle?.active, 'gameEnded:', gameEnded, 'menuVisible:', menuVisible, 'playerDead:', playerDead, 'mainMenuVisible:', mainMenuVisible);
        
        if (gameEnded || playerDead) {
            if (mainMenuVisible) {
                console.log('Already at main menu, ignoring after-game menu');
                return;
            }
            console.log('Game ended or player dead, ensuring after-game menu');
            if (window.state.lastMatch) {
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned);
            }
            return;
        }
        
        if (window.state.battle && window.state.battle.active && !menuVisible) {
            console.log('Tab visible, battle active – forcing battle screen');
            const battleScreen = document.getElementById('battle-screen');
            if (battleScreen) {
                battleScreen.classList.remove('hidden');
                battleScreen.style.zIndex = '10000';
                battleScreen.style.display = 'block';
            }
            const menuScreen = document.getElementById('menu-screen');
            if (menuScreen) menuScreen.style.display = 'none';
            if (canvas) {
                const oldWidth = canvas.width;
                canvas.width = oldWidth + 1;
                canvas.width = oldWidth;
                console.log('Forced canvas repaint');
            }
            killFeed = ensureKillFeed();
            if (killFeed) {
                killFeed.style.display = 'flex';
                killFeed.style.zIndex = '100000';
            }
        }
    }
});

// Fallback: if after 2 seconds after death the menu hasn't appeared, force it
setInterval(() => {
    if (playerDead && !gameEnded) {
        const menu = document.getElementById('aftergame-menu');
        if (menu && (menu.style.display !== 'flex' || window.getComputedStyle(menu).display !== 'flex')) {
            console.log('Fallback: forcing after-game menu');
            if (window.state.lastMatch) {
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned);
            }
        }
    }
}, 1000);

window.startBattlePre = startBattlePre;
window.showAfterGame = showAfterGame;
window.hideAfterGame = hideAfterGame;
window.exitBattle = exitBattle;
