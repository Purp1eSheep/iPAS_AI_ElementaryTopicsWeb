題目皆來自經濟部 iPAS 網頁
https://ipd.nat.gov.tw/ipas/certification/AIAP/downloads

我是 Vibe Coder 我對不起老爹跟老爹的學費錢，我是 Gen Z 腦萎縮資工學生，阿公676767。

工作分配：
- 我: 逼事沒幹下指令
- Claude: New Version, yes Daddy.
- Gemini: 被我放棄, trash. 因為 Claude 額度用完所以負責 Debug

---

# 📝 Quiz Template

一個簡單、可 fork 的靜態測驗網站。所有題目都放在 JSON 檔中，不需要後端或資料庫。

**[→ Demo](https://Purp1eSheep.github.io/iPAS_AI_ElementaryTopicsWeb)**

---

## 快速開始（Fork & 部署）

1. **Fork** 這個 repo
2. 進入 repo **Settings → Pages**，Source 選 `main` branch / `/ (root)`
3. **新增題目**：在 `data/` 資料夾放入你的 JSON 檔。
4. **自動更新**：Push 後 GitHub Actions 會自動跑 `update_manifest.py` 更新清單。
5. 你的網站就上線了 🎉

---

## 檔案結構

```
quiz-template/
├── index.html          # 網站主體（通常不需要改）
├── manifest.json       # 題目集清單（自動生成，不用手改）
├── update_manifest.py  # 自動產生題目清單的腳本
└── data/
        ├── javascript.json # 題目集範例
        └── datastructure.json
```

---

## 新增題目集

### Step 1｜建立 JSON 題目檔

在 `data/` 資料夾新增一個 `.json` 檔，例如 `data/history.json`。格式必須是一個 **JSON 陣列**：

```json
[
    {
        "題號": "H-01",
        "難易度": "初級",
        "題目": "誰在 1912 年建立了中華民國？",
        "選項": ["蔣中正", "孫中山", "袁世凱", "黎元洪"],
        "答案": 2
    }
]
```

### Step 2｜Push 檔案

直接把檔案 push 到 GitHub 即可。GitHub Actions 會自動幫你執行 `python3 update_manifest.py` 並更新 `manifest.json`。

完成！

---

## 題目格式規範

### 欄位說明
- **題號** (選填): 顯示在標籤旁。
- **難易度** (選填): 顯示在標籤旁。
- **題目**: 問題內容。
- **選項**: 字串陣列。
- **答案**: 正確選項的數字（**從 1 開始算**，例如 1 代表第一個選項）。

### 單選題範例
```json
{
    "題目": "1+1=?",
    "選項": ["1", "2", "3"],
    "答案": 2
}
```

### 多選題範例
```json
{
    "題目": "哪些是水果？",
    "選項": ["蘋果", "椅子", "香蕉"],
    "答案": [1, 3]
}
```

---

## 自訂外觀

打開 `index.html`，修改最上方的 CSS 變數：

```css
:root {
    --accent: #7c6dfa;   /* 主色 */
    --bg:     #0f1117;   /* 背景 */
    /* ... */
}
```

主標題與副標題也在 `index.html` 中，搜尋 `✏️` 標記的地方即可找到。

---

## License

MIT — 隨意使用、改造、商用。
