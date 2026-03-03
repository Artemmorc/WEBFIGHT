// ========== UI FUNCTIONS ==========
function initUI() {
    window.Textures.generate();
    updateBrawlerMenu();
    updateStatsUI();
    document.getElementById('mode-icon-container').innerHTML = window.SVG_ICONS.showdown;
    document.getElementById('icon-trophy-sm').innerHTML = window.SVG_ICONS.trophy(18);
    document.getElementById('icon-pp-sm').innerHTML = window.SVG_ICONS.pp(18);
    document.getElementById('icon-coins-sm').innerHTML = window.SVG_ICONS.coin(18);
    document.getElementById('icon-gems-sm').innerHTML = window.SVG_ICONS.gem(18);
    
    document.getElementById('shop-coins-icon').innerHTML = window.SVG_ICONS.coin(24);
    document.getElementById('shop-gems-icon').innerHTML = window.SVG_ICONS.gem(24);
    document.getElementById('daily-reward-icon').innerHTML = window.SVG_ICONS.coin(100);
    document.getElementById('btn-gem-icon').innerHTML = window.SVG_ICONS.gem(18);
    document.getElementById('btn-gem-icon-2').innerHTML = window.SVG_ICONS.gem(18);
    document.getElementById('shop-coins-bundle-icon').innerHTML = window.SVG_ICONS.coin(80);
    
    // Set Starr Drop icon in shop
    document.getElementById('shop-starr-drop-icon').innerHTML = createStarrDropSVG('RARE', 100);
    
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 500);
    }, 1000);
}

function updateStatsUI() {
    document.getElementById('display-player-name').innerText = window.playerState.name;
    document.getElementById('display-player-name').style.color = window.playerState.nameColor;
    document.getElementById('val-coins').innerText = window.playerState.coins.toLocaleString();
    document.getElementById('val-pp').innerText = window.playerState.pp.toLocaleString();
    document.getElementById('val-gems').innerText = window.playerState.gems.toLocaleString();
    document.getElementById('trophy-count').innerText = window.playerState.trophies.toLocaleString();
    document.getElementById('menu-pfp-container').innerHTML = createBrawlerSVG(window.playerState.selectedIcon, 'small');
    document.getElementById('menu-pfp-container').style.backgroundColor = 'transparent';
    
    if (!document.getElementById('shop-modal').classList.contains('hidden')) {
        document.getElementById('shop-val-coins').innerText = window.playerState.coins.toLocaleString();
        document.getElementById('shop-val-gems').innerText = window.playerState.gems.toLocaleString();
    }
    if (window.currentProfile) {
        document.getElementById('profileAccountId').innerText = '#' + window.currentProfile.account_id;
    }
}

// Inside ui.js, replace createBrawlerSVG with:

function createBrawlerSVG(name, size) {
    const s = size === 'large' ? 200 : 80;
    return `
    <svg width="${s}" height="${s}" viewBox="0 0 100 100">
        <defs>
            <radialGradient id="bodyGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#c084fc"/>
                <stop offset="100%" stop-color="#6b21a8"/>
            </radialGradient>
            <radialGradient id="headGrad" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#e9d5ff"/>
                <stop offset="100%" stop-color="#a855f7"/>
            </radialGradient>
        </defs>
        <!-- Body (torso) -->
        <ellipse cx="50" cy="50" rx="18" ry="20" fill="url(#bodyGrad)" stroke="black" stroke-width="2"/>
        <!-- Head -->
        <circle cx="50" cy="30" r="10" fill="url(#headGrad)" stroke="black" stroke-width="2"/>
        <!-- Eyes -->
        <circle cx="45" cy="27" r="2.5" fill="white" stroke="black" stroke-width="1.5"/>
        <circle cx="55" cy="27" r="2.5" fill="white" stroke="black" stroke-width="1.5"/>
        <circle cx="45" cy="28" r="1.2" fill="black"/>
        <circle cx="55" cy="28" r="1.2" fill="black"/>
        <!-- Hat -->
        <ellipse cx="50" cy="20" rx="14" ry="6" fill="#5d3a1a" stroke="black" stroke-width="2"/>
        <rect x="42" y="18" width="16" height="4" fill="#5d3a1a" stroke="black" stroke-width="2"/>
        <!-- Shoulders / cloak -->
        <ellipse cx="35" cy="45" rx="6" ry="8" fill="#4a2e1e" stroke="black" stroke-width="2"/>
        <ellipse cx="65" cy="45" rx="6" ry="8" fill="#4a2e1e" stroke="black" stroke-width="2"/>
        <!-- Weapon -->
        <rect x="60" y="45" width="24" height="5" rx="2" fill="#4a3729" stroke="black" stroke-width="2"/>
        <rect x="78" y="42" width="5" height="11" rx="2" fill="#4a3729" stroke="black" stroke-width="2"/>
    </svg>`;
}

