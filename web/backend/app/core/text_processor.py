import re
from typing import List, Set, Dict
from app.config import settings


def remove_initials(text: str) -> str:
    """
    Удаляет инициалы и номера из текста перед фамилиями.
    Например: 
    - "Л. Толстой" -> "Толстой"
    - "Ф. Достоевский" -> "Достоевский"
    - "3. Кедрина" -> "Кедрина"
    - "3. Кедрина, Озеров, Щербина" -> "Кедрина, Озеров, Щербина"
    - "3. Кедрина Озеров Щербина" -> "Кедрина Озеров Щербина"
    - "А. Б. Иванов" -> "Иванов"
    
    Важно: удаляет только номера/инициалы перед именами/фамилиями, 
    не трогает номера в других контекстах (например, "Глава 3. Текст" остается как есть).
    Сохраняет запятые и другие знаки препинания между фамилиями.
    """
    # Удаляем номера с точкой перед фамилиями
    # Просто удаляем "число. " перед словом, начинающимся с заглавной буквы
    # Это сохраняет все запятые и знаки препинания после номера
    # Примеры: 
    # "3. Кедрина" -> "Кедрина"
    # "3. Кедрина, Озеров" -> "Кедрина, Озеров"
    # "3. Кедрина Озеров" -> "Кедрина Озеров"
    # Используем \b для границы слова, чтобы не трогать "Глава 3. Текст"
    pattern = r'\b\d+\.\s+(?=[А-ЯЁA-Z])'
    text = re.sub(pattern, '', text)
    
    # Удаляем инициалы: одна буква (кириллица или латиница) + точка + пробел + слово
    # Убираем инициал, оставляем только фамилию
    # Примеры: "Л. Толстой" -> "Толстой", "Ф. Достоевский" -> "Достоевский"
    pattern = r'\b[А-ЯЁA-Z]\.\s+([А-ЯЁA-ZА-Яёa-zа-я]+)'
    text = re.sub(pattern, r'\1', text)
    
    # Также убираем множественные инициалы (например, "А. Б. Иванов" -> "Иванов")
    pattern = r'(?:\b[А-ЯЁA-Z]\.\s+){1,3}([А-ЯЁA-ZА-Яёa-zа-я]+)'
    text = re.sub(pattern, r'\1', text)
    
    return text


def detect_page_numbers(line: str, context_lines: List[str] = None, line_index: int = -1) -> bool:
    """
    Определяет, является ли строка номером страницы.
    
    Args:
        line: Строка для проверки
        context_lines: Все строки документа для контекста
        line_index: Индекс текущей строки в контексте
    """
    line = line.strip()
    
    # Пустая строка
    if not line:
        return False
    
    # Только цифры (но не одиночные цифры с точкой - могут быть частью нумерации в тексте)
    if re.match(r'^\d+$', line):
        # Если это очень большое число (вероятно номер страницы) или стоит отдельно
        num = int(line)
        if num > 10:  # Номера страниц обычно больше 10
            return True
        # Если это маленькое число (1-10), проверяем контекст
        if context_lines and line_index >= 0:
            # Если следующая строка начинается с заглавной буквы, это может быть продолжение
            if line_index + 1 < len(context_lines):
                next_line = context_lines[line_index + 1].strip()
                if next_line and next_line[0].isupper():
                    # Это может быть часть предложения, не удаляем
                    return False
        return True
    
    # Цифры с разделителями (например, "- 5 -", "* 10 *")
    # Но НЕ удаляем короткие номера с точкой (1., 2., 3.) - они могут быть частью текста
    if re.match(r'^[\s\-\*\.]*\d+[\s\-\*\.]*$', line):
        # Проверяем, не является ли это коротким номером с точкой (1., 2., 3.)
        if re.match(r'^\d+\.$', line):
            num = int(line[:-1])
            # Если это маленькое число (1-20), проверяем контекст
            if num <= 20 and context_lines and line_index >= 0:
                # Если следующая строка начинается с заглавной буквы, это может быть продолжение
                if line_index + 1 < len(context_lines):
                    next_line = context_lines[line_index + 1].strip()
                    if next_line and next_line[0].isupper():
                        # Это может быть часть предложения (например, "3. Кедрина...")
                        return False
            # Если это большое число, вероятно номер страницы
            if num > 20:
                return True
        # Другие форматы (с дефисами, звездочками) - вероятно номера страниц
        return True
    
    return False


