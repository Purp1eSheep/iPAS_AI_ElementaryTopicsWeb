import json
import os

def update_manifest():
    data_dir = 'data'
    manifest_path = 'manifest.json'
    quiz_sets = []

    # 掃描 data 資料夾下的所有 .json 檔案
    if not os.path.exists(data_dir):
        print(f"找不到 {data_dir} 資料夾")
        return

    files = [f for f in os.listdir(data_dir) if f.endswith('.json')]
    files.sort() # 確保順序一致

    for filename in files:
        file_path = os.path.join(data_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                if isinstance(data, list):
                    # 處理新格式 (oneShot 格式)
                    # 因為純陣列沒地方存標題，我們先用檔名當標題
                    title = filename.replace('.json', '')
                    questions_count = len(data)
                    description = f"{questions_count} 題"
                else:
                    # 處理舊格式 (物件格式)
                    title = data.get('title', filename)
                    questions_count = len(data.get('questions', []))
                    description = data.get('description', f"{questions_count} 題")
                
                quiz_sets.append({
                    "title": title,
                    "description": description,
                    "file": f"data/{filename}"
                })
        except Exception as e:
            print(f"跳過錯誤檔案 {filename}: {e}")

    # 寫回 manifest.json
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(quiz_sets, f, indent=2, ensure_ascii=False)
    
    print(f"成功更新 {manifest_path}，共計 {len(quiz_sets)} 個題目集。")

if __name__ == "__main__":
    update_manifest()
