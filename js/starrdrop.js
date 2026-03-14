// ========== STARR DROP (FIXED CHANCES, MAX 4 TAPS, GEMS ONLY LEGENDARY) ==========
const rarities = ['RARE', 'SUPER RARE', 'EPIC', 'MYTHIC', 'LEGENDARY'];
const rarityColors = ['#4ade80', '#60a5fa', '#c084fc', '#f87171', '#fbbf24'];
const rarityClasses = ['rarity-rare', 'rarity-super', 'rarity-epic', 'rarity-mythic', 'rarity-legendary'];

function createStarrDropSVG(rarity, size) {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fbbf24" stroke="white" stroke-width="4"/>
        <path d="M50 20 L58 40 L80 40 L62 55 L70 75 L50 62 L30 75 L38 55 L20 40 L42 40 Z" fill="white" />
    </svg>`;
}

function startStarrDropAnimation() {
    document.getElementById('starr-drop-screen').classList.remove('hidden');
    
    // Choose target rarity based on fixed probabilities
    const rand = Math.random();
    let cumulative = 0;
    const rarityProbs = [
        { rarity: 'RARE', prob: 0.50 },
        { rarity: 'SUPER RARE', prob: 0.28 },
        { rarity: 'EPIC', prob: 0.15 },
        { rarity: 'MYTHIC', prob: 0.05 },
        { rarity: 'LEGENDARY', prob: 0.02 }
    ];
    for (let r of rarityProbs) {
        cumulative += r.prob;
        if (rand < cumulative) {
            window.state.starrDropTargetRarity = r.rarity;
            break;
        }
    }
    
    resetStarrDrop();
    document.getElementById('star-svg-container').style.animation = 'spin 8s linear infinite';
}

function resetStarrDrop() {
    window.state.starrDropStep = 0;
    window.state.starrDropRarity = 'RARE';
    window.state.starrDropTaps = 0;
    document.getElementById('close-starr-drop').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('starr-drop-hint').classList.remove('hidden');
    document.getElementById('starr-drop-reward').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.remove('hidden');
    document.getElementById('star-svg-container').innerHTML = createStarrDropSVG('RARE', 250);
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
    document.getElementById('starr-drop-hint').innerText = 'TAP TO UPGRADE!';
    updateStarrDropUI();
}

function updateStarrDropUI() {
    const rIdx = rarities.indexOf(window.state.starrDropRarity);
    const textEl = document.getElementById('starr-drop-rarity');
    textEl.innerText = window.state.starrDropRarity;
    textEl.className = `text-6xl mb-4 ${rarityClasses[rIdx]}`;
    document.getElementById('star-svg-container').innerHTML = createStarrDropSVG(window.state.starrDropRarity, 250);
    document.getElementById('star-glow').style.backgroundColor = rarityColors[rIdx];
}

document.getElementById('starr-drop-container').onclick = () => {
    // If reward already shown, do nothing
    if (!document.getElementById('starr-drop-reward').classList.contains('hidden')) return;

    // If reached target rarity or max taps, reveal reward
    if (window.state.starrDropRarity === window.state.starrDropTargetRarity || window.state.starrDropTaps >= 4) {
        revealReward();
        return;
    }

    // Upgrade one step towards target rarity
    const currentIdx = rarities.indexOf(window.state.starrDropRarity);
    const targetIdx = rarities.indexOf(window.state.starrDropTargetRarity);
    if (currentIdx < targetIdx) {
        window.state.starrDropRarity = rarities[currentIdx + 1];
    }
    window.state.starrDropTaps++;

    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);

    updateStarrDropUI();

    if (window.state.starrDropRarity === window.state.starrDropTargetRarity) {
        document.getElementById('starr-drop-hint').innerText = 'TAP TO OPEN';
    }
};

function getRareBrawlers() {
    return Object.keys(window.CONFIG.BRAWLERS).filter(name => 
        window.CONFIG.BRAWLERS[name].rarity === 'rare'
    );
}

function isAllRareUnlocked() {
    const rareBrawlers = getRareBrawlers();
    if (rareBrawlers.length === 0) return true;
    for (let name of rareBrawlers) {
        if (!window.brawlerProgress[name]?.unlocked) return false;
    }
    return true;
}

function getRandomRareBrawler() {
    const rareBrawlers = getRareBrawlers().filter(name => !window.brawlerProgress[name]?.unlocked);
    if (rareBrawlers.length === 0) return null;
    return rareBrawlers[Math.floor(Math.random() * rareBrawlers.length)];
}

function getPossibleRewards(rarity) {
    // Base rewards for all rarities (coins and PP)
    const baseRewards = [
        { type: 'coins', min: 50, max: 150 },
        { type: 'pp', min: 30, max: 100 }
    ];
    
    // For LEGENDARY, also include gems
    if (rarity === 'LEGENDARY') {
        baseRewards.push({ type: 'gems', min: 5, max: 10 });
    }
    
    // Brawler unlock chances based on rarity
    let brawlerChance = 0;
    switch (rarity) {
        case 'SUPER RARE': brawlerChance = 0.01; break;
        case 'EPIC': brawlerChance = 0.04; break;
        case 'MYTHIC': brawlerChance = 0.10; break;
        case 'LEGENDARY': brawlerChance = 0.20; break;
        default: brawlerChance = 0;
    }
    return { rewards: baseRewards, brawlerChance };
}

function revealReward() {
    document.getElementById('starr-drop-hint').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.add('hidden');
    document.getElementById('star-svg-container').style.animation = 'none';
    document.getElementById('starr-drop-reward').classList.remove('hidden');

    const rarity = window.state.starrDropRarity;
    const rIdx = rarities.indexOf(rarity);
    const multiplier = rIdx + 1;
    const { rewards, brawlerChance } = getPossibleRewards(rarity);

    // Check for brawler unlock
    const rareBrawlers = getRareBrawlers();
    if (rareBrawlers.length > 0 && Math.random() < brawlerChance) {
        const newBrawler = getRandomRareBrawler();
        if (newBrawler) {
            window.brawlerProgress[newBrawler].unlocked = true;
            document.getElementById('reward-visual').innerHTML = createBrawlerSVG(newBrawler, 120);
            document.getElementById('reward-desc').innerText = `${newBrawler} unlocked!`;
            if (typeof saveBrawlerProgress === 'function') saveBrawlerProgress();
            if (typeof updateStatsUI === 'function') updateStatsUI();
            document.getElementById('close-starr-drop').classList.remove('opacity-0', 'pointer-events-none');
            return;
        }
    }

    // Otherwise, random resource reward
    const rewardType = rewards[Math.floor(Math.random() * rewards.length)];
    let amount = 0;
    let rewardText = '';

    switch (rewardType.type) {
        case 'coins':
            amount = Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min;
            amount *= multiplier;
            window.playerState.coins += amount;
            document.getElementById('reward-visual').innerHTML = window.SVG_ICONS.coin(120);
            rewardText = `${amount} Coins!`;
            break;
        case 'pp':
            amount = Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min;
            amount *= multiplier;
            window.playerState.pp += amount;
            document.getElementById('reward-visual').innerHTML = window.SVG_ICONS.pp(120);
            rewardText = `${amount} Power Points!`;
            break;
        case 'gems':
            amount = Math.floor(Math.random() * (rewardType.max - rewardType.min + 1)) + rewardType.min;
            amount *= multiplier;
            // Hard cap at 10 gems (though max is 10*multiplier, but we keep cap)
            amount = Math.min(amount, 10);
            window.playerState.gems += amount;
            document.getElementById('reward-visual').innerHTML = window.SVG_ICONS.gem(120);
            rewardText = `${amount} Gems!`;
            break;
    }

    document.getElementById('reward-desc').innerText = rewardText;

    if (rarity === 'LEGENDARY') {
        document.getElementById('starr-drop-screen').style.backgroundColor = 'rgba(255,215,0,0.3)';
        setTimeout(() => {
            document.getElementById('starr-drop-screen').style.backgroundColor = '';
        }, 500);
    }

    if (typeof updateStatsUI === 'function') updateStatsUI();
    if (typeof saveProfileToDB === 'function') saveProfileToDB();
    document.getElementById('close-starr-drop').classList.remove('opacity-0', 'pointer-events-none');
}

function finishStarrDrop() {
    document.getElementById('starr-drop-screen').classList.add('hidden');
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
}
