// ========== AREA EFFECTS (Brewiant & Anthony) ==========
import { checkCollision } from './core.js';
import { addKillMessage } from './utils.js';

export function createBombExplosion(centerX, centerY, battle, now, owner) {
    const radius = 192; // 3 tiles
    const pushForce = 200;
    const mapSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;

    battle.explosions.push({
        x: centerX,
        y: centerY,
        startTime: now,
        duration: 500
    });

    battle.walls = battle.walls.filter(w => {
        const dx = w.x + 32 - centerX;
        const dy = w.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

    battle.bushes = battle.bushes.filter(b => {
        const dx = b.x + 32 - centerX;
        const dy = b.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

    battle.barrels = battle.barrels.filter(b => {
        const dx = b.x + 32 - centerX;
        const dy = b.y + 32 - centerY;
        return Math.hypot(dx, dy) > radius;
    });

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

                if (dist > 1) {
                    const pushX = (dx / dist) * pushForce;
                    const pushY = (dy / dist) * pushForce;
                    let newX = t.x + pushX;
                    let newY = t.y + pushY;
                    newX = Math.max(25, Math.min(mapSize - 25, newX));
                    newY = Math.max(25, Math.min(mapSize - 25, newY));
                    if (!checkCollision(newX, newY, 25)) {
                        t.x = newX;
                        t.y = newY;
                    }
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

export function createBottle(x, y, owner, level, battle, now) {
    const stats = window.getBrawlerStats('Brewiant', level);
    const effect = {
        type: 'bottle',
        x: x,
        y: y,
        radius: 128, // 2 tiles
        damagePerSecond: stats.damage * 2,
        startTime: now,
        duration: 2000,
        ownerId: owner.id,
        ownerLevel: level,
        lastTick: now
    };
    battle.areaEffects.push(effect);
    applyAreaDamage(effect, battle, now);
}

export function createBubble(centerX, centerY, owner, level, battle, now) {
    const stats = window.getBrawlerStats('Brewiant', level);
    const effect = {
        type: 'bubble',
        x: centerX,
        y: centerY,
        radius: 192, // 3 tiles
        damagePerSecond: stats.superDamage,
        startTime: now,
        duration: 3000,
        ownerId: owner.id,
        ownerLevel: level,
        lastTick: now
    };
    battle.areaEffects.push(effect);
    applyAreaDamage(effect, battle, now);
}

export function applyAreaDamage(effect, battle, now) {
    const p = battle.player;
    const targets = [p, ...battle.bots];
    targets.forEach(t => {
        if (t.id === effect.ownerId) return;
        if (t.hp <= 0 || t.dying) return;
        const dist = Math.hypot(t.x - effect.x, t.y - effect.y);
        if (dist < effect.radius) {
            if (!t.invincibleUntil || now > t.invincibleUntil) {
                t.hp -= effect.damagePerSecond;
                t.revealUntil = now + 1000;
                if (t.id === 'player') t.lastDamageTime = now;

                if (effect.ownerId === p.id && effect.type === 'bottle') {
                    p.superCharge = Math.min(p.superMax, p.superCharge + 10);
                }

                if (t.hp <= 0 && !t.dying) {
                    t.dying = true;
                    t.deathTime = now;
                    let killerName = 'Unknown';
                    if (effect.ownerId === p.id) {
                        killerName = p.name;
                    } else {
                        const killerBot = battle.bots.find(bot => bot.id === effect.ownerId);
                        killerName = killerBot ? killerBot.name : 'Brewiant';
                    }
                    addKillMessage(killerName, t.name);
                }
            }
        }
    });

    for (let box of battle.boxes) {
        if (box.hp <= 0) continue;
        const dist = Math.hypot(box.x + 32 - effect.x, box.y + 32 - effect.y);
        if (dist < effect.radius) {
            box.hp -= effect.damagePerSecond;
            if (box.hp <= 0) {
                battle.powerCubes.push({ x: box.x + 32, y: box.y + 32, collected: false });
            }
        }
    }
}
