// ========== STARR DROP (5 TAPS: 4 SPIN, EXPLODE, 5TH OPEN) ==========
const rarities = ['RARE', 'SUPER RARE', 'EPIC', 'MYTHIC', 'LEGENDARY'];
const rarityColors = ['#4ade80', '#60a5fa', '#c084fc', '#f87171', '#fbbf24'];
const rarityClasses = ['rarity-rare', 'rarity-super', 'rarity-epic', 'rarity-mythic', 'rarity-legendary'];

// Final rarity probabilities
const rarityProbs = [
    { rarity: 'RARE', prob: 0.50 },
    { rarity: 'SUPER RARE', prob: 0.28 },
    { rarity: 'EPIC', prob: 0.15 },
    { rarity: 'MYTHIC', prob: 0.05 },
    { rarity: 'LEGENDARY', prob: 0.02 }
];

// Expose rainbow SVG globally
window.createRainbowStarrDropSVG = function(size) {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="url(#rainbow)" stroke="white" stroke-width="4"/>
        <defs>
            <linearGradient id="rainbow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ff0000" />
                <stop offset="16%" stop-color="#ff7f00" />
                <stop offset="33%" stop-color="#ffff00" />
                <stop offset="50%" stop-color="#00ff00" />
                <stop offset="66%" stop-color="#0000ff" />
                <stop offset="83%" stop-color="#4b0082" />
                <stop offset="100%" stop-color="#8f00ff" />
            </linearGradient>
        </defs>
        <path d="M50 20 L58 40 L80 40 L62 55 L70 75 L50 62 L30 75 L38 55 L20 40 L42 40 Z" fill="white" />
    </svg>`;
};

function createStarrDropSVG(rarity, size) {
    return `
    <svg width="${size}" height="${size}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="${rarityColors[rarities.indexOf(rarity)]}" stroke="white" stroke-width="4"/>
        <path d="M50 20 L58 40 L80 40 L62 55 L70 75 L50 62 L30 75 L38 55 L20 40 L42 40 Z" fill="white" />
    </svg>`;
}

// Modified start function – accepts forced rarity and optional callback
function startStarrDropAnimation(forcedRarity = null, onComplete = null) {
    window.starrDropActive = true;
    window.starrDropOnComplete = onComplete;
    document.getElementById('starr-drop-screen').classList.remove('hidden');
    
    // If forced rarity is provided, set it as target and also final (no randomness)
    if (forcedRarity && rarities.includes(forcedRarity)) {
        window.state.starrDropTargetRarity = forcedRarity;
        window.state.starrDropFinalRarity = forcedRarity; // will be used after explosion
    } else {
        // Choose target rarity randomly
        const rand = Math.random();
        let cumulative = 0;
        for (let r of rarityProbs) {
            cumulative += r.prob;
            if (rand < cumulative) {
                window.state.starrDropTargetRarity = r.rarity;
                break;
            }
        }
    }
    
    resetStarrDrop();
}

function resetStarrDrop() {
    window.state.starrDropTaps = 0;
    window.state.starrDropExploded = false;
    
    document.getElementById('close-starr-drop').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('starr-drop-hint').classList.remove('hidden');
    document.getElementById('starr-drop-reward').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.remove('hidden');
    
    // Ensure centering
    const content = document.getElementById('starr-drop-content');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.justifyContent = 'center';
    
    document.getElementById('star-svg-container').innerHTML = window.createRainbowStarrDropSVG(250);
    document.getElementById('starr-drop-rarity').innerText = '???';
    document.getElementById('starr-drop-rarity').className = 'text-6xl mb-4 text-white';
    document.getElementById('star-glow').style.backgroundColor = 'white';
    
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
    document.getElementById('starr-drop-hint').innerText = 'TAP TO SPIN';
    document.getElementById('star-svg-container').style.animation = 'spin 4s linear infinite';
}

document.getElementById('starr-drop-container').onclick = () => {
    if (!document.getElementById('starr-drop-reward').classList.contains('hidden')) return;

    window.state.starrDropTaps++;

    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);

    if (window.state.starrDropTaps < 4) {
        const speed = 4 - window.state.starrDropTaps;
        document.getElementById('star-svg-container').style.animation = `spin ${speed}s linear infinite`;
        document.getElementById('starr-drop-hint').innerText = 'TAP TO SPIN';
    }
    else if (window.state.starrDropTaps === 4 && !window.state.starrDropExploded) {
        // Use target rarity if already set, otherwise choose randomly (should already be set)
        window.state.starrDropFinalRarity = window.state.starrDropTargetRarity;
        window.state.starrDropExploded = true;

        document.getElementById('star-svg-container').style.animation = 'none';
        document.getElementById('star-svg-container').innerHTML = createStarrDropSVG(window.state.starrDropFinalRarity, 250);
        
        // Force re-center
        const visual = document.getElementById('starr-drop-visual');
        visual.style.display = 'flex';
        visual.style.alignItems = 'center';
        visual.style.justifyContent = 'center';
        
        document.getElementById('starr-drop-rarity').innerText = window.state.starrDropFinalRarity;
        const rIdx = rarities.indexOf(window.state.starrDropFinalRarity);
        document.getElementById('starr-drop-rarity').className = `text-6xl mb-4 ${rarityClasses[rIdx]}`;
        document.getElementById('star-glow').style.backgroundColor = rarityColors[rIdx];
        
        document.getElementById('starr-drop-hint').innerText = 'TAP TO OPEN';
    }
    else if (window.state.starrDropTaps >= 5 && window.state.starrDropExploded) {
        revealReward();
    }
};

function getRareBrawlers() {
    return Object.keys(window.CONFIG.BRAWLERS).filter(name => 
        window.CONFIG.BRAWLERS[name].rarity === 'rare'
    );
}

function getRandomRareBrawler() {
    const rareBrawlers = getRareBrawlers().filter(name => !window.brawlerProgress[name]?.unlocked);
    if (rareBrawlers.length === 0) return null;
    return rareBrawlers[Math.floor(Math.random() * rareBrawlers.length)];
}

function getPossibleRewards(rarity) {
    const rewards = [
        { type: 'coins', min: 50, max: 150 },
        { type: 'pp', min: 30, max: 100 }
    ];
    if (rarity === 'LEGENDARY') {
        rewards.push({ type: 'gems', min: 2, max: 5 });
    }
    let brawlerChance = 0;
    switch (rarity) {
        case 'SUPER RARE': brawlerChance = 0.01; break;
        case 'EPIC': brawlerChance = 0.04; break;
        case 'MYTHIC': brawlerChance = 0.10; break;
        case 'LEGENDARY': brawlerChance = 0.20; break;
        default: brawlerChance = 0;
    }
    return { rewards, brawlerChance };
}

function revealReward() {
    document.getElementById('starr-drop-hint').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.add('hidden');
    document.getElementById('starr-drop-content').style.display = 'none';
    document.getElementById('star-svg-container').style.animation = 'none';
    document.getElementById('starr-drop-reward').classList.remove('hidden');
    document.getElementById('starr-drop-reward').style.display = 'flex';

    const rarity = window.state.starrDropFinalRarity;
    const rIdx = rarities.indexOf(rarity);
    const multiplier = rIdx + 1;
    const { rewards, brawlerChance } = getPossibleRewards(rarity);

    // Brawler unlock
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

    // Resource reward
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
    window.starrDropActive = false;
    
    // If there's a callback (for multiple drops), call it
    if (typeof window.starrDropOnComplete === 'function') {
        const cb = window.starrDropOnComplete;
        window.starrDropOnComplete = null;
        cb();
    }
    
    // Check if there are more Starr Drops in queue
    if (typeof window.processNextStarrDrop === 'function') {
        window.processNextStarrDrop();
    }
}
