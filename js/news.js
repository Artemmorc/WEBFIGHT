// ========== NEWS SYSTEM (with reactions & polls) ==========

// Main entry point when News button is clicked
async function handleNewsClick() {
    await openNewsViewer();
}

// Open the news viewer modal
async function openNewsViewer() {
    const viewer = document.getElementById('news-viewer');
    if (!viewer) {
        console.error('❌ News viewer element (#news-viewer) not found in DOM!');
        alert('News system error: viewer not found. Please refresh.');
        return;
    }
    viewer.classList.remove('hidden');
    
    // Load news list
    await loadNewsList();

    // Show or hide the create button based on admin status
    const createBtn = document.getElementById('news-create-btn');
    if (createBtn) {
        if (window.currentProfile?.is_admin) {
            createBtn.classList.remove('hidden');
        } else {
            createBtn.classList.add('hidden');
        }
    }
}

// Close the news viewer
function closeNewsViewer() {
    const viewer = document.getElementById('news-viewer');
    if (viewer) viewer.classList.add('hidden');
}

// Load and display the list of published news articles
async function loadNewsList() {
    if (!window.sb) {
        console.error('Supabase not initialized');
        return;
    }

    const container = document.getElementById('news-list');
    if (!container) {
        console.error('❌ News list container (#news-list) not found in DOM!');
        return;
    }

    try {
        const { data, error } = await window.sb
            .from('news')
            .select('*')
            .eq('published', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error loading news:', error);
            container.innerHTML = '<div class="text-center text-red-400 p-4">Failed to load news.</div>';
            return;
        }

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-center text-white/50 p-8">No news yet.</div>';
            return;
        }

        container.innerHTML = ''; // Clear previous content

        for (const news of data) {
            const card = document.createElement('div');
            card.className = 'news-card bg-black/40 p-6 rounded-xl border-2 border-white/30 cursor-pointer hover:bg-black/60 transition-colors';
            
            // Strip HTML tags for preview
            const plainText = news.content.replace(/<[^>]*>/g, '');
            const preview = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;

            card.innerHTML = `
                <h3 class="text-3xl text-yellow-400 mb-2">${escapeHTML(news.title)}</h3>
                <div class="text-gray-300 text-sm">${new Date(news.created_at).toLocaleString()}</div>
                <div class="text-white mt-2 line-clamp-2">${escapeHTML(preview)}</div>
            `;

            // Click to show full detail
            card.onclick = () => showNewsDetail(news);

            // Load reactions for this news
            await attachReactions(card, news.id);

            // Load polls for this news
            await attachPolls(card, news.id);

            container.appendChild(card);
        }
    } catch (e) {
        console.error('Unexpected error loading news:', e);
        container.innerHTML = '<div class="text-center text-red-400 p-4">An error occurred.</div>';
    }
}

// Attach reaction buttons to a news card
async function attachReactions(card, newsId) {
    if (!window.sb) return;

    const { data: reactions, error } = await window.sb
        .from('news_reactions')
        .select('emoji, user_id')
        .eq('news_id', newsId);

    if (error || !reactions || reactions.length === 0) return;

    const emojiCounts = {};
    reactions.forEach(r => {
        emojiCounts[r.emoji] = (emojiCounts[r.emoji] || 0) + 1;
    });

    const reactionDiv = document.createElement('div');
    reactionDiv.className = 'flex gap-2 mt-2';

    for (let em in emojiCounts) {
        const btn = document.createElement('button');
        btn.className = 'bg-gray-700 px-2 py-1 rounded text-white text-sm';
        btn.innerText = `${em} ${emojiCounts[em]}`;
        btn.onclick = async (e) => {
            e.stopPropagation();
            if (!window.currentUser) {
                alert('You must be logged in to react.');
                return;
            }
            const userReacted = reactions.some(r => r.user_id === window.currentUser.id && r.emoji === em);
            if (userReacted) {
                await removeReaction(newsId, em);
            } else {
                await addReaction(newsId, em);
            }
            // Reload the entire news list to reflect changes
            await loadNewsList();
        };
        reactionDiv.appendChild(btn);
    }
    card.appendChild(reactionDiv);
}

// Attach polls to a news card
async function attachPolls(card, newsId) {
    if (!window.sb) return;

    const { data: polls, error } = await window.sb
        .from('news_polls')
        .select('*')
        .eq('news_id', newsId);

    if (error || !polls || polls.length === 0) return;

    for (const poll of polls) {
        const pollDiv = document.createElement('div');
        pollDiv.className = 'mt-4 p-4 bg-black/60 rounded-lg';
        pollDiv.innerHTML = `<p class="text-yellow-300">${escapeHTML(poll.question)}</p>`;

        const { data: options } = await window.sb
            .from('poll_options')
            .select('*')
            .eq('poll_id', poll.id);

        const { data: votes } = await window.sb
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', poll.id)
            .eq('user_id', window.currentUser?.id || '');
        const userVoted = votes && votes.length > 0;

        if (userVoted) {
            const { count: totalVotes } = await window.sb
                .from('poll_votes')
                .select('*', { count: 'exact', head: true })
                .eq('poll_id', poll.id);

            for (const opt of options) {
                const { count } = await window.sb
                    .from('poll_votes')
                    .select('*', { count: 'exact', head: true })
                    .eq('poll_id', poll.id)
                    .eq('option_id', opt.id);
                const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
                const optEl = document.createElement('div');
                optEl.className = 'text-white text-sm mt-1';
                optEl.innerText = `${escapeHTML(opt.option_text)}: ${percent}% (${count})`;
                pollDiv.appendChild(optEl);
            }
        } else {
            for (const opt of options) {
                const btn = document.createElement('button');
                btn.className = 'bg-blue-600 text-white px-3 py-1 rounded mr-2 mt-2 text-sm';
                btn.innerText = escapeHTML(opt.option_text);
                btn.onclick = async (e) => {
                    e.stopPropagation();
                    if (!window.currentUser) {
                        alert('You must be logged in to vote.');
                        return;
                    }
                    await votePoll(poll.id, opt.id);
                    // Reload list
                    await loadNewsList();
                };
                pollDiv.appendChild(btn);
            }
        }
        card.appendChild(pollDiv);
    }
}

