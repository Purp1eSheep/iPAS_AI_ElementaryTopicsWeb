import { DOM, State } from './modules/state.js';
import { Storage } from './modules/storage.js';
import { Utils } from './modules/utils.js';
import { UI } from './modules/ui.js';

// --- Core Initialization ---
async function init() {
    initSettings();
    initEvents();
    checkProgress(); // 優先檢查本地進度
    
    try {
        const [manifestRes, csvRes] = await Promise.all([
            fetch('assets/data/manifest.json'),
            fetch('assets/data/all_questions.csv')
        ]);

        if (!manifestRes.ok || !csvRes.ok) {
            throw new Error('無法取得題庫檔案，請檢查網路連線或路徑。');
        }

        State.quizSets = await manifestRes.json();
        const csvText = await csvRes.text();
        
        const results = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        });

        if (results.errors.length > 0) {
            console.warn('CSV 解析過程中出現部分錯誤:', results.errors);
        }

        State.globalQuestions = results.data.map(q => {
            try {
                return {
                    ...q,
                    options: JSON.parse(q.options),
                    answer: Utils.normalizeIndex(JSON.parse(q.answer))
                };
            } catch (err) {
                console.error(`解析題目 (ID: ${q.id}) 失敗:`, err);
                return null;
            }
        }).filter(q => q !== null);

        if (State.globalQuestions.length === 0) {
            throw new Error('題庫載入後無有效題目，請確認 CSV 格式。');
        }

        UI.renderQuizList();
    } catch (e) {
        console.error('初始化失敗:', e);
        DOM.quizList.innerHTML = `
            <div class="text-center" style="padding:40px 20px;">
                <p style="color:var(--wrong); font-weight:700; font-size:1.2rem; margin-bottom:12px;">🚫 資料載入失敗</p>
                <p style="color:var(--muted); font-size:0.9rem;">${e.message || '未知錯誤，請重新整理頁面。'}</p>
                <button class="btn btn-ghost mt-3" onclick="location.reload()">重新嘗試</button>
            </div>
        `;
    }
}

