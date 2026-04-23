import json
import os
import csv

def merge_questions():
    raw_dir = 'questions'
    output_dir = 'assets/data'
    output_file = os.path.join(output_dir, 'all_questions.csv')
    manifest_path = os.path.join(output_dir, 'manifest.json')
    
    # 定義科目名稱
    S1 = "科目一：人工智慧基礎概論"
    S2 = "科目二：生成式AI應用與規劃"

    # 定義檔案歸屬與預設主題
    subject_mapping = {
        'AI_Concepts.json': S1,
        'Data_Processing.json': S1,
        'Machine_Learning.json': S1,
        'Discriminative_vs_Generative_AI.json': S1,
        'No_Code_Low_Code.json': S2,
        'GenAI_Applications.json': S2,
        'GenAI_Implementation.json': S2
    }

    # 定義各科目內的合法章節（依據 classification.md）
    S1_TOPICS = ["人工智慧概念", "資料處理與分析概念", "機器學習概念", "鑑別式 AI 與生成式 AI"]
    S2_TOPICS = ["No code / Low code 概念", "生成式 AI 應用領域與工具使用", "生成式 AI 導入評估規劃"]

    all_questions = []
    
    if not os.path.exists(raw_dir):
        print(f"找不到 {raw_dir} 資料夾")
        return
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    for filename, current_subject in subject_mapping.items():
        file_path = os.path.join(raw_dir, filename)
        if not os.path.exists(file_path):
            print(f"警告: 找不到檔案 {filename}，跳過")
            continue

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                questions_list = json.load(f)
                
                for q in questions_list:
                    q_text = q.get("question", "").strip()
                    if not q_text: continue
                    
                    q_options = q.get("options")
                    q_answer = q.get("answer")
                    
                    # 取得目前 topic
                    raw_topic = q.get("topic", "").strip()
                    
                    # 移除科目首碼 (例如 "科目一：... / ")，保留後方完整內容
                    mapped_topic = raw_topic
                    for s in [S1, S2]:
                        prefix = f"{s} / "
                        if mapped_topic.startswith(prefix):
                            mapped_topic = mapped_topic[len(prefix):].strip()
                    
                    # 檢查並修正章節歸屬
                    if current_subject == S1:
                        if mapped_topic not in S1_TOPICS:
                            mapped_topic = S1_TOPICS[0] # 預設歸類
                    else:
                        if mapped_topic not in S2_TOPICS:
                            mapped_topic = S2_TOPICS[0] # 預設歸類
                    
                    # 最終 topic 只保留最後項
                    full_topic = mapped_topic
                    
                    all_questions.append({
                        "question": q_text,
                        "options": q_options,
                        "answer": q_answer,
                        "topic": full_topic
                    })
        except Exception as e:
            print(f"處理檔案 {filename} 時發生錯誤: {e}")

    # 去重
    unique_questions = {}
    for q in all_questions:
        if q['question'] not in unique_questions:
            unique_questions[q['question']] = q
    
    final_questions = list(unique_questions.values())
    final_questions.sort(key=lambda x: x['question'])

    for i, q in enumerate(final_questions):
        q['id'] = f"Q{i+1:03d}"

    # 輸出為 CSV
    with open(output_file, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = ['id', 'question', 'options', 'answer', 'topic']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for q in final_questions:
            # 將 list 轉換為 JSON 字串以存儲在 CSV 單元格中
            row = {
                'id': q['id'],
                'question': q['question'],
                'options': json.dumps(q['options'], ensure_ascii=False),
                'answer': json.dumps(q['answer'], ensure_ascii=False),
                'topic': q['topic']
            }
            writer.writerow(row)
    
    # 建立結構化的 manifest.json
    manifest_structure = {
        S1: {t: 0 for t in S1_TOPICS},
        S2: {t: 0 for t in S2_TOPICS}
    }

    # 建立一個反向查找，從 topic 到 subject
    topic_to_subject = {}
    for t in S1_TOPICS: topic_to_subject[t] = S1
    for t in S2_TOPICS: topic_to_subject[t] = S2

    for q in final_questions:
        top = q['topic']
        if top in topic_to_subject:
            sub = topic_to_subject[top]
            manifest_structure[sub][top] += 1

    formatted_manifest = []
    for sub in [S1, S2]:
        topics_list = []
        target_topics = S1_TOPICS if sub == S1 else S2_TOPICS
        sub_total_count = 0
        for top in target_topics:
            count = manifest_structure[sub][top]
            sub_total_count += count
            topics_list.append({
                "title": top,
                "count": count,
                "full_topic": top
            })
        formatted_manifest.append({
            "subject": sub,
            "count": sub_total_count,
            "full_topic": sub,
            "topics": topics_list
        })
    
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(formatted_manifest, f, indent=4, ensure_ascii=False)

    print(f"成功合併共 {len(final_questions)} 題至 {output_file}")
    print(f"已更新 {manifest_path}")

if __name__ == "__main__":
    merge_questions()
