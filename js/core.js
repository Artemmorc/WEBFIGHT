// ========== CORE GAME CONSTANTS & HELPERS ==========

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

// Expose globally
window.isInBush = isInBush;
window.canSee = canSee;
window.checkCollision = checkCollision;