// --- Event Bindings ---
function initEvents() {
    // 畫面導航
    document.getElementById('browse-btn').onclick = () => { initBrowser(); UI.switchScreen('browser'); };
    document.getElementById('browser-back-btn').onclick = () => { UI.switchScreen('select'); checkProgress(); };
    document.getElementById('back-btn').onclick = () => { 
        clearTimeout(State.redirectTimer); 
        UI.stopResultAudio();
        UI.switchScreen('select'); 
        UI.renderQuizList(); 
        checkProgress();
    };
    
    // 綁定學習分析看板
    document.getElementById('analysis-btn').onclick = () => { UI.renderDashboard(); document.getElementById('analysis-modal').classList.add('active'); };
    document.getElementById('close-analysis').onclick = () => document.getElementById('analysis-modal').classList.remove('active');
    document.getElementById('analysis-close-btn').onclick = () => document.getElementById('analysis-modal').classList.remove('active');
    document.getElementById('dashboard-unit-filter').onchange = () => UI.renderDashboard();

    // 匯出功能實作
    const performExport = (questions, format, prefix) => {
        const fileName = `${prefix}_${new Date().toISOString().slice(0, 10)}.${format}`;
        if (format === 'json') {
            Utils.downloadFile(JSON.stringify(questions, null, 2), fileName, 'application/json');
        } else {
            const header = ['id', 'topic', 'question', 'options', 'answer'];
            const rows = questions.map(q => [
                q.id, q.topic, q.question, 
                q.options.map((opt, i) => `${State.OPTION_LABELS[i]}. ${opt}`).join(' | '),
                Array.isArray(q.answer) ? q.answer.map(i => State.OPTION_LABELS[i]).join(',') : State.OPTION_LABELS[q.answer]
            ]);
            const csvContent = "\uFEFF" + [header, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
            Utils.downloadFile(csvContent, fileName, 'text/csv;charset=utf-8;');
        }
    };

    const prepareExport = () => {
        const wrongIds = Storage.get(Storage.KEYS.WRONG, []);
        const questions = State.globalQuestions.filter(q => wrongIds.includes(q.id));
        
        if (!questions.length) return UI.showToast('目前沒有錯題紀錄');

        let textPreview = "以下是我的 iPAS AI 認證錯題紀錄，請幫我分析我的弱點並提供建議：\n\n";
        
        questions.forEach((q, idx) => {
            const ansIndices = Array.isArray(q.answer) ? q.answer : [q.answer];
            const correctText = ansIndices.map(i => `${State.OPTION_LABELS[i]}. ${q.options[i]}`).join('、');
            textPreview += `題目 ${idx + 1} [${q.topic}]:\n${q.question}\n正確答案: ${correctText}\n\n`;
        });

        document.getElementById('export-preview-text').value = textPreview;
        document.getElementById('export-modal').classList.add('active');

        // 綁定下載按鈕
        document.getElementById('download-json-btn').onclick = () => performExport(questions, 'json', 'all_wrong');
        document.getElementById('download-csv-btn').onclick = () => performExport(questions, 'csv', 'all_wrong');
    };

    document.getElementById('prepare-export-btn').onclick = prepareExport;
    document.getElementById('close-export').onclick = () => document.getElementById('export-modal').classList.remove('active');
    document.getElementById('copy-export-btn').onclick = (e) => {
        const textarea = document.getElementById('export-preview-text');
        textarea.select();
        navigator.clipboard.writeText(textarea.value).then(() => {
            const btn = e.target;
            const orig = btn.textContent;
            btn.textContent = '✅ 已複製';
            setTimeout(() => btn.textContent = orig, 2000);
        });
    };
    
    // Quiz 控制
    DOM.exitBtn = document.getElementById('exit-btn');
    DOM.exitBtn.onclick = () => UI.showConfirm('退出測驗', '確定要退出看結果？', () => UI.showResult(openAIPrompt));
    DOM.prevBtn.onclick = () => { if (State.currentIdx > 0) { State.currentIdx--; UI.renderQuestion(); saveProgress(); } };
    DOM.nextBtn.onclick = handleNextClick;

    // 選項點擊 (Event Delegation)
    DOM.optionsWrap.onclick = (e) => {
        const optionEl = e.target.closest('.option');
        if (!optionEl || optionEl.classList.contains('locked') || State.answers[State.currentIdx] !== null) return;
        
        const idx = parseInt(optionEl.dataset.i);
        const q = State.activeQuestions[State.currentIdx];
        const isMulti = Array.isArray(q.answer);

        if (isMulti) {
            State.currentSelection.has(idx) ? State.currentSelection.delete(idx) : State.currentSelection.add(idx);
            optionEl.classList.toggle('selected');
        } else {
            if (State.currentSelection.has(idx)) return handleNextClick(); // 雙擊確認
            DOM.optionsWrap.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
            State.currentSelection = new Set([idx]);
            optionEl.classList.add('selected');
        }
        UI.updateNextBtnUI();
        saveProgress();
    };

    // 列表點擊 (Event Delegation)
    DOM.quizList.onclick = (e) => {
        const header = e.target.closest('.list-section-header');
        if (header) header.parentElement.classList.toggle('active');

        const card = e.target.closest('.quiz-card');
        if (!card) return;

        if (card.classList.contains('challenge-card')) {
            DOM.quizList.querySelectorAll('.topic-checkbox').forEach(cb => { cb.checked = false; cb.closest('.quiz-card').classList.remove('selected'); });
            DOM.quizList.querySelectorAll('.challenge-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
        } else if (card.classList.contains('topic-card')) {
            const cb = card.querySelector('.topic-checkbox');
            if (e.target !== cb) cb.checked = !cb.checked;
            card.classList.toggle('selected', cb.checked);
            if (cb.checked) DOM.quizList.querySelectorAll('.challenge-card').forEach(c => c.classList.remove('selected'));
        }
        
        const hasTopic = DOM.quizList.querySelectorAll('.topic-checkbox:checked').length > 0;
        const hasChallenge = DOM.quizList.querySelector('.challenge-card.selected');
        DOM.startBtn.disabled = !(hasTopic || hasChallenge);
    };

    DOM.startBtn.onclick = startQuizFlow;

    // AI Modal 控制
    document.getElementById('close-ai').onclick = () => DOM.aiModal.classList.remove('active');
    document.getElementById('close-ai-btn').onclick = () => DOM.aiModal.classList.remove('active');
    document.getElementById('copy-ai-prompt').onclick = (e) => {
        DOM.aiPromptText.select();
        navigator.clipboard.writeText(DOM.aiPromptText.value).then(() => {
            const btn = e.target;
            const orig = btn.textContent;
            btn.textContent = '✅ 已複製';
            setTimeout(() => btn.textContent = orig, 2000);
        });
    };

    // Quiz 頁面的 AI 按鈕事件
    DOM.expWrap.onclick = (e) => {
        const aiBtn = e.target.closest('.ai-btn');
        if (aiBtn) {
            const id = aiBtn.dataset.id;
            const q = State.activeQuestions.find(item => item.id === id);
            const ansRecord = State.answers[State.currentIdx];
            openAIPrompt(q, ansRecord ? ansRecord.selected : null);
        }
    };

    // 全域點擊外部關閉彈窗
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    };

    // Esc 鍵邏輯
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            const topBar = document.getElementById('top-bar');
            
            if (activeModal) {
                activeModal.classList.remove('active');
            } else if (topBar.classList.contains('settings-open')) {
                topBar.classList.remove('settings-open');
            } else {
                const currentScreen = Object.keys(DOM.screens).find(k => DOM.screens[k].classList.contains('active'));
                if (currentScreen === 'browser') {
                    UI.switchScreen('select');
                    checkProgress();
                } else if (currentScreen === 'quiz') {
                    DOM.exitBtn.click();
                } else if (currentScreen === 'result') {
                    document.getElementById('back-btn').click();
                }
            }
        }
    });
}