def is_header_footer(line: str, all_lines: List[str] = None, line_index: int = -1) -> bool:
    """
    Определяет, является ли строка колонтитулом (header/footer).
    Колонтитулы обычно:
    - Очень короткие (< 50 символов)
    - Находятся в начале или конце страницы
    - Содержат только заглавные буквы
    - Повторяются на разных страницах
    """
    line = line.strip()
    
    if not line:
        return False
    
    # Очень короткие строки (вероятно колонтитулы)
    if len(line) < 5:
        return True
    
    # Строки только из заглавных букв (часто названия разделов в колонтитулах)
    letters = re.findall(r'[а-яёА-ЯЁa-zA-Z]', line)
    if letters and len(letters) >= 3:
        uppercase_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
        if uppercase_ratio > 0.9 and len(line) < 50:
            return True
    
    # Строки с типичными словами колонтитулов
    header_keywords = [
        'кыргыз китептери',
        'китептер',
        'глава',
        'бөлүм',
        'раздел'
    ]
    line_lower = line.lower()
    for keyword in header_keywords:
        if line_lower == keyword or line_lower.startswith(keyword + ' '):
            return True
    
    return False


def has_balanced_pairs(text: str) -> Dict[str, bool]:
    """
    Проверяет, сбалансированы ли парные символы в тексте.
    Возвращает словарь с результатами для каждого типа пар.
    """
    pairs = {
        '"': text.count('"') % 2 == 0,
        '«»': text.count('«') == text.count('»'),
        '()': text.count('(') == text.count(')'),
        '[]': text.count('[') == text.count(']'),
        '{}': text.count('{') == text.count('}'),
    }
    
    return pairs


def estimate_reading_time(text: str, words_per_minute: int = 150) -> int:
    """
    Оценивает время чтения текста в секундах.
    Оставлено для обратной совместимости, но не используется в основной логике.
    """
    if not text.strip():
        return 0
    
    words = text.split()
    if not words:
        return 0
    
    total_chars = sum(len(word) for word in words)
    avg_word_length = total_chars / len(words) if words else 0
    
    if avg_word_length <= 4:
        adjusted_wpm = words_per_minute * 1.1
    elif avg_word_length <= 6:
        adjusted_wpm = words_per_minute
    else:
        adjusted_wpm = words_per_minute * 0.85
    
    minutes = len(words) / adjusted_wpm
    return int(minutes * 60)


def clean_text_for_tts(text: str) -> str:
    """
    Очищает текст от символов, которые не подходят для TTS обучения.
    Удаляет инициалы, номера перед фамилиями и другие элементы, которые не должны читаться дикторами.
    """
    # Сначала удаляем инициалы и номера перед фамилиями
    # Это важно для TTS - дикторы не должны читать "3. Кедрина", а только "Кедрина"
    text = remove_initials(text)
    
    # Убираем специальные символы (©, ®, ™, №)
    text = re.sub(r'[©®™№]', '', text)
    
    # Убираем markdown разметку
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)  # **bold**
    text = re.sub(r'\*(.+?)\*', r'\1', text)      # *italic*
    text = re.sub(r'__(.+?)__', r'\1', text)      # __bold__
    text = re.sub(r'_(.+?)_', r'\1', text)        # _italic_
    text = re.sub(r'`(.+?)`', r'\1', text)        # `code`
    
    # Убираем ссылки [text](url)
    text = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', text)
    
    # Убираем URL
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    
    # Убираем email
    text = re.sub(r'\S+@\S+\.\S+', '', text)
    
    # Убираем хештеги и упоминания
    text = re.sub(r'#\S+', '', text)
    text = re.sub(r'@\S+', '', text)
    
    # Убираем множественные спецсимволы подряд
    text = re.sub(r'[#$%^&*+=\[\]{}|\\<>]{2,}', '', text)
    
    # Нормализуем кавычки
    text = text.replace('«', '"').replace('»', '"')
    text = text.replace('"', '"').replace('"', '"')
    text = text.replace(''', "'").replace(''', "'")
    
    # Нормализуем тире и дефисы
    text = text.replace('—', '-').replace('–', '-')
    
    # Убираем множественные пробелы
    text = re.sub(r' +', ' ', text)
    
    # Убираем множественные переносы строк (оставляем максимум два)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    return text.strip()


def is_metadata_line(text: str) -> bool:
    """
    Определяет, является ли строка метаданными издательства.
    """
    text_lower = text.lower()
    
    # Ключевые слова метаданных
    metadata_keywords = [
        'басма үйү',
        'басылышы',
        'басылым',
        'редакциясы',
        'редактор',
        'isbn',
        'тираж',
        'баасы'
    ]
    
    # Если содержит ключевые слова метаданных
    for keyword in metadata_keywords:
        if keyword in text_lower:
            return True
    
    # Если строка очень короткая и содержит кавычки (название издательства)
    if len(text) < 50 and ('"' in text or '«' in text or '»' in text):
        return True
    
    return False


