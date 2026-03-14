// Create Supabase client and make it globally accessible
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.sb = sb;

// Auth variables
window.currentUser = null;
window.currentProfile = null;

function generateAccountId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function handleRegister() {
    console.log('handleRegister called');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }

    const email = username + '@example.com';
    console.log('Attempting signup with email:', email);

    const { data, error } = await sb.auth.signUp({
        email: email,
        password: password,
        options: {
            data: { username: username }
        }
    });

    if (error) {
        console.error('Signup error:', error);
        msg.innerText = error.message;
        return;
    }

    console.log('Signup success, user:', data.user);

    const accountId = generateAccountId();
    const { error: profileError } = await sb
        .from('profiles')
        .insert({
            user_id: data.user.id,
            username: username,
            display_name: username,
            account_id: accountId,
            coins: 0,
            gems: 0,
            pp: 0,
            trophies: 0,
            daily_claimed: false,
            is_admin: false,
            daily_wins: 0,
            daily_wins_date: new Date().toISOString().split('T')[0],
            selected_icon: 'Mysteria',
            name_color: '#4ade80'
        });

    if (profileError) {
        console.error('Profile insert error:', profileError);
        msg.innerText = 'Profile creation failed: ' + profileError.message;
        return;
    }

    // Create initial brawler progress row with all brawlers
    const { error: brawlerError } = await sb
        .from('brawler_progress')
        .insert({
            user_id: data.user.id,
            mysteria_unlocked: true,
            mysteria_trophies: 0,
            mysteria_power_level: 1,
            brewiant_unlocked: false,
            brewiant_trophies: 0,
            brewiant_power_level: 1,
            anthony_unlocked: false,
            anthony_trophies: 0,
            anthony_power_level: 1
        });

    if (brawlerError) {
        console.error('Brawler progress insert error:', brawlerError);
    }

    msg.innerText = 'Registration successful! You can now login.';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

async function handleLogin() {
    console.log('handleLogin called');
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');

    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }

    const email = username + '@example.com';
    console.log('Attempting login with email:', email);

    const { data, error } = await sb.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        console.error('Login error:', error);
        msg.innerText = error.message;
        return;
    }

    console.log('Login success, user:', data.user);
    window.currentUser = data.user;
    await loadProfile();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

