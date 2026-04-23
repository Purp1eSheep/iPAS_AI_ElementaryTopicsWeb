import { DOM, State } from './state.js';
import { UIQuiz } from './ui-quiz.js';
import { UIBrowser } from './ui-browser.js';
import { UIDashboard } from './ui-dashboard.js';

export const UI = {
    // Core Utilities
    switchScreen: (name) => {
        Object.values(DOM.screens).forEach(s => s.classList.remove('active'));
        DOM.screens[name].classList.add('active');
        document.getElementById('top-bar').classList.remove('settings-open');
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
        if (!container) return;
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

    // Quiz Module Delegate
    renderQuizList: UIQuiz.renderQuizList,
    renderQuestion: UIQuiz.renderQuestion,
    updateNextBtnUI: UIQuiz.updateNextBtnUI,
    addAIBtn: UIQuiz.addAIBtn,
    showResult: (openAIPrompt) => UIQuiz.showResult(openAIPrompt, UI.switchScreen, UI.playAudio),

    // Browser Module Delegate
    renderBrowserList: UIBrowser.renderBrowserList,

    // Dashboard Module Delegate
    renderDashboard: UIDashboard.renderDashboard
};
