// ========== BOT AI ==========

function updateBotAI(bot, battle, now, mapLimit, player) {
    if (bot.hp <= 0 || bot.dying) return;

    // Reload ammo
    if (bot.ammo < bot.maxAmmo) {
        bot.ammo = Math.min(bot.maxAmmo, bot.ammo + 0.005);
    }

    // Choose target
    if (!bot.targetEntity || (bot.targetEntity.hp <= 0 || bot.targetEntity.dying) || now - bot.lastTargetUpdate > 2000) {
        const possibleTargets = [player, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0 && !b.dying)];
        const visible = possibleTargets.filter(t => window.canSee(bot, t, now));
        if (visible.length > 0) {
            if (bot.personality === 'aggressive') {
                visible.sort((a,b) => Math.hypot(bot.x - a.x, bot.y - a.y) - Math.hypot(bot.x - b.x, bot.y - b.y));
                bot.targetEntity = visible[0];
            } else if (bot.personality === 'defensive') {
                visible.sort((a,b) => Math.hypot(bot.x - b.x, bot.y - b.y) - Math.hypot(bot.x - a.x, bot.y - a.y));
                bot.targetEntity = visible[0];
            } else {
                bot.targetEntity = visible[Math.floor(Math.random() * visible.length)];
            }
        } else {
            bot.targetEntity = null;
        }
        bot.lastTargetUpdate = now;
    }

    // Movement
    let moveSpeed = bot.speed;
    let desiredAngle = bot.angle;

    if (bot.targetEntity) {
        const dx = bot.targetEntity.x - bot.x;
        const dy = bot.targetEntity.y - bot.y;
        const distToTarget = Math.hypot(dx, dy);
        const healthPercent = bot.hp / bot.maxHp;
        desiredAngle = Math.atan2(dy, dx);

        if (healthPercent < bot.retreatThreshold) {
            desiredAngle += Math.PI;
            moveSpeed *= 0.8;
        } else {
            if (bot.personality === 'aggressive') {
                if (distToTarget > bot.attackRange * 0.7) {
                    // move closer
                } else {
                    moveSpeed = 0;
                }
            } else if (bot.personality === 'defensive') {
                if (distToTarget < bot.attackRange * 0.5) {
                    desiredAngle += Math.PI;
                } else if (distToTarget > bot.attackRange) {
                    // move closer
                } else {
                    moveSpeed = 0;
                }
            } else { // balanced
                if (distToTarget > bot.attackRange) {
                    // move closer
                } else if (distToTarget < bot.attackRange * 0.4) {
                    desiredAngle += Math.PI;
                } else {
                    moveSpeed *= 0.5;
                }
            }
        }
    } else {
        if (Math.random() < 0.02) desiredAngle += (Math.random() - 0.5) * 0.5;
        moveSpeed *= 0.5;
    }

    if (moveSpeed > 0) {
        let moved = false;
        let newX = bot.x + Math.cos(desiredAngle) * moveSpeed;
        let newY = bot.y + Math.sin(desiredAngle) * moveSpeed;
        newX = Math.max(25, Math.min(mapLimit - 25, newX));
        newY = Math.max(25, Math.min(mapLimit - 25, newY));
        if (!window.checkCollision(newX, newY, 25)) {
            bot.x = newX;
            bot.y = newY;
            bot.angle = desiredAngle;
            moved = true;
        } else {
            for (let attempt = 0; attempt < 5; attempt++) {
                let testAngle = desiredAngle + (Math.random() - 0.5) * Math.PI;
                let tx = bot.x + Math.cos(testAngle) * moveSpeed * 0.7;
                let ty = bot.y + Math.sin(testAngle) * moveSpeed * 0.7;
                tx = Math.max(25, Math.min(mapLimit - 25, tx));
                ty = Math.max(25, Math.min(mapLimit - 25, ty));
                if (!window.checkCollision(tx, ty, 25)) {
                    bot.x = tx;
                    bot.y = ty;
                    bot.angle = testAngle;
                    moved = true;
                    break;
                }
            }
        }
        if (!moved) {
            bot.angle += (Math.random() - 0.5) * 0.5;
        }
    }

    // Attack
    if (bot.targetEntity && bot.ammo >= 1 && now - bot.lastShot > 2000) {
        const dx = bot.targetEntity.x - bot.x;
        const dy = bot.targetEntity.y - bot.y;
        const dist = Math.hypot(dx, dy);
        if (dist < bot.attackRange) {
            const angle = Math.atan2(dy, dx);
            window.spawnBullet(bot, angle, false);
            bot.ammo--;
            bot.lastShot = now;
            bot.revealUntil = now + 500;
        }
    }

    // Super usage
    if (bot.superCharge >= bot.superMax && now - bot.lastSuperCheck > 1000) {
        bot.lastSuperCheck = now;
        if (bot.type === 'Mysteria') {
            if (bot.targetEntity) {
                const dx = bot.targetEntity.x - bot.x;
                const dy = bot.targetEntity.y - bot.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 400 && bot.targetEntity.hp / bot.targetEntity.maxHp < 0.3) {
                    window.spawnBullet(bot, Math.atan2(dy, dx), true);
                    bot.superCharge = 0;
                }
            }
        } else if (bot.type === 'Brewiant') {
            const nearbyEnemies = [player, ...battle.bots].filter(t => 
                t.id !== bot.id && t.hp > 0 && !t.dying && 
                Math.hypot(t.x - bot.x, t.y - bot.y) < 192
            ).length;
            if (nearbyEnemies >= 2 || bot.hp / bot.maxHp < 0.25) {
                window.createBubble(bot.x, bot.y, bot, bot.level, battle, now);
                bot.superCharge = 0;
            }
        } else if (bot.type === 'Anthony') {
            if (bot.targetEntity) {
                const los = window.checkLineOfSight(bot, bot.targetEntity, battle.walls);
                if (!los || (bot.targetEntity.hp / bot.targetEntity.maxHp < 0.3)) {
                    const bomb = {
                        x: bot.x,
                        y: bot.y,
                        targetX: bot.targetEntity.x,
                        targetY: bot.targetEntity.y,
                        startTime: now,
                        duration: 400,
                        owner: bot,
                        level: bot.level
                    };
                    battle.bombs.push(bomb);
                    bot.superCharge = 0;
                }
            }
        }
    }
}

// Expose globally
window.updateBotAI = updateBotAI;