def is_valid_chunk(text: str, min_words: int = 3, min_chars: int = 50) -> bool:
    """
    Проверяет, является ли чанк валидным для TTS обучения.
    """
    text = text.strip()
    
    if not text:
        return False
    
    # Проверяем минимальное количество символов
    if len(text) < min_chars:
        return False
    
    # Проверяем наличие хотя бы одной буквы
    if not re.search(r'[а-яёА-ЯЁa-zA-Z]', text):
        return False
    
    # Проверяем минимальное количество слов
    words = text.split()
    if len(words) < min_words:
        return False
    
    # Проверяем, не является ли это метаданными
    if is_metadata_line(text):
        return False
    
    # Проверяем процент спецсимволов (не должно быть больше 30%)
    total_chars = len(text)
    special_chars = len(re.findall(r'[^а-яёА-ЯЁa-zA-Z0-9\s.,!?;:\-—"\'\(\)]', text))
    if total_chars > 0 and (special_chars / total_chars) > 0.3:
        return False
    
    # Проверяем, не состоит ли текст только из заглавных букв (часто метаданные)
    letters = re.findall(r'[а-яёА-ЯЁa-zA-Z]', text)
    if letters and sum(1 for c in letters if c.isupper()) > len(letters) * 0.8:
        return False
    
    return True


