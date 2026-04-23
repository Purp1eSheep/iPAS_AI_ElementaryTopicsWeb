export const Storage = {
    KEYS: { WRONG: 'quiz_wrong', STATS: 'quiz_stats', THEME: 'quiz_theme', AUDIO: 'quiz_audio', BOOKMARKS: 'quiz_bookmarks', PROG: 'quiz_prog' },
    get: (key, def) => {
        const val = localStorage.getItem(key);
        if (val === null) return def;
        try {
            return JSON.parse(val);
        } catch (e) {
            // 兼容舊版純字串資料 (例如舊的 "dark", "light")
            return val;
        }
    },
    set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
    remove: (key) => localStorage.removeItem(key),
    clearAll: () => localStorage.clear()
};
