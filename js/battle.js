// ========== BATTLE INITIALIZATION ==========
import { checkCollision } from './core.js';
import { ensureKillFeed } from './utils.js';
import { createBubble } from './effects.js'; // for bot creation? not needed here but kept for consistency

export async function startBattlePre() {
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
        window.preBattleStart = Date.now();
        document.getElementById('battle-ui').style.display = 'none';
    }, 500);
}

export function startBattle(customMap = null, background = 'floor') {
    window.gameEnded = false;
    window.state.screen = 'battle';
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('battle-screen').classList.remove('hidden');
    
    const canvas = document.getElementById('gameCanvas');
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
    
    window.powerCubesCollected = 0;
    // Kill messages are managed in utils.js, we clear the array there? We'll rely on the module's internal array.
    // For now, we can re-initialize by resetting the module's variable if needed. Simpler: keep as is.

    window.state.battle = {
        active: true,
        camera: { x: 0, y: 0, zoom: 0.8 },
        poisonRadius: fullSize / 1.1,
        player: null,
        bullets: [],
        bombs: [],
        explosions: [],
        areaEffects: [],
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

    // Create bots
    const brawlerTypes = Object.keys(window.CONFIG.BRAWLERS);
    const personalities = ['aggressive', 'defensive', 'balanced'];
    for(let i=0; i<9; i++) {
        const botSpawn = pickSpawnPoint(usedSpawns);
        usedSpawns.push(botSpawn);
        
        const botType = brawlerTypes[Math.floor(Math.random() * brawlerTypes.length)];
        const botLevel = Math.floor(Math.random() * 3) + 1;
        const botStats = window.getBrawlerStats(botType, botLevel);
        const botData = window.CONFIG.BRAWLERS[botType];
        
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        
        window.state.battle.bots.push({
            id: 'bot_'+i, 
            name: `${botType}-${i+1}`,
            x: botSpawn.x, y: botSpawn.y,
            hp: botStats.health, 
            maxHp: botStats.health,
            level: botLevel,
            type: botType, 
            speed: botData.speed,
            ammo: botData.ammo,
            maxAmmo: botData.ammo,
            reloadTimer: 0,
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
            slowUntil: 0,
            personality: personality,
            targetEntity: null,
            lastTargetUpdate: 0,
            retreatThreshold: personality === 'defensive' ? 0.6 : (personality === 'aggressive' ? 0.3 : 0.45),
            attackRange: 400,
            lastSuperCheck: 0
        });
    }

    ensureKillFeed();

    if (window.gameLoopId) cancelAnimationFrame(window.gameLoopId);
    window.gameLoopId = requestAnimationFrame(window.gameLoop);
}