async function logout() {
    await sb.auth.signOut();
    window.currentUser = null;
    window.currentProfile = null;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

async function loadProfile() {
    if (!window.currentUser) return;

    const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .single();

    if (error) {
        console.error('Profile load error', error);
        return;
    }

    window.currentProfile = data;
    window.playerState = {
        name: data.display_name,
        nameColor: data.name_color || '#4ade80',
        selectedIcon: data.selected_icon || 'Mysteria',
        trophies: data.trophies,
        pp: data.pp,
        coins: data.coins,
        gems: data.gems,
        dailyClaimed: data.daily_claimed,
        dailyWins: data.daily_wins || 0
    };

    document.getElementById('displayUsername').innerText = data.username;
    document.getElementById('displayAccountId').innerText = '#' + data.account_id;

    await checkDailyWinReset();

    if (typeof checkDailyReset === 'function') {
        checkDailyReset();
    }

    await loadBrawlerProgress();

    if (typeof updateStatsUI === 'function') updateStatsUI();

    // 🔔 Update FREE badge on shop button
    if (typeof window.updateShopButtonFreeIndicator === 'function') {
        window.updateShopButtonFreeIndicator();
    }

    if (data.is_admin) {
        document.getElementById('adminBtnContainer').classList.remove('hidden');
    } else {
        document.getElementById('adminBtnContainer').classList.add('hidden');
    }
}

async function checkDailyWinReset() {
    if (!window.currentUser || !window.currentProfile) return;
    const today = new Date().toISOString().split('T')[0];
    if (window.currentProfile.daily_wins_date !== today) {
        window.currentProfile.daily_wins = 0;
        window.currentProfile.daily_wins_date = today;
        window.playerState.dailyWins = 0;
        const { error } = await window.sb
            .from('profiles')
            .update({ daily_wins: 0, daily_wins_date: today })
            .eq('user_id', window.currentUser.id);
        if (error) console.error('Error resetting daily wins:', error);
    }
}

async function loadBrawlerProgress() {
    if (!window.currentUser) return;
    const { data, error } = await window.sb
        .from('brawler_progress')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .maybeSingle();

    if (error) {
        console.error('Error loading brawler progress:', error);
        return;
    }

    window.brawlerProgress = {};

    if (data) {
        window.brawlerProgress['Mysteria'] = {
            unlocked: data.mysteria_unlocked,
            trophies: data.mysteria_trophies,
            level: data.mysteria_power_level
        };
        window.brawlerProgress['Brewiant'] = {
            unlocked: data.brewiant_unlocked,
            trophies: data.brewiant_trophies,
            level: data.brewiant_power_level
        };
        window.brawlerProgress['Anthony'] = {
            unlocked: data.anthony_unlocked,
            trophies: data.anthony_trophies,
            level: data.anthony_power_level
        };
    } else {
        window.brawlerProgress['Mysteria'] = { unlocked: true, trophies: 0, level: 1 };
        window.brawlerProgress['Brewiant'] = { unlocked: false, trophies: 0, level: 1 };
        window.brawlerProgress['Anthony'] = { unlocked: false, trophies: 0, level: 1 };
        await window.sb
            .from('brawler_progress')
            .insert({
                user_id: window.currentUser.id,
                mysteria_unlocked: true,
                mysteria_trophies: 0,
                mysteria_power_level: 1,
                brewiant_unlocked: false,
                brewiant_trophies: 0,
                brewiant_power_level: 1,
                anthony_unlocked: false,
                anthony_trophies: 0,
                anthony_power_level: 1
            })
            .then(({ error }) => {
                if (error) console.error('Error inserting default brawler progress:', error);
            });
    }

    window.playerState.trophies = Object.values(window.brawlerProgress).reduce((sum, b) => sum + (b.trophies || 0), 0);
    if (typeof updateStatsUI === 'function') updateStatsUI();
}

async function saveBrawlerProgress() {
    if (!window.currentUser) return;

    const updates = {
        user_id: window.currentUser.id,
        mysteria_unlocked: window.brawlerProgress['Mysteria']?.unlocked ?? true,
        mysteria_trophies: window.brawlerProgress['Mysteria']?.trophies ?? 0,
        mysteria_power_level: window.brawlerProgress['Mysteria']?.level ?? 1,
        brewiant_unlocked: window.brawlerProgress['Brewiant']?.unlocked ?? false,
        brewiant_trophies: window.brawlerProgress['Brewiant']?.trophies ?? 0,
        brewiant_power_level: window.brawlerProgress['Brewiant']?.level ?? 1,
        anthony_unlocked: window.brawlerProgress['Anthony']?.unlocked ?? false,
        anthony_trophies: window.brawlerProgress['Anthony']?.trophies ?? 0,
        anthony_power_level: window.brawlerProgress['Anthony']?.level ?? 1
    };

    const { error } = await window.sb
        .from('brawler_progress')
        .upsert(updates, { onConflict: 'user_id' });

    if (error) console.error('Error saving brawler progress:', error);
}

async function saveProfileToDB() {
    if (!window.currentUser || !window.currentProfile) return;

    const updates = {
        display_name: window.playerState.name,
        selected_icon: window.playerState.selectedIcon,
        name_color: window.playerState.nameColor,
        trophies: window.playerState.trophies,
        pp: window.playerState.pp,
        coins: window.playerState.coins,
        gems: window.playerState.gems,
        daily_claimed: window.playerState.dailyClaimed,
        daily_wins: window.playerState.dailyWins,
        daily_wins_date: window.currentProfile.daily_wins_date
    };

    const { error } = await sb
        .from('profiles')
        .update(updates)
        .eq('user_id', window.currentUser.id);

    if (error) console.error('Save error', error);
}

// ========== UPGRADE FUNCTION ==========
async function upgradeBrawler(brawlerName) {
    if (!window.currentUser) return;
    const progress = window.brawlerProgress[brawlerName];
    if (!progress) return;
    const currentLevel = progress.level;
    if (currentLevel >= 11) {
        alert('Already max level!');
        return;
    }
    const costIndex = currentLevel - 1;
    const cost = window.UPGRADE_COSTS[costIndex];
    if (!cost) return;

    if (window.playerState.coins < cost.coins || window.playerState.pp < cost.pp) {
        alert('Not enough resources!');
        return;
    }

    window.playerState.coins -= cost.coins;
    window.playerState.pp -= cost.pp;
    progress.level = currentLevel + 1;

    await saveBrawlerProgress();
    await saveProfileToDB();

    if (typeof updateStatsUI === 'function') updateStatsUI();
    if (!document.getElementById('brawler-screen').classList.contains('hidden')) {
        toggleBrawlers(true);
    }
    alert(`${brawlerName} upgraded to level ${progress.level}!`);
}

// ========== ADMIN FUNCTIONS ==========
function toggleAdminPanel() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('hidden');
}

async function adminGiveCoins() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminCoins').value);
    window.playerState.coins += amount;
    if (typeof updateStatsUI === 'function') updateStatsUI();
    await saveProfileToDB();
}

async function adminGiveGems() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminGems').value);
    window.playerState.gems += amount;
    if (typeof updateStatsUI === 'function') updateStatsUI();
    await saveProfileToDB();
}

async function adminGivePp() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminPp').value);
    window.playerState.pp += amount;
    if (typeof updateStatsUI === 'function') updateStatsUI();
    await saveProfileToDB();
}

async function adminChangeUsername() {
    if (!window.currentProfile?.is_admin) return;
    const newUsername = document.getElementById('adminNewUsername').value.trim();
    if (!newUsername) return;
    const { error } = await sb
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', window.currentUser.id);
    if (!error) {
        window.currentProfile.username = newUsername;
        document.getElementById('displayUsername').innerText = newUsername;
    }
}