function openAIPrompt(q, userSelected) {
    if (!q) return;
    const ansIndices = Array.isArray(q.answer) ? q.answer : [q.answer];
    const correctOptions = ansIndices.map(i => `${State.OPTION_LABELS[i]}. ${q.options[i]}`).join('、');
    const optText = q.options.map((o, i) => `${State.OPTION_LABELS[i]}. ${o}`).join('\n');
    
    let userSelectInfo = "";
    if (userSelected && userSelected.length > 0) {
        const userText = userSelected.map(i => `${State.OPTION_LABELS[i]}. ${q.options[i]}`).join('、');
        userSelectInfo = `\n【使用者選的錯誤答案】\n${userText}\n`;
    }
    
    DOM.aiPromptText.value = `你是一位專業的人工智慧 (AI) 講師，擅長釐清學生的觀念誤區。
請針對以下這題 iPAS AI 專業認證的考題進行詳細解析：

【題目】
${q.question}

【選項】
${optText}

【正確答案】
${correctOptions}
${userSelectInfo}
【解析需求】
1. **正確答案解析**：請詳細說明為什麼「${correctOptions}」才是正確的，其背後的 AI 理論、技術細節或邏輯依據為何。
2. **錯誤陷阱分析**：${userSelectInfo ? `重點分析為什麼使用者選的「${userSelectInfo.split('\n')[2]}」是錯誤的。請指出該選項的觀念錯誤之處，以及它與正確答案的本質區別。` : "請分析其他錯誤選項常見的干擾點或觀念陷阱。"}
3. **觀念釐清**：用一句話總結如何區分正確與錯誤選項的關鍵特徵。

請以繁體中文回答，條列式呈現，語氣專業、精簡且直擊重點。`;
    DOM.aiModal.classList.add('active');
}

