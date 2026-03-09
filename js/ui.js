// ========== UI FUNCTIONS ==========

function initUI() {
    loadBrawlerImages().then(() => {
        window.Textures.generate();
        updateBrawlerMenu();
        updateStatsUI();
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
        document.getElementById('shop-starr-drop-icon').innerHTML = createStarrDropSVG('RARE', 100);
        
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
    if (size === 'xlarge' && window.BrawlerImages.menu) {
        return `<img src="images/mysteria_menu.png" style="width: 400px; height: 400px; object-fit: contain;">`;
    }
    if (size === 'large' && window.BrawlerImages.menu) {
        return `<img src="images/mysteria_menu.png" style="width: 200px; height: 200px; object-fit: contain;">`;
    }
    if (size === 'small' && window.BrawlerImages.icon) {
        return `<img src="images/mysteria_icon.png" style="width: 80px; height: 80px; object-fit: contain;">`;
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
        cost) {
        window window.player.playerState.gState.gems -= cost;
ems -= cost;
        window        window.playerState.playerState.coins.coins += amount;
        += amount updateStats;
        updateStatsUI();
UI();
        await        await saveProfileToDB saveProfileToDB();
   ();
    } else {
        } else {
        alert(" alert("Not enoughNot enough gems!");
 gems!");
    }
    }
}

async}

async function purchase function purchaseStarrDrop()Starr {
   Drop() {
    if ( if (window.playerState.gwindow.playerems >=State.g 10ems >= 10) {
) {
        window        window.playerState.playerState.gems.gems -= 10;
 -=         update10;
        updateStatsUI();
        await saveStatsUI();
        await saveProfileToProfileToDB();
DB();
        start        startStarrDropAnimationStarrDropAnimation();
    } else();
    {
        } else {
        alert(" alert("Not enoughNot enough gems!");
 gems!");
    }
}

function    }
}

function toggleProfile toggleProfile(show(show) {
) {
    const modal =    const modal = document.getElementById document.getElementById('profile('profile-modal');
    if-modal');
    if (show (show) {
) {
        modal        modal.classList.remove.classList.remove('hidden');
('hidden       ');
        document.getElementById('input document.getElementById('input-name').-name').value =value = window.player window.playerState.name;
        
State.name;
        
        const        const cg cg = document.getElementById('color-grid');
        cg = document.getElementById('color-grid');
        cg.innerHTML =.innerHTML = '';
        '';
        CONFIG CONFIG.COL.COLORS.forEachORS.forEach(c => {
           (c => {
            const d const d = document = document.createElement('.createElement('div');
div');
            d            d.className.className = `w-full aspect-square = `w-full aspect-square rounded-lg rounded-lg cursor-pointer cursor-pointer border-4 ${ border-4 ${window.playerwindow.playerState.nameColor ===State.nameColor === c ? c ? 'border 'border-white scale-white scale-110 shadow-lg-110 shadow-lg' : 'border' : 'border-transparent-transparent'}`'}`;
            d.style;
            d.style.backgroundColor = c;
.backgroundColor = c;
            d.onclick            d.onclick = () = () => { window.player => { window.playerState.nameState.nameColor = c;Color = c; toggleProfile toggleProfile(true); };
           (true); };
            cg cg.appendChild(d);
       .appendChild(d);
        });

        });

        const ig = document const ig = document.getElementById('.getElementById('icon-grid');
       icon-grid ig.innerHTML = '';
');
        ig.innerHTML = '';
        Object.keys(C        Object.keys(CONFIGONFIG.BRA.BRAWLERSWLERS).forEach(name =>).forEach(name => {
            {
            if (!CONFIG.BRAWLERS[name].unlocked) return;
            const d if (!CONFIG.BRAWLERS[name].unlocked) return;
            const d = document.createElement('div');
            d = document.createElement('div');
            d.className = `.className = `p-2 bgp-2 bg-black/40 rounded-black/40 rounded-xl cursor-xl cursor-pointer border-pointer border-4 flex items-center justify-center transition-4 flex items-center justify-center transition-all ${window.playerState.selected-all ${window.playerState.selectedIcon ===Icon === name ? 'border name ? 'border-yellow-yellow-400-400 scale-105 scale-105' : '' : 'border-transborder-transparent hover:borderparent hover:border-white/-white/20'20'}`;
            d}`;
            d.style.backgroundColor.style.backgroundColor = CON = CONFIG.BFIG.BRAWLERS[nameRAWLERS[name].color].color;
           ;
            d.innerHTML d.innerHTML = createBrawlerSV = createBrawlerSVG(nameG(name,, ' 'small');
            dsmall');
            d.onclick.onclick = () = () => { => { window.player window.playerState.selectedIcon =State.selectedIcon = name; name; toggleProfile toggleProfile(true); };
           (true); };
            ig.appendChild ig.appendChild(d);
(d);
        });
    }        });
    } else {
        modal.classList.add else {
        modal.classList.add('hidden('hidden');
    }
}

async function');
    }
}

async function saveProfile saveProfile() {
() {
    window.player    windowState.name =.playerState.name = document.getElementById document.getElementById('input-name').('input-name').value || 'Mvalue || 'Mysteria';
ysteria';
    update    updateStatsUIStatsUI();
    await save();
    await saveProfileToProfileToDB();
DB();
    toggle    toggleProfile(falseProfile(false);
}

);
}

function updatefunction updateBrawlerMenuBrawlerMenu() {
() {
    document    document.getElementById('.getElementById('brawler-brawler-stand').innerHTML = createstand').innerHTMLBraw = createBrawlerSVlerSVG(windowG(window.state.current.state.currentBrawler,Brawler, 'x 'xlarge');
large');
    document    document.getElementById('.getElementById('current-bcurrent-brawlerrawler-name').-name').innerText = windowinnerText = window.state.current.state.currentBrawler;
}

//Brawler;
}

// Show Show upgrade confirmation upgrade confirmation
function show
function showUpgradeUpgradeModal(brawlerModal(brawlerName) {
   Name) {
    const progress = window.brawlerProgress[brawlerName const progress = window.brawlerProgress[brawlerName];
    if (!progress) return;
];
    if (!progress) return;
    const level =    const level = progress.level;
    progress.level;
    if (level >= if (level >= 11) return;
    const cost 11) return;
    const cost = window.UPGRADE = window.UPGRADE_COSTS_COSTS[level - 1];
    const ok =[level - 1];
    const ok = confirm(`Upgrade ${b confirm(`Upgrade ${brawlerName} to level ${level + rawlerName} to level ${level + 1}?\nCost: ${cost.coins} coins and ${cost.pp} power1}?\nCost: ${cost.coins} coins and ${cost.pp} power points.`);
    if (ok) {
        upgradeB points.`);
    if (ok) {
        upgradeBrawlerrawler(brawlerName(brawlerName);
   );
    }
}

function toggle }
}

function toggleBrawBrawlers(lers(show) {
   show) {
    const screen = document const screen = document.getElementById('.getElementById('brawler-screenbrawler-screen');
   ');
    if (show) if (show) {
        {
        screen.classList screen.classList.remove('hidden');
        const list =.remove('hidden');
        const document.getElementById('brawler-list');
 list = document.getElementById('brawler-list');
        list        list.innerHTML = '';
       .innerHTML = '';
        Object.keys Object.keys(CONFIG.BRAWLERS).forEach(name(CONFIG.BRAWLERS).forEach(name => {
            const b = => {
            const b = CONFIG.BRAWLERS[name];
            const CONFIG.BRAWLERS[name];
            const isUnlocked = b.unlocked;
            const progress = isUnlocked = b.unlocked;
            const progress = window.b window.brawlerProgress[name] || { trophies: 0, level: 1 };
            const trophies = progress.trophies;
            const level = progress.level;
            
            constrawlerProgress[name] || { trophies: 0, level: 1 };
            const trophies = progress.trophies;
            const level = progress.level;
            
            const div = document.createElement('div');
            const bgClass = b.rarity div = document.createElement('div');
            const bgClass = b.rarity === 'starter' ? 'bg-starter' : 'bg-rare-brawler === 'starter' ? 'bg-starter' : 'bg-rare-brawler';
            div.class';
            div.className = `pName = `p-4-4 rounded-xl border-4 ${ rounded-xl border-4 ${window.state.currentwindow.state.currentBrawlerBrawler === name === name ? ' ? 'border-yellow-border-yellow-400'400' : ' : 'border-black'} ${border-black'} ${bgClassbgClass} cursor} cursor-pointer hover-pointer hover:scale-105:scale-105 transition-all transition-all relative ${ relative ${!isUnlocked ? 'opacity-80' : ''}`;
            
            //!isUnlocked ? 'opacity-80' : ''}`;
            
 Level display
                       // Level display
            const level const levelText =Text = isUn isUnlocked ?locked ? `L `Lv.v. ${level ${level}` :}` : '';
            
 '';
            
            div.innerHTML =            div.innerHTML = `
                `
                <div class=" <div class="h-32 mb-2h-32 mb-2 flex items-center justify-center ${!is flex items-center justify-center ${!isUnlocked ? 'grayscale brightness-50'Unlocked ? 'grayscale brightness-50' : ''}">${createBrawlerSV : ''}">${createBrawlerSVG(name, 'G(name, 'small')small')}</div}</div>
               >
                <div class="text-center <div class="text-center text-xl text text-xl text-black">${name}</div>
-black">${name}</div>
                <div class="text                <div class="text-center text-center text-xs opacity-70-xs opacity-70 text-black text-black uppercase">${b.rar uppercase">${b.rarity}</div>
ity}</div>
                ${                ${isUnlocked ?isUnlocked ? `<div `<div class="text-center class="text-center text-y text-yellow-ellow-400">🏆400">🏆 ${t ${trophiesrophies}</div>` :}</div>` : ''}
 ''}
                ${                ${isUnlocked ?isUnlocked ? `<div `<div class="text-center text-blue class="text-center text-blue-400-400">${">${levelText}</divlevelText}</div>` :>` : ''}
 ''}
                ${!isUnlocked                ${!isUnlocked ? ? '<div class '<div class="absolute="absolute inset- inset-0 flex items-center0 flex items-center justify-center justify-center text- text-4xl">4xl">🔒</div>' : ''🔒</div>' : ''}
            `;
            
            if (}
            `;
            
            if (isUnlocked)isUnlocked) {
                div.on {
                div.onclick =click = () => { 
                    window.state.currentBrawler = name; 
                    toggleBrawlers(false); () => { 
                    window.state.currentBrawler = name; 
                    toggleBrawlers(false); 
                    updateBrawlerMenu(); 
                };
            }
            list.appendChild(div);
            
            // Add upgrade button if unlocked and 
                    updateBrawlerMenu(); 
                };
            }
            list.appendChild(div);
            
            // Add upgrade button if unlocked and not max level
            if (isUnlocked && level < 11) not max level
            if (isUnlocked && level < 11) {
                const upgradeDiv = document.createElement {
                const upgradeDiv = document.createElement('div');
                upgradeDiv('div');
                upgradeDiv.className.className = 'mt- = 'mt-2 flex2 flex justify-center';
                justify-center const cost';
                const cost = window = window.UPGRADE.UPGRADE_COSTS[level_COSTS[level - 1];
 - 1];
                upgradeDiv.innerHTML = `
                upgradeDiv.innerHTML = `
                    <button onclick                    <button onclick="event="event.stopPropagation(); showUpgradeModal('${name}.stopPropagation(); showUpgradeModal('${name}')" 
                            class="bg-green-500')" 
                            class="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded-xl border-2 border-black text hover:bg-green-400 text-black px-4 py-2 rounded-xl border-2 border-black text-sm">
-sm">
                        Upgrade (${cost.coins}💰 ${                        Upgrade (${cost.coins}💰 ${cost.pp}cost.pp}⚡)
⚡)
                    </button>
                `                    </button>
                `;
               ;
                div.appendChild( div.appendChild(upgradeDivupgradeDiv);
           );
            }
        }
        });
    } else });
    } else { 
        screen { 
        screen.classList.add('hidden'); 
    }
}

// Expose new functions.classList.add('hidden'); 
    }
}

// Expose new functions
window.showUpgradeModal = showUpgradeModal;
