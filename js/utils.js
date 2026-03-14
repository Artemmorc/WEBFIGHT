// ========== UTILITY FUNCTIONS ==========

let killMessages = [];

export function addKillMessage(killerName, victimName) {
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

export function getKillMessages() {
    return killMessages;
}

export function ensureKillFeed() {
    let killFeed = document.getElementById('kill-feed');
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

export function spawnBullet(owner, angle, isSuper) {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || window.playerDead) return;
    if (owner.id === 'player') {
        owner.lastAttackTime = Date.now();
        owner.angle = angle;
        owner.revealUntil = Date.now() + 500;
    }
    if (owner.id === 'player' && !isSuper && owner.ammo <= 0.9) return;
    if (owner.id === 'player' && !isSuper) owner.ammo--;
    const count = (owner.type === 'Mysteria') ? 5 : 1;
    const attackerLevel = owner.level || 1;
    const passThrough = (owner.type === 'Brewiant' && !isSuper);
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
            ownerType: owner.type,
            passThroughWalls: passThrough
        });
    }
}

export function checkLineOfSight(from, to, walls) {
    const steps = 10;
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        for (let w of walls) {
            if (x > w.x && x < w.x + 64 && y > w.y && y < w.y + 64) return false;
        }
    }
    return true;
}
