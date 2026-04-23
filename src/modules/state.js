// --- 1. DOM Cache ---
export const DOM = {
    screens: {
        select: document.getElementById('select-screen'),
        browser: document.getElementById('browser-screen'),
        quiz: document.getElementById('quiz-screen'),
        result: document.getElementById('result-screen')
    },
    topBar: document.getElementById('top-bar'),
    settingsDrop: document.getElementById('settings-dropdown'),
    quizList: document.getElementById('quiz-list'),
    startBtn: document.getElementById('start-btn'),
    // Quiz Elements
    progress: document.getElementById('progress-bar'),
    counter: document.getElementById('q-counter'),
    qText: document.getElementById('question-text'),
    optionsWrap: document.getElementById('options'),
    expWrap: document.getElementById('explanation-container'),
    nextBtn: document.getElementById('next-btn'),
    prevBtn: document.getElementById('prev-btn'),
    // Modals
    aiModal: document.getElementById('ai-modal'),
    aiPromptText: document.getElementById('ai-prompt-text')
};

// --- 2. Application State ---
export const State = {
    quizSets: [],
    globalQuestions: [],
    activeQuestions: [],
    currentIdx: 0,
    answers: [],
    currentSelection: new Set(),
    isComprehensive: false,
    audioEnabled: false,
    audio: {
        correct: new Audio('assets/sfx/right.mp3'),
        wrong: new Audio('assets/sfx/wrong.mp3'),
        cheer: new Audio('assets/sfx/pass.mp3'),
        sad: new Audio('assets/sfx/notPass.mp3')
    },
    charts: { progress: null, risk: null },
    redirectTimer: null
};
