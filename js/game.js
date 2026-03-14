// ========== MAIN GAME ENTRY POINT ==========

// Global variables
window.gameLoopId = null;
window.preBattleStart = null;
window.playerDead = false;
window.deathAnimationStart = 0;
window.deathAnimationDuration = 1500;
window.gameEnded = false;

// Game loop with error handling
function gameLoop() {
    try {
        if (!window.state.battle || !window.state.battle.active) {
            return;
        }
        window.updateGame();
        window.drawGame();
        window.gameLoopId = requestAnimationFrame(gameLoop);
    } catch (e) {
        console.error('❌ Game loop error:', e);
        // Optionally rethrow to stop the loop (but we want to see the error)
    }
}

// Expose gameLoop globally so it can be started from battle.js
window.gameLoop = gameLoop;

// Exit battle
function exitBattle() {
    console.log('exitBattle called');
    window.gameEnded = true;
    if (window.gameLoopId) {
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }
    if (window.state.battle) {
        window.state.battle.active = false;
    }
    window.state.screen = 'menu';
    
    const battleScreen = document.getElementById('battle-screen');
    battleScreen.classList.add('hidden');
    battleScreen.style.zIndex = '';
    battleScreen.style.display = '';
    
    document.getElementById('menu-screen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

// After-game menu
function showAfterGame(rank, coins, starrdropEarned = false, trophyGain = 0) {
    console.log('showAfterGame called with rank:', rank, 'coins:', coins, 'starrdrop:', starrdropEarned, 'trophyGain:', trophyGain);
    const menu = document.getElementById('aftergame-menu');
    if (!menu) {
        console.error('aftergame-menu not found!');
        return;
    }
    menu.style.display = 'flex';
    menu.style.opacity = '1';
    menu.style.zIndex = '100000';
    document.getElementById('aftergame-rank').innerText = `Rank #${rank}`;
    document.getElementById('aftergame-reward').innerText = `+${coins} coins`;
    
    const trophyGainEl = document.getElementById('aftergame-trophy-gain');
    if (trophyGainEl) {
        trophyGainEl.innerText = `+${trophyGain} trophies`;
    } else {
        console.error('aftergame-trophy-gain element not found');
    }
    
    const dailyWinsEl = document.getElementById('aftergame-daily-wins');
    if (dailyWinsEl) {
        dailyWinsEl.innerHTML = `Daily Wins: ${window.playerState.dailyWins}/3`;
        if (starrdropEarned) {
            dailyWinsEl.innerHTML += ' <span style="color:#fbbf24;">+1</span>';
        }
    }
    
    const starrdropEl = document.getElementById('aftergame-starrdrop');
    if (starrdropEl) {
        if (starrdropEarned && typeof window.createStarrDropSVG === 'function') {
            starrdropEl.innerHTML = window.createStarrDropSVG('RARE', 64);
            starrdropEl.classList.remove('hidden');
        } else {
            starrdropEl.classList.add('hidden');
        }
    }
    
    const battleScreen = document.getElementById('battle-screen');
    battleScreen.style.zIndex = '1000';
    battleScreen.style.display = 'block';
}

function hideAfterGame() {
    const menu = document.getElementById('aftergame-menu');
    menu.style.opacity = '0';
    setTimeout(() => {
        menu.style.display = 'none';
        exitBattle();
        if (window.state.lastMatch && window.state.lastMatch.starrdropEarned && typeof window.startStarrDropAnimation === 'function') {
            window.startStarrDropAnimation();
            window.state.lastMatch.starrdropEarned = false;
        }
    }, 300);
}

// Initialize joysticks (called after DOM is ready)
document.addEventListener('DOMContentLoaded', () => {
    window.setupJoystick('move-joy-base', 'move-joy-stick', 'move', () => {});
    window.setupJoystick('attack-joy-base', 'attack-joy-stick', 'attack', (ang) => {
        const p = window.state.battle?.player;
        if (p && !p.dying) {
            window.spawnBullet(p, ang, false);
        }
    });
    window.setupJoystick('super-joy-base', 'super-joy-stick', 'super', (ang) => {
        const p = window.state.battle?.player;
        if (p && !p.dying && p.superCharge >= p.superMax) {
            if (p.type === 'Anthony') {
                const targetX = p.x + Math.cos(ang) * 800;
                const targetY = p.y + Math.sin(ang) * 800;
                const bomb = {
                    x: p.x,
                    y: p.y,
                    targetX: targetX,
                    targetY: targetY,
                    startTime: Date.now(),
                    duration: 400,
                    owner: p,
                    level: p.level
                };
                window.state.battle.bombs.push(bomb);
                p.superCharge = 0;
            } else if (p.type === 'Brewiant') {
                window.createBubble(p.x, p.y, p, p.level, window.state.battle, Date.now());
                p.superCharge = 0;
            } else {
                window.spawnBullet(p, ang, true);
                p.superCharge = 0;
            }
        }
    });
});

// Visibility change handler
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible') {
        const afterGameMenu = document.getElementById('aftergame-menu');
        const menuVisible = afterGameMenu && (afterGameMenu.style.display === 'flex' || window.getComputedStyle(afterGameMenu).display === 'flex');
        const menuScreen = document.getElementById('menu-screen');
        const mainMenuVisible = menuScreen && (menuScreen.style.display === 'flex' || window.getComputedStyle(menuScreen).display === 'flex');
        console.log('Tab became visible, battle active:', window.state.battle?.active, 'gameEnded:', window.gameEnded, 'menuVisible:', menuVisible, 'playerDead:', window.playerDead, 'mainMenuVisible:', mainMenuVisible);
        
        if (window.gameEnded || window.playerDead) {
            if (mainMenuVisible || menuVisible) {
                console.log('Already at main menu or after-game menu visible, ignoring');
                return;
            }
            console.log('Game ended or player dead, ensuring after-game menu');
            if (window.state.lastMatch) {
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned, 0);
            }
            return;
        }
        
        if (window.state.battle && window.state.battle.active && !menuVisible) {
            console.log('Tab visible, battle active – forcing battle screen');
            const battleScreen = document.getElementById('battle-screen');
            if (battleScreen) {
                battleScreen.classList.remove('hidden');
                battleScreen.style.zIndex = '10000';
                battleScreen.style.display = 'block';
            }
            const menuScreen = document.getElementById('menu-screen');
            if (menuScreen) menuScreen.style.display = 'none';
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                const oldWidth = canvas.width;
                canvas.width = oldWidth + 1;
                canvas.width = oldWidth;
                console.log('Forced canvas repaint');
            }
            const killFeed = window.ensureKillFeed();
            if (killFeed) {
                killFeed.style.display = 'flex';
                killFeed.style.zIndex = '100000';
            }
        }
    }
});

// Fallback for after-game menu
setInterval(() => {
    if (window.playerDead && !window.gameEnded) {
        const menu = document.getElementById('aftergame-menu');
        if (menu && (menu.style.display !== 'flex' || window.getComputedStyle(menu).display !== 'flex')) {
            console.log('Fallback: forcing after-game menu');
            if (window.state.lastMatch) {
                showAfterGame(window.state.lastMatch.rank, window.state.lastMatch.coinsEarned, window.state.lastMatch.starrdropEarned, 0);
            }
        }
    }
}, 1000);

// Expose functions for HTML
window.exitBattle = exitBattle;
window.showAfterGame = showAfterGame;
window.hideAfterGame = hideAfterGame;
