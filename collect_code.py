import os
from pathlib import Path

# --- НАСТРОЙКИ ---
PROJECT_DIR = "."
OUTPUT_FILE = "project_full_dump.txt"

# Расширения, которые реально нужны для анализа сайта
EXTENSIONS = {
    ".py",
    ".txt",
    ".md",
    ".yaml",
    ".yml",
    ".json",
    ".js",
    ".ts",
    ".tsx",
    ".css",
}

# Имена файлов без расширения, которые нужно включать
SPECIAL_FILES = {
    "Dockerfile",
}

# Папки, которые НЕ надо включать в дамп
IGNORE_DIRS = {
    ".git",
    ".next",
    ".vercel",
    ".turbo",
    ".cache",
    ".venv",
    ".venv-paddle",
    "__pycache__",
    ".idea",
    ".vscode",
    "node_modules",
    "1_BACKUP",
    "BACKUP_page",
    "handoff",
    "coverage",
    "dist",
    "build",
    "out",
}

# Файлы, которые НЕ надо включать в дамп
IGNORE_FILES = {
    OUTPUT_FILE,
    "collect_code.py",
    "site_tree.txt",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "npm-debug.log",
    "update.txt",
    "update.bat",
    ".DS_Store",
}

# Части имени файла, по которым файл лучше исключить
IGNORE_FILE_CONTAINS = {
    "backup",
    "архив",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
}

# Секретные/локальные env-файлы нельзя класть в дамп
IGNORE_ENV_FILES = {
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    ".env.test",
}


def should_ignore_dir(dirname: str) -> bool:
    return dirname in IGNORE_DIRS


def should_include_file(filename: str) -> bool:
    path = Path(filename)
    lower_name = filename.lower()

    if filename in IGNORE_FILES:
        return False

    if filename in IGNORE_ENV_FILES:
        return False

    if lower_name.endswith(".env"):
        return False

    for bad_part in IGNORE_FILE_CONTAINS:
        if bad_part in lower_name:
            return False

    if filename in SPECIAL_FILES:
        return True

    return path.suffix in EXTENSIONS


def safe_read_text(file_path: str) -> str:
    with open(file_path, "r", encoding="utf-8") as infile:
        return infile.read()


def generate_tree(startpath: str) -> str:
    """Генерирует текстовое дерево структуры проекта без мусорных папок и файлов."""
    tree_lines = ["СТРУКТУРА ПРОЕКТА:", "=" * 30]

    for root, dirs, files in os.walk(startpath):
        dirs[:] = sorted([d for d in dirs if not should_ignore_dir(d)])
        files = sorted(files)

        level = root.replace(startpath, "").count(os.sep)
        indent = " " * 4 * level
        folder_name = os.path.basename(root) or "."

        tree_lines.append(f"{indent}{folder_name}/")

        subindent = " " * 4 * (level + 1)

        for filename in files:
            if should_include_file(filename):
                tree_lines.append(f"{subindent}{filename}")

    tree_lines.append("=" * 30 + "\n")
    return "\n".join(tree_lines)


def collect_all_data(project_dir: str, output_file: str) -> None:
    with open(output_file, "w", encoding="utf-8") as outfile:
        print("Генерирую структуру проекта...")
        tree = generate_tree(project_dir)
        outfile.write(tree)

        print("Собираю содержимое файлов...")

        for root, dirs, files in os.walk(project_dir):
            dirs[:] = sorted([d for d in dirs if not should_ignore_dir(d)])
            files = sorted(files)

            for filename in files:
                if not should_include_file(filename):
                    continue

                file_path = os.path.join(root, filename)

                # Дополнительная защита от повторного включения самого дампа
                if os.path.abspath(file_path) == os.path.abspath(output_file):
                    continue

                separator = f"\n\n{'=' * 60}\n"
                header = f"ФАЙЛ: {file_path}\n"
                subheader = f"{'-' * 60}\n"

                try:
                    content = safe_read_text(file_path)

                    outfile.write(separator)
                    outfile.write(header)
                    outfile.write(subheader)
                    outfile.write(content)

                    print(f"Добавлен: {file_path}")

                except UnicodeDecodeError:
                    print(f"Пропущен бинарный или не UTF-8 файл: {file_path}")
                except Exception as e:
                    print(f"Ошибка при чтении {file_path}: {e}")


if __name__ == "__main__":
    collect_all_data(PROJECT_DIR, OUTPUT_FILE)
    print(f"\nГотово! Результат в файле: {OUTPUT_FILE}")