// ========== OFFER MANAGEMENT (ADMIN) ==========

let currentEditingOfferId = null;

function openOfferEditor() {
    document.getElementById('offer-editor').classList.remove('hidden');
    loadOffersList();
    clearOfferForm();
}

function closeOfferEditor() {
    document.getElementById('offer-editor').classList.add('hidden');
}

function clearOfferForm() {
    currentEditingOfferId = null;
    document.getElementById('offer-title').value = '';
    document.getElementById('offer-description').value = '';
    document.getElementById('offer-item-type').value = 'coins';
    document.getElementById('offer-item-id').value = '';
    document.getElementById('offer-amount').value = '1';
    document.getElementById('offer-image').value = '';
    document.getElementById('offer-price-type').value = 'coins';
    document.getElementById('offer-price-amount').value = '0';
    document.getElementById('offer-start').value = '';
    document.getElementById('offer-end').value = '';
    document.getElementById('offer-delete-btn').classList.add('hidden');
}

async function loadOffersList() {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('shop_offers')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading offers:', error);
        return;
    }
    const list = document.getElementById('offer-list');
    list.innerHTML = data.map(offer => `
        <div class="bg-black/40 p-3 rounded-lg flex justify-between items-center">
            <span class="text-white">${offer.title} (${offer.item_type})</span>
            <button onclick="editOffer(${offer.id})" class="bg-blue-500 px-3 py-1 rounded text-sm">Edit</button>
        </div>
    `).join('');
}

async function editOffer(id) {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('shop_offers')
        .select('*')
        .eq('id', id)
        .single();
    if (error || !data) {
        alert('Offer not found');
        return;
    }
    currentEditingOfferId = id;
    document.getElementById('offer-title').value = data.title || '';
    document.getElementById('offer-description').value = data.description || '';
    document.getElementById('offer-item-type').value = data.item_type || 'coins';
    document.getElementById('offer-item-id').value = data.item_id || '';
    document.getElementById('offer-amount').value = data.amount || 1;
    document.getElementById('offer-image').value = data.image_url || '';
    document.getElementById('offer-price-type').value = data.price_type || 'coins';
    document.getElementById('offer-price-amount').value = data.price_amount || 0;
    if (data.start_time) {
        document.getElementById('offer-start').value = data.start_time.slice(0,16);
    }
    if (data.end_time) {
        document.getElementById('offer-end').value = data.end_time.slice(0,16);
    }
    document.getElementById('offer-delete-btn').classList.remove('hidden');
}

async function saveOffer() {
    if (!window.currentProfile?.is_admin) return;

    const title = document.getElementById('offer-title').value.trim();
    if (!title) {
        alert('Title is required');
        return;
    }

    const start = document.getElementById('offer-start').value;
    const end = document.getElementById('offer-end').value;
    if (!start || !end) {
        alert('Start and end times are required');
        return;
    }

    const offerData = {
        title,
        description: document.getElementById('offer-description').value.trim() || null,
        item_type: document.getElementById('offer-item-type').value,
        item_id: document.getElementById('offer-item-id').value.trim() || null,
        amount: parseInt(document.getElementById('offer-amount').value) || 1,
        image_url: document.getElementById('offer-image').value.trim() || null,
        price_type: document.getElementById('offer-price-type').value,
        price_amount: parseInt(document.getElementById('offer-price-amount').value) || 0,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        is_active: true
    };

    let error;
    if (currentEditingOfferId) {
        ({ error } = await window.sb
            .from('shop_offers')
            .update(offerData)
            .eq('id', currentEditingOfferId));
    } else {
        ({ error } = await window.sb
            .from('shop_offers')
            .insert(offerData));
    }

    if (error) {
        alert('Error saving offer: ' + error.message);
    } else {
        alert('Offer saved successfully');
        closeOfferEditor();
    }
}

async function deleteOffer() {
    if (!currentEditingOfferId || !confirm('Delete this offer?')) return;
    const { error } = await window.sb
        .from('shop_offers')
        .delete()
        .eq('id', currentEditingOfferId);
    if (error) {
        alert('Error deleting: ' + error.message);
    } else {
        alert('Offer deleted');
        closeOfferEditor();
    }
}

// Expose functions
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.logout = logout;
window.loadProfile = loadProfile;
window.saveProfileToDB = saveProfileToDB;
window.saveBrawlerProgress = saveBrawlerProgress;
window.loadBrawlerProgress = loadBrawlerProgress;
window.checkDailyWinReset = checkDailyWinReset;
window.upgradeBrawler = upgradeBrawler;
window.toggleAdminPanel = toggleAdminPanel;
window.adminGiveCoins = adminGiveCoins;
window.adminGiveGems = adminGiveGems;
window.adminGivePp = adminGivePp;
window.adminChangeUsername = adminChangeUsername;
window.openOfferEditor = openOfferEditor;
window.closeOfferEditor = closeOfferEditor;
window.editOffer = editOffer;
window.saveOffer = saveOffer;
window.deleteOffer = deleteOffer;