function startQuizFlow() {
    const existingProg = Storage.get(Storage.KEYS.PROG, null);
    if (existingProg) {
        UI.showConfirm('開始新測驗', '偵測到您有未完成的進度，開始新測驗將會清除目前的進度。確定要繼續嗎？', () => {
            Storage.remove(Storage.KEYS.PROG);
            document.getElementById('resume-banner').classList.add('hidden');
            executeStartQuiz();
        });
    } else {
        executeStartQuiz();
    }
}

function executeStartQuiz() {
    const challenge = DOM.quizList.querySelector('.challenge-card.selected');
    const checked = Array.from(DOM.quizList.querySelectorAll('.topic-checkbox:checked')).map(cb => cb.value);
    const stats = Storage.get(Storage.KEYS.STATS, {});
    
    if (challenge) {
        State.isComprehensive = true;
        if (challenge.dataset.type === 'comp') {
            State.activeQuestions = Utils.weightedShuffle(State.globalQuestions, stats).slice(0, State.quizCount);
        } else {
            const filtered = State.globalQuestions.filter(q => Storage.get(Storage.KEYS.WRONG, []).includes(q.id));
            State.activeQuestions = Utils.shuffle(filtered);
        }
    } else {
        State.isComprehensive = checked.length > 1;
        const filtered = State.globalQuestions.filter(q => checked.includes(q.topic));
        State.activeQuestions = Utils.weightedShuffle(filtered, stats);
    }

    if (State.activeQuestions.length > State.quizCount) {
        State.activeQuestions = State.activeQuestions.slice(0, State.quizCount);
    }

    if (!State.activeQuestions.length) return;
    
    State.answers = new Array(State.activeQuestions.length).fill(null);
    State.currentIdx = 0;
    
    UI.switchScreen('quiz');
    UI.renderQuestion();
    saveProgress();
}

function handleNextClick() {
    // 已回答：進入下一題或結算
    if (State.answers[State.currentIdx] !== null) {
        State.currentIdx++;
        if (State.currentIdx < State.activeQuestions.length) {
            UI.renderQuestion();
            saveProgress();
        } else {
            UI.showResult(openAIPrompt);
            Storage.remove(Storage.KEYS.PROG);
        }
        return;
    }

    // 未回答：有選選項則送出，沒選則跳過
    if (State.currentSelection.size > 0) {
        submitAnswer();
    } else {
        // 跳過邏輯
        State.currentIdx++;
        if (State.currentIdx < State.activeQuestions.length) {
            UI.renderQuestion();
            saveProgress();
        } else {
            UI.showResult(openAIPrompt);
            Storage.remove(Storage.KEYS.PROG);
        }
    }
}

function submitAnswer() {
    const q = State.activeQuestions[State.currentIdx];
    const isMulti = Array.isArray(q.answer);
    const correctArr = isMulti ? q.answer : [q.answer];
    
    const selArr = [...State.currentSelection].sort();
    const isCorrect = selArr.toString() === [...correctArr].sort().toString();

    State.answers[State.currentIdx] = { ...q, selected: selArr, correct: correctArr, isCorrect, origIdx: State.currentIdx };

    DOM.optionsWrap.querySelectorAll('.option').forEach(el => {
        el.classList.add('locked');
        const i = parseInt(el.dataset.i);
        if (correctArr.includes(i)) el.classList.add('correct');
        if (State.currentSelection.has(i) && !correctArr.includes(i)) el.classList.add('wrong');
    });

    updateStats(q.id, isCorrect);
    if (isCorrect) {
        removeWrong(q.id);
        if (State.audioEnabled) UI.playAudio('correct');
        DOM.nextBtn.disabled = true;
        setTimeout(() => {
            handleNextClick();
            DOM.nextBtn.disabled = false;
        }, 900);
    } else {
        saveWrong(q.id);
        if (State.audioEnabled) UI.playAudio('wrong');
        UI.addAIBtn(q);
        UI.updateNextBtnUI();
        saveProgress();
    }
    saveProgress();
}

