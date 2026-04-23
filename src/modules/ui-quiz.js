import { DOM, State } from './state.js';
import { Storage } from './storage.js';
import { Utils } from './utils.js';

export const UIQuiz = {
    renderQuizList: () => {
        const wrongIds = Storage.get(Storage.KEYS.WRONG, []);
        let html = `
            <div class="mb-3">
                <div class="challenge-title">挑戰</div>
                <div class="grid-2">
                    <div class="quiz-card challenge-card" data-type="comp">
                        <div class="name">🔥 綜合測驗</div><div class="meta">隨機 40 題</div>
                    </div>
                    ${wrongIds.length ? `
                    <div class="quiz-card challenge-card" data-type="wrong" style="border-color:var(--wrong); background:var(--wrong-soft);">
                        <div class="name">❌ 錯題強化</div><div class="meta">${wrongIds.length} 題</div>
                    </div>` : `
                    <div class="quiz-card" style="opacity:0.5; cursor:default; display:flex; align-items:center; justify-content:center; border-style:dashed;">
                        <div class="meta">暫無錯題</div>
                    </div>`}
                </div>
            </div>
        `;
        State.quizSets.forEach(set => {
            html += `<div class="list-section"><div class="list-section-header">${set.subject}</div><div class="list-section-content grid-2">`;
            html += set.topics.map(t => `<div class="quiz-card topic-card"><input type="checkbox" class="topic-checkbox hidden" value="${t.full_topic}"><div class="name">${t.title}</div><div class="meta">${t.count} 題</div></div>`).join('');
            html += `</div></div>`;
        });
        DOM.quizList.innerHTML = html;
    },

    renderQuestion: () => {
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

        DOM.optionsWrap.innerHTML = q.options.map((opt, i) => {
            let cls = 'option';
            if (isAns) {
                cls += ' locked';
                if (ansData.correct.includes(i)) cls += ' correct';
                if (ansData.selected.includes(i) && !ansData.correct.includes(i)) cls += ' wrong';
                if (ansData.selected.includes(i) && ansData.correct.includes(i)) cls += ' selected';
            }
            return `<div class="${cls}" data-i="${i}"><span class="option-key">${State.OPTION_LABELS[i]}</span><span class="option-text">${Utils.formatText(opt)}</span></div>`;
        }).join('');

        if (isAns && !ansData.isCorrect) UIQuiz.addAIBtn(q);
        
        DOM.prevBtn.disabled = State.currentIdx === 0;
        UIQuiz.updateNextBtnUI();
    },

    updateNextBtnUI: () => {
        DOM.nextBtn.disabled = false;
        DOM.exitBtn.disabled = false;
        const isLast = State.currentIdx === State.activeQuestions.length - 1;
        if (State.answers[State.currentIdx] !== null) {
            DOM.nextBtn.textContent = isLast ? '完成作答' : '下一題';
        } else {
            DOM.nextBtn.textContent = '確定';
        }
    },

    addAIBtn: (q) => {
        DOM.expWrap.innerHTML = `<button class="btn btn-ghost w-100 mt-3 ai-btn" style="border-color:var(--wrong)" data-id="${q.id}">🤖 AI 詳解</button>`;
    },

    showResult: (openAIPrompt, switchScreen, playAudio) => {
        switchScreen('result');
        const validAns = State.answers.filter(a => a !== null);
        const correctCount = validAns.filter(a => a.isCorrect).length;
        const rate = validAns.length ? Math.round((correctCount / validAns.length) * 100) : 0;
        
        const scoreNumEl = document.getElementById('score-number');
        scoreNumEl.textContent = `${correctCount} / ${validAns.length}`;
        
        const rateEl = document.getElementById('score-percent');
        const eggEl = document.getElementById('easter-egg-67');
        rateEl.textContent = `答對率：${rate}%`;
        
        if (rate === 67) {
            rateEl.classList.add('rainbow-text');
            const lyrics = ['<span class="rainbow-text">欸six seven</span>🗣️🗣️🔥🔥🔥', '<span class="rainbow-text">欸six seven</span>🗣️🗣️🔥🔥🔥', '<span class="rainbow-text">six！six！seven</span>🥰🥰', '<span class="rainbow-text">欸six seven</span>🗣️🗣️🔥🔥🔥', '<span class="rainbow-text">阿公67</span>↗️', '<span class="rainbow-text">阿公阿公67</span>↘️↗️', '<span class="rainbow-text">阿公67</span>↗️', '<span class="rainbow-text">阿公67</span>↗️', '<span class="rainbow-text">阿公阿公67</span>↘️↗️', '<span class="rainbow-text">阿公！！</span>🥰🥰🥰', '<span class="rainbow-text">67！</span>', '<span class="rainbow-text">阿公阿公67</span>↘️↗️', '<span class="rainbow-text">six seven</span>🗣️🗣️🔥🔥🔥'];
            eggEl.innerHTML = lyrics.join('<br>');
            eggEl.classList.remove('hidden');
        } else {
            rateEl.classList.remove('rainbow-text');
            eggEl.innerHTML = '';
            eggEl.classList.add('hidden');
        }

        rateEl.style.color = rate >= 80 ? 'var(--correct)' : (rate === 67 ? 'transparent' : 'var(--accent)');

        if (State.audioEnabled) {
            rate >= 80 ? playAudio('cheer') : playAudio('sad');
        }

        const resultList = document.getElementById('result-list');
        
        const renderItem = a => `
            <div class="result-item ${a.isCorrect ? 'ok' : 'fail'}">
                <div class="flex-between" style="color:var(--muted); font-size:.8rem; margin-bottom:4px;">
                    <span>第 ${a.origIdx + 1} 題</span><span style="color:var(--accent)">${a.topic}</span>
                </div>
                <div>${Utils.formatText(a.question)}</div>
                <div class="flex-between mt-3 font-weight-bold" style="color: ${a.isCorrect ? 'var(--correct)' : 'var(--wrong)'}">
                    ${a.isCorrect ? '✓ 答對' : `✗ 答錯 ─ 正解：${a.correct.map(c=>State.OPTION_LABELS[c]).join('、')}`}
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
    }
};
