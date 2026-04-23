export const Storage = {
    KEYS: { WRONG: 'quiz_wrong', STATS: 'quiz_stats', THEME: 'quiz_theme', AUDIO: 'quiz_audio', BOOKMARKS: 'quiz_bookmarks', PROG: 'quiz_prog', LEFTHAND: 'quiz_lefthand' },
    get: (key, def) => {
        try {
            const val = localStorage.getItem(key);
            if (val === null) return def;
            return JSON.parse(val);
        } catch (e) {
            console.warn(`Storage get error for key "${key}":`, e);
            // 嘗試回傳原始值 (兼容舊版純字串資料)
            const raw = localStorage.getItem(key);
            return raw !== null ? raw : def;
        }
    },
    set: (key, val) => {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            return true;
        } catch (e) {
            console.error(`Storage set error for key "${key}":`, e);
            if (e.name === 'QuotaExceededError') {
                alert('本地儲存空間已滿，部分進度可能無法儲存。');
            }
            return false;
        }
    },
    remove: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.error(`Storage remove error for key "${key}":`, e);
        }
    },
    clearAll: () => {
        try {
            localStorage.clear();
        } catch (e) {
            console.error("Storage clear error:", e);
        }
    }
};