// --- Stats Helpers ---
function updateStats(id, isCorrect) {
    const stats = Storage.get(Storage.KEYS.STATS, {});
    if (!stats[id]) stats[id] = { t: 0, w: 0 };
    stats[id].t++;
    if (!isCorrect) stats[id].w++;
    Storage.set(Storage.KEYS.STATS, stats);
}
function saveWrong(id) {
    const arr = Storage.get(Storage.KEYS.WRONG, []);
    if (!arr.includes(id)) Storage.set(Storage.KEYS.WRONG, [...arr, id]);
}
function removeWrong(id) {
    Storage.set(Storage.KEYS.WRONG, Storage.get(Storage.KEYS.WRONG, []).filter(i => i !== id));
}
function saveProgress() {
    if (State.activeQuestions && State.activeQuestions.length > 0) {
        Storage.set(Storage.KEYS.PROG, { 
            idx: State.currentIdx, 
            ans: State.answers, 
            qs: State.activeQuestions, 
            comp: State.isComprehensive,
            sel: Array.from(State.currentSelection)
        });
    }
}
function checkProgress() {
    const p = Storage.get(Storage.KEYS.PROG, null);
    const banner = document.getElementById('resume-banner');
    if (!banner) return;

    if (p && p.qs && p.qs.length > 0) {
        banner.classList.remove('hidden');
        document.getElementById('resume-yes-btn').onclick = () => {
            State.activeQuestions = p.qs; 
            State.currentIdx = p.idx; 
            State.answers = p.ans; 
            State.isComprehensive = p.comp;
            State.currentSelection = new Set(p.sel || []);
            banner.classList.add('hidden');
            UI.switchScreen('quiz'); 
            UI.renderQuestion();
            
            // 如果恢復後發現該題已有選擇但未送出，需要還原 UI 選擇狀態
            if (State.answers[State.currentIdx] === null && State.currentSelection.size > 0) {
                DOM.optionsWrap.querySelectorAll('.option').forEach(el => {
                    const idx = parseInt(el.dataset.i);
                    if (State.currentSelection.has(idx)) el.classList.add('selected');
                });
            }
        };
        document.getElementById('resume-no-btn').onclick = () => { 
            UI.showConfirm('放棄進度', '確定要放棄未完成的作答進度嗎？這將無法復原。', () => {
                Storage.remove(Storage.KEYS.PROG); 
                banner.classList.add('hidden'); 
                UI.showToast('進度已清除');
            });
        };
    } else {
        banner.classList.add('hidden');
    }
}

