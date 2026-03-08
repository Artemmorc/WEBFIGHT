// ========== STARR DROP (FIXED CHANCES) ==========
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

    // If legendary, reveal reward on next tap
    if (window.state.starrDropRarity === 'LEGENDARY') {
        revealReward();
        return;
    }

    // Upgrade chances: 0 steps (stay Rare) 50%, +1 step 28%, +2 steps 15%, +3 steps 5%, +4 steps 2%
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

    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);

    updateStarrDropUI();

    if (window.state.starrDropRarity === 'LEGENDARY') {
        document.getElementById('starr-drop-hint').innerText = 'LEGENDARY! TAP TO OPEN';
    }
};

function revealReward() {
    document.getElementById('starr-drop-hint').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.add('hidden');
    document.getElementById('star-svg-container').style.animation = 'none';
    document.getElementById('starr-drop-reward').classList.remove('hidden');

    const rIdx = rarities.indexOf(window.state.starrDropRarity);
    const multiplier = rIdx + 1; // 1-5
    const isLegendary = window.state.starrDropRarity === 'LEGENDARY';

    const rewardType = Math.random() > 0.5 ? 'COINS' : 'PP';
    let amount = multiplier * (50 + Math.floor(Math.random() * 50));

    document.getElementById('reward-title').innerText = isLegendary ? '⭐ LEGENDARY ⭐' : 'REWARD';

    if (rewardType === 'COINS') {
        document.getElementById('reward-visual').innerHTML = window.SVG_ICONS.coin(180);
        document.getElementById('reward-desc').innerText = `${amount} Coins!`;
        window.playerState.coins += amount;
    } else {
        document.getElementById('reward-visual').innerHTML = window.SVG_ICONS.pp(180);
        document.getElementById('reward-desc').innerText = `${amount} Power Points!`;
        window.playerState.pp += amount;
    }

    if (isLegendary) {
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
