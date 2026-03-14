// ========== KEYBOARD, MOUSE, JOYSTICK HANDLERS ==========
import { spawnBullet } from './utils.js';
import { createBubble } from './effects.js';

// Mouse aiming variables
export let mouseInsideCanvas = false;
export let mouseAimAngle = 0;
export let superAiming = false;
export let attackTarget = null; 

// Re-export for other modules
export function setMouseInside(value) { mouseInsideCanvas = value; }
export function setSuperAiming(value) { superAiming = value; }
export function setAttackTarget(value) { attackTarget = value; }

export function setupJoystick(id, stickId, type, onRelease) {
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

export function updateMoveJoystickVisual() {
    const stick = document.getElementById('move-joy-stick');
    if (!stick) return;
    const joy = window.state.battle.joystick.move;
    const max = 50;
    const dx = joy.x * max;
    const dy = joy.y * max;
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
}

export function updateKeyboardMovement() {
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

// Keyboard listeners
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
