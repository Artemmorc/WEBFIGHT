// ========== KEYBOARD, MOUSE, JOYSTICK HANDLERS ==========

// Mouse aiming variables (global)
window.mouseInsideCanvas = false;
window.mouseAimAngle = 0;
window.superAiming = false;
window.attackTarget = null;

// Ensure keys object exists
window.keys = window.keys || { w: false, a: false, s: false, d: false };

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

function updateKeyboardMovement() {
    if (!window.state.battle || !window.state.battle.active || window.state.preBattle || window.playerDead) return;
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

// Keyboard listeners – safe with window.keys
window.onkeydown = (e) => {
    if (!e) return;
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
        return;
    }
    if (!window.keys) window.keys = { w: false, a: false, s: false, d: false };
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
    if (!window.keys) window.keys = { w: false, a: false, s: false, d: false };
    switch (e.code) {
        case 'KeyW': window.keys.w = false; e.preventDefault(); break;
        case 'KeyA': window.keys.a = false; e.preventDefault(); break;
        case 'KeyS': window.keys.s = false; e.preventDefault(); break;
        case 'KeyD': window.keys.d = false; e.preventDefault(); break;
    }
};

// ========== MOUSE AIMING HANDLERS ==========
function setupMouseListeners() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found for mouse listeners');
        return;
    }

    canvas.addEventListener('mouseenter', () => {
        if (window.state.battle && window.state.battle.active) {
            window.mouseInsideCanvas = true;
        }
    });

    canvas.addEventListener('mouseleave', () => {
        window.mouseInsideCanvas = false;
        if (window.state.battle) {
            window.state.battle.isAiming = false;
            window.superAiming = false;
            window.state.battle.superTarget = null;
            window.attackTarget = null;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!window.state.battle || !window.state.battle.active || window.state.preBattle || window.playerDead) return;
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
        const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
        const p = window.state.battle.player;
        if (p) {
            if (window.superAiming && p.type === 'Anthony') {
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
            } else if (p.type === 'Brewiant') {
                // Always update attackTarget for Brewiant
                const dx = worldX - p.x;
                const dy = worldY - p.y;
                const dist = Math.hypot(dx, dy);
                const maxDist = 1600;
                const targetDist = Math.min(dist, maxDist);
                const angle = Math.atan2(dy, dx);
                window.attackTarget = {
                    x: p.x + Math.cos(angle) * targetDist,
                    y: p.y + Math.sin(angle) * targetDist
                };
                window.state.battle.isAiming = true;
                window.state.battle.aimAngle = angle;
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
        if (!window.state.battle || !window.state.battle.active || window.state.preBattle || window.playerDead) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left) / window.state.battle.camera.zoom + window.state.battle.camera.x;
        const worldY = (e.clientY - rect.top) / window.state.battle.camera.zoom + window.state.battle.camera.y;
        const p = window.state.battle.player;

        if (e.button === 0) { // Left click – main attack
            if (p.type === 'Brewiant') {
                // One‑step attack: use current attackTarget
                if (p.ammo >= 1 && !p.dying && window.attackTarget) {
                    const bomb = {
                        x: p.x,
                        y: p.y,
                        targetX: window.attackTarget.x,
                        targetY: window.attackTarget.y,
                        startTime: Date.now(),
                        duration: 400,
                        owner: p,
                        level: p.level,
                        isBottle: true
                    };
                    window.state.battle.bombs.push(bomb);
                    p.ammo--;
                    p.lastAttackTime = Date.now();
                }
            } else {
                window.spawnBullet(p, Math.atan2(worldY - p.y, worldX - p.x), false);
            }
        } else if (e.button === 2) { // Right click – super
            if (p.type === 'Anthony') {
                if (!window.superAiming) {
                    window.superAiming = true;
                    window.state.battle.isAiming = true;
                    const dx = worldX - p.x;
                    const dy = worldY - p.y;
                    const dist = Math.hypot(dx, dy);
                    const maxDist = 1600;
                    const targetDist = Math.min(dist, maxDist);
                    const angle = Math.atan2(dy, dx);
                    window.state.battle.superTarget = {
                        x: p.x + Math.cos(angle) * targetDist,
                        y: p.y + Math.sin(angle) * targetDist
                    };
                } else {
                    if (p.superCharge >= p.superMax && !p.dying) {
                        if (window.state.battle.superTarget) {
                            const bomb = {
                                x: p.x,
                                y: p.y,
                                targetX: window.state.battle.superTarget.x,
                                targetY: window.state.battle.superTarget.y,
                                startTime: Date.now(),
                                duration: 400,
                                owner: p,
                                level: p.level
                            };
                            window.state.battle.bombs.push(bomb);
                            p.superCharge = 0;
                        }
                    }
                    window.superAiming = false;
                    window.state.battle.isAiming = false;
                    window.state.battle.superTarget = null;
                }
            } else if (p.type === 'Brewiant') {
                // One‑step super: create bubble at current position
                if (p.superCharge >= p.superMax && !p.dying) {
                    window.createBubble(p.x, p.y, p, p.level, window.state.battle, Date.now());
                    p.superCharge = 0;
                }
                window.superAiming = false;
                window.state.battle.isAiming = false;
                window.state.battle.superTarget = null;
            } else {
                // Other brawlers: normal two-step super (aim then fire)
                if (!window.superAiming) {
                    window.superAiming = true;
                    window.state.battle.isAiming = true;
                    window.state.battle.aimAngle = Math.atan2(worldY - p.y, worldX - p.x);
                } else {
                    if (p.superCharge >= p.superMax && !p.dying) {
                        window.spawnBullet(p, window.state.battle.aimAngle, true);
                        p.superCharge = 0;
                    }
                    window.superAiming = false;
                    window.state.battle.isAiming = false;
                }
            }
        }
    });
}

// Expose globally
window.setupJoystick = setupJoystick;
window.updateMoveJoystickVisual = updateMoveJoystickVisual;
window.updateKeyboardMovement = updateKeyboardMovement;
window.setupMouseListeners = setupMouseListeners;
