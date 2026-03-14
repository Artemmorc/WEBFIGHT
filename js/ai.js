// ========== BOT AI (IMPROVED) ==========

// Constants
const TARGET_UPDATE_INTERVAL = 2000; // ms
const ATTACK_COOLDOWN = 1500; // ms
const SUPER_CHECK_INTERVAL = 1000; // ms
const CUBE_SEARCH_RADIUS = 300;
const POISON_ESCAPE_THRESHOLD = 100; // distance from poison edge to start fleeing

export function updateBotAI(bot, battle, now, mapLimit, player) {
    if (bot.hp <= 0 || bot.dying) return;

    // Reload ammo
    if (bot.ammo < bot.maxAmmo) {
        bot.ammo = Math.min(bot.maxAmmo, bot.ammo + 0.005);
    }

    // ----- TARGET SELECTION -----
    // Update target periodically or if current target is dead/invalid
    if (!bot.targetEntity || bot.targetEntity.hp <= 0 || bot.targetEntity.dying || now - bot.lastTargetUpdate > TARGET_UPDATE_INTERVAL) {
        chooseNewTarget(bot, battle, now, player);
        bot.lastTargetUpdate = now;
    }

    // ----- MOVEMENT DECISION -----
    let targetX = null, targetY = null;
    let moveSpeed = bot.speed;
    let desiredAngle = bot.angle; // default

    // Priority 1: Collect nearby power cubes
    const nearestCube = findNearestPowerCube(bot, battle);
    if (nearestCube) {
        targetX = nearestCube.x;
        targetY = nearestCube.y;
    }
    // Priority 2: Flee from poison if too close
    else if (isPoisonClose(bot, battle, mapLimit)) {
        const centerX = mapLimit / 2;
        const centerY = mapLimit / 2;
        targetX = centerX;
        targetY = centerY;
    }
    // Priority 3: Engage target
    else if (bot.targetEntity) {
        targetX = bot.targetEntity.x;
        targetY = bot.targetEntity.y;
    }

    if (targetX !== null && targetY !== null) {
        const dx = targetX - bot.x;
        const dy = targetY - bot.y;
        const distToTarget = Math.hypot(dx, dy);
        desiredAngle = Math.atan2(dy, dx);

        // Adjust speed based on health (retreat if low)
        const healthPercent = bot.hp / bot.maxHp;
        if (healthPercent < bot.retreatThreshold && bot.targetEntity) {
            // Run away from target
            desiredAngle += Math.PI;
            moveSpeed *= 1.2; // flee faster
        } else if (distToTarget < 100) {
            // Too close, back off a bit
            desiredAngle += Math.PI;
            moveSpeed *= 0.5;
        } else if (distToTarget > bot.attackRange) {
            // Move closer
            moveSpeed *= 0.8; // approach slower to avoid overshooting
        } else {
            // In attack range, strafe or hold
            if (Math.random() < 0.3) {
                // Strafe perpendicular
                desiredAngle += (Math.random() > 0.5 ? Math.PI/2 : -Math.PI/2);
                moveSpeed *= 0.6;
            } else {
                moveSpeed = 0; // hold position
            }
        }
    }

    // Attempt to move
    if (moveSpeed > 0) {
        moveBot(bot, desiredAngle, moveSpeed, mapLimit);
    }

    // ----- ATTACK -----
    if (bot.targetEntity && bot.ammo >= 1 && now - bot.lastShot > ATTACK_COOLDOWN) {
        const dx = bot.targetEntity.x - bot.x;
        const dy = bot.targetEntity.y - bot.y;
        const dist = Math.hypot(dx, dy);
        // Check line of sight
        if (dist < bot.attackRange && window.canSee(bot, bot.targetEntity, now)) {
            const angle = Math.atan2(dy, dx);
            window.spawnBullet(bot, angle, false);
            bot.ammo--;
            bot.lastShot = now;
            bot.revealUntil = now + 500;
        }
    }

    // ----- SUPER USAGE -----
    if (bot.superCharge >= bot.superMax && now - bot.lastSuperCheck > SUPER_CHECK_INTERVAL) {
        bot.lastSuperCheck = now;
        useSuper(bot, battle, now, player);
    }
}

// Choose a new target (player or another bot)
function chooseNewTarget(bot, battle, now, player) {
    const possibleTargets = [player, ...battle.bots.filter(b => b.id !== bot.id && b.hp > 0 && !b.dying)];
    // Only consider visible targets
    const visible = possibleTargets.filter(t => window.canSee(bot, t, now));
    if (visible.length === 0) {
        bot.targetEntity = null;
        return;
    }

    // Personality-based selection
    if (bot.personality === 'aggressive') {
        // Closest
        visible.sort((a,b) => Math.hypot(bot.x - a.x, bot.y - a.y) - Math.hypot(bot.x - b.x, bot.y - b.y));
        bot.targetEntity = visible[0];
    } else if (bot.personality === 'defensive') {
        // Farthest (keep distance)
        visible.sort((a,b) => Math.hypot(bot.x - b.x, bot.y - b.y) - Math.hypot(bot.x - a.x, bot.y - a.y));
        bot.targetEntity = visible[0];
    } else {
        // Balanced: random among visible
        bot.targetEntity = visible[Math.floor(Math.random() * visible.length)];
    }
}

// Find the nearest uncollected power cube
function findNearestPowerCube(bot, battle) {
    let nearest = null;
    let minDist = Infinity;
    for (let cube of battle.powerCubes) {
        if (!cube.collected) {
            const dist = Math.hypot(bot.x - cube.x, bot.y - cube.y);
            if (dist < CUBE_SEARCH_RADIUS && dist < minDist) {
                minDist = dist;
                nearest = cube;
            }
        }
    }
    return nearest;
}

// Check if bot is too close to the poison edge
function isPoisonClose(bot, battle, mapLimit) {
    const centerX = mapLimit / 2;
    const centerY = mapLimit / 2;
    const distToCenter = Math.hypot(bot.x - centerX, bot.y - centerY);
    return distToCenter > battle.poisonRadius - POISON_ESCAPE_THRESHOLD;
}

// Move the bot with collision avoidance
function moveBot(bot, desiredAngle, speed, mapLimit) {
    let moved = false;
    // Try desired direction first
    let newX = bot.x + Math.cos(desiredAngle) * speed;
    let newY = bot.y + Math.sin(desiredAngle) * speed;
    newX = Math.max(25, Math.min(mapLimit - 25, newX));
    newY = Math.max(25, Math.min(mapLimit - 25, newY));
    if (!window.checkCollision(newX, newY, 25)) {
        bot.x = newX;
        bot.y = newY;
        bot.angle = desiredAngle;
        moved = true;
    } else {
        // Try up to 5 random angles
        for (let attempt = 0; attempt < 5; attempt++) {
            let testAngle = desiredAngle + (Math.random() - 0.5) * Math.PI;
            let tx = bot.x + Math.cos(testAngle) * speed * 0.7;
            let ty = bot.y + Math.sin(testAngle) * speed * 0.7;
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
        // Completely stuck – rotate in place
        bot.angle += (Math.random() - 0.5) * 0.5;
    }
}

// Use super based on brawler type
function useSuper(bot, battle, now, player) {
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
        // Use bubble if surrounded by at least 2 enemies or low health
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
            // Check if target is behind a wall
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

// Expose the main function globally
window.updateBotAI = updateBotAI;
