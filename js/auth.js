// ========== AUTHENTICATION & PROFILE ==========

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

async function loadProfile() {
    if (!window.currentUser) return;
    const { data, error } = await window.sb
        .from('profiles')
        .select('*')
        .eq('user_id', window.currentUser.id)
        .single();
    if (error) {
        console.error('Profile load error', error);
        return;
    }
    window.currentProfile = data;
    
    // Load brawler progress
    const { data: progress } = await window.sb
        .from('brawler_progress')
        .select('*')
        .eq('user_id', window.currentUser.id);
    window.brawlerProgress = {};
    if (progress) {
        progress.forEach(p => {
            window.brawlerProgress[p.brawler_name] = p.trophies;
        });
    } else {
        Object.keys(CONFIG.BRAWLERS).forEach(name => {
            window.brawlerProgress[name] = 0;
        });
    }
    window.playerState.trophies = Object.values(window.brawlerProgress).reduce((a, b) => a + b, 0);
    
    window.playerState = {
        name: data.display_name || 'Mysteria',
        nameColor: '#4ade80',
        selectedIcon: 'Mysteria',
        pp: data.pp,
        coins: data.coins,
        gems: data.gems,
        dailyClaimed: data.daily_claimed,
        trophies: window.playerState.trophies
    };
    
    document.getElementById('displayUsername').innerText = data.username;
    document.getElementById('displayAccountId').innerText = '#' + data.account_id;
    if (typeof updateStatsUI === 'function') updateStatsUI();
    if (data.is_admin) {
        document.getElementById('adminBtnContainer').classList.remove('hidden');
    } else {
        document.getElementById('adminBtnContainer').classList.add('hidden');
    }
    if (typeof checkDailyReset === 'function') checkDailyReset();
}

async function saveProfileToDB() {
    if (!window.currentUser || !window.currentProfile) return;
    const updates = {
        display_name: window.playerState.name,
        pp: window.playerState.pp,
        coins: window.playerState.coins,
        gems: window.playerState.gems,
        daily_claimed: window.playerState.dailyClaimed
    };
    const { error } = await window.sb
        .from('profiles')
        .update(updates)
        .eq('user_id', window.currentUser.id);
    if (error) console.error('Save error', error);
}

async function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }
    const email = username + '@example.com';
    const { data, error } = await window.sb.auth.signInWithPassword({ email, password });
    if (error) {
        msg.innerText = error.message;
        return;
    }
    window.currentUser = data.user;
    await loadProfile();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'flex';
}

async function handleRegister() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const msg = document.getElementById('loginMessage');
    if (!username || !password) {
        msg.innerText = 'Username and password required';
        return;
    }
    const email = username + '@example.com';
    const { data, error } = await window.sb.auth.signUp({ email, password, options: { data: { username } } });
    if (error) {
        msg.innerText = error.message;
        return;
    }
    const accountId = generateAccountId();
    const { error: profileError } = await window.sb
        .from('profiles')
        .insert({
            user_id: data.user.id,
            username,
            display_name: username,
            account_id: accountId,
            coins: 0,
            gems: 0,
            pp: 0,
            trophies: 0,
            daily_claimed: false,
            is_admin: false
        });
    if (profileError) {
        msg.innerText = 'Profile creation failed: ' + profileError.message;
        return;
    }
    msg.innerText = 'Registration successful! You can now login.';
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

async function logout() {
    await window.sb.auth.signOut();
    window.currentUser = null;
    window.currentProfile = null;
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    window.keys = { w: false, a: false, s: false, d: false };
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
}

// Admin functions
function toggleAdminPanel() {
    document.getElementById('adminPanel').classList.toggle('hidden');
}

async function adminGiveCoins() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminCoins').value);
    window.playerState.coins += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminGiveGems() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminGems').value);
    window.playerState.gems += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminGivePp() {
    if (!window.currentProfile?.is_admin) return;
    const amount = parseInt(document.getElementById('adminPp').value);
    window.playerState.pp += amount;
    updateStatsUI();
    await saveProfileToDB();
}

async function adminChangeUsername() {
    if (!window.currentProfile?.is_admin) return;
    const newUsername = document.getElementById('adminNewUsername').value.trim();
    if (!newUsername) return;
    const { error } = await window.sb
        .from('profiles')
        .update({ username: newUsername })
        .eq('user_id', window.currentUser.id);
    if (!error) {
        window.currentProfile.username = newUsername;
        document.getElementById('displayUsername').innerText = newUsername;
    }
}
