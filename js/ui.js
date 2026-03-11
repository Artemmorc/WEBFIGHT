// ========== UI FUNCTIONS ==========

let currentBrawlerDetail = null;
let currentTab = 'stats';

function initUI() {
    loadBrawlerImages().then(() => {
        window.Textures.generate();
        updateBrawlerMenu();
        updateStatsUI();
        
        if (window.SVG_ICONS) {
            document.getElementById('mode-icon-container').innerHTML = SVG_ICONS.showdown;
            document.getElementById('icon-trophy-sm').innerHTML = SVG_ICONS.trophy(18);
            document.getElementById('icon-pp-sm').innerHTML = SVG_ICONS.pp(18);
            document.getElementById('icon-coins-sm').innerHTML = SVG_ICONS.coin(18);
            document.getElementById('icon-gems-sm').innerHTML = SVG_ICONS.gem(18);
            
            document.getElementById('shop-coins-icon').innerHTML = SVG_ICONS.coin(24);
            document.getElementById('shop-gems-icon').innerHTML = SVG_ICONS.gem(24);
            document.getElementById('daily-reward-icon').innerHTML = SVG_ICONS.coin(100);
            document.getElementById('btn-gem-icon').innerHTML = SVG_ICONS.gem(18);
            document.getElementById('btn-gem-icon-2').innerHTML = SVG_ICONS.gem(18);
            document.getElementById('shop-coins-bundle-icon').innerHTML = SVG_ICONS.coin(80);
        }
        
        if (typeof createStarrDropSVG === 'function') {
            document.getElementById('shop-starr-drop-icon').innerHTML = createStarrDropSVG('RARE', 100);
        }
        
        setTimeout(() => {
            document.getElementById('loading-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('loading-screen').style.display = 'none';
            }, 500);
        }, 1000);
    });
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

function createBrawlerSVG(name, size) {
    const imgData = window.BrawlerImages && window.BrawlerImages[name];
    if (size === 'xlarge' && imgData && imgData.menu) {
        return `<img src="images/${name.toLowerCase()}_menu.png" style="width: 400px; height: 400px; object-fit: contain;">`;
    }
    if (size === 'large' && imgData && imgData.menu) {
        return `<img src="images/${name.toLowerCase()}_menu.png" style="width: 200px; height: 200px; object-fit: contain;">`;
    }
    if (size === 'small' && imgData && imgData.icon) {
        return `<img src="images/${name.toLowerCase()}_icon.png" style="width: 80px; height: 80px; object-fit: contain;">`;
    }
    // Fallback to drawn SVG
    const b = CONFIG.BRAWLERS[name];
    const s = size === 'xlarge' ? 400 : size === 'large' ? 200 : 80;
    const strokeWidth = size === 'xlarge' ? 8 : size === 'large' ? 4 : 2;
    return `
    <svg width="${s}" height="${s}" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="38" fill="${b.color}" stroke="black" stroke-width="${strokeWidth}" />
        <circle cx="38" cy="42" r="6" fill="white" stroke="black" stroke-width="2"/>
        <circle cx="62" cy="42" r="6" fill="white" stroke="black" stroke-width="2"/>
        <circle cx="38" cy="44" r="3" fill="black"/>
        <circle cx="62" cy="44" r="3" fill="black"/>
        <circle cx="36" cy="40" r="1.5" fill="white"/>
        <circle cx="60" cy="40" r="1.5" fill="white"/>
        <path d="M30 25 L70 25 L65 35 L35 35 Z" fill="#8b5a2b" stroke="black" stroke-width="2"/>
        <rect x="65" y="42" width="25" height="8" rx="2" fill="#4a3729" stroke="black" stroke-width="2"/>
    </svg>`;
}

function toggleShop(show) {
    const shop = document.getElementById('shop-modal');
    if (show) {
        shop.classList.remove('hidden');
        updateStatsUI();
        if (window.playerState.dailyClaimed) {
            document.getElementById('daily-reward-card').style.opacity = '0.5';
            document.getElementById('daily-reward-card').onclick = null;
            document.getElementById('daily-claim-text').innerText = 'CLAIMED';
        } else {
            document.getElementById('daily-reward-card').style.opacity = '1';
            document.getElementById('daily-reward-card').onclick = claimDailyReward;
            document.getElementById('daily-claim-text').innerText = 'CLAIM';
        }
    } else {
        shop.classList.add('hidden');
    }
}

async function exchangeGems(cost, amount) {
    if (window.playerState.gems >= cost) {
        window.playerState.gems -= cost;
        window.playerState.coins += amount;
        updateStatsUI();
        await saveProfileToDB();
    } else {
        alert("Not enough gems!");
    }
}

