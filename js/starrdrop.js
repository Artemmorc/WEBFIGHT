// ========== STARR DROP ==========
const rarities = ['RARE', 'SUPER RARE', 'EPIC', 'MYTHIC', 'LEGENDARY'];
const rarityClasses = ['rarity-rare', 'rarity-super', 'rarity-epic', 'rarity-mythic', 'rarity-legendary'];
const rarityColors = ['#4ade80', '#60a5fa', '#c084fc', '#f87171', '#fbbf24'];

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
    state.starrDropStep = 0;
    state.starrDropRarity = 'RARE';
    document.getElementById('close-starr-drop').classList.add('opacity-0', 'pointer-events-none');
    document.getElementById('starr-drop-hint').classList.remove('hidden');
    document.getElementById('starr-drop-reward').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.remove('hidden');
    document.getElementById('star-svg-container').innerHTML = createStarrDropSVG('RARE', 250);
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
    updateStarrDropUI();
}
function updateStarrDropUI() {
    const rIdx = rarities.indexOf(state.starrDropRarity);
    const textEl = document.getElementById('starr-drop-rarity');
    textEl.innerText = state.starrDropRarity;
    textEl.className = `text-6xl mb-4 ${rarityClasses[rIdx]}`;
    document.getElementById('star-svg-container').innerHTML = createStarrDropSVG(state.starrDropRarity, 250);
    document.getElementById('star-glow').style.backgroundColor = rarityColors[rIdx];
}
document.getElementById('starr-drop-container').onclick = () => {
    if (state.starrDropStep >= 4) return;
    state.starrDropStep++;
    
    let roll = Math.random();
    if (roll > 0.7) {
        const currentIdx = rarities.indexOf(state.starrDropRarity);
        if (currentIdx < rarities.length - 1) {
            state.starrDropRarity = rarities[currentIdx + 1];
        }
    }
    
    const container = document.getElementById('starr-drop-container');
    container.classList.add('starr-drop-shake');
    setTimeout(() => container.classList.remove('starr-drop-shake'), 400);
    updateStarrDropUI();
    
    if (state.starrDropStep === 4) {
        const rIdx = rarities.indexOf(state.starrDropRarity);
        container.style.backgroundColor = rarityColors[rIdx] + '40';
        revealReward();
    }
};
async function revealReward() {
    document.getElementById('starr-drop-hint').classList.add('hidden');
    document.getElementById('starr-drop-content').classList.add('hidden');
    document.getElementById('star-svg-container').style.animation = 'none';
    document.getElementById('starr-drop-reward').classList.remove('hidden');
    
    const multiplier = rarities.indexOf(state.starrDropRarity) + 1;
    const rewardType = Math.random() > 0.5 ? 'COINS' : 'PP';
    const amount = multiplier * 50;
    document.getElementById('reward-title').innerText = "REWARD";
    if(rewardType === 'COINS') {
        document.getElementById('reward-visual').innerHTML = SVG_ICONS.coin(180);
        document.getElementById('reward-desc').innerText = `${amount} Coins collected!`;
        playerState.coins += amount;
    } else {
        document.getElementById('reward-visual').innerHTML = SVG_ICONS.pp(180);
        document.getElementById('reward-desc').innerText = `${amount} Power Points!`;
        playerState.pp += amount;
    }
    updateStatsUI();
    await saveProfileToDB();
    document.getElementById('close-starr-drop').classList.remove('opacity-0', 'pointer-events-none');
}
function finishStarrDrop() {
    document.getElementById('starr-drop-screen').classList.add('hidden');
    document.getElementById('starr-drop-container').style.backgroundColor = 'transparent';
}
