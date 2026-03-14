// ========== STARR DROP (RANDOM UPGRADES PER TAP, 4 TAPS MAX, GEMS ONLY LEGENDARY) ==========
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

    // If already legendary or reached 4 taps, reveal reward
    if (window.state.starrDropRarity === 'LEGENDARY' || window.state.starrDropTaps >= 4) {
        revealReward();
        return;
    }

    // Upgrade chances based on current rarity (same as original)
    const steps = [0, 1, 2, 3, 4];
    const probs = [0.50, 0.28, 0.15, 0.05, 0.02];
    const rand = Math.random();
    let cum = 0;
    let upgradeSteps = 0;
    for (let i = 0; i < steps.length; i++) {
        cum += probs[i];
        if (rand < cum) {
            upgradeSteps = steps[i];
            break;
        }
    }

    const currentIdx = rarities.indexOf(window.state.starrDropRarity);
    let newIdx = Math.min(currentIdx + upgradeSteps, rarities.length - 1);
    window.state.starrDropRarity = rarities[newIdx];
    window.state.starrDropTaps++;

    // Shake animation
    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);

    updateStarrDropUI();

    // Update hint text if legendary or last tap
    if (window.state.starrDropRarity === 'LEGENDARY') {
        document.getElementById('starr-drop-hint').innerText = 'LEGENDARY! TAP TO OPEN';
    } else if (window.state.starrDropTaps === 4) {
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
