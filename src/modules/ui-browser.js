import { State } from './state.js';
import { Storage } from './storage.js';
import { Utils } from './utils.js';

export const UIBrowser = {
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

        listEl.innerHTML = filtered.map(q => {
            const s = stats[q.id] || { t: 0, w: 0 };
            const isBookmarked = bookmarks.includes(q.id);
            const correctIndices = Array.isArray(q.answer) ? q.answer : [q.answer];
            const correctText = correctIndices.map(idx => `${State.OPTION_LABELS[idx]}. ${Utils.formatText(q.options[idx])}`).join('、');

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
    }
};