def clean_chunk_edges(text: str) -> str:
    """
    Очищает края чанка от лишних знаков препинания.
    НЕ удаляет запятые в конце, так как они могут быть частью списка фамилий.
    """
    text = text.strip()
    
    # Убираем только точки с запятой и двоеточия в конце (но НЕ запятые - они могут быть в списках)
    text = re.sub(r'[;:]+$', '', text)
    
    # Убираем начальные знаки препинания (кроме кавычек)
    text = re.sub(r'^[,;:\-—]+\s*', '', text)
    
    # Убираем лишние пробелы
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def split_into_sentences(text: str) -> List[str]:
    """
    Разбивает текст на предложения по основным знакам препинания.
    Не разбивает на инициалах (А., Б., В.) и сокращениях (т.д., т.п., др.).
    Учитывает структуру абзацев и диалоги.
    """
    # Сохраняем маркеры абзацев
    paragraph_markers = []
    text = re.sub(r'__PARAGRAPH_BREAK__', lambda m: f"__PARAGRAPH_{len(paragraph_markers)}__", text)
    paragraph_markers = [i for i in range(len(re.findall(r'__PARAGRAPH_\d+__', text)))]
    
    # Заменяем инициалы и сокращения временными маркерами, чтобы не разбивать на них
    # Сохраняем инициалы (одна заглавная буква с точкой и пробелом)
    # Также сохраняем номера с точкой перед заглавной буквой (например, "3. Кедрина")
    initials_pattern = r'\b([А-ЯЁA-Z])\.\s'
    initials = []
    def save_initial(match):
        initials.append(match.group(0))
        return f"__INITIAL_{len(initials)-1}__ "
    text = re.sub(initials_pattern, save_initial, text)
    
    # Сохраняем номера с точкой перед заглавной буквой (например, "3. Кедрина", "1. Первый")
    # Это важно для случаев, когда нумерация идет в тексте
    # Паттерн ищет: цифра + точка + пробел + заглавная буква + остаток слова
    numbered_list_pattern = r'\b(\d+)\.\s+([А-ЯЁA-Z][а-яёА-ЯЁa-zA-Z]*)'
    numbered_items = []
    def save_numbered_item(match):
        full_match = match.group(0)  # Полное совпадение, например "3. Кедрина"
        numbered_items.append(full_match)
        word_start = match.group(2)  # Начало слова после номера, например "Кедрина"
        return f"__NUMBERED_{len(numbered_items)-1}__{word_start}"
    text = re.sub(numbered_list_pattern, save_numbered_item, text)
    
    # Сохраняем сокращения (расширенный список для кыргызского языка)
    # т.д., т.п., др., и т.д., и т.п., и др., ж.б., м.б., б.а., ж.а., к.б., м.а.
    abbrev_pattern = r'\b(т\.д\.|т\.п\.|др\.|и т\.д\.|и т\.п\.|и др\.|ж\.б\.|м\.б\.|б\.а\.|ж\.а\.|к\.б\.|м\.а\.|т\.а\.|т\.б\.)'
    abbrevs = []
    def save_abbrev(match):
        abbrevs.append(match.group(0))
        return f"__ABBREV_{len(abbrevs)-1}__"
    text = re.sub(abbrev_pattern, save_abbrev, text, flags=re.IGNORECASE)
    
    # Сохраняем многоточия в середине предложений (не разбиваем на них)
    ellipsis_pattern = r'\.{3,}'
    ellipses = []
    def save_ellipsis(match):
        ellipses.append(match.group(0))
        return f"__ELLIPSIS_{len(ellipses)-1}__"
    text = re.sub(ellipsis_pattern, save_ellipsis, text)
    
    # Паттерн для разбиения на предложения
    # Разделяем по: точка/восклицательный/вопросительный + опциональная кавычка + пробел
    # НЕ разбиваем если после точки идет заглавная буква в середине слова (инициал)
    pattern = r'([.!?]+["»"]?\s+|\.{2,}\s+)(?![А-ЯЁA-Z]\.)'
    
    parts = re.split(pattern, text)
    
    # Объединяем предложения с их разделителями
    sentences = []
    i = 0
    while i < len(parts):
        sentence = parts[i]
        if i + 1 < len(parts) and re.match(pattern, parts[i + 1]):
            sentence += parts[i + 1]
            i += 2
        else:
            i += 1
        
        # Восстанавливаем многоточия
        for idx, ellipsis in enumerate(ellipses):
            sentence = sentence.replace(f"__ELLIPSIS_{idx}__", ellipsis)
        
        # Восстанавливаем нумерованные списки
        # Ищем паттерн "__NUMBERED_X__WORD" и заменяем на "X. WORD"
        for idx, numbered_item in enumerate(numbered_items):
            # numbered_item имеет формат "3. Кедрина"
            # В тексте это "__NUMBERED_0__Кедрина" (без пробела)
            # Нужно найти и заменить правильно
            pattern = f"__NUMBERED_{idx}__([А-ЯЁA-Z][а-яёА-ЯЁa-zA-Z]*)"
            sentence = re.sub(pattern, numbered_item, sentence)
        
        # Восстанавливаем инициалы
        for idx, initial in enumerate(initials):
            sentence = sentence.replace(f"__INITIAL_{idx}__ ", initial)
        
        # Восстанавливаем сокращения
        for idx, abbrev in enumerate(abbrevs):
            sentence = sentence.replace(f"__ABBREV_{idx}__", abbrev)
        
        # Восстанавливаем маркеры абзацев
        for idx in paragraph_markers:
            sentence = sentence.replace(f"__PARAGRAPH_{idx}__", '__PARAGRAPH_BREAK__')
        
        sentence = sentence.strip()
        if sentence:
            sentences.append(sentence)
    
    return sentences


def split_by_semicolon_colon(text: str) -> List[str]:
    """
    Разбивает текст по точкам с запятой и двоеточиям.
    """
    pattern = r'([;:]\s+)'
    parts = re.split(pattern, text)
    
    fragments = []
    i = 0
    while i < len(parts):
        fragment = parts[i]
        if i + 1 < len(parts) and re.match(pattern, parts[i + 1]):
            fragment += parts[i + 1]
            i += 2
        else:
            i += 1
        
        fragment = fragment.strip()
        if fragment:
            fragments.append(fragment)
    
    return fragments


def split_by_comma(text: str) -> List[str]:
    """
    Разбивает текст по запятым.
    """
    pattern = r'(,\s+)'
    parts = re.split(pattern, text)
    
    fragments = []
    i = 0
    while i < len(parts):
        fragment = parts[i]
        if i + 1 < len(parts) and re.match(pattern, parts[i + 1]):
            fragment += parts[i + 1]
            i += 2
        else:
            i += 1
        
        fragment = fragment.strip()
        if fragment:
            fragments.append(fragment)
    
    return fragments


def split_by_words(text: str, max_chars: int) -> List[str]:
    """
    Разбивает текст по словам (крайний случай).
    """
    words = text.split()
    chunks = []
    current_chunk = ""
    
    for word in words:
        test_chunk = (current_chunk + " " + word).strip() if current_chunk else word
        
        if len(test_chunk) <= max_chars:
            current_chunk = test_chunk
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = word
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks


