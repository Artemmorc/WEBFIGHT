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

// Expose rainbow SVG globally so shop can use it
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

function startStarrDropAnimation() {
    document.getElementById('starr-drop-screen').classList.remove('hidden');
    resetStarrDrop();
}

function resetStarrDrop() {
    window.state.starrDropTaps = 0;
    window.state.starrDropFinalRarity = null;
    window.state.starrDropExploded = false;
    
    document.getElementById('close-starr-drop').classList.add('opacity-0', 'pointer-events-none');
    
    // Show content, hide reward
    const content = document.getElementById('starr-drop-content');
    const reward = document.getElementById('starr-drop-reward');
    content.classList.remove('hidden');
    content.style.display = 'flex';
    reward.classList.add('hidden');
    reward.style.display = 'none';
    
    // Show rainbow
    document.getElementById('star-svg-container').innerHTML = window.createRainbowStarrDropSVG(250);
    document.getElementById('starr-drop-rarity').innerText = '???';
    document.getElementById('starr-drop-rarity').className = 'text-6xl mb-4 text-white';
    document.getElementById('star-glow').style.backgroundColor = 'white';
    
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
    document.getElementById('starr-drop-hint').innerText = 'TAP TO SPIN';
    document.getElementById('star-svg-container').style.animation = 'spin 4s linear infinite';
}

document.getElementById('starr-drop-container').onclick = () => {
    // If reward already shown, do nothing
    if (!document.getElementById('starr-drop-reward').classList.contains('hidden')) return;

    // Increment tap count
    window.state.starrDropTaps++;

    // Shake animation
    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);

    // Taps 1-3: speed up spinning
    if (window.state.starrDropTaps < 4) {
        const speed = 4 - window.state.starrDropTaps; // 3s, 2s, 1s
        document.getElementById('star-svg-container').style.animation = `spin ${speed}s linear infinite`;
        document.getElementById('starr-drop-hint').innerText = 'TAP TO SPIN';
    }
    // Tap 4: explode and show final starr drop
    else if (window.state.starrDropTaps === 4 && !window.state.starrDropExploded) {
        // Choose final rarity
        const rand = Math.random();
        let cumulative = 0;
        for (let r of rarityProbs) {
            cumulative += r.prob;
            if (rand < cumulative) {
                window.state.starrDropFinalRarity = r.rarity;
                break;
            }
        }
        window.state.starrDropExploded = true;

        // Replace rainbow with static starr drop
        document.getElementById('star-svg-container').style.animation = 'none';
        document.getElementById('star-svg-container').innerHTML = createStarrDropSVG(window.state.starrDropFinalRarity, 250);
        
        // Force re‑center
        const visual = document.getElementById('starr-drop-visual');
        visual.style.display = 'flex';
        visual.style.alignItems = 'center';
        visual.style.justifyContent = 'center';
        
        // Update text
        document.getElementById('starr-drop-rarity').innerText = window.state.starrDropFinalRarity;
        const rIdx = rarities.indexOf(window.state.starrDropFinalRarity);
        document.getElementById('starr-drop-rarity').className = `text-6xl mb-4 ${rarityClasses[rIdx]}`;
        document.getElementById('star-glow').style.backgroundColor = rarityColors[rIdx];
        
        document.getElementById('starr-drop-hint').innerText = 'TAP TO OPEN';
    }
    // Tap 5: reveal reward
    else if (window.state.starrDropTaps >= 5 && window.state.starrDropExploded) {
        revealReward();
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
    // Base rewards: coins and PP for all, gems ONLY for legendary
    const rewards = [
        { type: 'coins', min: 50, max: 150 },
        { type: 'pp', min: 30, max: 100 }
    ];
    if (rarity === 'LEGENDARY') {
        rewards.push({ type: 'gems', min: 2, max: 5 });
    }

    // Brawler unlock chance based on rarity
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
    console.log('revealReward called'); // Debug log

    // Hide content, show reward
    const content = document.getElementById('starr-drop-content');
    const reward = document.getElementById('starr-drop-reward');
    
    content.classList.add('hidden');
    content.style.display = 'none'; // force hide
    reward.classList.remove('hidden');
    reward.style.display = 'flex';   // force show

    document.getElementById('starr-drop-hint').classList.add('hidden');
    document.getElementById('star-svg-container').style.animation = 'none';

    const rarity = window.state.starrDropFinalRarity;
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
            amount = Math.min(amount, 10); // cap at 10
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
