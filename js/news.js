// ========== NEWS SYSTEM (with reactions & polls) ==========

async function handleNewsClick() {
    await openNewsViewer();
}

async function openNewsViewer() {
    const viewer = document.getElementById('news-viewer');
    viewer.classList.remove('hidden');
    await loadNewsList();
    const createBtn = document.getElementById('news-create-btn');
    if (window.currentProfile?.is_admin) {
        createBtn.classList.remove('hidden');
    } else {
        createBtn.classList.add('hidden');
    }
}

function closeNewsViewer() {
    document.getElementById('news-viewer').classList.add('hidden');
}

async function loadNewsList() {
    if (!window.sb) return;
    const { data, error } = await window.sb
        .from('news')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error loading news:', error);
        return;
    }
    const container = document.getElementById('news-list');
    container.innerHTML = '';
    for (const news of data) {
        const card = document.createElement('div');
        card.className = 'news-card bg-black/40 p-6 rounded-xl border-2 border-white/30 cursor-pointer hover:bg-black/60 transition-colors';
        const plainText = news.content.replace(/<[^>]*>/g, '');
        const preview = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
        card.innerHTML = `
            <h3 class="text-3xl text-yellow-400 mb-2">${escapeHTML(news.title)}</h3>
            <div class="text-gray-300 text-sm">${new Date(news.created_at).toLocaleString()}</div>
            <div class="text-white mt-2 line-clamp-2">${escapeHTML(preview)}</div>
        `;
        card.onclick = () => showNewsDetail(news);
        
        const { data: reactions } = await window.sb
            .from('news_reactions')
            .select('emoji, user_id')
            .eq('news_id', news.id);
        
        if (reactions && reactions.length > 0) {
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
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const userReacted = reactions.some(r => r.user_id === window.currentUser?.id && r.emoji === em);
                    if (userReacted) {
                        removeReaction(news.id, em);
                    } else {
                        addReaction(news.id, em);
                    }
                };
                reactionDiv.appendChild(btn);
            }
            card.appendChild(reactionDiv);
        }
        
        const { data: polls } = await window.sb
            .from('news_polls')
            .select('*')
            .eq('news_id', news.id);
        if (polls && polls.length > 0) {
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
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            votePoll(poll.id, opt.id);
                        };
                        pollDiv.appendChild(btn);
                    }
                }
                card.appendChild(pollDiv);
            }
        }
        
        container.appendChild(card);
    }
}

async function addReaction(newsId, emoji) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('news_reactions')
        .insert({ news_id: newsId, user_id: window.currentUser.id, emoji });
    if (error) console.error('Reaction error', error);
    else loadNewsList();
}

async function removeReaction(newsId, emoji) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('news_reactions')
        .delete()
        .eq('news_id', newsId)
        .eq('user_id', window.currentUser.id)
        .eq('emoji', emoji);
    if (error) console.error('Remove reaction error', error);
    else loadNewsList();
}

async function votePoll(pollId, optionId) {
    if (!window.currentUser) return;
    const { error } = await window.sb
        .from('poll_votes')
        .insert({ poll_id: pollId, option_id: optionId, user_id: window.currentUser.id });
    if (error) console.error('Vote error', error);
    else loadNewsList();
}

function showNewsDetail(news) {
    document.getElementById('detail-title').innerText = news.title;
    document.getElementById('detail-date').innerText = new Date(news.created_at).toLocaleString();
    document.getElementById('detail-content').innerHTML = news.content;
    document.getElementById('news-detail').classList.remove('hidden');
}

function closeNewsDetail() {
    document.getElementById('news-detail').classList.add('hidden');
}

function escapeHTML(str) {
    return str.replace(/[&<>"]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        if (m === '"') return '&quot;';
        return m;
    });
}

function openNewsEditor() {
    if (!window.currentProfile?.is_admin) return;
    document.getElementById('news-editor').classList.remove('hidden');
}

function closeNewsEditor() {
    document.getElementById('news-editor').classList.add('hidden');
}

function addPollOption() {
    const container = document.getElementById('poll-options');
    const newInput = document.createElement('input');
    newInput.type = 'text';
    newInput.placeholder = `Option ${container.children.length + 1}`;
    newInput.className = 'poll-option w-full p-2 rounded text-black mt-1';
    container.appendChild(newInput);
}

function removePollOption() {
    const container = document.getElementById('poll-options');
    if (container.children.length > 2) {
        container.removeChild(container.lastChild);
    }
}

function updatePollOptions(count) {
    document.getElementById('poll-count-display').innerText = count;
    const container = document.getElementById('poll-options');
    container.innerHTML = '';
    for (let i = 1; i <= count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Option ${i}`;
        input.className = 'poll-option w-full p-2 rounded text-black mt-1';
        container.appendChild(input);
    }
}

function clearNewsEditor() {
    document.getElementById('news-title').value = '';
    document.getElementById('news-content').value = '';
    document.getElementById('poll-question').value = '';
    
    const slider = document.getElementById('poll-option-count');
    if (slider) {
        slider.value = '2';
    }
    document.getElementById('poll-count-display').innerText = '2';
    
    const container = document.getElementById('poll-options');
    container.innerHTML = '';
    for (let i = 1; i <= 2; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = `Option ${i}`;
        input.className = 'poll-option w-full p-2 rounded text-black mt-1';
        container.appendChild(input);
    }
}

async function saveNewsAsDraft() {
    await saveNews(false);
}

async function publishNews() {
    await saveNews(true);
}

async function saveNews(published) {
    if (!window.currentUser) return;
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
    if (published) loadNewsList();
}

// Expose functions
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
window.addPollOption = addPollOption;
window.removePollOption = removePollOption;
window.updatePollOptions = updatePollOptions;
window.clearNewsEditor = clearNewsEditor;
window.saveNewsAsDraft = saveNewsAsDraft;
window.publishNews = publishNews;
