export const Utils = {
    formatText: text => {
        if (!text) return "";
        let formatted = text.replace(/ ([A-Da-d]\.)/g, '\n$1');
        return formatted.replace(/(並非|不是)/g, '<u>$1</u>');
    },
    shuffle: arr => [...arr].sort(() => Math.random() - 0.5),
    weightedShuffle: (arr, stats) => {
        return [...arr].map(q => {
            const s = stats[q.id] || { t: 0, w: 0 };
            const accuracy = s.t > 0 ? (s.t - s.w) / s.t : 0;
            let weight = 8; // 預設權重: 其他 (8%)

            if (s.t === 0) {
                weight = 70; // 1. 未答題目 (70%)
            } else if (accuracy < 0.6) {
                weight = 20; // 2. 高錯誤率 (20%)
            } else if (accuracy > 0.85 && s.t > 10) {
                weight = 2;  // 3. 高正確率/精通 (2%)
            }

            // 使用 Efraimidis and Spirakis 演算法進行加權隨機抽樣
            return { q, sortKey: Math.pow(Math.random(), 1 / weight) };
        })
        .sort((a, b) => b.sortKey - a.sortKey)
        .map(item => item.q);
    },
    normalizeIndex: ans => Array.isArray(ans) ? ans.map(a => typeof a === 'number' ? a - 1 : a) : (typeof ans === 'number' ? ans - 1 : ans),
    downloadFile: (content, fileName, mimeType) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
    }
};