def preprocess_text_for_chunking(text: str, preserve_paragraphs: bool = True) -> str:
    """
    Preprocesses text before chunking:
    - Removes page numbers
    - Removes headers and footers
    - Removes standalone all-caps lines (topics/themes)
    - Filters out very short lines
    - Preserves paragraph structure for better chunking
    
    Args:
        preserve_paragraphs: If True, preserves paragraph boundaries using special markers
    """
    lines = text.split('\n')
    filtered_lines = []
    
    for i, line in enumerate(lines):
        line = line.strip()
        
        # Skip empty lines (but preserve them as paragraph markers if preserve_paragraphs=True)
        if not line:
            if preserve_paragraphs and filtered_lines:  # Only add if we have previous content
                # Add paragraph marker (double newline will be converted to marker)
                filtered_lines.append('__PARAGRAPH_BREAK__')
            continue
        
        # Skip page numbers (с учетом контекста)
        if detect_page_numbers(line, lines, i):
            continue
        
        # Skip headers/footers
        if is_header_footer(line, lines, i):
            continue
        
        # Skip very short lines (less than 10 chars) that might be artifacts
        # But allow if it looks like a valid sentence fragment
        if len(line) < 10:
            # Check if it's a valid sentence fragment (ends with punctuation)
            # ИЛИ это номер с точкой перед продолжением (например, "3." перед "Кедрина")
            if not re.search(r'[.!?;:,]$', line):
                # Проверяем, не является ли это номером с точкой перед продолжением
                if re.match(r'^\d+\.$', line):
                    # Если следующая строка начинается с заглавной буквы, это продолжение
                    if i + 1 < len(lines):
                        next_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
                        if next_line and next_line[0].isupper():
                            # Это часть предложения, не пропускаем
                            filtered_lines.append(line)
                continue
        
        # Skip all-caps lines that are standalone (likely topics/themes)
        # But only if they're relatively short
        if len(line) < 100:
            letters = re.findall(r'[а-яёА-ЯЁa-zA-Z]', line)
            if letters:
                uppercase_ratio = sum(1 for c in letters if c.isupper()) / len(letters)
                # If more than 80% uppercase and standalone, it's likely a topic
                if uppercase_ratio > 0.8:
                    # Check if this looks like a standalone topic (no sentence-ending punctuation)
                    if not line.endswith(('.', '!', '?', ':', ';', ',')):
                        continue
        
        filtered_lines.append(line)
    
    if preserve_paragraphs:
        # Join with paragraph markers to preserve structure
        # Single space = same paragraph, double space = paragraph break
        # Также объединяем строки, где номер с точкой стоит отдельно
        result = []
        prev_was_break = False
        for i, line in enumerate(filtered_lines):
            if line == '__PARAGRAPH_BREAK__':
                if result and not prev_was_break:
                    result.append('__PARAGRAPH_BREAK__')
                prev_was_break = True
            else:
                # Проверяем, не нужно ли объединить с предыдущей строкой
                # Если предыдущая строка заканчивается на номер с точкой (например, "3.")
                # и текущая начинается с заглавной буквы, объединяем без пробела
                if result and not prev_was_break:
                    prev_line = result[-1] if result else ""
                    # Если предыдущая строка заканчивается на "число.", а текущая начинается с заглавной
                    if re.search(r'\d+\.$', prev_line) and line and line[0].isupper():
                        # Объединяем без пробела: "3." + "Кедрина" = "3.Кедрина"
                        # Но лучше с пробелом: "3. Кедрина"
                        result[-1] = prev_line + " " + line
                    else:
                        result.append(' ')  # Same paragraph
                        result.append(line)
                else:
                    result.append(line)
                prev_was_break = False
        return ''.join(result)
    else:
        # Join with spaces instead of newlines to avoid artificial breaks
        # Но также объединяем строки с номерами
        result = []
        for i, line in enumerate(filtered_lines):
            if i > 0:
                prev_line = filtered_lines[i - 1]
                # Если предыдущая строка заканчивается на "число.", а текущая начинается с заглавной
                if re.search(r'\d+\.$', prev_line) and line and line[0].isupper():
                    result[-1] = prev_line + " " + line
                else:
                    result.append(' ')
                    result.append(line)
            else:
                result.append(line)
        return ''.join(result)


