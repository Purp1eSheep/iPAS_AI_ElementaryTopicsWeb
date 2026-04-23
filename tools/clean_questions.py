import json
import os
import glob

def clean_json_files(directory):
    files = glob.glob(os.path.join(directory, "*.json"))
    
    standard_fields = ["id", "question", "options", "answer", "topic"]
    mapping = {
        "題目": "question",
        "q": "question",
        "選項": "options",
        "答案": "answer"
    }

    for file_path in files:
        print(f"Processing {file_path}...")
        with open(file_path, 'r', encoding='utf-8') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                print(f"Error decoding {file_path}")
                continue

        if not isinstance(data, list):
            print(f"Skipping {file_path}: not a list of objects")
            continue

        cleaned_data = []
        for i, item in enumerate(data):
            new_item = {}
            
            # Initialize temp_item with all standard fields
            temp_item = {field: item.get(field) for field in standard_fields}
            
            # Map old fields to standard ones if standard one is missing
            for old_field, std_field in mapping.items():
                if old_field in item:
                    val = item[old_field]
                    if temp_item[std_field] is None:
                        temp_item[std_field] = val
                    # If they are the same, we just ignore the old_field (it won't be in standard_fields list anyway)
                    # If they are different, we prioritize the standard field's existing value.
            
            # Re-index ID as continuous integer starting from 1
            temp_item['id'] = i + 1
            
            # Construct new_item with ONLY standard fields in order
            for field in standard_fields:
                new_item[field] = temp_item[field]
                
            cleaned_data.append(new_item)

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(cleaned_data, f, indent=4, ensure_ascii=False)
        print(f"Cleaned {file_path}")

if __name__ == "__main__":
    clean_json_files("questions/")
