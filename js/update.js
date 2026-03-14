// ========== MAIN UPDATE LOOGIC ==========
import { checkCollision } from './core.js';
import { spawnBullet, addKillMessage } from './utils.js';
import { createBottle, createBombExplosion, applyAreaDamage } from './effects.js';
import { updateBotAI } from './ai.js';
import { updateKeyboardMovement } from './input.js';

export function updateGame() {
    if (window.gameEnded) return;

    const battle = window.state.battle;
    const p = battle.player;
    const mapLimit = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const now = Date.now();

    // Update bombs
    battle.bombs = battle.bombs.filter(bomb => {
        const elapsed = now - bomb.startTime;
        if (elapsed >= bomb.duration) {
            if (bomb.isBottle) {
                createBottle(bomb.targetX, bomb.targetY, bomb.owner, bomb.level, battle, now);
            } else {
                createBombExplosion(bomb.targetX, bomb.targetY, battle, now, bomb.owner);
            }
            return false;
        }
        const t = elapsed / bomb.duration;
        bomb.currentX = bomb.x + (bomb.targetX - bomb.x) * t;
        bomb.currentY = bomb.y + (bomb.targetY - bomb.y) * t;
        return true;
    });

    battle.explosions = battle.explosions.filter(exp => now - exp.startTime < exp.duration);

    // Update area effects
    battle.areaEffects = battle.areaEffects.filter(effect => {
        const elapsed = now - effect.startTime;
        if (elapsed >= effect.duration) return false;
        while (effect.lastTick + 1000 <= now) {
            applyAreaDamage(effect, battle, now);
            effect.lastTick += 1000;
        }
        return true;
    });

    if (window.playerDead) {
        const elapsed = now - window.deathAnimationStart;
        if (elapsed < window.deathAnimationDuration) {
            const t = elapsed / window.deathAnimationDuration;
            battle.camera.zoom = 0.8 + (0.5 - 0.8) * t;
            battle.camera.x = p.x - (canvas.width/2)/battle.camera.zoom;
            battle.camera.y = p.y - (canvas.height/2)/battle.camera.zoom;
        } else {
            console.log('Death animation finished, deactivating battle and showing menu');
            window.playerDead = false;
            battle.active = false;
            window.gameEnded = true;
            if (window.state.lastMatch) {
                window.showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned, 0);
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
        const elapsed = now - window.preBattleStart;
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
            const fightTextEl = document.getElementById('fight-text');
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

    // Bullet update
    battle.bullets = battle.bullets.filter(b => {
        const bulletSpeed = (b.ownerType === 'Anthony' && !b.super) ? 18 : 12;
        const nextX = b.x + Math.cos(b.angle) * bulletSpeed;
        const nextY = b.y + Math.sin(b.angle) * bulletSpeed;

        // Box destruction
        if (!b.passThroughWalls) {
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
        }

        // Wall collision
        if (!b.passThroughWalls) {
            for (const wall of battle.walls) {
                if (nextX + 8 > wall.x && nextX - 8 < wall.x + 64 &&
                    nextY + 8 > wall.y && nextY - 8 < wall.y + 64) {
                    if (b.ownerType === 'Anthony' && b.super) {
                        createBombExplosion(b.x, b.y, battle, now, p);
                    }
                    return false;
                }
            }
        }

        // Water collision
        if (!b.passThroughWalls) {
            for (const water of battle.water || []) {
                if (nextX + 8 > water.x && nextX - 8 < water.x + 64 &&
                    nextY + 8 > water.y && nextY - 8 < water.y + 64) {
                    if (b.ownerType === 'Anthony' && b.super) {
                        createBombExplosion(b.x, b.y, battle, now, p);
                    }
                    return false;
                }
            }
        }

        // Barrel collision
        if (!b.passThroughWalls) {
            for (const barrel of battle.barrels || []) {
                if (nextX + 8 > barrel.x && nextX - 8 < barrel.x + 64 &&
                    nextY + 8 > barrel.y && nextY - 8 < barrel.y + 64) {
                    if (b.ownerType === 'Anthony' && b.super) {
                        createBombExplosion(b.x, b.y, battle, now, p);
                    }
                    return false;
                }
            }
        }

        b.x = nextX;
        b.y = nextY;
        b.dist += bulletSpeed;
        const maxRange = (b.ownerType === 'Anthony' && !b.super) ? 600 : 300;
        if (b.dist > maxRange) {
            if (b.ownerType === 'Brewiant' && !b.super) {
                createBottle(b.x, b.y, p, b.level, battle, now);
            }
            return false;
        }

        const targets = [p, ...battle.bots];
        for (let t of targets) {
            if (t.id === b.ownerId || t.hp <= 0 || t.dying) continue;
            const hitRadius = (b.ownerType === 'Anthony' && !b.super) ? 32 : 30;
            if (Math.hypot(b.x - t.x, b.y - t.y) < hitRadius) {
                if (b.ownerType === 'Anthony' && b.super) {
                    createBombExplosion(b.x, b.y, battle, now, p);
                    return false;
                }
                if (!t.invincibleUntil || now > t.invincibleUntil) {
                    const stats = window.getBrawlerStats(b.ownerType, b.level);
                    let damage = b.super ? stats.superDamage : stats.damage;
                    if (b.ownerId === 'player' && p.power > 0) {
                        damage += p.power * 200;
                    }
                    t.hp -= damage;
                    t.revealUntil = now + 1000;
                    if (t.id === 'player') t.lastDamageTime = now;

                    if (b.ownerType === 'Anthony' && !b.super) {
                        t.slowUntil = now + 1000;
                    }

                    if (!b.super) {
                        let chargeAmount = 10;
                        if (b.ownerType === 'Anthony') chargeAmount = 40;
                        const attacker = (b.ownerId === 'player') ? p : battle.bots.find(bot => bot.id === b.ownerId);
                        if (attacker) {
                            attacker.superCharge = Math.min(attacker.superMax, attacker.superCharge + chargeAmount);
                        }
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
                        addKillMessage(killerName, t.name);

                        if (t.id === 'player') {
                            console.log('PLAYER DIED, starting death animation');
                            window.playerDead = true;
                            window.deathAnimationStart = now;
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
        if (!cube.collected) {
            if (Math.hypot(p.x - cube.x, p.y - cube.y) < 30) {
                cube.collected = true;
                p.power++;
                p.maxHp += 500;
                p.hp = Math.min(p.hp + 500, p.maxHp);
                window.powerCubesCollected++;
            }
            for (let bot of battle.bots) {
                if (bot.hp > 0 && !bot.dying && Math.hypot(bot.x - cube.x, bot.y - cube.y) < 30) {
                    cube.collected = true;
                    bot.power++;
                    bot.maxHp += 500;
                    bot.hp = Math.min(bot.hp + 500, bot.maxHp);
                    break;
                }
            }
        }
    }

    // Ammo recharge for player
    if (p.ammo < p.maxAmmo && !p.dying) {
        p.ammo = Math.min(p.maxAmmo, p.ammo + 0.01);
    }

    // Bot AI
    for (let bot of battle.bots) {
        updateBotAI(bot, battle, now, mapLimit, p);
    }

    const aliveBots = battle.bots.filter(b => b.hp > 0 && !b.dying).length;
    const aliveCount = (p.hp > 0 && !p.dying ? 1 : 0) + aliveBots;
    document.getElementById('brawlers-left').innerText = aliveCount;

    // Poison gas – FASTER!
    battle.poisonRadius -= 0.5;   // <-- increased from 0.05 to 0.5
    const centerX = mapLimit / 2, centerY = mapLimit / 2;
    [...battle.bots, p].forEach(ent => {
        if(ent.hp <= 0 || ent.dying) return;
        const dist = Math.hypot(ent.x - centerX, ent.y - centerY);
        if (dist > battle.poisonRadius && (!ent.invincibleUntil || now > ent.invincibleUntil)) {
            ent.hp -= 2;
            if (ent.id === 'player') ent.lastDamageTime = now;
        }
    });

    // Natural regen
    if (!p.dying && now - p.lastDamageTime > 2000 && now - p.lastAttackTime > 1500 && p.hp < p.maxHp) {
        p.hp = Math.min(p.maxHp, p.hp + 10);
    }

    // Player death safety
    if (p.hp <= 0 && !p.dying) {
        console.log('Player HP <= 0 (safety), setting death state');
        p.dying = true;
        p.deathTime = now;
        window.playerDead = true;
        window.deathAnimationStart = now;
        window.state.lastMatch = {
            rank: aliveCount + 1,
            coinsEarned: 0,
            starrdropEarned: false
        };
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
        
        window.playerState.trophies = Object.values(window.brawlerProgress).reduce((a, b) => a + (b.trophies || 0), 0);
        
        let starrdropEarned = false;
        if (window.playerState.dailyWins < 3) {
            window.playerState.dailyWins++;
            if (window.currentProfile) window.currentProfile.daily_wins = window.playerState.dailyWins;
            starrdropEarned = true;
        }
        
        if (typeof window.saveProfileToDB === 'function') window.saveProfileToDB();
        if (typeof window.saveBrawlerProgress === 'function') window.saveBrawlerProgress();
        
        window.state.lastMatch = {
            rank: 1,
            coinsEarned: coinsEarned,
            starrdropEarned: starrdropEarned
        };
        
        window.gameEnded = true;
        battle.active = false;
        
        window.showAfterGame(1, coinsEarned, starrdropEarned, trophyGain);
        return;
    }

    battle.camera.x = p.x - (canvas.width / 2) / battle.camera.zoom;
    battle.camera.y = p.y - (canvas.height / 2) / battle.camera.zoom;
}
