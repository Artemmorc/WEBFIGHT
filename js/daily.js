// ========== DAILY RESET ==========

let dailyTimerInterval = null;

async function checkDailyReset() {
    if (!window.currentProfile) return;
    const now = new Date();
    const today9am = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
    
    if (window.currentProfile.last_daily) {
        const last = new Date(window.currentProfile.last_daily);
        window.playerState.dailyClaimed = last >= today9am;
    } else {
        window.playerState.dailyClaimed = false;
    }
    
    const claimText = document.getElementById('daily-claim-text');
    if (claimText) {
        claimText.innerText = window.playerState.dailyClaimed ? 'CLAIMED' : 'CLAIM';
    }
    
    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    dailyTimerInterval = setInterval(updateDailyTimer, 1000);
    updateDailyTimer();
}

function updateDailyTimer() {
    const now = new Date();
    const nextReset = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 9, 0, 0));
    if (now >= nextReset) {
        nextReset.setUTCDate(nextReset.getUTCDate() + 1);
    }
    const diff = nextReset - now;
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    const timerSpan = document.getElementById('daily-timer');
    if (timerSpan) {
        timerSpan.innerText = `Resets in ${hours}h ${minutes}m ${seconds}s`;
    }
}

async function claimDailyReward() {
    if (window.playerState.dailyClaimed) return;
    if (!window.currentUser || !window.currentProfile) {
        alert('You must be logged in to claim daily reward.');
        return;
    }
    window.playerState.dailyClaimed = true;
    window.playerState.coins += 100;
    updateStatsUI();
    
    const now = new Date().toISOString();
    const { error } = await window.sb
        .from('profiles')
        .update({ coins: window.playerState.coins, daily_claimed: true, last_daily: now })
        .eq('user_id', window.currentUser.id);
    
    if (error) {
        console.error('Error updating daily claim:', error);
        window.playerState.dailyClaimed = false;
        window.playerState.coins -= 100;
        updateStatsUI();
    } else {
        window.currentProfile.last_daily = now;
        window.currentProfile.daily_claimed = true;
        document.getElementById('daily-claim-text').innerText = 'CLAIMED';
        toggleShop(true);
        
        // 🔔 Update FREE badge on shop button
        if (typeof window.updateShopButtonFreeIndicator === 'function') {
            window.updateShopButtonFreeIndicator();
        }
    }
}

// Expose
window.checkDailyReset = checkDailyReset;
window.claimDailyReward = claimDailyReward;
