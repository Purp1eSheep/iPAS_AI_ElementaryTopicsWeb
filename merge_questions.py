import json
import os

def merge_questions():
    raw_dir = 'data/src'
    output_file = 'data/all_questions.json'
    manifest_path = 'manifest.json'
    
    all_questions = []
    
    if not os.path.exists(raw_dir):
        print(f"找不到 {raw_dir} 資料夾")
        return

    # 取得原始 json 檔案
    files = [f for f in os.listdir(raw_dir) if f.endswith('.json')]
    files.sort()

    for filename in files:
        file_path = os.path.join(raw_dir, filename)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                questions = data if isinstance(data, list) else data.get('questions', [])
                
                # 取得該檔案預設的 topic (如果題目沒寫的話)
                default_topic = filename.replace('.json', '')
                
                for q in questions:
                    # 統一欄位名稱
                    q_text = (q.get("題目") or q.get("question", "")).strip()
                    if not q_text: continue
                    
                    q_options = q.get("選項") or q.get("options")
                    q_answer = q.get("答案") if q.get("答案") is not None else q.get("answer")
                    q_difficulty = q.get("難易度") or q.get("difficulty") or q.get("level")
                    q_topic = q.get("topic") or default_topic
                    
                    # 建立標準化物件
                    all_questions.append({
                        "question": q_text,
                        "options": q_options,
                        "answer": q_answer,
                        "difficulty": q_difficulty,
                        "topic": q_topic
                    })
        except Exception as e:
            print(f"跳過錯誤檔案 {filename}: {e}")

    # 去重邏輯：使用題目內容作為 Key
    unique_questions = {}
    for q in all_questions:
        if q['question'] not in unique_questions:
            unique_questions[q['question']] = q
    
    final_questions = list(unique_questions.values())

    # 使用題目內容進行 Unicode 排序
    final_questions.sort(key=lambda x: x['question'])

    # 重新分配 ID (Q001, Q002...)
    for i, q in enumerate(final_questions, 1):
        q['id'] = f"Q{i:03d}"

    # 寫入合併後的檔案
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(final_questions, f, indent=2, ensure_ascii=False)
    
    # 更新 manifest.json 以指向合併後的檔案
    topics = sorted(list(set(q['topic'] for q in final_questions)))
    manifest_data = []
    for topic in topics:
        count = len([q for q in all_questions if q['topic'] == topic])
        manifest_data.append({
            "title": topic,
            "description": f"{count} 題",
            "file": "data/all_questions.json", # 全部都指向同一個檔案
            "isTopic": True
        })
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    print(f"成功合併共 {len(all_questions)} 題至 {output_file}")

if __name__ == "__main__":
    merge_questions()
