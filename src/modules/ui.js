import { DOM, State } from './state.js';
import { Storage } from './storage.js';
import { Utils } from './utils.js';

export const UI = {
    switchScreen: (name) => {
        Object.values(DOM.screens).forEach(s => s.classList.remove('active'));
        DOM.screens[name].classList.add('active');
        document.getElementById('top-bar').classList.remove('settings-open');
    },

    renderQuizList: () => {
        const wrongIds = Storage.get(Storage.KEYS.WRONG, []);
        let html = `
            <div class="mb-3">
                <div class="challenge-title">挑戰</div>
                <div class="quiz-card challenge-card" data-type="comp">
                    <div class="name">🔥 綜合測驗</div><div class="meta">所有章節隨機</div>
                </div>
                ${wrongIds.length ? `<div class="quiz-card challenge-card mt-3" data-type="wrong" style="border-color:var(--wrong); background:var(--wrong-soft);"><div class="name">❌ 錯題強化</div><div class="meta">${wrongIds.length} 題</div></div>` : ''}
            </div>
        `;
        State.quizSets.forEach(set => {
            html += `<div class="list-section"><div class="list-section-header">${set.subject}</div><div class="list-section-content">`;
            html += set.topics.map(t => `<div class="quiz-card topic-card"><input type="checkbox" class="topic-checkbox hidden" value="${t.full_topic}"><div class="name">${t.title}</div><div class="meta">共 ${t.count} 題</div></div>`).join('');
            html += `</div></div>`;
        });
        DOM.quizList.innerHTML = html;
    },

    renderQuestion: (handleSubmit, handleNext) => {
        const q = State.activeQuestions[State.currentIdx];
        State.currentSelection = new Set();
        
        DOM.progress.style.width = `${(State.currentIdx / State.activeQuestions.length) * 100}%`;
        DOM.counter.textContent = State.isComprehensive ? `第 ${State.currentIdx + 1} 題` : `${State.currentIdx + 1} / ${State.activeQuestions.length}`;
        
        const meta = q.id;
        document.getElementById('type-badge').textContent = meta;
        document.getElementById('type-badge').className = `badge badge-primary ${!meta ? 'hidden' : ''}`;
        document.getElementById('topic-badge').textContent = q.topic;
        DOM.qText.innerHTML = Utils.formatText(q.question);
        DOM.expWrap.innerHTML = '';
        
        const isAns = State.answers[State.currentIdx] !== null;
        const ansData = isAns ? State.answers[State.currentIdx] : null;
        const keys = ['A','B','C','D','E','F'];

        DOM.optionsWrap.innerHTML = q.options.map((opt, i) => {
            let cls = 'option';
            if (isAns) {
                cls += ' locked';
                if (ansData.correct.includes(i)) cls += ' correct';
                if (ansData.selected.includes(i) && !ansData.correct.includes(i)) cls += ' wrong';
                if (ansData.selected.includes(i) && ansData.correct.includes(i)) cls += ' selected';
            }
            return `<div class="${cls}" data-i="${i}"><span class="option-key">${keys[i]}</span><span class="option-text">${Utils.formatText(opt)}</span></div>`;
        }).join('');

        if (isAns && !ansData.isCorrect) UI.addAIBtn(q);
        
        DOM.prevBtn.disabled = State.currentIdx === 0;
        UI.updateNextBtnUI();
    },

    updateNextBtnUI: () => {
        DOM.nextBtn.disabled = false;
        DOM.exitBtn.disabled = false;
        const isLast = State.currentIdx === State.activeQuestions.length - 1;
        if (State.answers[State.currentIdx] !== null || State.currentSelection.size > 0) {
            DOM.nextBtn.textContent = isLast ? '完成作答' : '下一題';
        } else {
            DOM.nextBtn.textContent = '跳過';
        }
    },

    addAIBtn: (q) => {
        DOM.expWrap.innerHTML = `<button class="btn btn-ghost w-100 mt-3 ai-btn" style="border-color:var(--wrong)" data-id="${q.id}">🤖 AI 詳解</button>`;
    },

    playAudio: (key) => {
        if (State.audioEnabled && State.audio[key]) {
            State.audio[key].currentTime = 0;
            State.audio[key].play().catch(() => {});
        }
    },

    stopResultAudio: () => {
        if (State.audio.cheer) { State.audio.cheer.pause(); State.audio.cheer.currentTime = 0; }
        if (State.audio.sad) { State.audio.sad.pause(); State.audio.sad.currentTime = 0; }
    },

    showToast: (msg) => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    showConfirm: (title, msg, onYes) => {
        const modal = document.getElementById('confirm-modal');
        document.getElementById('confirm-title').textContent = title;
        document.getElementById('confirm-msg').textContent = msg;
        modal.classList.add('active');

        const yesBtn = document.getElementById('confirm-yes-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        const close = () => {
            modal.classList.remove('active');
            yesBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        yesBtn.onclick = () => { close(); onYes(); };
        cancelBtn.onclick = close;
    },

    showResult: (openAIPrompt) => {
        UI.switchScreen('result');
        const validAns = State.answers.filter(a => a !== null);
        const correctCount = validAns.filter(a => a.isCorrect).length;
        const rate = validAns.length ? Math.round((correctCount / validAns.length) * 100) : 0;
        
        document.getElementById('score-number').textContent = `${correctCount} / ${validAns.length}`;
        const rateEl = document.getElementById('score-percent');
        rateEl.textContent = `答對率：${rate}%`;
        rateEl.style.color = rate >= 80 ? 'var(--correct)' : 'var(--accent)';

        if (State.audioEnabled) {
            rate >= 80 ? UI.playAudio('cheer') : UI.playAudio('sad');
        }

        const resultList = document.getElementById('result-list');
        const keys = ['A','B','C','D','E','F'];
        
        const renderItem = a => `
            <div class="result-item ${a.isCorrect ? 'ok' : 'fail'}">
                <div class="flex-between" style="color:var(--muted); font-size:.8rem; margin-bottom:4px;">
                    <span>第 ${a.origIdx + 1} 題</span><span style="color:var(--accent)">${a.topic}</span>
                </div>
                <div>${Utils.formatText(a.question)}</div>
                <div class="flex-between mt-3 font-weight-bold" style="color: ${a.isCorrect ? 'var(--correct)' : 'var(--wrong)'}">
                    ${a.isCorrect ? '✓ 答對' : `✗ 答錯 ─ 正解：${a.correct.map(c=>keys[c]).join('、')}`}
                    ${!a.isCorrect ? `<button class="btn btn-ghost ai-btn" style="padding:4px 8px; font-size:.7rem" data-id="${a.id}">AI</button>` : ''}
                </div>
            </div>`;
        
        resultList.innerHTML = validAns.filter(a=>!a.isCorrect).map(renderItem).join('') + 
            (correctCount > 0 ? `<div class="list-section mt-3"><div class="list-section-header" onclick="this.parentElement.classList.toggle('active')">顯示答對 (${correctCount})</div><div class="list-section-content">${validAns.filter(a=>a.isCorrect).map(renderItem).join('')}</div></div>` : '');

        resultList.onclick = (e) => {
            const aiBtn = e.target.closest('.ai-btn');
            if (aiBtn) {
                const id = aiBtn.dataset.id;
                const ansRecord = State.answers.find(a => a && a.id === id);
                if (ansRecord) {
                    openAIPrompt(ansRecord, ansRecord.selected);
                } else {
                    const q = State.globalQuestions.find(item => item.id === id);
                    openAIPrompt(q);
                }
            }
        };
    },

    renderBrowserList: (openAIPrompt) => {
        const stats = Storage.get(Storage.KEYS.STATS, {});
        const bookmarks = Storage.get(Storage.KEYS.BOOKMARKS, []);
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const targetTopic = document.getElementById('topic-filter').value;
        const onlyBookmarked = document.getElementById('only-bookmarked').checked;
        const onlyRisky = document.getElementById('only-risky').checked;
        const listEl = document.getElementById('browser-list');

        const filtered = State.globalQuestions.filter(q => {
            const s = stats[q.id] || { t: 0, w: 0 };
            const rate = s.t > 0 ? (s.w / s.t) : 0;
            if (searchTerm && !q.question.toLowerCase().includes(searchTerm)) return false;
            if (targetTopic && q.topic !== targetTopic) return false;
            if (onlyBookmarked && !bookmarks.includes(q.id)) return false;
            if (onlyRisky && rate <= 0.5) return false;
            return true;
        });

        if (filtered.length === 0) {
            listEl.innerHTML = '<p class="text-center" style="color:var(--muted)">找不到符合條件的題目。</p>';
            return;
        }

        const keys = ['A','B','C','D','E','F'];
        listEl.innerHTML = filtered.map(q => {
            const s = stats[q.id] || { t: 0, w: 0 };
            const isBookmarked = bookmarks.includes(q.id);
            const correctIndices = Array.isArray(q.answer) ? q.answer : [q.answer];
            const correctText = correctIndices.map(idx => `${keys[idx]}. ${Utils.formatText(q.options[idx])}`).join('、');

            return `
                <div class="question-card">
                    <div class="flex-between" style="align-items:flex-start; margin-bottom:8px;">
                        <div style="font-family:monospace; font-weight:700; color:var(--accent); font-size:0.8rem;">${q.id}</div>
                        <div class="flex-gap" style="flex-wrap:wrap;">
                            ${isBookmarked ? '<span class="badge" style="background:var(--accent-soft); color:var(--accent); margin-bottom:0;">⭐ 已收藏</span>' : ''}
                            ${(s.t > 0 && s.w/s.t > 0.5) ? '<span class="badge" style="background:var(--wrong-soft); color:var(--wrong); margin-bottom:0;">⚠️ 易錯題</span>' : ''}
                        </div>
                    </div>
                    <div style="font-size:0.95rem; font-weight:600; margin-bottom:12px; line-height:1.5; white-space:pre-wrap;">${Utils.formatText(q.question)}</div>
                    <div style="font-size:0.85rem; color:var(--correct); background:var(--correct-soft); padding:8px 12px; border-radius:6px; margin-bottom:12px; border-left:3px solid var(--correct);">正確答案：${correctText}</div>
                    <div class="flex-between" style="align-items:flex-end;">
                        <div class="flex-gap" style="font-size:0.75rem; color:var(--muted);"><span>🏷️ ${q.topic}</span></div>
                        <div class="flex-gap">
                            <button class="btn-link ai-btn" data-id="${q.id}" style="border:1.5px solid var(--accent); color:var(--accent); padding:4px 12px; border-radius:6px; font-size:0.75rem;">🤖 AI 詳解</button>
                            <button class="btn-link bookmark-btn" data-id="${q.id}" style="border:1.5px solid ${isBookmarked ? 'var(--accent)' : 'var(--border)'}; color:${isBookmarked ? 'var(--accent)' : 'var(--muted)'}; background:${isBookmarked ? 'var(--accent-soft)' : 'none'}; padding:4px 12px; border-radius:6px; font-size:0.75rem;">
                                ${isBookmarked ? '★ 取消' : '☆ 收藏'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderDashboard: () => {
        const stats = Storage.get(Storage.KEYS.STATS, {});
        const unitFilter = document.getElementById('dashboard-unit-filter');
        const dashboardContent = document.getElementById('dashboard-content');
        const noDataMsg = document.getElementById('no-data-msg');
        
        if (unitFilter.options.length <= 1) {
            const topics = [...new Set(State.globalQuestions.map(q => q.topic))].sort();
            unitFilter.innerHTML = '<option value="">所有單元</option>' + topics.map(t => `<option value="${t}">${t}</option>`).join('');
        }
        
        const targetUnit = unitFilter.value;
        const attemptedIds = Object.keys(stats).filter(id => {
            if (!targetUnit) return true;
            const q = State.globalQuestions.find(i => i.id === id);
            return q && q.topic === targetUnit;
        });

        if (Object.keys(stats).length === 0) {
            dashboardContent.classList.add('hidden');
            noDataMsg.classList.remove('hidden');
            return;
        }
        dashboardContent.classList.remove('hidden');
        noDataMsg.classList.add('hidden');

        let filteredAttempts = 0, filteredWrongs = 0;
        attemptedIds.forEach(id => { filteredAttempts += stats[id].t; filteredWrongs += stats[id].w; });
        
        const totalInUnit = targetUnit 
            ? State.globalQuestions.filter(q => q.topic === targetUnit).length
            : State.globalQuestions.length;

        document.getElementById('overall-accuracy').textContent = `${filteredAttempts > 0 ? Math.round(((filteredAttempts - filteredWrongs) / filteredAttempts) * 100) : 0}%`;
        document.getElementById('overall-progress').textContent = `${Math.round((attemptedIds.length / totalInUnit) * 100)}%`;

        if (State.charts.progress) State.charts.progress.destroy();
        State.charts.progress = new Chart(document.getElementById('progressChart'), {
            type: 'doughnut',
            data: { labels: ['已挑戰', '未挑戰'], datasets: [{ data: [attemptedIds.length, totalInUnit - attemptedIds.length], backgroundColor: ['#7c6dfa', '#23263a'], borderWidth: 0 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#7a7e9a' } } } }
        });

        const unitStats = {};
        const topics = targetUnit ? [targetUnit] : [...new Set(State.globalQuestions.map(q => q.topic))].sort();
        
        topics.forEach(t => {
            const qIds = State.globalQuestions.filter(q => q.topic === t).map(q => q.id);
            const attemptedInUnit = qIds.filter(id => stats[id]);
            let uT = 0, uW = 0;
            attemptedInUnit.forEach(id => { uT += stats[id].t; uW += stats[id].w; });
            unitStats[t] = { acc: uT > 0 ? ((uT - uW) / uT * 100) : 0, prog: (attemptedInUnit.length / qIds.length * 100) };
        });

        if (State.charts.unit) State.charts.unit.destroy();
        State.charts.unit = new Chart(document.getElementById('unitChart'), {
            type: 'radar',
            data: {
                labels: topics.map(t => t.length > 8 ? t.substring(0, 8) + '...' : t),
                datasets: [
                    { label: '正確率 (%)', data: topics.map(t => unitStats[t].acc), borderColor: '#4caf87', backgroundColor: 'rgba(76,175,135,0.2)', pointBackgroundColor: '#4caf87' },
                    { label: '完成度 (%)', data: topics.map(t => unitStats[t].prog), borderColor: '#7c6dfa', backgroundColor: 'rgba(124,109,250,0.2)', pointBackgroundColor: '#7c6dfa' }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: '#2d3148' }, angleLines: { color: '#2d3148' }, pointLabels: { color: '#7a7e9a', font: { size: 10 } } } },
                plugins: { legend: { position: 'bottom', labels: { color: '#7a7e9a', boxWidth: 12 } } }
            }
        });

        const sortedData = attemptedIds
            .map(id => {
                const s = stats[id];
                return { id, rate: (s.w / s.t * 100), q: State.globalQuestions.find(i => i.id === id) };
            })
            .sort((a, b) => b.rate - a.rate).slice(0, 10);

        if (State.charts.risk) State.charts.risk.destroy();
        State.charts.risk = new Chart(document.getElementById('riskChart'), {
            type: 'bar',
            data: { labels: sortedData.map(d => d.id), datasets: [{ label: '錯誤率 (%)', data: sortedData.map(d => d.rate), backgroundColor: sortedData.map(d => d.rate > 70 ? '#e05c6e' : '#f59e0b'), borderRadius: 5 }] },
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { color: '#7a7e9a' }, grid: { color: '#2d3148' } }, y: { ticks: { color: '#7a7e9a' }, grid: { display: false } } } }
        });

        document.getElementById('full-analysis-list').innerHTML = attemptedIds
            .map(id => ({ id, rate: (stats[id].w / stats[id].t * 100), ...stats[id], text: State.globalQuestions.find(i => i.id === id)?.question || id }))
            .sort((a, b) => b.rate - a.rate)
            .map(item => `
                <div class="flex-between" style="padding:12px; border-bottom:1px solid var(--border);">
                    <div style="flex:1;">
                        <div style="font-weight:700; color:var(--accent); font-size:0.8rem;">${item.id} <span style="font-weight:normal; color:var(--muted); font-size:0.7rem;">(錯 ${item.w} / 共 ${item.t})</span></div>
                        <div style="font-size:0.9rem; margin-top:4px; display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${item.text}</div>
                    </div>
                    <div style="text-align:right; margin-left:16px; min-width:80px;">
                        <div style="color:${item.rate > 50 ? 'var(--wrong)' : 'var(--correct)'}; font-weight:700; font-size:1rem;">${Math.round(item.rate)}%</div>
                    </div>
                </div>
            `).join('');
    }
};