async function purchaseStarrDrop() {
    if (window.playerState.gems >= 10) {
        window.playerState.gems -= 10;
        updateStatsUI();
        await saveProfileToDB();
        if (typeof startStarrDropAnimation === 'function') {
            startStarrDropAnimation();
        }
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
        CONFIG.COLORS.forEach(c => {
            const d = document.createElement('div');
            d.className = `w-full aspect-square rounded-lg cursor-pointer border-4 ${window.playerState.nameColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`;
            d.style.backgroundColor = c;
            d.onclick = () => { window.playerState.nameColor = c; toggleProfile(true); };
            cg.appendChild(d);
        });

        const ig = document.getElementById('icon-grid');
        ig.innerHTML = '';
        Object.keys(CONFIG.BRAWLERS).forEach(name => {
            const unlocked = window.brawlerProgress[name]?.unlocked ?? false;
            if (!unlocked) return;
            const d = document.createElement('div');
            d.className = `p-2 bg-black/40 rounded-xl cursor-pointer border-4 flex items-center justify-center transition-all ${window.playerState.selectedIcon === name ? 'border-yellow-400 scale-105' : 'border-transparent hover:border-white/20'}`;
            d.style.backgroundColor = CONFIG.BRAWLERS[name].color;
            d.innerHTML = createBrawlerSVG(name, 'small');
            d.onclick = () => { window.playerState.selectedIcon = name; toggleProfile(true); };
            ig.appendChild(d);
        });
    } else {
        modal.classList.add('hidden');
    }
}

async function saveProfile() {
    window.playerState.name = document.getElementById('input-name').value || 'Mysteria';
    updateStatsUI();
    await saveProfileToDB();
    toggleProfile(false);
}

function updateBrawlerMenu() {
    document.getElementById('brawler-stand').innerHTML = createBrawlerSVG(window.state.currentBrawler, 'xlarge');
    document.getElementById('current-brawler-name').innerText = window.state.currentBrawler;
}

function showBrawlerGrid() {
    document.getElementById('brawler-list').classList.remove('hidden');
    document.getElementById('brawler-detail').classList.add('hidden');
}