def try_merge_for_paired_symbols(chunks: List[str], max_lookahead: int = 3) -> List[str]:
    """
    Пытается объединить чанки, если парные символы разделены между ними.
    Например, если кавычка открыта в одном чанке, а закрыта в следующем.
    Проверяет несколько следующих чанков для лучшего объединения.
    
    Args:
        max_lookahead: Максимальное количество следующих чанков для проверки
    """
    if not chunks:
        return chunks
    
    merged_chunks = []
    i = 0
    
    while i < len(chunks):
        current_chunk = chunks[i]
        
        # Проверяем баланс парных символов
        pairs_status = has_balanced_pairs(current_chunk)
        
        # Если все пары сбалансированы, добавляем чанк как есть
        if all(pairs_status.values()):
            merged_chunks.append(current_chunk)
            i += 1
            continue
        
        # Если есть несбалансированные пары, ищем подходящий чанк для объединения
        best_merge = None
        best_merge_idx = None
        best_improvement = 0
        
        # Проверяем следующие чанки (до max_lookahead)
        for lookahead in range(1, min(max_lookahead + 1, len(chunks) - i)):
            if i + lookahead >= len(chunks):
                break
            
            # Объединяем текущий чанк с чанком через lookahead позиций
            chunks_to_merge = chunks[i:i+lookahead+1]
            combined = " ".join(chunks_to_merge)
            
            # Проверяем длину (более гибкий лимит для парных символов)
            max_allowed = 300 if lookahead == 1 else 350  # Больше лимит для дальних объединений
            
            if len(combined) <= max_allowed:
                combined_pairs = has_balanced_pairs(combined)
                
                # Считаем улучшение баланса
                current_balanced = sum(1 for v in pairs_status.values() if v)
                combined_balanced = sum(1 for v in combined_pairs.values() if v)
                improvement = combined_balanced - current_balanced
                
                # Если баланс улучшился и это лучшее улучшение
                if improvement > best_improvement:
                    best_merge = combined
                    best_merge_idx = i + lookahead
                    best_improvement = improvement
        
        # Если нашли хорошее объединение
        if best_merge and best_improvement > 0:
            merged_chunks.append(best_merge)
            i = best_merge_idx + 1
        else:
            # Если не удалось объединить, добавляем как есть
            merged_chunks.append(current_chunk)
            i += 1
    
    return merged_chunks