// Add a reaction
async function addReaction(newsId, emoji) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('news_reactions')
        .insert({ news_id: newsId, user_id: window.currentUser.id, emoji });
    if (error) console.error('Reaction error', error);
}

// Remove a reaction
async function removeReaction(newsId, emoji) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('news_reactions')
        .delete()
        .eq('news_id', newsId)
        .eq('user_id', window.currentUser.id)
        .eq('emoji', emoji);
    if (error) console.error('Remove reaction error', error);
}

// Vote on a poll
async function votePoll(pollId, optionId) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: window.currentUser.id });
    if (error) console.error('Vote error', error);
}

// Show detailed view of a news article
function showNewsDetail(news) {
    const detailModal = document.getElementById('news-detail');
    if (!detailModal) {
        console.error('News detail modal not found');
        return;
    }
    document.getElementById('detail-title').innerText = news.title || 'Untitled';
    document.getElementById('detail-date').innerText = news.created_at ? new Date(news.created_at).toLocaleString() : '';
    document.getElementById('detail-content').innerHTML = news.content || '';
    detailModal.classList.remove('hidden');
}

// Close the detail view
function closeNewsDetail() {
    const detailModal = document.getElementById('news-detail');
    if (detailModal) detailModal.classList.add('hidden');
}

// Escape HTML to prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

// Open the news editor (admin only)
function openNewsEditor() {
    if (!window.currentProfile?.is_admin) return;
    const editor = document.getElementById('news-editor');
    if (editor) editor.classList.remove('hidden');
}

// Close the news editor
function closeNewsEditor() {
    const editor = document.getElementById('news-editor');
    if (editor) editor.classList.add('hidden');
}

// Update poll options based on slider
function updatePollOptions(count) {
    const display = document.getElementById('poll-count-display');
    if (display) display.innerText = count;
    const container = document.getElementById('poll-options');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Option ${i}`;
        input.className = 'poll-option w-full p-2 rounded text-black mt-1';
        container.appendChild(input);
    }
}

// Clear the news editor form
function clearNewsEditor() {
    document.getElementById('news-title').value = '';
    document.getElementById('news-content').value = '';
    document.getElementById('poll-question').value = '';
    
    const slider = document.getElementById('poll-option-count');
    if (slider) {
        slider.value = '2';
        updatePollOptions(2);
    }
}

// Save news as draft (not published)
async function saveNewsAsDraft() {
    await saveNews(false);
}

// Publish news
async function publishNews() {
    await saveNews(true);
}

// Generic save function
async function saveNews(published) {
    if (!window.currentUser) {
        alert('You must be logged in.');
        return;
    }
    const title = document.getElementById('news-title').value.trim();
    const content = document.getElementById('news-content').value.trim();
    if (!title || !content) {
        alert('Title and content required');
        return;
    }

    const { data: newsData, error } = await window.sb
        .from('news')
        .insert({ title, content, published, author_id: window.currentUser.id })
        .select()
        .single();
    if (error) {
        alert('Error saving news: ' + error.message);
        return;
    }

    // Handle poll if present
    const pollQuestion = document.getElementById('poll-question').value.trim();
    if (pollQuestion) {
        const optionInputs = document.querySelectorAll('.poll-option');
        const options = [];
        optionInputs.forEach(inp => {
            const val = inp.value.trim();
            if (val) options.push(val);
        });
        if (options.length >= 2) {
            const { data: poll } = await window.sb
                .from('news_polls')
                .insert({ news_id: newsData.id, question: pollQuestion })
                .select()
                .single();
            if (poll) {
                for (let opt of options) {
                    await window.sb.from('poll_options').insert({ poll_id: poll.id, option_text: opt });
                }
            }
        }
    }

    alert('News saved');
    clearNewsEditor();
    closeNewsEditor();
    if (published) await loadNewsList();
}

// Expose functions globally
window.handleNewsClick = handleNewsClick;
window.openNewsViewer = openNewsViewer;
window.closeNewsViewer = closeNewsViewer;
window.addReaction = addReaction;
window.removeReaction = removeReaction;
window.votePoll = votePoll;
window.showNewsDetail = showNewsDetail;
window.closeNewsDetail = closeNewsDetail;
window.openNewsEditor = openNewsEditor;
window.closeNewsEditor = closeNewsEditor;
window.updatePollOptions = updatePollOptions;
window.clearNewsEditor = clearNewsEditor;
window.saveNewsAsDraft = saveNewsAsDraft;
window.publishNews = publishNews;