function initSettings() {
    const themeDescriptions = {
        dark: '🌌 預設深色模式，保護眼睛。',
        light: '你有病？亮色模式會閃瞎啊！',
        charcoal: '🖤 炭黑柔和：專業深灰背景，色彩飽和但不刺眼。',
        twilight: '🌆 暮光沈穩：紮實深藍灰，長時間閱讀首選。',
        'slate-purple': '🔮 石板灰紫：優雅低調的暗紫色系塊。',
        nord: '🧊 北歐寒霜：乾淨低飽和的灰藍。'
    };


    const theme = Storage.get(Storage.KEYS.THEME, 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    const descEl = document.getElementById('theme-description');
    if (descEl) descEl.textContent = themeDescriptions[theme] || '';

    document.querySelectorAll('.theme-option').forEach(el => {
        el.classList.toggle('active', el.dataset.theme === theme);
        el.onclick = () => {
            const selectedTheme = el.dataset.theme;
            document.documentElement.setAttribute('data-theme', selectedTheme);
            Storage.set(Storage.KEYS.THEME, selectedTheme);
            if (descEl) descEl.textContent = themeDescriptions[selectedTheme] || '';
            document.querySelectorAll('.theme-option').forEach(o => o.classList.toggle('active', o === el));
        };
    });

    State.audioEnabled = Storage.get(Storage.KEYS.AUDIO, false);
    document.getElementById('audio-status').textContent = State.audioEnabled ? '開啟' : '關閉';
    document.getElementById('audio-toggle-card').onclick = () => {
        State.audioEnabled = !State.audioEnabled;
        Storage.set(Storage.KEYS.AUDIO, State.audioEnabled);
        document.getElementById('audio-status').textContent = State.audioEnabled ? '開啟' : '關閉';
    };

    State.leftHanded = Storage.get(Storage.KEYS.LEFTHAND, false);
    document.documentElement.setAttribute('data-lefthand', State.leftHanded);
    document.getElementById('lefthand-status').textContent = State.leftHanded ? '已開啟' : '已關閉';
    document.getElementById('lefthand-toggle-card').onclick = () => {
        State.leftHanded = !State.leftHanded;
        Storage.set(Storage.KEYS.LEFTHAND, State.leftHanded);
        document.documentElement.setAttribute('data-lefthand', State.leftHanded);
        document.getElementById('lefthand-status').textContent = State.leftHanded ? '已開啟' : '已關閉';
    };

    // 測題題數設定
    State.quizCount = Storage.get(Storage.KEYS.QUIZ_COUNT, 40);
    document.querySelectorAll('#count-grid .theme-option').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.count) === State.quizCount);
        el.onclick = () => {
            State.quizCount = parseInt(el.dataset.count);
            Storage.set(Storage.KEYS.QUIZ_COUNT, State.quizCount);
            document.querySelectorAll('#count-grid .theme-option').forEach(o => o.classList.toggle('active', o === el));
            UI.renderQuizList(); // 重新渲染列表以更新 "隨機 X 題" 文字
        };
    });

    document.getElementById('settings-btn').onclick = () => document.getElementById('top-bar').classList.toggle('settings-open');
    document.getElementById('settings-back-btn').onclick = () => document.getElementById('top-bar').classList.remove('settings-open');
    document.getElementById('top-bar-toggle').onclick = (e) => {
        document.getElementById('top-bar').classList.toggle('collapsed');
        e.target.textContent = document.getElementById('top-bar').classList.contains('collapsed') ? '▼' : '▲';
    };

    const bindClear = (id, key, msg) => {
        const el = document.getElementById(id);
        if (el) el.onclick = () => { UI.showConfirm('清除資料', msg, () => { key ? Storage.remove(key) : Storage.clearAll(); location.reload(); }); };
    };
    bindClear('clear-stats-btn', Storage.KEYS.STATS, '清除統計？');
    bindClear('clear-history-btn', Storage.KEYS.WRONG, '清除錯題？');
    bindClear('clear-all-btn', null, '清除所有設定與資料？');
    bindClear('clear-stats-btn-dash', Storage.KEYS.STATS, '清除統計？');
}

function initBrowser() {
    UI.renderBrowserList(openAIPrompt);
    if (!State.browserEventsBound) {
        ['search-input', 'topic-filter', 'only-bookmarked', 'only-risky'].forEach(id => {
            document.getElementById(id).addEventListener('input', () => UI.renderBrowserList(openAIPrompt));
        });
        document.getElementById('browser-list').onclick = (e) => {
            const btn = e.target.closest('.bookmark-btn');
            const aiBtn = e.target.closest('.ai-btn');
            if (btn) {
                const id = btn.dataset.id;
                let bookmarks = Storage.get(Storage.KEYS.BOOKMARKS, []);
                bookmarks = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
                Storage.set(Storage.KEYS.BOOKMARKS, bookmarks);
                UI.renderBrowserList(openAIPrompt);
            } else if (aiBtn) {
                const id = aiBtn.dataset.id;
                const q = State.globalQuestions.find(item => item.id === id);
                openAIPrompt(q);
            }
        };
        State.browserEventsBound = true;
    }
}

init();
