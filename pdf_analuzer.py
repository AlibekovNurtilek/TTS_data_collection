import re
import sys
from pdfminer.high_level import extract_text

def clean_text(text):
    # оставить только буквы и пробелы (кириллица и латиница)
    text = re.sub(r"[^a-zA-Zа-яА-ЯёЁ\s]", " ", text)
    # убрать лишние пробелы
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def average_word_length(words):
    if not words:
        return 0
    total_chars = sum(len(w) for w in words)
    return total_chars / len(words)

def main(pdf_path):
    print("Извлечение текста из PDF...")
    text = extract_text(pdf_path)

    print("Очистка текста...")
    cleaned = clean_text(text)

    words = cleaned.split()
    avg_len = average_word_length(words)

    print(f"Количество слов: {len(words)}")
    print(f"Средняя длина слова: {avg_len:.2f} символов")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Использование: python script.py path/to/file.pdf")
        sys.exit(1)

    main(sys.argv[1])
