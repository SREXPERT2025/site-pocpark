import os

# --- НАСТРОЙКИ ---
PROJECT_DIR = '.'  # Текущая папка
OUTPUT_FILE = 'project_full_dump.txt'
# Добавили все нужные расширения
EXTENSIONS = ['.py', '.jml', '.txt', '.md', '.yaml', '.yml', '.json', 'Dockerfile', '.md', '.js', '.ts', '.tsx']
# Игнорируем системные папки
IGNORE_DIRS = ['.venv', '.venv-paddle','.git', '__pycache__', '.idea', '.vscode', 'node_modules', '1_BACKUP', 'node_modules']

def generate_tree(startpath):
    """Генерирует текстовое дерево структуры проекта"""
    tree_lines = ["СТРУКТУРА ПРОЕКТА:", "=" * 30]
    for root, dirs, files in os.walk(startpath):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        level = root.replace(startpath, '').count(os.sep)
        indent = ' ' * 4 * level
        tree_lines.append(f"{indent}{os.path.basename(root)}/")
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if any(f.endswith(ext) for ext in EXTENSIONS) or f == 'Dockerfile':
                tree_lines.append(f"{subindent}{f}")
    tree_lines.append("=" * 30 + "\n")
    return "\n".join(tree_lines)

def collect_all_data(project_dir, output_file):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # 1. Сначала записываем структуру папок
        print("Генерирую структуру проекта...")
        tree = generate_tree(project_dir)
        outfile.write(tree)

        # 2. Затем проходим по файлам и собираем код
        print("Собираю содержимое файлов...")
        for root, dirs, files in os.walk(project_dir):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if any(file.endswith(ext) for ext in EXTENSIONS) or file == 'Dockerfile':
                    # Пропускаем сам файл скрипта, чтобы он не записывал сам себя бесконечно
                    if file == os.path.basename(__file__) or file == output_file:
                        continue
                        
                    file_path = os.path.join(root, file)
                    
                    separator = f"\n\n{'='*60}\n"
                    header = f"ФАЙЛ: {file_path}\n"
                    subheader = f"{'-'*60}\n"
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            content = infile.read()
                        
                        outfile.write(separator)
                        outfile.write(header)
                        outfile.write(subheader)
                        outfile.write(content)
                        print(f"Добавлен: {file_path}")
                    except Exception as e:
                        print(f"Ошибка при чтении {file_path}: {e}")

if __name__ == '__main__':
    collect_all_data(PROJECT_DIR, OUTPUT_FILE)
    print(f"\nГотово! Результат в файле: {OUTPUT_FILE}")