function toggleShop(show) {
    const shop = document.getElementById('shop-modal');
    if(show) {
        // Ensure Starr Drop icon is set (in case it was missing)
        document.getElementById('shop-starr-drop-icon').innerHTML = createStarrDropSVG('RARE', 100);
        shop.classList.remove('hidden');
        updateStatsUI();
        if(window.playerState.dailyClaimed) {
            document.getElementById('daily-reward-card').style.opacity = '0.5';
            document.getElementById('daily-reward-card').onclick = null;
            document.getElementById('daily-claim-text').innerText = 'CLAIMED';
        }
    } else {
        shop.classList.add('hidden');
    }
}

async function claimDailyReward() {
    if(window.playerState.dailyClaimed) return;
    window.playerState.dailyClaimed = true;
    window.playerState.coins += 100;
    updateStatsUI();
    await saveProfileToDB();
    toggleShop(true);
}

async function exchangeGems(cost, amount) {
    if(window.playerState.gems >= cost) {
        window.playerState.gems -= cost;
        window.playerState.coins += amount;
        updateStatsUI();
        await saveProfileToDB();
    } else {
        alert("Not enough gems!");
    }
}

async function purchaseStarrDrop() {
    if(window.playerState.gems >= 10) {
        window.playerState.gems -= 10;
        updateStatsUI();
        await saveProfileToDB();
        startStarrDropAnimation();
    } else {
        alert("Not enough gems!");
    }
}

function toggleProfile(show) {
    const modal = document.getElementById('profile-modal');
    if (show) {
        modal.classList.remove('hidden');
        document.getElementById('input-name').value = window.playerState.name;
        
        const cg = document.getElementById('color-grid');
        cg.innerHTML = '';
        window.CONFIG.COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = `w-full aspect-square rounded-lg cursor-pointer border-4 ${window.playerState.nameColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`;
            d.style.backgroundColor = c;
            d.onclick = () => { window.playerState.nameColor = c; toggleProfile(true); };
            cg.appendChild(d);
        });

        const ig = document.getElementById('icon-grid');
        ig.innerHTML = '';
        Object.keys(window.CONFIG.BRAWLERS).forEach(name => {
            if (!window.CONFIG.BRAWLERS[name].unlocked) return;
            const d = document.createElement('div');
            d.className = `p-2 bg-black/40 rounded-xl cursor-pointer border-4 flex items-center justify-center transition-all ${window.playerState.selectedIcon === name ? 'border-yellow-400 scale-105' : 'border-transparent hover:border-white/20'}`;
            d.style.backgroundColor = window.CONFIG.BRAWLERS[name].color;
            d.innerHTML = createBrawlerSVG(name, 'small');
            d.onclick = () => { window.playerState.selectedIcon = name; toggleProfile(true); };
            ig.appendChild(d);
        });
    } else {
        modal.classList.add('hidden');
    }
}

async function saveProfile() {
    window.playerState.name = document.getElementById('input-name').value || 'Mystery';
    updateStatsUI();
    await saveProfileToDB();
    toggleProfile(false);
}

function updateBrawlerMenu() {
    document.getElementById('brawler-stand').innerHTML = createBrawlerSVG(window.state.currentBrawler, 'large');
    document.getElementById('current-brawler-name').innerText = window.state.currentBrawler;
}

function toggleBrawlers(show) {
    const screen = document.getElementById('brawler-screen');
    if (show) {
        screen.classList.remove('hidden');
        const list = document.getElementById('brawler-list');
        list.innerHTML = '';
        Object.keys(window.CONFIG.BRAWLERS).forEach(name => {
            const b = window.CONFIG.BRAWLERS[name];
            const div = document.createElement('div');
            const bgClass = b.rarity === 'starter' ? 'bg-starter' : 'bg-rare-brawler';
            const isUnlocked = b.unlocked;
            
            div.className = `p-4 rounded-xl border-4 ${window.state.currentBrawler === name ? 'border-yellow-400' : 'border-black'} ${bgClass} cursor-pointer hover:scale-105 transition-all relative ${!isUnlocked ? 'opacity-80' : ''}`;
            div.innerHTML = `
                <div class="h-32 mb-2 flex items-center justify-center ${!isUnlocked ? 'grayscale brightness-50' : ''}">${createBrawlerSVG(name, 'small')}</div>
                <div class="text-center text-xl text-black">${name}</div>
                <div class="text-center text-xs opacity-70 text-black uppercase">${b.rarity}</div>
                ${!isUnlocked ? '<div class="absolute inset-0 flex items-center justify-center text-4xl">🔒</div>' : ''}
            `;
            if (isUnlocked) {
                div.onclick = () => { window.state.currentBrawler = name; toggleBrawlers(false); updateBrawlerMenu(); };
            }
            list.appendChild(div);
        });
    } else { screen.classList.add('hidden'); }
}