def split_text_into_chunks(
    text: str,
    min_duration: int = None,
    max_duration: int = None,
    sentence_threshold: int = None
) -> List[str]:
    """
    Разбивает текст на чанки оптимальной длины для TTS обучения.
    
    Основано на количестве символов (средняя длина слова в кыргызском = 5):
    - Минимум: 50 символов (~10 слов, ~4-5 секунд)
    - Оптимум: 70-120 символов (~14-24 слова, ~6-10 секунд)
    - Максимум: 140 символов (~28 слов, ~13 секунд)
    
    Улучшения:
    - Сохраняет структуру абзацев
    - Учитывает смысловые границы
    - Лучше обрабатывает парные символы
    - Более гибкие лимиты для сохранения целостности
    
    Параметры min_duration, max_duration, sentence_threshold оставлены
    для обратной совместимости, но не используются.
    """
    # Оптимальные значения по символам (с учетом средней длины слова = 5)
    MIN_CHARS = 50      # ~10 слов, ~4-5 секунд
    OPTIMAL_MIN = 70    # ~14 слов, ~6 секунд
    OPTIMAL_MAX = 120   # ~24 слова, ~10 секунд
    MAX_CHARS = 140     # ~28 слов, ~13 секунд
    SPLIT_THRESHOLD = 200  # Если больше - обязательно делим
    # Увеличенный лимит для сохранения смысловых единиц (абзацы, диалоги)
    MAX_CHARS_FOR_CONTEXT = 180  # Для важных контекстов (абзацы, парные символы)
    
    # Предварительная обработка: удаляем колонтитулы, номера страниц, темы
    # Сохраняем структуру абзацев для лучшего разбиения
    text = preprocess_text_for_chunking(text, preserve_paragraphs=True)
    
    if not text:
        return []
    
    # Очищаем текст, но сначала заменяем маркеры абзацев на временные маркеры
    # чтобы clean_text_for_tts их не удалил
    paragraph_placeholder = '___PARAGRAPH_MARKER___'
    text = text.replace('__PARAGRAPH_BREAK__', paragraph_placeholder)
    
    # Очищаем текст
    text = clean_text_for_tts(text)
    
    # Восстанавливаем маркеры абзацев
    text = text.replace(paragraph_placeholder, '__PARAGRAPH_BREAK__')
    
    if not text:
        return []
    
    # Разбиваем на предложения (с учетом структуры абзацев)
    sentences = split_into_sentences(text)
    
    if not sentences:
        return []
    
    chunks = []
    current_chunk = ""
    is_paragraph_start = False  # Флаг начала абзаца
    
    for sentence in sentences:
        sentence = sentence.strip()
        
        if not sentence:
            continue
        
        # Проверяем, является ли это началом абзаца
        if '__PARAGRAPH_BREAK__' in sentence:
            is_paragraph_start = True
            sentence = sentence.replace('__PARAGRAPH_BREAK__', '').strip()
            if not sentence:
                continue
        
        sentence_len = len(sentence)
        
        # Случай 1: Предложение оптимальной длины (70-120 символов)
        if OPTIMAL_MIN <= sentence_len <= OPTIMAL_MAX:
            # Если это начало абзаца и текущий чанк короткий, можно объединить
            if is_paragraph_start and current_chunk and len(current_chunk) < OPTIMAL_MIN:
                test_chunk = (current_chunk + " " + sentence).strip()
                if len(test_chunk) <= OPTIMAL_MAX:
                    chunks.append(test_chunk)
                    current_chunk = ""
                    is_paragraph_start = False
                    continue
            
            # Сохраняем текущий чанк
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            # Добавляем предложение как отдельный чанк
            chunks.append(sentence)
            is_paragraph_start = False
            continue
        
        # Случай 2: Предложение короткое (< 70 символов)
        if sentence_len < OPTIMAL_MIN:
            # Если это начало абзаца, стараемся не объединять с предыдущим
            # (если только предыдущий чанк не очень короткий)
            if is_paragraph_start and current_chunk and len(current_chunk) >= MIN_CHARS:
                # Сохраняем текущий чанк и начинаем новый
                chunks.append(current_chunk)
                current_chunk = sentence
                is_paragraph_start = False
                continue
            
            test_chunk = (current_chunk + " " + sentence).strip() if current_chunk else sentence
            test_len = len(test_chunk)
            
            # Если вместе оптимально (70-120)
            if OPTIMAL_MIN <= test_len <= OPTIMAL_MAX:
                chunks.append(test_chunk)
                current_chunk = ""
                is_paragraph_start = False
            # Если вместе допустимо (50-140)
            elif MIN_CHARS <= test_len <= MAX_CHARS:
                # Если ближе к оптимуму, сохраняем
                if test_len >= OPTIMAL_MIN - 20:
                    chunks.append(test_chunk)
                    current_chunk = ""
                    is_paragraph_start = False
                else:
                    current_chunk = test_chunk
                    is_paragraph_start = False
            # Если вместе все еще коротко
            elif test_len < MIN_CHARS:
                current_chunk = test_chunk
                is_paragraph_start = False
            # Если вместе слишком длинно
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence
                is_paragraph_start = False
            continue
        
        # Случай 3: Предложение допустимое (120-140 символов)
        if OPTIMAL_MAX < sentence_len <= MAX_CHARS:
            # Пробуем разбить по точкам с запятой/двоеточиям
            fragments = split_by_semicolon_colon(sentence)
            
            if len(fragments) > 1:
                # Сохраняем текущий чанк
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = ""
                
                # Обрабатываем фрагменты
                for fragment in fragments:
                    fragment = clean_chunk_edges(fragment)
                    if not fragment:
                        continue
                    
                    frag_len = len(fragment)
                    
                    if frag_len >= MIN_CHARS:
                        if current_chunk:
                            test_chunk = (current_chunk + " " + fragment).strip()
                            if len(test_chunk) <= MAX_CHARS:
                                current_chunk = test_chunk
                            else:
                                chunks.append(current_chunk)
                                current_chunk = fragment
                        else:
                            current_chunk = fragment
                    else:
                        current_chunk = (current_chunk + " " + fragment).strip() if current_chunk else fragment
            else:
                # Не удалось разбить - добавляем как есть
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = ""
                chunks.append(sentence)
            continue
        
        # Случай 4: Предложение длинное (> 140 символов)
        if current_chunk:
            chunks.append(current_chunk)
            current_chunk = ""
        
        # Сначала пробуем по точкам с запятой/двоеточиям
        fragments = split_by_semicolon_colon(sentence)
        
        if len(fragments) > 1 and all(len(f) <= SPLIT_THRESHOLD for f in fragments):
            # Обрабатываем фрагменты
            for fragment in fragments:
                fragment = clean_chunk_edges(fragment)
                if not fragment:
                    continue
                
                frag_len = len(fragment)
                
                if frag_len <= MAX_CHARS and frag_len >= MIN_CHARS:
                    if current_chunk:
                        test_chunk = (current_chunk + " " + fragment).strip()
                        if len(test_chunk) <= MAX_CHARS:
                            current_chunk = test_chunk
                        else:
                            chunks.append(current_chunk)
                            current_chunk = fragment
                    else:
                        current_chunk = fragment
                elif frag_len < MIN_CHARS:
                    current_chunk = (current_chunk + " " + fragment).strip() if current_chunk else fragment
                else:
                    # Фрагмент все еще длинный - делим по запятым
                    sub_fragments = split_by_comma(fragment)
                    for sub_frag in sub_fragments:
                        sub_frag = clean_chunk_edges(sub_frag)
                        if not sub_frag:
                            continue
                        
                        sub_len = len(sub_frag)
                        
                        if sub_len <= MAX_CHARS:
                            if current_chunk:
                                test_chunk = (current_chunk + " " + sub_frag).strip()
                                if len(test_chunk) <= MAX_CHARS:
                                    current_chunk = test_chunk
                                else:
                                    chunks.append(current_chunk)
                                    current_chunk = sub_frag
                            else:
                                current_chunk = sub_frag
                        else:
                            # Все еще длинный - по словам
                            if current_chunk:
                                chunks.append(current_chunk)
                                current_chunk = ""
                            
                            word_chunks = split_by_words(sub_frag, MAX_CHARS)
                            for wc in word_chunks[:-1]:
                                chunks.append(wc)
                            if word_chunks:
                                current_chunk = word_chunks[-1]
        else:
            # Делим по запятым
            comma_fragments = split_by_comma(sentence)
            
            if len(comma_fragments) > 1:
                for fragment in comma_fragments:
                    fragment = clean_chunk_edges(fragment)
                    if not fragment:
                        continue
                    
                    frag_len = len(fragment)
                    
                    if frag_len <= MAX_CHARS:
                        if current_chunk:
                            test_chunk = (current_chunk + " " + fragment).strip()
                            if len(test_chunk) <= MAX_CHARS:
                                current_chunk = test_chunk
                            else:
                                chunks.append(current_chunk)
                                current_chunk = fragment
                        else:
                            current_chunk = fragment
                    else:
                        # По словам
                        if current_chunk:
                            chunks.append(current_chunk)
                            current_chunk = ""
                        
                        word_chunks = split_by_words(fragment, MAX_CHARS)
                        for wc in word_chunks[:-1]:
                            chunks.append(wc)
                        if word_chunks:
                            current_chunk = word_chunks[-1]
            else:
                # Крайний случай - по словам
                word_chunks = split_by_words(sentence, MAX_CHARS)
                for wc in word_chunks[:-1]:
                    chunks.append(wc)
                if word_chunks:
                    current_chunk = word_chunks[-1]
    
    # Добавляем последний чанк
    if current_chunk:
        chunks.append(current_chunk)
    
    # Финальная обработка
    final_chunks = []
    
    for chunk in chunks:
        # Очищаем края
        chunk = clean_chunk_edges(chunk)
        
        if not chunk:
            continue
        
        chunk_len = len(chunk)
        
        # Если чанк короткий и есть предыдущий
        if chunk_len < MIN_CHARS and final_chunks:
            # Пробуем объединить с предыдущим
            combined = (final_chunks[-1] + " " + chunk).strip()
            
            if len(combined) <= MAX_CHARS:
                final_chunks[-1] = combined
            else:
                # Не помещается - проверяем валидность и добавляем отдельно
                if is_valid_chunk(chunk, min_chars=40):  # Снижаем порог для последних чанков
                    final_chunks.append(chunk)
        else:
            final_chunks.append(chunk)
    
    # Финальная валидация
    validated_chunks = []
    
    for chunk in final_chunks:
        chunk = clean_chunk_edges(chunk)
        if is_valid_chunk(chunk):
            validated_chunks.append(chunk)
    
    # Пытаемся объединить чанки с несбалансированными парными символами
    # Используем увеличенный lookahead для лучшего объединения
    validated_chunks = try_merge_for_paired_symbols(validated_chunks, max_lookahead=5)
    
    # Финальная очистка: удаляем маркеры абзацев из финальных чанков
    final_cleaned_chunks = []
    for chunk in validated_chunks:
        cleaned = chunk.replace('__PARAGRAPH_BREAK__', ' ').strip()
        # Убираем множественные пробелы
        cleaned = re.sub(r'\s+', ' ', cleaned)
        if cleaned and is_valid_chunk(cleaned):
            final_cleaned_chunks.append(cleaned)
    
    return final_cleaned_chunks