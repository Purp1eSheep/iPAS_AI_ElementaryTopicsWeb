# iPAS AI Elementary Topics Web

這是一個簡單的網頁應用程式，用於練習 iPAS AI 相關題目。

## 專案結構

- `questions/`: 放置您的題目 JSON 檔案（來源）。
- `data/`: **自動生成**的資料夾，存放合併後的題目與清單（請勿手動修改）。
- `index.html`: 主網頁程式。
- `merge_questions.py`: 合併題目並更新清單的工具。

## 使用方式

1.  將您的題目 JSON 檔案放入 `questions` 資料夾中。
2.  執行合併腳本：
    ```bash
    python merge_questions.py
    ```
3.  直接開啟 `index.html` 即可開始練習！

## 題目格式範例

```json
{
  "題目": "您的問題內容",
  "選項": ["選項A", "選項B", "選項C", "選項D"],
  "答案": 1,
  "難易度": "易",
  "topic": "章節名稱"
}
```