function switchBrawlerTab(tab) {
    currentTab = tab;
    // Update tab button styles
    ['stats', 'upgrade', 'skins', 'lore'].forEach(t => {
        const btn = document.getElementById(`tab-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.remove('bg-gray-600');
                btn.classList.add('bg-purple-600');
            } else {
                btn.classList.remove('bg-purple-600');
                btn.classList.add('bg-gray-600');
            }
        }
        const content = document.getElementById(`tab-content-${t}`);
        if (content) {
            content.classList.toggle('hidden', t !== tab);
        }
    });
}

function showBrawlerDetail(name) {
    const progress = window.brawlerProgress[name];
    if (!progress) return;
    currentBrawlerDetail = name;
    const bData = CONFIG.BRAWLERS[name];
    const level = progress.level;
    const stats = getBrawlerStats(name, level);
    const nextLevelStats = level < 11 ? getBrawlerStats(name, level + 1) : null;

    // Update portrait and basic info
    document.getElementById('detail-brawler-portrait').innerHTML = createBrawlerSVG(name, 'large');
    document.getElementById('detail-brawler-name').innerText = name;
    document.getElementById('detail-brawler-rarity').innerText = bData.rarity.toUpperCase();
    document.getElementById('detail-brawler-trophies').innerText = progress.trophies;
    document.getElementById('detail-brawler-level').innerText = level;

    // Stats tab
    document.getElementById('detail-brawler-hp').innerText = stats.health;
    document.getElementById('detail-brawler-damage').innerText = stats.damage;
    document.getElementById('detail-brawler-super').innerText = stats.superDamage;
    document.getElementById('detail-brawler-speed').innerText = bData.speed;
    document.getElementById('detail-brawler-ammo').innerText = bData.ammo;
    document.getElementById('detail-brawler-reload').innerText = bData.reload;

    // Upgrade tab
    if (level >= 11) {
        document.getElementById('upgrade-current-level').innerText = level;
        document.getElementById('upgrade-next-level').innerText = 'MAX';
        document.getElementById('upgrade-cost-coins').innerText = '-';
        document.getElementById('upgrade-cost-pp').innerText = '-';
        document.getElementById('detail-upgrade-btn').disabled = true;
        document.getElementById('detail-upgrade-btn').classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        document.getElementById('upgrade-current-level').innerText = level;
        document.getElementById('upgrade-next-level').innerText = level + 1;
        const cost = window.UPGRADE_COSTS[level - 1];
        document.getElementById('upgrade-cost-coins').innerText = cost.coins;
        document.getElementById('upgrade-cost-pp').innerText = cost.pp;
        document.getElementById('detail-upgrade-btn').disabled = false;
        document.getElementById('detail-upgrade-btn').classList.remove('opacity-50', 'cursor-not-allowed');
        document.getElementById('detail-upgrade-btn').onclick = () => {
            upgradeBrawler(name);
            setTimeout(() => showBrawlerDetail(name), 100);
        };
    }

    // Lore tab
    document.getElementById('detail-brawler-lore').innerText = bData.lore || 'No lore available.';
    document.getElementById('detail-brawler-ability').innerText = bData.ability || 'No special ability.';

    // Skins tab (placeholder)
    const skinsGrid = document.getElementById('detail-skins-grid');
    skinsGrid.innerHTML = '';
    if (bData.skins && bData.skins.length) {
        bData.skins.forEach(skin => {
            const div = document.createElement('div');
            div.className = 'bg-gray-700 p-2 rounded-xl text-center border-2 border-white/30';
            div.innerText = skin.name;
            skinsGrid.appendChild(div);
        });
    } else {
        const div = document.createElement('div');
        div.className = 'col-span-3 text-center text-gray-400';
        div.innerText = 'No skins yet.';
        skinsGrid.appendChild(div);
    }

    // Equip button
    document.getElementById('detail-equip-btn').onclick = () => {
        window.state.currentBrawler = name;
        updateBrawlerMenu();
        alert(`${name} equipped!`);
    };

    // Show detail, hide grid, reset to stats tab
    document.getElementById('brawler-list').classList.add('hidden');
    document.getElementById('brawler-detail').classList.remove('hidden');
    switchBrawlerTab('stats');
}

function showUpgradeModal(brawlerName) {
    const progress = window.brawlerProgress[brawlerName];
    if (!progress) return;
    const level = progress.level;
    if (level >= 11) {
        alert('Already max level!');
        return;
    }
    const cost = window.UPGRADE_COSTS[level - 1];
    const ok = confirm(`Upgrade ${brawlerName} to level ${level + 1}?\nCost: ${cost.coins} coins and ${cost.pp} power points.`);
    if (ok) {
        if (typeof upgradeBrawler === 'function') {
            upgradeBrawler(brawlerName);
        }
    }
}

function toggleBrawlers(show) {
    const screen = document.getElementById('brawler-screen');
    if (show) {
        screen.classList.remove('hidden');
        // Show grid, hide detail initially
        document.getElementById('brawler-list').classList.remove('hidden');
        document.getElementById('brawler-detail').classList.add('hidden');
        
        const list = document.getElementById('brawler-list');
        list.innerHTML = '';
        Object.keys(CONFIG.BRAWLERS).forEach(name => {
            const b = CONFIG.BRAWLERS[name];
            const progress = window.brawlerProgress[name] || { unlocked: false, trophies: 0, level: 1 };
            const isUnlocked = progress.unlocked;
            const trophies = progress.trophies || 0;
            
            const div = document.createElement('div');
            let bgClass = '';
            switch (b.rarity) {
                case 'starter':
                    bgClass = 'bg-starter';
                    break;
                case 'mythic':
                    bgClass = 'bg-mythic-brawler';
                    break;
                default:
                    bgClass = 'bg-rare-brawler';
            }
            div.className = `p-4 rounded-xl border-4 ${window.state.currentBrawler === name ? 'border-yellow-400' : 'border-black'} ${bgClass} cursor-pointer hover:scale-105 transition-all relative ${!isUnlocked ? 'opacity-80' : ''}`;
            
            div.innerHTML = `
                <div class="h-24 mb-2 flex items-center justify-center ${!isUnlocked ? 'grayscale brightness-50' : ''}">${createBrawlerSVG(name, 'small')}</div>
                <div class="text-center text-xl text-white">${name}</div>
                <div class="text-center text-xs opacity-80 text-gray-300 uppercase">${b.rarity}</div>
                ${isUnlocked ? `<div class="text-center text-yellow-400 text-sm">🏆 ${trophies}</div>` : ''}
                ${!isUnlocked ? '<div class="absolute inset-0 flex items-center justify-center text-4xl">🔒</div>' : ''}
            `;
            
            if (isUnlocked) {
                div.onclick = () => {
                    // Open detail view instead of selecting brawler
                    showBrawlerDetail(name);
                };
            }
            list.appendChild(div);
        });
    } else { 
        screen.classList.add('hidden'); 
    }
}
