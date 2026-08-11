import os
import json

# Путь к папке с языками от корня проекта
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LANG_DIR = os.path.join(BASE_DIR, 'public', 'languages')

def load_json(filepath):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                print(f"⚠️ Ошибка чтения JSON в {filepath}, создан пустой словарь.")
    return {}

def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')

def sync_translations():
    if not os.path.exists(LANG_DIR):
        print(f"❌ Папка не найдена: {LANG_DIR}")
        print("Убедитесь, что скрипт находится в корне проекта рядом с папкой 'public/'.")
        return

    tm_path = os.path.join(LANG_DIR, 'tm.json')
    ru_path = os.path.join(LANG_DIR, 'ru.json')
    en_path = os.path.join(LANG_DIR, 'en.json')

    if not os.path.exists(tm_path):
        print(f"❌ Основной файл языковых настроек {tm_path} не найден.")
        return

    tm_data = load_json(tm_path)
    ru_data = load_json(ru_path)
    en_data = load_json(en_path)

    # Обновляем ключи для RU и EN, если какого-то ключа нет, он берется из TM
    for key, val in tm_data.items():
        if key not in ru_data:
            ru_data[key] = val
        if key not in en_data:
            en_data[key] = val

    save_json(ru_path, ru_data)
    save_json(en_path, en_data)

    print("✅ Локализации ru.json и en.json успешно синхронизированы с tm.json!")

if __name__ == '__main__':
    sync_translations()
