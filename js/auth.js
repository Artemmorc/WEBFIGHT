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
            daily_wins_date: new Date().toISOString().split('T')[0]
        });

    if (profileError) {
        console.error('Profile insert error:', profileError);
        msg.innerText = 'Profile creation failed: ' + profileError.message;
        return;
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
        nameColor: '#4ade80',
        selectedIcon: 'Mysteria',
        trophies: data.trophies,
        pp: data.pp,
        coins: data.coins,
        gems: data.gems,
        dailyClaimed: data.daily_claimed,
        dailyWins: data.daily_wins || 0
    };

    document.getElementById('displayUsername').innerText = data.username;
    document.getElementById('displayAccountId').innerText = '#' + data.account_id;

    // Reset daily wins if date changed
    await checkDailyWinReset();

    // Load per-brawler progress
    await loadBrawlerProgress();

    if (typeof updateStatsUI === 'function') updateStatsUI();

    if (data.is_admin) {
        document.getElementById('adminBtnContainer').classList.remove('hidden');
    } else {
        document.getElementById('adminBtnContainer').classList.add('hidden');
    }
}

async function checkDailyWinReset() {
    if (!window.currentUser || !window.currentProfile) return;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
        .select('brawler_name, trophies')
        .eq('user_id', window.currentUser.id);

    if (error) {
        console.error('Error loading brawler progress:', error);
        return;
    }

    window.brawlerProgress = {};
    let totalTrophies = 0;
    data.forEach(row => {
        window.brawlerProgress[row.brawler_name] = row.trophies;
        totalTrophies += row.trophies;
    });

    // Update playerState.trophies with the sum
    window.playerState.trophies = totalTrophies;
    if (typeof updateStatsUI === 'function') updateStatsUI();
}

async function saveBrawlerProgress(brawlerName, trophies) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('brawler_progress')
        .upsert({
            user_id: window.currentUser.id,
            brawler_name: brawlerName,
            trophies: trophies
        }, { onConflict: 'user_id, brawler_name' });
    if (error) console.error('Error saving brawler progress:', error);
}

async function saveProfileToDB() {
    if (!window.currentUser || !window.currentProfile) return;

    const updates = {
        display_name: window.playerState.name,
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

// Admin functions
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

// Expose functions
window.handleRegister = handleRegister;
window.handleLogin = handleLogin;
window.logout = logout;
window.loadProfile = loadProfile;
window.saveProfileToDB = saveProfileToDB;
window.saveBrawlerProgress = saveBrawlerProgress;
window.loadBrawlerProgress = loadBrawlerProgress;
window.checkDailyWinReset = checkDailyWinReset;
window.toggleAdminPanel = toggleAdminPanel;
window.adminGiveCoins = adminGiveCoins;
window.adminGiveGems = adminGiveGems;
window.adminGivePp = adminGivePp;
window.adminChangeUsername = adminChangeUsername;
