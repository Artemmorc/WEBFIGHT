// ========== SHOP OFFERS ==========

// Fetch currently active offers (excluding claimed ones)
async function getActiveOffers() {
    if (!window.sb || !window.currentUser) return [];
    const now = new Date().toISOString();
    const { data, error } = await window.sb
        .from('shop_offers')
        .select('*') 
        .eq('is_active', true)
        .lte('start_time', now)
        .gte('end_time', now)
        .order('end_time', { ascending: true });
    if (error) {
        console.error('Error fetching offers:', error);
        return [];
    }
    // Filter out offers already claimed by this user
    const claimed = window.currentProfile?.claimed_offers || [];
    return data.filter(offer => !claimed.includes(offer.id));
}

// Check if there is any active free offer (unclaimed)
async function hasFreeOffer() {
    const offers = await getActiveOffers();
    return offers.some(offer => offer.price_type === 'free');
}

// Purchase an offer
async function purchaseOffer(offerId) {
    if (!window.currentUser) {
        alert('You must be logged in.');
        return;
    }

    // Re-fetch offer to ensure it's still valid and not claimed
    const { data: offer, error } = await window.sb
        .from('shop_offers')
        .select('*')
        .eq('id', offerId)
        .eq('is_active', true)
        .single();
    if (error || !offer) {
        alert('Offer not found or expired.');
        return;
    }

    // Check if already claimed
    const claimed = window.currentProfile?.claimed_offers || [];
    if (claimed.includes(offer.id)) {
        alert('You have already claimed this offer.');
        return;
    }

    const now = new Date();
    const start = new Date(offer.start_time);
    const end = new Date(offer.end_time);
    if (now < start || now > end) {
        alert('This offer is not active at this time.');
        return;
    }

    // Check price
    if (offer.price_type !== 'free') {
        const playerResource = window.playerState[offer.price_type];
        if (playerResource < offer.price_amount) {
            alert(`Not enough ${offer.price_type}!`);
            return;
        }
    }

    // Deduct price
    if (offer.price_type !== 'free') {
        window.playerState[offer.price_type] -= offer.price_amount;
    }

    // Mark as claimed in database
    const newClaimed = [...claimed, offer.id];
    const { error: updateError } = await window.sb
        .from('profiles')
        .update({ claimed_offers: newClaimed })
        .eq('user_id', window.currentUser.id);
    if (updateError) {
        console.error('Error marking offer as claimed:', updateError);
        alert('Failed to claim offer. Please try again.');
        return;
    }
    window.currentProfile.claimed_offers = newClaimed;

    // Grant reward(s) – handle multiple starrdrops
    await grantReward(offer);

    // Save updated player state (coins, gems, etc. already updated in grantReward)
    await window.saveProfileToDB();

    // Refresh shop display
    if (!document.getElementById('shop-modal').classList.contains('hidden')) {
        await refreshShopOffers();
    }

    // Update the FREE badge on the shop button
    if (typeof window.updateShopButtonFreeIndicator === 'function') {
        window.updateShopButtonFreeIndicator();
    }

    // No success alert – removed
}

async function grantReward(offer) {
    const { item_type, item_id, amount } = offer;

    switch (item_type) {
        case 'coins':
            window.playerState.coins += amount;
            break;
        case 'gems':
            window.playerState.gems += amount;
            break;
        case 'pp':
            window.playerState.pp += amount;
            break;
        case 'brawler':
            if (window.brawlerProgress[item_id]) {
                window.brawlerProgress[item_id].unlocked = true;
                await window.saveBrawlerProgress();
            }
            break;
        case 'starrdrop':
            // Start a sequence of starrdrops
            if (typeof window.startStarrDropSequence === 'function') {
                window.startStarrDropSequence(amount, item_id); // item_id can be a specific rarity or null for random
            } else {
                console.error('startStarrDropSequence not available');
            }
            break;
        default:
            console.warn('Unknown item_type:', item_type);
    }
}

// Refresh offers in shop UI
async function refreshShopOffers() {
    const container = document.getElementById('shop-offers-container');
    if (!container) return;

    const offers = await getActiveOffers();
    if (offers.length === 0) {
        container.innerHTML = '<div class="col-span-4 text-center text-white/50 py-8">No special offers at the moment.</div>';
        return;
    }

    container.innerHTML = offers.map(offer => createOfferCard(offer)).join('');

    offers.forEach(offer => {
        const btn = document.getElementById(`offer-btn-${offer.id}`);
        if (btn) {
            btn.onclick = () => purchaseOffer(offer.id);
        }
    });

    startOfferTimers(offers);
}

function createOfferCard(offer) {
    const priceDisplay = offer.price_type === 'free' ? 'FREE' : `${offer.price_amount} ${offer.price_type}`;
    const rewardDisplay = getRewardDisplay(offer);
    return `
    <div class="shop-card rounded-2xl p-4 flex flex-col items-center justify-between text-center min-h-[280px] relative overflow-hidden">
        ${offer.image_url ? `<img src="${offer.image_url}" class="absolute inset-0 w-full h-full object-cover opacity-20">` : ''}
        <div class="relative z-10">
            <h3 class="text-xl font-bold text-yellow-400 mb-1">${offer.title}</h3>
            <p class="text-sm text-white/70 mb-2">${offer.description || ''}</p>
            <div class="text-2xl mb-2">${rewardDisplay}</div>
            <div class="text-sm text-white/80 mb-2">${offer.amount > 1 ? `x${offer.amount}` : ''}</div>
            <div class="bg-purple-600 w-full py-2 rounded-lg border-2 border-black text-lg font-bold cursor-pointer hover:bg-purple-500" id="offer-btn-${offer.id}">
                ${priceDisplay}
            </div>
            <div class="text-xs text-white/50 mt-1" id="offer-timer-${offer.id}"></div>
        </div>
    </div>`;
}

function getRewardDisplay(offer) {
    switch (offer.item_type) {
        case 'brawler': return `🏆 ${offer.item_id}`;
        case 'skin': return `🎨 ${offer.item_id}`;
        case 'starrdrop': return offer.item_id ? `⭐ ${offer.item_id} Starr Drop` : '⭐ Starr Drop';
        case 'coins': return '💰 Coins';
        case 'gems': return '💎 Gems';
        case 'pp': return '🔋 Power Points';
        default: return '🎁 Reward';
    }
}

function startOfferTimers(offers) {
    offers.forEach(offer => {
        const timerEl = document.getElementById(`offer-timer-${offer.id}`);
        if (!timerEl) return;
        const end = new Date(offer.end_time).getTime();
        updateTimer(timerEl, end);
    });
}

function updateTimer(el, endTime) {
    const interval = setInterval(() => {
        const now = Date.now();
        const diff = endTime - now;
        if (diff <= 0) {
            el.innerText = 'EXPIRED';
            clearInterval(interval);
            refreshShopOffers();
            return;
        }
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        el.innerText = `Ends in ${hours}h ${minutes}m ${seconds}s`;
    }, 1000);
}

// Expose functions
window.getActiveOffers = getActiveOffers;
window.purchaseOffer = purchaseOffer;
window.refreshShopOffers = refreshShopOffers;
window.hasFreeOffer = hasFreeOffer;
