// ========== RENDERING ==========

function drawGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.save();

    const battle = window.state.battle;
    const bg = battle.background || 'floor';
    let bgColor = '#d4a373';
    if (bg === 'water') bgColor = '#0284c7';
    else if (bg === 'grass') bgColor = '#2d6a4f';
    else if (bg === 'stone') bgColor = '#4a4a4a';
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.scale(battle.camera.zoom, battle.camera.zoom);
    ctx.translate(-battle.camera.x, -battle.camera.y);

    const fullSize = window.CONFIG.MAP_SIZE * window.CONFIG.TILE_SIZE;
    const startCol = Math.max(0, Math.floor(battle.camera.x / 64));
    const endCol = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((battle.camera.x + canvas.width / battle.camera.zoom) / 64));
    const startRow = Math.max(0, Math.floor(battle.camera.y / 64));
    const endRow = Math.min(window.CONFIG.MAP_SIZE, Math.ceil((battle.camera.y + canvas.height / battle.camera.zoom) / 64));
    const now = Date.now();
    const p = battle.player;

    const floorTexture = window.Textures.floor;
    for (let i = startCol; i < endCol; i++) {
        for (let j = startRow; j < endRow; j++) {
            if (floorTexture) {
                ctx.drawImage(floorTexture, i * 64, j * 64, 64, 64);
            } else {
                ctx.fillStyle = '#d4a373';
                ctx.fillRect(i * 64, j * 64, 64, 64);
            }
        }
    }

    battle.bushes.forEach(b => {
        if (window.Textures.bush) {
            ctx.drawImage(window.Textures.bush, b.x, b.y, 64, 64);
        } else {
            ctx.fillStyle = '#b45309';
            ctx.fillRect(b.x, b.y, 64, 64);
        }
    });

    battle.water?.forEach(w => {
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(w.x, w.y, 64, 64);
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(w.x + 10, w.y + 10 + i * 20, 44, 4);
        }
    });

    battle.boxes?.forEach(b => {
        if (b.hp > 0) {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(b.x, b.y, 64, 64);
            ctx.strokeStyle = '#4a3729';
            ctx.lineWidth = 2;
            ctx.strokeRect(b.x, b.y, 64, 64);
            if (b.hp < 6000) {
                ctx.fillStyle = 'rgba(0,0,0,0.7)';
                ctx.fillRect(b.x + 5, b.y - 10, 54, 8);
                ctx.fillStyle = '#f97316';
                ctx.fillRect(b.x + 5, b.y - 10, (b.hp / 6000) * 54, 8);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px Luckiest Guy';
                ctx.fillText(`${Math.ceil(b.hp)}`, b.x + 25, b.y - 15);
            }
        }
    });

    battle.powerCubes?.forEach(p => {
        if (!p.collected) {
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(p.x - 10, p.y - 10, 20, 20);
            ctx.fillStyle = '#b45309';
            ctx.fillRect(p.x - 5, p.y - 5, 10, 10);
        }
    });

    battle.barrels?.forEach(b => {
        ctx.fillStyle = '#b91c1c';
        ctx.fillRect(b.x, b.y, 64, 64);
        ctx.fillStyle = '#4a3729';
        ctx.fillRect(b.x + 8, b.y + 8, 48, 48);
    });

    battle.walls.forEach(w => {
        if (window.Textures.wall) {
            ctx.drawImage(window.Textures.wall, w.x, w.y, 64, 64);
        } else {
            ctx.fillStyle = '#8b5a2b';
            ctx.fillRect(w.x, w.y, 64, 64);
        }
    });

    // Area effects
    battle.areaEffects.forEach(effect => {
        if (effect.type === 'bottle') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.fillStyle = '#3b82f6';
            ctx.shadowColor = 'cyan';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, 64, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fbbf24';
            ctx.shadowBlur = 0;
            ctx.beginPath();
            ctx.arc(0, -10, 16, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (effect.type === 'bubble') {
            ctx.save();
            ctx.translate(effect.x, effect.y);
            ctx.strokeStyle = 'rgba(59,130,246,0.8)';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(0, 0, effect.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }
    });

    // Characters
    if (window.isInBush(p.x, p.y)) ctx.globalAlpha = 0.75;
    drawChar(p, true, p);
    ctx.globalAlpha = 1;

    battle.bots.forEach(b => {
        if (window.canSee(p, b, now) || b.dying) {
            drawChar(b, false, p);
        }
    });

    // Bombs
    battle.bombs.forEach(bomb => {
        ctx.save();
        ctx.translate(bomb.currentX, bomb.currentY);
        ctx.fillStyle = '#000000';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, -3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Explosions
    battle.explosions.forEach(exp => {
        const elapsed = now - exp.startTime;
        const progress = elapsed / exp.duration;
        const radius = 192 * progress;
        const alpha = 1 - progress;
        ctx.save();
        ctx.translate(exp.x, exp.y);
        ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
        ctx.shadowColor = 'orange';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 255, 0, ${alpha})`;
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });

    // Bullets
    battle.bullets.forEach(b => {
        let bulletColor = 'white';
        let bulletRadius = 8;
        if (b.ownerType === 'Anthony' && !b.super) {
            bulletColor = '#ff0000';
            bulletRadius = 32;
        } else if (b.super) {
            bulletColor = '#fbbf24';
        } else if (b.ownerType === 'Brewiant' && !b.super) {
            bulletColor = '#3b82f6';
            bulletRadius = 12;
        }
        ctx.fillStyle = bulletColor;
        ctx.beginPath();
        ctx.arc(b.x, b.y, bulletRadius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Aiming indicators
    if (window.mouseInsideCanvas && p && !p.dying) {
        if (window.superAiming && p.type === 'Anthony' && battle.superTarget) {
            const target = battle.superTarget;
            ctx.save();
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(target.x, target.y, 192, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        } else if (p.type === 'Brewiant' && window.attackTarget) {
            const target = window.attackTarget;
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.arc(target.x, target.y, 128, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        } else if (battle.isAiming) {
            const angle = battle.aimAngle;
            const startX = p.x;
            const startY = p.y;
            const lineLength = 300;

            if (p.type === 'Anthony') {
                ctx.save();
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 4;
                ctx.globalAlpha = 0.6;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(startX + Math.cos(angle) * 600, startY + Math.sin(angle) * 600);
                ctx.stroke();
                ctx.restore();
            } else {
                const spreadAngle = 0.15;
                ctx.save();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.globalAlpha = 0.4;

                for (let i = -2; i <= 2; i++) {
                    const lineAngle = angle + i * spreadAngle;
                    const endX = startX + Math.cos(lineAngle) * lineLength;
                    const endY = startY + Math.sin(lineAngle) * lineLength;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }

                const centerEndX = startX + Math.cos(angle) * lineLength;
                const centerEndY = startY + Math.sin(angle) * lineLength;
                ctx.fillStyle = 'white';
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.translate(centerEndX, centerEndY);
                ctx.rotate(angle);
                ctx.moveTo(0, 0);
                ctx.lineTo(-10, -5);
                ctx.lineTo(-10, 5);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }
    }

    // Poison overlay
    ctx.fillStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.beginPath();
    ctx.rect(-2000, -2000, fullSize + 4000, fullSize + 4000);
    ctx.arc(fullSize / 2, fullSize / 2, battle.poisonRadius, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.restore();

    // Kill feed
    const killFeed = window.ensureKillFeed();
    if (killFeed) {
        killFeed.innerHTML = '';
        window.getKillMessages().slice(-5).forEach(msg => {
            const el = document.createElement('div');
            el.className = 'kill-message';
            el.textContent = msg.text;
            killFeed.appendChild(el);
        });
    }
}

function drawChar(c, isPlayer, viewer) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const now = Date.now();
    if (c.hp <= 0 && !c.dying) return;
    if (!isPlayer && !window.canSee(viewer, c, now) && !c.dying) return;

    let alpha = 1;
    let scale = 1;
    if (c.dying) {
        const elapsed = now - c.deathTime;
        const progress = Math.min(1, elapsed / 800);
        alpha = 1 - progress;
        scale = 1 - progress * 0.5;
    }

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    drawBrawler(ctx, c.type, 0, 0, c.angle);

    ctx.restore();

    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Luckiest Guy';
    ctx.textAlign = 'center';
    ctx.fillText(c.name, 0, -70);

    if (isPlayer && c.power > 0 && !c.dying) {
        ctx.save();
        ctx.translate(40, -60);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Luckiest Guy';
        ctx.fillText(`x${c.power}`, 15, 5);
        ctx.restore();
    }

    if (!c.dying) {
        const bw = 70;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(-bw / 2, -50, bw, 12);
        ctx.fillStyle = isPlayer ? '#22c55e' : '#ef4444';
        ctx.fillRect(-bw / 2, -50, (c.hp / c.maxHp) * bw, 12);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Luckiest Guy';
        ctx.fillText(`${Math.ceil(c.hp)}/${c.maxHp}`, -bw / 2, -55);

        if (isPlayer) {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-bw / 2, -36, bw, 6);
            ctx.fillStyle = '#f97316';
            ctx.fillRect(-bw / 2, -36, (c.ammo / c.maxAmmo) * bw, 6);
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-bw / 2, -28, bw, 4);
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(-bw / 2, -28, (c.superCharge / c.superMax) * bw, 4);
        }
    }
    ctx.restore();
}

function drawBrawler(ctx, type, x, y, angle) {
    if (window.BrawlerImages && window.BrawlerImages[type] && window.BrawlerImages[type].game) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.drawImage(window.BrawlerImages[type].game, -40, -40, 80, 80);
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    
    const brawlerData = window.CONFIG.BRAWLERS[type];
    ctx.fillStyle = brawlerData ? brawlerData.color : '#a855f7';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 20, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#2d2d2d';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI*2);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.arc(-4, -22, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -22, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2d1b0e';
    ctx.beginPath(); ctx.arc(-4, -21, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -21, 1.2, 0, Math.PI*2); ctx.fill();
    
    ctx.fillStyle = '#5d3a1a';
    ctx.beginPath(); ctx.ellipse(0, -30, 14, 6, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillRect(-8, -32, 16, 4);
    
    ctx.fillStyle = '#4a3729';
    ctx.fillRect(10, -3, 24, 5);
    ctx.fillRect(28, -6, 5, 11);
    
    ctx.restore();
}

// Expose globally
window.drawGame = drawGame;
