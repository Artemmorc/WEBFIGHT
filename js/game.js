// ========== GLOBAL FALLBACKS ==========
window.keys = window.keys || { w: false, a: false, s: false, d: false };
window.state = window.state || { battle: { active: false } };
window.playerState = window.playerState || { name: 'Mysteria' };
window.CONFIG = window.CONFIG ||ALLBACKS ==========
window.keys = window.keys || { w: false, a: false, s: false, d: false };
window.state = window.state || { battle: { active: false } };
window.playerState = window.playerState || { name: 'Mysteria' };
window.CONFIG = window.CONFIG || { { 
    MAP_SIZE: 60, 
    TILE_SIZE: 64, 
    BRAWLERS: { 
        Mysteria: { hp: 3800, speed: 6, color: '#a855f7', ammo: 3, reload: 1.5, type: 'Shotgun', unlocked: true 
    MAP_SIZE: 60, 
    TILE_SIZE: 64, 
    BRAWLERS: { 
        Mysteria: { hp: 3800, speed: 6, color: '#a855f7', ammo: 3, reload: 1.5, type: 'Shotgun', unlocked: true } 
    } 
};
window.Textures = window.Textures || } 
    } 
};
window.Textures = window.Textures || { floor: null, bush: null, wall { floor: null, bush: null, wall: null: null };

if (!window.state.currentBrawler) {
    window.state.currentBrawler = 'Mysteria };

if (!window.state.currentBrawler) {
    window.state.currentBrawler = 'Mysteria';
}

console.log('game.js loaded, window.keys =', window.keys);

// =';
}

console.log('game.js loaded, window.keys =', window.keys);

// ========== GAME ENGINE ==========
const canvas = document.getElementById('========= GAME ENGINE ==========
const canvas = document.getElementById('gameCanvas');
constgameCanvas');
const ctx = canvas.get ctx = canvas.getContext('2dContext('2d');
let gameLoopId = null;
let pre');
let gameLoopId = null;
let preBattleStart = nullBattleStart = null;
const fightText;
const fightTextEl = document.getElementById('fightEl = document.getElementById('fight-text');

let powerCubesCollected = 0;
let deathAnimationStart = 0;
let deathAnimationDuration = 1500;
let playerDead-text');

let powerCubesCollected = 0;
let deathAnimationStart = 0;
let deathAnimationDuration = 1500;
let playerDead = false;

// Cached DOM elements
let brawlersLeftEl = document.getElementById('brawlers-left');
let battleUiEl = document.getElementById('battle-ui');

// ========== BUSH VISIBILITY FUNCTIONS ==========
function isInBush(x, y) {
    const battle = window.state.battle;
    if (!battle) return false;
    = false;

// Cached DOM elements
let brawlersLeftEl = document.getElementById('brawlers-left');
let battleUiEl = document.getElementById('battle-ui');

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
    const distance = Math.hypot(observer.x - target.x, observer.y - target for (let bush of battle.bushes) {
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
        if (x + radius > wall.x && x -.y);
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
            y + radius > water.y && y - radius < water radius < wall.x + window.CONFIG.TILE_SIZE &&
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
            y + radius > barrel.y && y - radius < barrel.y + window.y + window.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const barrel of battle.barrels || []) {
        if (x + radius > barrel.x && x - radius < barrel.x + window.CONFIG.TILE_SIZE &&
            y + radius > barrel.y && y - radius < barrel.y + window.CONFIG.TILE_SIZE) {
            return true;
.CONFIG.TILE_SIZE) {
            return true;
        }
    }
    for (const        }
    }
    for (const box of battle.boxes || []) {
        box of battle.boxes || []) {
        if ( if (box.hbox.hp > 0p > 0 && x && x + radius + radius > box.x > box.x && x - && x - radius < box.x radius < box.x + window + window.CONFIG.T.CONFIG.TILE_SIZEILE_SIZE &&
            &&
            y + y + radius > radius > box.y && y box.y && y - radius - radius < box < box.y + window.C.y +ONFIG window.CONFIG.TILE.TILE_SIZE)_SIZE) {
            {
            return true;
        }
    }
    return true;
        }
    return false;
}

async function }
    return false;
}

 startBattleasync function startBattlePre()Pre() {
    {
    console.log('start console.log('startBattlePreBattlePre called');
 called');
    document    document.getElementById('.getElementById('prematch-loading').classprematch-loading').classList.addList.add('active('active');
    
');
    
       let let customMap = null customMap = null;
   ;
    let map let mapBackground = 'floorBackground = 'floor'; // default
'; // default
    if    if (typeof window.sb !== (typeof window.sb !== 'undefined 'undefined') {
') {
        try {
                   try {
            const { const { data, data, error } error } = await = await window.sb
 window.sb
                .from('maps')
                .from('maps')
                .                .select('select('map_data, backgroundmap_data, background')
               ')
                .eq .eq('is('is_active', true)
_active', true)
                .                .maybeSinglemaybeSingle();
           ();
            if (!error && if (!error && data) data) {
                {
                customMap customMap = data.map_data = data.map_data;
               ;
                mapBackground mapBackground = data = data.background || '.background || 'floor';
floor';
                console                console.log('.log('Loaded activeLoaded active map from map from server, server, background:', background:', mapBackground mapBackground);
           );
            }
        }
        } catch (e } catch (e) {
            console.warn) {
            console.warn('Could not load('Could not load active map active map, using, using random', random', e);
 e);
        }
        }
    }
    
       }
    
    setTimeout(() setTimeout(() => {
 => {
        document.getElementById('prematch        document.getElementById('prematch-loading-loading').classList.remove').class('activeList.remove('active');
       ');
        startBattle startBattle(customMap,(customMap, mapBackground mapBackground);
       );
        window.state window.state.preBattle.preBattle = true = true;
       ;
        const full const fullSize =Size = window.CONFIG window.CONFIG.MAP.MAP_SIZE * window.C_SIZE * window.CONFIG.TILEONFIG.TILE_SIZE;
_SIZE;
               window.state.b window.state.battle.camera.xattle.camera.x = full = fullSize/Size/2 - (canvas2 - (canvas.width/.width/2)/2)/window.statewindow.state.battle.battle.camera.camera.zoom;
       .zoom;
        window.state window.state.battle.battle.camera.camera.y =.y = fullSize fullSize/2 - (/2 - (canvas.heightcanvas.height/2/2)/window)/window.state.b.state.battle.cattle.camera.zoomamera.;
        prezoom;
        preBattleStartBattleStart = Date = Date.now();
.now();
        battleUiEl.style.display        battleUiEl.style.display = ' = 'none';
none';
    },    }, 500 500);
}

);
}

function startfunction startBattle(cBattle(customMapustomMap = null = null,, background = ' background = 'floor')floor') {
    window {
    window.state.screen.state.screen = ' = 'battlebattle';
    document.getElementById';
    document.getElementById('menu('menu-screen').-screen').style.displaystyle.display = ' = 'none';
    documentnone';
    document.getElementById('battle.getElementById('battle-screen').-screen').classListclassList.remove('hidden');
.remove('hidden');
    
       
    canvas.width = window.innerWidth canvas.width = window.innerWidth;
   ;
    canvas.height canvas.height = window.innerHeight = window.innerHeight;
    
;
    
    const    const fullSize = window fullSize = window.CON.CONFIG.MFIG.MAP_SIZE *AP_SIZE window.CON * window.CONFIG.TFIG.TILE_SIZE;
   ILE_SIZE;
    const b const brawlerrawlerName = window.state.currentBrawler || 'Name = window.state.currentBrawler || 'Mysteria';
   Mysteria';
    const b const bData =Data = window.C window.CONFIGONFIG.BRA.BRAWLERS[bWLERS[brawlerNamerawlerName];
   ];
    if (! if (!bData) {
bData) {
        console        console.error('.error('Brawler dataBrawler data not found not found for', for', brawlerName brawlerName);
       );
        return;
 return;
    }
    
       }
    
 // Get player level    // Get player level and and stats
 stats
    const    const progress = progress = window.b window.brawlerrawlerProgress[bProgress[brawlerrawlerName]Name] || { || { level: level: 1 1 };
    };
    const level const level = progress = progress.level;
.level;
    const    const stats = stats = window window.getB.getBrawlerrawlerStats(brawlerStats(bName, level);
rawlerName, level);
    const    const maxH maxHp = stats.health;
    
   p = stats.health;
    
    powerCubesCol powerCubesCollected =lected = 0 0;
    
   ;
    
    window.state.battle = window.state.battle = {
        {
        active: true,
 active: true,
        camera        camera: {: { x: 0, y x: 0, y: : 0, zoom:0, zoom: 0 0.8.8 },
        poisonRadius },
        poisonRadius: full: fullSize /Size / 1.1 1.1,
       ,
        player: player: null,
        bullets null,
        bullets: [],
: [],
        walls        walls: [],
        bushes: [],
        bushes: [],
: [],
        water        water: [],
: [],
        boxes        boxes: [],
: [],
        powerCubes        powerCubes: [],
: [],
        barrels        barrels: [],
: [],
        spawn        spawnPoints:Points: [],
        bots: [],
        bots: [],
        [],
        joyst joystick: {ick: { move move: {: { x: x: 0 0, y: , y: 0 }, attack: { x0 }, attack: { x: : 0,0, y: 0 y: 0 } },
 } },
        background        background: background: background
    };

   
    };

    if ( if (customMap)customMap) {
        for {
        for (let (let y = 0 y =; y 0; y < window < window.CON.CONFIG.MAP_SIZEFIG.MAP_SIZE; y; y++) {
++) {
            for (let            for (let x = x = 0; x < 0; x < window window.CONFIG.M.CONFIG.MAP_SIZE; x++) {
AP_SIZE; x++) {
                const                const type = customMap type = customMap[y][x];
[y][x];
                const world                constX = x worldX = x * window * window.CON.CONFIG.TFIG.TILE_SIZEILE_SIZE;
               ;
                const worldY = const world y *Y = y * window.C window.CONFIG.TILEONFIG_SIZE;
.TILE_SIZE;
                if                if (type (type ===  === 1)1) window.state window.state.battle.walls.push({ x:.battle.walls.push({ x: worldX worldX, y: worldY });
, y: worldY });
                else                else if ( if (type ===type === 2 2) window.state.battle.b) window.state.bushes.pushattle.bushes.push({({ x: worldX, x: worldX, y: worldY y: worldY });
                else if });
                else if (type ===  (type === 3)3) window.state.battle window.state.battle.water.push({ x:.water.push({ x: worldX worldX, y: worldY });
, y: worldY });
                else                else if (type === 4 if (type === 4) window) window.state.b.state.battle.boxes.pushattle.boxes.push({ x({ x: worldX, y: worldY, hp: : worldX, y: worldY, hp: 6000 });
               6000 });
                else if ( else if (type === 5)type === 5) window.state window.state.battle.battle.bar.barrels.pushrels.push({ x: world({ x: worldX,X, y: y: worldY worldY });
                });
                else if (type else if (type ===  === 6) window.state6) window.state.battle.spawn.battle.spawnPoints.push({ xPoints.push({ x: world: worldX + 32X + 32, y, y: world: worldY + 32 });
           Y + 32 });
            }
        }
    } else }
        }
    } else {
        {
        // Random // Random generation
 generation
        for(let i        for(let i=0=0; i; i<window.CON<windowFIG.M.CONFIG.MAP_SIZEAP_SIZE; i; i++) {
            for++) {
            for(let j(let j=0=0; j<window; j<window.CON.CONFIG.MFIG.MAP_SIZE; jAP_SIZE; j++) {
++) {
                const                const rand = Math.random rand = Math.random();
               ();
                if( if(rand < 0.08rand < 0.08)
                   )
                    window.state window.state.battle.battle.walls.walls.push({.push({ x: i*w x: i*window.Cindow.CONFIGONFIG.TILE_SIZE, y:.TILE_SIZE, j*w y: j*window.Cindow.CONFIGONFIG.TILE.TILE_SIZE });
                else_SIZE });
                else if( if(rand < 0rand.20 < 0.20)
                   )
                    window.state window.state.battle.battle.bushes.bushes.push({ x: i*w.push({ x: i*window.Cindow.CONFIGONFIG.TILE_SIZE,.TILE y: j*w_SIZE, y: j*window.Cindow.CONFIGONFIG.TILE_SIZE });
.TILE_SIZE });
            }
            }
        }
        }
    }

    function    }

    function pickS pickSpawnPointpawnPoint(excludeList =(excludeList = []) []) {
        if (window.state {
        if (window.state.battle.spawn.battle.spawnPoints.length === 0)Points.length === 0) return safe return safeSpawnSpawn(25(25);
       );
        const shuffled const shuffled = [... = [...window.state.battlewindow.state.battle.spawn.spawnPoints].sort(()Points]. => Math.random() - 0.5);
        forsort(() => Math.random() - 0.5);
        for (let spawn of shuffled) {
            (let spawn of shuffled) {
            const used = exclude const used = excludeList.sList.some(u => u.x === spawn.x && u.y ===ome(u => u.x === spawn.x && u spawn.y);
            if (!used) return spawn;
        }
       .y === spawn.y);
            if (!used) return spawn;
        }
        return safeSpawn(25);
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
                x + radius > w.x && x - radius }

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
                y + radius > w.y && y - radius < w.y + window < w.x + window.CONFIG.TILE_SIZE &&
                y + radius > w.y && y - radius < w.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.water.s.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.water.some(w =>
                x +ome(w =>
                x + radius > w.x && x - radius < w.x + window.CONFIG.TILE_SIZE &&
                y + radius > w.y && y - radius < w.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.barrels.some(b =>
                x + radius > b.x && x - radius > w.x && x - radius < w.x + window.CONFIG.TILE_SIZE &&
                y + radius > w.y && y - radius < w.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.barrels.some(b =>
                x + radius > b.x && x - radius < b.x + window.CONFIG.TILE_SIZE &&
                y + radius > b.y && y - radius < b.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.boxes.some(b =>
                b.hp > 0 && x + radius > b.x && x - radius < b.x + window.CONFIG.TILE_SIZE &&
                radius < b.x + window.CONFIG.TILE_SIZE &&
                y + radius > b.y && y - radius < b.y + window.CONFIG.TILE_SIZE
            ) ||
            window.state.battle.boxes.some(b =>
                b.hp > 0 && x + radius > b.x && x - radius < b.x + window.CONFIG.TILE_SIZE &&
                y + radius > b.y && y - radius < b.y y + radius > b.y && y - radius < b.y + window.CONFIG.TILE_SIZE
            )
        );
        return { x, y };
    }

    const usedSpawns = [];
    const playerSpawn = pickSpawnPoint(usedSpawns);
    usedSpa + window.CONFIG.TILE_SIZE
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
        hp: maxwns.push(playerSpawn);
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
        inBHp, 
        maxHp: maxHp,
        level: level,
        ammo: 3, maxAmmo: 3,
        type: brawlerName,
        reloading: 0, angle: 0,
        inBush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() +ush: false, lastDamageTime: Date.now(),
        lastAttackTime: Date.now(), invincibleUntil: Date.now() + 3000,
        power: 0,
        3000,
        power: 0,
        revealUntil: 0
    };

    revealUntil: 0
    };

    for(let i= for(let i=0; i<9;0; i<9; i++) i++) {
        const bot {
        const botSpawn = pickSpawnSpawn = pickSpawnPoint(usedSpawnsPoint(usedSpawns);
       );
        usedS usedSpawnspawns.push(botS.push(botpawn);
        const botLevel = 1; // all bots level 1 for simplicity
        const botStats = window.getBrawlerStats('Mysteria', botLevel);
        window.state.battle.bots.push({
            id: 'bot_'+i, name: 'Bot-'+(i+1),
            x: botSpawn.x, y: botSpawn.y,
Spawn);
        const botLevel = 1; // all bots level 1 for simplicity
        const botStats = window.getBrawlerStats('Mysteria', botLevel);
        window.state.battle.bots.push({
            id: 'bot_'+i, name: 'Bot-'+(i+1),
            x: botSpawn.x, y: botSpawn.y,
                       hp: botStats.health, 
            maxHp: botStats.health,
            level: hp: botStats.health, 
            maxHp: botStats.health,
            level: botLevel botLevel,
            type: 'M,
            type: 'Mysteria', speed:ysteria', speed: window.C window.CONFIG.BRAONFIG.BRAWLERS['MWLERS['Mysteria'].ysteria'].speed,
            anglespeed,
            angle: Math: Math.random().random()*Math.PI*2*Math.PI*2, last, lastShot: 0Shot: 0,
           ,
            inB inBush: false,ush: false, invinc invincibleUntilibleUntil: Date.now(): Date.now() +  + 3000,
            power:3000,
            power: 0,
            0,
            revealUntil:  revealUntil: 0
0
        });
        });
    }

    if (game    }

    ifLoopId (gameLoopId) cancel) cancelAnimationFrameAnimationFrame(gameLoopId);
(gameLoopId);
    game    gameLoop();
Loop();
}

function gameLoop() {
    if(!window.state.battle ||}

function gameLoop() {
    if(!window.state.battle || !window !window.state.b.state.battle.activeattle.active) return) return;
   ;
    updateGame();
    drawGame updateGame();
    drawGame();
   ();
    gameLoop gameLoopId =Id = requestAnimationFrame(game requestAnimationFrame(gameLoop);
Loop);
}

function updateGame}

function updateGame() {
() {
    const    const battle = window.state battle = window.state.battle.battle;
   ;
    const p const p = battle.player;
    const = battle.player;
    const mapLimit mapLimit = window.CONFIG.M = window.CONFIG.MAP_SIZE * windowAP_SIZE * window.CONFIG.T.CONFIG.TILE_SIZEILE_SIZE;
   ;
    const now = Date const now = Date.now();

    if.now();

    if (playerDead) (playerDead) {
        {
        const elapsed const elapsed = now - death = now - deathAnimationStart;
       AnimationStart;
        if (elapsed if (elapsed < deathAnimationDuration < deathAnimationDuration) {
            const t =) {
            const t = elapsed / deathAnimationDuration;
            battle.camera elapsed / deathAnimationDuration;
            battle.zoom = 0.8 + (0.camera.zoom = 0.8 + (0.5.5 - 0. - 0.8)8) * t * t;
            battle.camera.x = p;
            battle.camera.x = p.x - (canvas.width/2)/battle.camera.zoom;
            battle.camera.y = p.y - (canvas.height/2)/battle.camera.zoom;
       .x - (canvas.width/2)/battle.camera.zoom;
            battle.camera.y = p.y - (canvas.height/2)/battle.camera.zoom;
        } else {
            playerDead = false;
            } else {
            playerDead = false;
            battle.active = false;
            battle.active = false;
            showAfterGame(window showAfterGame(window.state.lastMatch..state.lastMatch.rank,rank, window.state.lastMatch.coins window.state.lastMatchEarn.coinsEarned,ed, window.state.lastMatch window.state.lastMatch.starr.starrdropEdropEarnedarned);
           );
            exitBattle exitBattle();
        }
        return;
();
        }
        return;
    }

    }

    if    if (window.state.preBattle) {
        (window.state.preBattle) {
        const elapsed = now - pre const elapsed = now - preBattleStart;
        if (elapsedBattleStart;
        if (elapsed <  < 10001000) {
) {
            const t =            const t = elapsed / elapsed / 100 1000;
            const0;
            const fullSize fullSize = window = window.CONFIG.M.CONFIG.MAP_SIZEAP_SIZE * window.CON * window.CONFIG.TILE_SIZEFIG.TILE_SIZE;
           ;
            const start const startX = fullSizeX = fullSize/2 - (canvas.width/2 - (canvas.width/2)/b/2)/battle.camera.zoom;
attle.camera.zoom;
            const startY = fullSize/            const startY = fullSize/2 - (canvas.height/2)/battle.camera.zoom;
            const targetX = p.x - (canvas.width2 - (canvas.height/2)/battle.camera.zoom;
            const targetX = p.x - (canvas.width/2)/battle.camera./2)/battle.camera.zoom;
            const targetY = p.y - (canvaszoom;
            const targetY = p.y - (canvas.height/2)/battle.height/2)/battle.camera.zoom.camera.zoom;
           ;
            battle.camera.x = start battle.camera.x = startX + (targetX - startXX + (targetX - startX) * t;
            battle.camera.y = startY + (targetY - start) * t;
            battle.camera.y = startY + (targetY - startY) * t;
       Y) * t;
        } else {
            window.state.preBattle } else {
            window.state.preBattle = false;
            = false;
            if (fightTextEl) {
                fightText if (fightTextEl) {
                fightTextEl.style.opacity = '1';
                setTimeout(() => {
                    fightTextEl.style.opacity = '0';
                    battleUiEl.style.display = 'flex';
                }, 800El.style.opacity = '1';
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

    if ();
            } else {
                battleUiEl.style.display = 'flex';
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
        if (!checkCollisionlen > 0) {
        const speed = window.CONFIG.BRAWLERS[window.state.currentBrawler].speed;
        let dx = (move.x / len) * speed;
        let dy = (move.y / len) * speed;

        let newX = p.x + dx;
        let newY = p.y;
        if (!checkCollision(newX, newY, 25)) p.x = Math.max(25, Math.min(mapLimit - 25, newX));
        newX = p.x;
        newY = p.y + dy;
        if (!checkCollision(newX, newY, 25)) p.y = Math.max(25, Math(newX, newY, 25)) p.x = Math.max(25, Math.min(mapLimit - 25, newX));
        newX = p.x;
        newY = p.y + dy;
        if (!checkCollision(newX, newY, 25)) p.y = Math.max(25, Math.min(mapLimit - 25, newY));
        p.angle = Math.atan2(dy, dx);
    }

    // Box destruction
   .min(mapLimit - 25, newY));
        p.angle = Math.atan2(dy, dx);
    }

    // Box destruction
    battle.bullets = battle.bullets.filter(b => {
        const speed = 12;
        const nextX = b.x + battle.bullets = battle.bullets.filter(b => {
        const speed = 12;
        const nextX = b.x + Math.cos(b.angle) * speed;
        const nextY = b.y + Math.sin(b.angle) * Math.cos(b.angle) * speed;
        const nextY = b.y + Math.sin(b.angle) * speed;

 speed;

        for (let box of battle.boxes) {
            if (box.hp <= 0) continue;
                   for (let box of battle.boxes) {
            if (box.hp <= 0) continue;
            if (nextX if (nextX + 8 > box.x && next + 8 > box.x && nextX -X - 8 < box 8 < box.x +.x + 64 64 &&
                nextY &&
                nextY +  + 8 > box.y8 > box.y && nextY - 8 && nextY - 8 < box < box.y + 64) {
                box.hp.y + 64) {
                box.hp -=  -= 800;
                if800;
                if (box.hp <=  (box.hp <= 0) {
                    battle.p0) {
                    battle.powerCubes.push({ xowerCubes.push({ x: box: box.x +.x + 32, y 32, y: box.y +: box.y + 32 32, collected, collected: false: false });
                });
                }
                }
                return false return false;
           ;
            }
        }
        }

        if (checkCollision(nextX, nextY }

        if (checkCollision(nextX, nextY, 8)) return false;

        b.x = next, 8)) return false;

        b.x = nextX;
X;
        b.y = nextY;
        b.d        b.y = nextY;
        b.dist +=ist += speed;
 speed;
        if (b.dist > 600) return false;

        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0) continue;
            if (Math.hypot(b.x - t.x, b.y - t.y) < 30) {
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    // Get attacker's stats based on level        if (b.dist > 600) return false;

        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0) continue;
            if (Math.hypot(b.x - t.x, b.y - t.y) < 30) {
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    // Get attacker's stats based on level
                    const attackerType = 'Mysteria'; // all use Mysteria for now
                   
                    const attackerType = 'Mysteria'; // all use Mysteria for now
                    const stats = window const stats = window.getB.getBrawlerStats(rawlerStats(attackerType,attackerType, b.level);
                    b.level);
                    let damage let damage = b = b.super.super ? stats ? stats.super.superDamage : stats.dDamage : stats.damage;
                    if (amage;
                   b. if (b.ownerId === 'ownerId === 'player'player' && p && p.power > 0).power > 0) {
                        damage += {
                        damage += p.p p.power *ower * 200 200; // power; // power cubes boost cubes boost
                    }
                    t.h
                    }
                    t.hp -=p -= damage;
 damage;
                    t.revealUntil = now                    t.revealUntil = now +  + 1000;
                   1000;
                    if ( if (t.id === 't.id === 'player')player') {
                        {
                        t.last t.lastDamageTime = nowDamageTime = now;
                    }
               ;
                    }
                }
                }
                return false;
            }
        return false;
            }
        }
        return true }
        return true;
   ;
    });

    // Power });

    // Power cube collection
    cube collection
    for ( for (let i = battlelet i = battle.power.powerCubes.length -Cubes.length - 1 1; i; i >= 0; i--) >= 0; i--) {
        {
        const cube = battle.p const cube = battle.powerowerCubes[i];
       Cubes[i];
        if if (!cube (!cube.collected.collected && Math && Math.hypot(p.hypot(p.x -.x - cube.x, p cube.x, p.y -.y - cube.y cube.y)) < 30 < 30) {
) {
            cube.collected = true            cube.collected = true;
           ;
            p.p p.power++;
ower++;
            p            p.maxH.maxHp +=p += 500;
            500 p.h;
            p.hp = Math.minp = Math.min(p.hp +(p.hp + 500 500, p, p.maxH.maxHp);
p);
            powerCubes            powerCubesCollected++;
       Collected++;
        }
    }
    }

    }

    if ( if (p.p.ammoammo < p < p.maxAmmo.maxAmmo && now && now - p - p.lastAttackTime >.lastAttackTime > 150 1500)0) {
        {
        p.ammo p.ammo = Math.min(p = Math.min(p.maxAmmo, p.ammo +.maxAmmo, p.ammo + 0 0.01);
   .01);
    }

    // Bot }

    // Bot AI
 AI
    for    for (let (let bot of bot of battle.bots) battle.bots) {
        if(bot.hp <= {
        if(bot.hp <= 0) continue;
        0) continue;
        if ( if (Math.random() < 0.02) bot.angle += (Math.random() - 0Math.random() < 0.02) bot.angle += (Math.random() - 0.5);
        
        let.5);
        
        let nx = bot.x + Math.cos(b nx = bot.x + Math.cos(bot.angle)ot.angle) * bot.speed;
        * bot.speed;
        let ny let ny = bot.y + = bot.y + Math.sin Math.sin(bot.angle) *(bot.angle) * bot.speed;
        nx bot.speed;
        nx = Math.max(25, = Math.max(25, Math.min(mapLimit Math.min(mapLimit - 25, nx));
        ny = Math.max(25, Math.min(mapLimit - 25, nx));
        ny = Math.max(25, Math.min(mapLimit - 25, ny));

        if - 25, ny));

        if (!check (!checkCollisionCollision(nx, ny(nx, ny, 25)) {
           , 25)) bot.x = nx {
            bot.x = nx;
            bot.y = ny;
        } else {
           ;
            bot.y = ny;
        } else {
            bot.angle += (Math.random() -  bot.angle += (Math.random() - 0.5) * Math.PI;
        }
        
        let targets = [p, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0)];
        let visibleTargets = targets.filter(t => canSee(bot, t, now));
       0.5) * Math.PI;
        }
        
        let targets = [p, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0)];
        let visibleTargets = targets.filter(t => canSee(bot, t, now));
        let closest = null, min let closest = null, minDist =Dist = Infinity;
 Infinity;
        for (let        for (let t of visibleTargets) {
            const d = Math.hypot(bot.x - t.x, bot.y - t.y);
            if (d < minDist) { minDist = d; closest = t; }
        }
        if (closest t of visibleTargets) {
            const d = Math.hypot(bot.x - t.x, bot.y - t.y);
            if (d < minDist) { minDist = d; closest = t; }
        }
        && minDist < 400 && now - bot.lastShot > 2000) {
            spawnBullet(bot, Math.atan2(closest.y - bot.y, closest.x - bot.x), false);
            bot if (closest && minDist < 400 && now - bot.lastShot > 2000) {
            spawnBullet(bot, Math.atan2(closest.y - bot.y, closest.x - bot.x), false);
            bot.lastShot = now;
           .lastShot = now;
            bot.revealUntil = now + 500;
        }
    }

    const aliveCount = (p bot.revealUntil = now + 500;
        }
    }

    const aliveCount = (p.hp > 0 ? 1 : 0).hp > 0 ? 1 : 0) + battle.bots.filter(b => b.hp > 0).length;
    brawlersLeftEl.innerText = aliveCount;

    battle.poisonRadius -= 0.05;
    const centerX = mapLimit / + battle.bots.filter(b => b.hp > 0).length;
    brawlersLeftEl.innerText = aliveCount;

    battle.poisonRadius -= 0.05;
    const centerX = mapLimit / 2, centerY = mapLimit / 2;
    [...battle 2, centerY = mapLimit / 2;
    [...battle.bots, p].forEach(ent => {
        if(ent.hp <= 0) return;
        const dist = Math.hypot(ent.x - centerX.bots, p].forEach(ent => {
        if(ent.hp <= 0) return;
        const dist = Math.hypot(ent.x - centerX, ent.y - centerY, ent.y - centerY);
        if (dist > battle.p);
        if (dist > battle.poisonRadius && (!ent.invoisonRadius && (!ent.invincibleincibleUntil ||Until || now > now > ent.invinc ent.invincibleUntilibleUntil)) {
)) {
            ent.hp -= 2;
            if (ent            ent.hp -= 2;
            if (ent.id === 'player') ent.lastDamageTime = now;
        }
    });

    if (now - p.lastDamageTime >.id === 'player') ent.lastDamageTime = now;
        }
    });

    if (now - p.lastDamageTime > 2000 && now - p.lastAttackTime > 1500 && p 2000 && now - p.lastAttackTime > 1500 && p.hp < p.maxH.hp < p.maxHp) {
       p) {
        p.hp = p.h Math.minp = Math.min(p.max(p.maxHpHp, p.hp, p.hp +  + 10);
10);
    }

    if    }

    if (p (p.hp <= .hp <= 0) {
       0) {
        playerDead playerDead = true = true;
       ;
        deathAnimation deathAnimationStart =Start = now;
        window now;
        window.state.last.state.lastMatch =Match = {
            {
            rank: rank: aliveCount,
            coinsEarned aliveCount,
            coinsE: arned: 0,
0,
            starrdrop            starrdropEarnEarned: false
        };
ed: false
        };
        return;
           return;
    }

    }

    if (alive if (aliveCount ===Count === 1 1 && p.hp && p.hp >  > 0)0) {
        {
        const coinsEarn const coinsEarned =ed = 50 50 + Math + Math.floor(Math.floor(Math.random().random() *  * 30) + p30) + p.power.power * 10;
 * 10;
        window        window.playerState.coins.playerState.coins += coins += coinsEarned;
Earned;
        
        // Add        
        // Add troph trophiesies to current braw to current brawler
ler
        const braw        const brawlerNamelerName = window.state.current = window.state.currentBrawBrawler;
ler;
        const        const currentT currentTrophiesrophies = ( = (window.bwindow.brawlerrawlerProgress[brawlerName]Progress[brawlerName]?.t?.trophies) ||rophies) || 0 0;
       ;
        const trophyGain const trophyGain =  = 10;
        if (!window10;
        if (!window.braw.brawlerProgress[brawlerProgress[brawlerName]) {
            windowlerName]) {
            window.braw.brawlerProgress[brawlerProgress[brawlerNamelerName] =] = { trophies: { trophies: 0 0, level, level: : 1 };
1 };
        }
        window.braw        }
        window.brawlerProgresslerProgress[braw[brawlerName].tlerName].trophies = currentrophiesTroph = currentTrophiesies + + trophyG trophyGain;
ain;
        window.playerState        window.playerState.trophies =.trophies = Object.values Object.values(window.b(window.brawlerProgress).reduce((rawlerProgress).reduce((a, b) => a + b.trophies,a, b) => a + b.trophies, 0 0);
        
);
        
        //        // Daily win logic
 Daily win logic
        let        let starr starrdropEarneddropEarned = false = false;
       ;
        if ( if (window.playerwindow.playerState.dState.dailyWailyWins < 3ins < 3) {
) {
            window.playerState.daily            window.playerState.dailyWinsWins++;
           ++;
            window.current window.currentProfile.dProfile.daily_waily_wins = window.playerins = window.playerState.dState.dailyWailyWins;
            stins;
            starrdropEarnarrdropEarned =ed = true;
        }
 true;
        }
        
        // Save        
        everything
 // Save        if everything
        if (typeof (typeof saveProfile saveProfileToDB === 'ToDB === 'function')function') saveProfile saveProfileToDBToDB();
       ();
        saveBrawler saveBrawlerProgress(brawlerProgress(brawlerName,Name, window.brawler window.brawlerProgress[bProgress[brawlerrawlerName].Name].trophies,trophies, window.b window.brawlerrawlerProgress[bProgress[brawlerName].rawlerlevel);
Name].level);
        
               
        // Store // Store match info for after match info for aftergame menu
       game menu
        window.state window.state.lastMatch.lastMatch = {
 = {
            rank            rank: : 1,
1,
            coins            coinsEarned:Earned: coinsE coinsEarned,
           arned starr,
            starrdropEdropEarned: starned: starrdroparrdropEarnEarned
ed
        };
        
               };
        
        showAfterGame( showAfterGame(1, coinsE1, coinsEarnedarned, st, starrdroparrdropEarned);
Earn        exitBattle();
ed);
        exitBattle();
        return        return;
    }

   ;
    }

    battle.c battle.camera.xamera.x = p = p.x - (canvas.x - (canvas.width /.width / 2 2) /) / battle.c battle.camera.zoom;
amera.zoom;
    battle.camera    battle.y =.camera.y = p.y p.y - (canvas.height - (canvas.height /  / 2)2) / battle / battle.camera.zoom.camera.zoom;
}

;
}

function exitfunction exitBattle()Battle() {
    if ( {
   window.state if (window.state.battle.battle) {
) {
        window        window.state.b.state.battle.activeattle.active = false = false;
   ;
    }
    }
    window.state window.state.screen.screen = ' = 'menu';
    documentmenu';
    document.getElementById('.getElementById('battlebattle-screen').-screen').classListclassList.add('hidden');
.add('hidden');
    document.getElementById('    document.getElementById('menu-screenmenu-screen').style.display = 'flex';
    window.keys').style.display = 'flex';
    window.keys = { = { w: false, w: false, a: a: false, s: false, s: false, d: false, d: false };
}

function false };
}

function showAfterGame( showAfterGame(rank,rank, coins, coins, starrdropE starrdropEarnedarned = false = false) {
    const) {
    const menu = menu = document.getElementById document.getElementById('after('aftergame-menugame-menu');
   ');
    document.getElementById('after document.getElementById('aftergame-rankgame-rank').inner').innerText = `Rank #${Text = `Rank #${rank}`;
   rank}` document.getElementById;
    document.getElementById('after('aftergame-regame-reward').ward').innerText = `innerText = `+${+${coins}coins} coins`;
 coins`;
    
       
    // Daily // Daily wins progress
    wins progress
    const daily const dailyWinsEl = document.getElementByIdWinsEl = document.getElementById('after('aftergame-dgame-daily-waily-wins');
    ifins');
    if (daily (dailyWinsEl)WinsEl) {
        dailyW {
        dailyWinsEl.innerHTML = `DailyinsEl.innerHTML = `Daily Wins: ${window.playerState Wins: ${window.playerState.daily.dailyWins}/3`;
       Wins}/3`;
        if ( if (starrstarrdropEarneddropEarned) {
) {
            daily            dailyWinsEl.innerHTMLWinsEl.innerHTML += ' += ' <span <span style=" style="color:#fbbf24color:#fbbf24;">+1</;">+span>';
1</span>';
        }
        }
    }
    }
    
    // Starr    
   drop indicator // Starrdrop indicator
   
    const st const starrdroparrdropEl =El = document.getElementById document.getElementById('after('aftergame-stgame-starrdrop');
   arrdrop');
    if (starr if (starrdropEdropEarned) {
arned) {
        st        starrdroparrdropEl.innerHTMLEl.innerHTML = createStarr = createStarrDropSVG('DropSVG('RARE', RARE', 64);
64);
        st        starrdropEl.classListarrdrop.remove('El.classList.remove('hidden');
    }hidden');
    } else {
 else {
        starr        starrdropEl.classList.add('dropEl.classList.add('hidden');
hidden');
    }
    }
    
       
    menu.style.opacity menu.style = '.opacity = '0';
    menu0';
    menu.style.display.style.display = ' = 'flex';
flex';
    setTimeout(() =>    setTimeout menu.style(() => menu.style.opacity.opacity = '1', = '1', 50 50);
}

);
}

function hideAfterGame() {
function hideAfterGame() {
    const    const menu = menu = document.getElementById('aftergame-menu document.getElementById('aftergame-menu');
   ');
    menu.style.opacity menu.style.opacity = '0';
 = '0';
    setTimeout(() =>    setTimeout(() => {
        {
        menu.style menu.style.display =.display = 'none';
        'none';
        document.getElementById document.getElementById('menu('menu-screen').style.display-screen').style.display = ' = 'flex';
flex';
        //        // If a If a starr starrdrop wasdrop was earned, earned, open it open it now
        if (window.state.lastMatch && window.state now
        if (window.state.lastMatch && window.state.lastMatch.starrdropE.lastMatch.starrdropEarnedarned) {
) {
            startStarr            startStarrDropAnimation();
           DropAnimation();
            window window.state.last.state.lastMatch.starrdropMatch.starrdropEarnEarned =ed = false;
 false;
        }
    },        }
    }, 300 300);
}

);
}

// =// ========== OPTIM=========IZED DRAW OPTIMIZED DRAWING =ING ==========
=========
function drawGame()function draw {
   Game() {
    ctx.clear ctx.clearRect(Rect(0,0, 0, canvas 0, canvas.width,.width, canvas.height canvas.height);
   );
    ctx.image ctx.imageSmoSmoothingEnabledothingEnabled = false = false;
   ;
    ctx.save ctx.save();

   ();

    const bg = window.state.battle.background || const bg = window.state.battle.background || 'floor';
    'floor';
    let bg let bgColor =Color = '#d4a '#d4a373';
373';
    if    if (bg === ' (bg === 'water')water') bgColor bgColor = '#0284 = '#0284c7c7';
   ';
    else if else if (bg === ' (bg === 'grass')grass') bgColor bgColor = '# = '#2d2d6a6a4f4f';
    else if';
    else if (bg (bg === ' === 'stone') bgColorstone') bgColor = '# = '#4a4a4a4a4a4a';
   ';
    ctx.fill ctx.fillStyle = bgColorStyle = bgColor;
   ;
    ctx.fill ctx.fillRect(Rect(0,0, 0 0, canvas, canvas.width, canvas.height.width, canvas.height);

   );

    ctx.sc ctx.scale(windowale(window.state.battle.c.state.battle.camera.amera.zoom,zoom, window.state window.state.battle.battle.camera.camera.zoom.zoom);
   );
    ctx.translate(- ctx.translate(-window.statewindow.state.battle.battle.camera.camera.x, -window.x, -window.state.b.state.battle.cattle.camera.yamera.y);

   );

    const full const fullSize =Size = window.C window.CONONFIGFIG.MAP.MAP_SIZE * window.C_SIZE * window.CONFIGONFIG.TILE.TILE_SIZE;
_SIZE;
    const    const startCol startCol = Math.max( = Math.max(0,0, Math.floor Math.floor(window.state(window.state.battle.battle.camera.camera.x /.x / 64 64));
    const end));
    const endCol =Col = Math.min Math.min(window.CONFIG.MAP(window.CONFIG.MAP_SIZE,_SIZE, Math. Math.ceil((ceil((window.state.battlewindow.state.battle.camera.camera.x + canvas.width.x + canvas.width / window / window.state.b.state.battle.cattle.camera.zoom)amera.zoom) /  / 64));
64));
    const startRow    const = Math startRow = Math.max(.max(0, Math.floor0,(window.state Math.floor(window.state.battle.battle.camera.camera.y / 64));
.y / 64));
       const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((window.state.battle.battle.camera.y +.camera.y + canvas.height / window canvas.height / window.state.b.state.battle.cattle.camera.amera.zoom) / zoom)64));
 / 64));
    const    const now now = = Date.now Date.now();
    const p = window();
    const p.state.b = windowattle.player.state.battle.player;

   ;

    // Floor // Floor tiles
 tiles
    const    const floorTexture floorTexture = window = window.Textures.floor;
.Textures.floor;
    for (let    for (let i = i = startCol startCol; i < end; i < endCol;Col; i++) i++) {
        for ( {
        for (let j = startlet j = startRow; j < endRowRow; j < endRow; j; j++) {
++) {
            if (floor            if (Texture)floorTexture) {
                {
                ctx.draw ctx.drawImage(Image(floorTexturefloorTexture, i, i * 64, * 64, j * j * 64 64, 64, 64, 64, 64);
           );
            } else } else {
                {
                ctx.fillStyle = ctx.fillStyle = '#d4a '#d4a373';
373';
                ctx                ctx.fillRect.fillRect(i *(i * 64 64, j, j *  * 64,64, 64,  64, 64);
64);
            }
            }
        }
        }
    }

    //    }

    // Bushes Bushes
   
    window.state window.state.battle.bushes.battle.forEach(b => {
.bushes.forEach(b => {
        if        if (window (window.Textures.Textures.bush.bush) {
            ctx) {
.drawImage            ctx.drawImage(window.Text(window.Textures.bures.bush,ush, b.x b.x, b, b.y,.y, 64 64, , 64);
64);
        }        } else {
 else {
            ctx.fillStyle            ctx.fillStyle = '# = '#b453b45309';
09';
            ctx            ctx.fillRect.fillRect(b.x(b.x, b.y,, b.y, 64 64, 64);
,         }
64);
        }
    });

    });

    // Water
    // Water
    window.state.battle.water?.forEach(w => {
        ctx    window.state.battle.water?.forEach(w => {
        ctx.fillStyle.fillStyle = '#0284 = '#0284c7c7';
       ';
        ctx.fill ctx.fillRect(w.x,Rect(w.x, w.y w.y, , 64, 6464, );
       64);
        ctx.fill ctx.fillStyle =Style = '# '#7dd37dd3fc';
fc';
        for        for (let (let i = i = 0 0; i < ; i < 3;3; i++) i++) {
            {
            ctx.fill ctx.fillRect(w.x + 10Rect(w.x + 10, w, w.y +.y + 10 10 + i + i * * 20, 20, 44 44, 4);
, 4);
        }
        }
    });

    });

    //    // Boxes Boxes
   
    window.state window.state.battle.battle.boxes?.forEach.boxes?.forEach(b =>(b => {
        {
        if ( if (b.hp >b.hp > 0 0) {
) {
            ctx            ctx.fillStyle.fillStyle = '# = '#8b5a8b5a2b';
           2b';
            ctx.fill ctx.fillRect(b.x, b.yRect(b.x, b.y, , 64, 6464, 64);
           );
            ctx.st ctx.strokeStylerokeStyle = '#4a = '#37294a3729';
            ctx.line';
            ctx.lineWidth = 2;
           Width = 2;
            ctx.strokeRect ctx.st(b.xrokeRect(b.x, b, b.y,.y, 64 64, , 64);
64);
            if            if (b.hp (b.hp <  < 6000) {
6000) {
                ctx                ctx.fillStyle.fillStyle = ' = 'rgbargba(0,0(0,0,0,0,0.7)';
,0.7                ctx)';
                ctx.fillRect.fillRect(b.x(b.x +  + 5,5, b.y b.y -  - 10, 5410, 54, , 8);
8);
                ctx                ctx.fill.fillStyleStyle = '#f973 = '#f97316';
                ctx16';
                ctx.fillRect.fillRect(b.x(b.x + 5, +  b.y5, b.y -  - 10,10, (b (b.hp.hp /  / 6000)6000 * 54) *,  54, 8);
8);
                ctx.fillStyle                ctx = '.fillStyle = 'white';
white';
                ctx.font =                ctx 'bold.font = 'bold 12 12px Luckpx Luckiest Guyiest Guy';
                ctx.fill';
                ctx.fillText(`${Text(`${Math.Math.ceil(b.hpceil(b.hp)}`,)}`, b.x b.x + 25 + , b.y25, b.y -  - 15);
           15);
            }
 }
        }
        }
    });

    });

    //    // Power cubes Power cubes
    window.state
    window.state.battle.battle.p.powerCubesowerCubes?.forEach?.forEach(p =>(p => {
        {
        if (!p.col if (!p.collected)lected) {
            {
            ctx.fillStyle = ctx.fill '#fStyle = '#fbbbbff24';
24';
            ctx            ctx.fillRect(p.x.fillRect(p.x -  - 10,10, p.y -  p.y - 10, 2010, 20, , 20);
20);
            ctx            ctx.fillStyle = '#.fillStyle = '#b453b45309';
            ctx09';
            ctx.fillRect.fillRect(p.x(p.x - 5, -  p.y - 5, p.y - 5,5, 10 10, , 10);
        }
    });

10);
        }
    //    });

    // Barrels
    Barrels
    window.state window.state.battle.battle.barrels?..barforEach(brels?.forEach(b => {
 => {
        ctx        ctx.fillStyle = '#.fillStyle = '#b91b91c1c1c';
        ctxc';
        ctx.fillRect.fillRect(b.x, b(b.x, b.y,.y, 64,  64, 64);
64);
        ctx.fillStyle = '#        ctx.fillStyle = '#4a4a3729';
       3729';
        ctx.fillRect(b ctx.fillRect(b.x +.x + 8 8, b.y +, b.y + 8,  8, 48, 4848, 48);
    });

   );
    // Walls });

    // Walls
   
    window.state.battle window.state.walls.forEach(w.battle.walls.forEach(w => {
 => {
        if        if (window.Textures (window.wall.Textures.wall) {
) {
            ctx.drawImage            ctx(window.Text.drawImage(windowures.w.Textures.wall,all, w.x, w w.x, w.y,.y, 64, 64);
 64, 64);
        }        } else {
 else {
            ctx.fillStyle            ctx.fillStyle = '# = '#8b8b5a2b';
           5a2b';
            ctx.fill ctx.fillRect(w.x, w.yRect(w.x,,  w.y, 64,64, 64 64);
        }
   );
        }
    });

    const draw });

    const drawChar = (cChar = (c, isPlayer,, isPlayer, viewer) viewer) => {
 => {
        if (        if (c.hp <= c.hp <= 0) return;
0) return;
        if        if (!is (!isPlayer && !canSee(viewPlayer && !canSee(viewer,er, c, now)) c, now)) return;

        draw return;

        drawBrawBrawler(ctx, cler(ctx, c.type,.type, c.x c.x, c, c.y, c..y, c.angle);

        ctx.save();
angle);

        ctx.save();
        ctx.translate        ctx.translate(c.x, c(c.x, c.y);
.y);
        ctx.fillStyle        ctx.fillStyle = ' = 'white';
        ctx.font =white';
        ctx.font = 'bold 'bold 24px Luckiest Guy 24px Luckiest Guy';
       ';
        ctx.text ctx.textAlign =Align = 'center';
        ctx.fill 'center';
        ctx.fillText(cText(c.name, 0.name, 0, -, -70);

70);

        if (is        if (isPlayer &&Player && c.power > c.power > 0) {
 0) {
            ctx            ctx.save();
.save();
            ctx.translate            ctx.translate(40(40, -60);
, -60);
            ctx            ctx.fillStyle.fillStyle = '# = '#fbbf24';
           fbbf24';
            ctx.fill ctx.fillRect(-10, -10Rect(-10, -10, , 20,20, 20);
            20);
            ctx.fill ctx.fillStyle =Style = '#b45309 '#b45309';
           ';
            ctx.fill ctx.fillRect(-5, -5Rect(-5, -5, , 10, 1010, 10);
           );
            ctx.fill ctx.fillStyle = 'whiteStyle = 'white';
            ctx.font';
            ctx.font = ' = 'bold 20pxbold 20px Luckiest Luckiest Guy';
            ctx.fillText Guy';
            ctx.fillText(`x(`x${c.power${c.power}`, 15}`, 15, 5);
, 5);
            ctx.restore            ctx.restore();
        }

       ();
        }

        const bw =  const bw = 70;
        ctx70;
        ctx.fillStyle = '.fillStylergba(0 = 'rgba,0(0,0,0,0.7,0)';
,0.7)';
        ctx        ctx.fillRect.fillRect(-b(-bw /w / 2 2, -, -50,50, bw, 12 bw, 12);
        ctx.fill);
        ctx.fillStyle =Style = isPlayer isPlayer ? '#22c ? '#22c55e55e' :' : '#ef4444 '#ef4444';
       ';
        ctx.fillRect(- ctx.fillRect(-bw / bw / 2, -50, (c.hp / c.maxHp) * bw, 12);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Luckiest Guy';
2, -50, (c.hp / c.maxHp) * bw, 12);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Luckiest Guy';
        ctx        ctx.fillText.fillText(`${Math(`${Math.ceil.ceil(c.hp)}(c.h/${cp)}.maxH/${c.maxHp}p}`, -`, -bw / bw / 2,2, -55 -55);

       );

        if (isPlayer if (isPlayer) {
) {
            ctx            ctx.fillStyle.fillStyle = ' = 'rgba(0rgba(0,0,0,0,0,0.7)';
,0.7)';
            ctx            ctx.fillRect.fillRect(-b(-bw /w / 2 2, -36,, -36, bw, bw, 6 6);
           );
            ctx.fillStyle = ctx.fillStyle = '#f '#f9731697316';
';
                       ctx.fillRect(- ctx.fillRect(-bwbw /  / 2,2, -36 -36,, (c.ammo (c.ammo / c / c.maxA.maxAmmo) *mmo) * bw, bw, 6 6);
       );
        }
        ctx.rest }
        ctx.restoreore();
    };

    if();
    };

    if (is (isInBInBush(push(p.x,.x, p.y p.y)) {
)) {
        ctx.gl        ctx.globalobalAlpha =Alpha = 0 0.75.75;
   ;
    }
    drawChar }
    drawChar(p,(p, true, p);
 true, p);
       ctx.global ctx.globalAlpha =Alpha = 1 1;

   ;

    window.state window.state.battle.bots.battle.bots.forEach(b => {
.forEach(b => {
        if        if (can (canSee(p, bSee(p, b, now, now)) {
)) {
            draw            drawChar(b, falseChar(b, false, p, p);
       );
        }
    }
    });

    window.state.battle });

    window.state.battle.bul.bullets.forEach(b =>lets.forEach(b => {
        {
        ctx.fillStyle = b.s ctx.fillStyle = b.super ?uper ? '#f '#fbbf24'bbf24' : ' : 'white';
white';
        ctx.beginPath        ctx.beginPath();
       ();
        ctx. ctx.arc(barc(b.x, b.y, .x, b.y, 8,8,  0, Math0, Math.PI.PI *  * 2);
2);
        ctx        ctx.fill();
.fill();
    });

    });

    ctx.fillStyle    ctx.fillStyle = ' = 'rgbargba(168, 85,(168, 85, 247, 0. 247, 0.3)3)';
   ';
    ctx.begin ctx.beginPath();
    ctxPath();
    ctx.rect.rect(-200(-2000, -2000, -2000,0, fullSize fullSize +  + 4000, full4000, fullSize + 400Size + 4000);
    ctx0);
    ctx.arc.arc(full(fullSize / 2Size / 2, fullSize /, fullSize / 2 2, window.state.b, window.state.battle.pattle.poisonoisonRadius, 0Radius, 0, Math, Math.PI.PI *  * 2,2, true);
 true);
    ctx    ctx.fill();

.fill();

    ctx    ctx.restore.restore();
}

function draw();
}

function drawBrawBrawler(ctxler(ctx, type, type, x, x, y, y, angle) {
, angle) {
    if    if (window (window.Braw.BrawlerImageslerImages && window.Braw && window.BrawlerImageslerImages.game).game) {
        {
        ctx.save();
        ctx.save ctx.translate(x();
        ctx.translate(x, y, y);
       );
        ctx.rotate( ctx.rotate(angle);
angle);
        ctx        ctx.drawImage(window.B.drawImage(window.BrawlerImages.gamerawler, -40,Images.game, -40, -40,  -4080,, 80, 80 80);
       );
        ctx.rest ctx.restore();
ore();
        return;
    }

           return;
    }

    ctx.save ctx.save();
    ctx.trans();
    ctx.translate(xlate(x, y, y);
   );
    ctx.rotate( ctx.rotate(angle);
angle);
    
       
    ctx.fillStyle = ctx.fillStyle = '#a855f '#a855f7';
    ctx7';
    ctx.beginPath.beginPath();
   ();
    ctx. ctx.ellipse(0ellipse(0, , 0,0, 18 18, , 20,20, 0,  00,, 0, Math.P Math.PI*I*2);
    ctx2);
.fill();
    ctx.fill();
    ctx    ctx.strokeStyle =.stroke '#2Style = '#2d2d2d2d';
d2    ctxd';
    ctx.lineWidth = .lineWidth = 2;
2;
    ctx    ctx.stroke();
    
.stroke();
    
    ctx    ctx.fillStyle.fillStyle = '#c084 = '#fc';
c084fc';
    ctx    ctx.beginPath.beginPath();
    ctx.arc(();
    ctx.arc(0,0, -20 -20, , 10, 010, 0, Math, Math.PI.PI*2);
   *2);
    ctx.fill ctx.fill();
   ();
    ctx.stroke();
 ctx.st    
   roke();
    
    ctx ctx.fillStyle = 'white';
   .fillStyle = 'white';
    ctx.begin ctx.beginPath();Path(); ctx. ctx.arc(-arc(-4,4, -22 -22, , 2.2.5,5, 0 0, Math.PI, Math.PI*2*2); ctx); ctx.fill();
    ctx.fill();
    ctx.beginPath.beginPath(); ctx.arc(); ctx.arc(4, -(4, -22,22, 2.5,  2.50,, 0, Math.P Math.PI*2); ctx.fillI*2);();
    ctx.fill ctx.fill();
    ctx.fillStyle = '#2Style = '#2d1d1b0b0e';
    ctxe';
    ctx.beginPath.beginPath(); ctx.arc(-4, -21, 1.2, 0, Math.P(); ctx.arc(-4, -21, 1.2, 0, Math.PI*2); ctx.fill();
   I*2); ctx.fill();
    ctx.beginPath(); ctx. ctx.beginPath(); ctx.arc(arc(4,4, -21 -21, 1.2, 0, 1.2,, Math 0, Math.PI.PI*2); ctx*2); ctx.fill();
.fill();
    
       
    ctx.fill ctx.fillStyle =Style = '#5d3 '#5d3a1a';
a1a';
    ctx    ctx.beginPath.beginPath(); ctx.ell(); ctx.ellipse(ipse(0,0, -30,  -30, 14, 6, 14, 6, 0, 00,, Math 0, Math.PI.PI*2*2); ctx); ctx.fill();
    ctx.fill();
    ctx.fillRect.fillRect(-8(-8, -32,, - 16, 32, 16, 4);
4);
    
       
    ctx.fill ctx.fillStyle = '#4Style = '#4a3729';
a3729';
    ctx    ctx.fillRect.fillRect(10(10, -, -3, 24, 3, 24, 5);
5);
    ctx    ctx.fillRect(28.fillRect(28, -, -6, 5, 6, 5, 11);
11);
    
       
    ctx.restore();
 ctx.restore();
}

// =========}

// ========== INPUT HANDL= INPUT HANDING =LING ==========
=========
window.onkeydownwindow.onkey = (e)down = (e) => {
    if => {
    if (!e (!e) return) return;
   ;
    const active = document const active = document.activeElement.activeElement;
   ;
    if ( if (active &&active && (active (active.tagName === '.tagName === 'INPUT' || active.tagNameINPUT' || active.tagName === ' === 'TEXTTEXTAREAAREA')) {
')) {
        return        return;
   ;
    }
    }
    switch (e.code) {
 switch (e.code        case) {
        case 'Key 'KeyW':W': window.keys window.keys.w =.w = true; true; e.preventDefault e.preventDefault(); break;
       (); break;
        case ' case 'KeyAKeyA': window': window.keys.a.keys.a = = true; e.preventDefault(); true; e.preventDefault(); break;
 break;
        case        case 'KeyS': 'KeyS': window.keys window.keys.s =.s = true true;; e.preventDefault(); break e.preventDefault(); break;
       ;
        case 'KeyD case '': windowKeyD': window.keys.d.keys.d = true; e = true.preventDefault();; e break;
.preventDefault(); break;
    }
    }
};

window.onkey};

windowup =.onkeyup = (e (e) =>) => {
    {
    if (! if (!e)e) return;
    const return;
 active =    const active = document.active document.activeElement;
Element;
    if    if (active && ( (active && (active.tagactive.tagName === 'INPUTName === 'INPUT' ||' || active.tag active.tagName ===Name === 'TEXTAR 'TEXTAREA'))EA')) {
        {
        return;
    }
 return;
    }
    switch    switch (e (e.code).code) {
        {
        case ' case 'KeyWKeyW': window': window.keys.w.keys.w = false = false; e; e.preventDefault(); break;
.preventDefault();        case break;
        case 'KeyA': window.keys.a = 'KeyA': window.keys.a = false false; e.preventDefault; e.preventDefault(); break(); break;
       ;
        case ' case 'KeySKeyS': window': window.keys.s = false.keys.s = false; e; e.preventDefault();.preventDefault(); break;
        case break;
        case 'Key 'KeyD':D': window.keys window.keys.d =.d = false; false; e.preventDefault e.preventDefault(); break(); break;
   ;
    }
};

 }
};

function updatefunction updateKeyboardMovementKeyboardMovement() {
    if (!window() {
    if (!window.state.b.state.battle ||attle || !window.state.b !window.state.battle.activeattle.active || window || window.state.preBattle ||.state.preBattle || playerDead playerDead) return) return;
    let kx =;
    let kx = 0 0, ky = , ky = 0;
0;
    if    if (window (window.keys.w.keys.w) ky) ky -=  -= 1;
    if1;
 (window    if (window.keys.s.keys.s) ky) ky += 1 += 1;
;
    if    if (window.keys.a) k (window.keys.a) kx -=x -= 1 1;
   ;
    if (window.keys if (window.keys.d).d) kx kx +=  += 1;
1;
    if (kx    if !==  (kx !== 0 ||0 || ky !== ky !== 0 0) {
) {
        const        const mag = mag = Math.hypot Math.hypot(kx(kx, ky, ky);
        window.state);
        window.state.battle.battle.jo.joystickystick.move.x = k.move.x = kx /x / mag;
 mag;
        window        window.state.b.state.battle.jattle.joystick.move.y = ky /oystick.move.y = ky / mag;
 mag;
    }    } else {
 else {
        window        window.state.b.state.battle.joystattle.joystick.moveick.move.x =.x = 0 0;
       ;
        window.state.battle window.state.jo.battle.joystickystick.move.y.move.y =  = 0;
    }
}

function0;
    }
}

function setupJo setupJoystickystick(id, stickId(id, stickId, type, type) {
) {
    const base =    document.getElementById(id);
 const base = document.getElementById(id);
    const    const stick = stick = document.getElementById document.getElementById(stick(stickId);
Id);
    let active =    let false;
    const active = false;
    const handleInput = ( handleInpute) = (e) => {
 => {
        if        if (!active (!active) return) return;
       ;
        const touch const touch = e.tou = e.touches ?ches ? e.t e.touches[0ouches] :[0] : e;
 e;
        const        const rect = rect = base.get base.getBoundingBoundingClientRectClientRect();
        const center();
        const centerX =X = rect.left rect.left + rect.width/ + rect.width/2;
2;
        const        const centerY = rect centerY = rect.top +.top + rect.height rect.height/2;
       /2;
        let dx = touch let dx = touch.clientX -.clientX centerX;
 - centerX;
        let        let dy = dy = touch.client touch.clientY -Y - centerY centerY;
        const dist;
        = Math const dist = Math.hyp.hypot(dot(dx, dy);
x,        const dy);
        const max = max = 50;
        50;
        if ( if (dist >dist > max) { dx max) *= max/dist; { dx *= max/dist; dy *= max/dist dy *= max/dist; }
        stick; }
        stick.style.transform.style.transform = ` = `translate($translate(${dx{dx}px}px, ${dy}, ${dy}px)`;
       px)`;
        window.state.battle.j window.state.battleoystick.joystick[type] =[type] = { x: dx { x: dx/max/max, y, y: dy/max: dy/max };
    };
    };
    base.addEventListener };
   ('touch base.addEventListener('touchstart',start', (e (e) =>) => { active { active = true = true; handleInput(e; handle); });
Input(e); });
    window    window.addEventListener('.addEventListener('touchmovetouchmove', handle', handleInput);
Input);
    window.addEventListener('    window.addEventListener('toutouchend',chend', () => () => { 
        if { 
        if(active(active && type === ' && typeattack') === 'attack') {
            {
            const joy const joy = window = window.state.b.state.battle.jattle.joystoystick.attack;
ick.attack;
            if (Math.hyp            if (Math.hypot(ot(joy.xjoy.x, joy, joy.y).y) >  > 0.5) {
               0.5) {
                const ang const ang = Math. = Math.atanatan2(joy.y2(joy.y, joy, joy.x);
.x);
                spawn                spawnBulletBullet(window.state.b(window.stateattle.player,.battle.player, ang, ang, false);
 false);
            }
        }
            }
        }
        active        active = false = false; 
        stick.style.transform; 
        stick.style.transform = ' = 'translate(0,0)translate(0,';
       0)';
        window.state window.state.battle.jo.battle.joystick[typeystick[type] = { x] = { x: : 0,0, y: y: 0 };
    0 };
    });
}

 });
}

setupJosetupJoystickystick('('move-joymove-joy-base', 'move-joy-base', 'move-joy-stick-stick', '', 'move');
move');
setupJoysticksetupJoystick('attack('attack-joy-joy-base',-base', 'attack 'attack-joy-joy-stick', '-stick', 'attack');

attack');

canvas.addEventListenercanvas.addEventListener('('mmousedownousedown', (', (e) => {
e) => {
    if    if (!window (!window.state.b.state.battle ||attle || !window !window.state.b.state.battle.activeattle.active || window || window.state.pre.state.preBattle || playerDeadBattle || playerDead) return) return;
   ;
    const rect const rect = canvas.getB = canvasoundingClient.getBoundingClientRect();
Rect();
    const    const worldX worldX = ( = (e.cliente.clientX - rect.leftX - rect.left) /) / window.state window.state.battle.camera.battle.zoom.camera.zoom + window + window.state.b.state.battle.camera.xattle.camera.x;
   ;
    const world const worldY = (eY = (e.clientY.clientY - rect - rect.top) / window.top) / window.state.b.state.battle.cattle.camera.amera.zoom + window.statezoom + window.state.battle.battle.camera.camera.y;
.y;
    const    const p = p = window.state.battle window.state.player;
.battle.player;
    spawn    spawnBulletBullet(p,(p, Math. Math.atan2atan2(world(worldY - p.yY - p.y, world, worldX -X - p.x), false p.x), false);
});

);
});

document.getElementByIddocument.getElementById('super('super-btn').onclick-btn').onclick = ( = (e) => {
e) => {
    e    e.stopProp.stopPropagation();
agation();
    if (window    if (window.state.battle &&.state.battle && window.state window.state.battle.player &&.battle.player && !window !window.state.pre.state.preBattle && !playerDead) {
        spawnBullet(window.state.battle.player, window.state.battle.player.angleBattle && !playerDead) {
        spawnBullet(window.state.battle.player, window.state.battle.player.angle, true);
    }
};

, true);
    }
};

function spawnfunction spawnBulletBullet(owner(owner, angle, angle, is, isSuper)Super) {
    {
    if (!window.state if (!window.state.battle.battle || ! || !window.state.battlewindow.state.battle.active ||.active || window.state.preBattle window.state.preBattle || player || playerDead)Dead) return;
    if return;
    (owner if (owner.id ===.id === 'player') {
 'player') {
        owner        owner.lastAttack.lastAttackTime =Time = Date.now();
        Date.now owner.();
        owner.angle =angle = angle;
        owner angle;
        owner.reve.revealUntil = DatealUntil = Date.now() + 500;
    }
.now() + 500;
    }
    if    if (owner (owner.id ===.id === 'player 'player' &&' && !is !isSuper && owner.Super && owner.ammoammo <=  <= 0.0.9)9) return;
    if return;
    if (owner (owner.id ===.id === 'player' && 'player' && !is !isSuper) owner.Super) owner.ammo--;
   ammo--;
    const count = ( const count = (owner.typeowner.type === ' === 'Mysteria') ?Mysteria') ? 5 :  51;
    const : 1;
    const attackerLevel attackerLevel = owner = owner.level || 1.level || ;
   1;
 for (    for (let i = let i = 0;0; i i < count; i++) < count; i++) {
        {
        const spread const spread = ( = (i - (counti - (count -  - 1)1) / 2) / 2) *  * 0.0.15;
15;
        window.state.b        window.state.battle.battle.bullets.push({
ullets.push({
            x            x: owner: owner.x,
.x,
            y            y: owner.y,
: owner.y,
            angle: angle            angle: angle + spread + spread,
           ,
            dist: dist: 0 0,
            super:,
            super: isSuper isSuper,
            ownerId,
           : owner ownerId: owner.id,
            level.id,
            level: attacker: attackerLevel
Level
        });
    }
        });
}

//    }
 =========}

// ========== VIS= VISIBILITYIBILITY CHANGE HAND CHANGE HANDLER =LER ==========
document.addEventListener=========
document.addEventListener('visibility('visibilitychange',change', () => {
    () => {
    if ( if (document.document.visibilityStatevisibilityState === ' === 'visible')visible') {
        {
        if ( if (window.statewindow.state.battle.battle && window && window.state.battle.active.state.battle.active) {
            console) {
            console.log('.log('Tab became visible,Tab became exiting battle visible, exiting battle to menu to menu');
           ');
            exitBattle();
        exitBattle();
        }
    }
    }
});

 }
});

// Ex// Expose functions
pose functions
window.startwindow.startBattlePreBattlePre = start = startBattlePreBattlePre;
window;
window.showAfter.showAfterGame =Game = showAfterGame;
window.h showAfterGame;
window.hideAfterideAfterGame =Game = hideAfterGame;
window.exit hideAfterGame;
window.exitBattle =Battle = exitBattle exitBattle;
