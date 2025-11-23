import re
from typing import List
from app.config import settings


def estimate_reading_time(text: str, words_per_minute: int = 150) -> int:
    """
    Оценивает время чтения текста в секундах с учетом длины слов.
    Длинные слова читаются медленнее, короткие - быстрее.
    """
    if not text.strip():
        return 0
    
    words = text.split()
    if not words:
        return 0
    
    # Учитываем среднюю длину слова для более точной оценки
    total_chars = sum(len(word) for word in words)
    avg_word_length = total_chars / len(words) if words else 0
    
    # Корректируем скорость чтения в зависимости от длины слов
    if avg_word_length <= 4:
        adjusted_wpm = words_per_minute * 1.1  # Читаем быстрее
    elif avg_word_length <= 6:
        adjusted_wpm = words_per_minute  # Нормальная скорость
    else:
        adjusted_wpm = words_per_minute * 0.85  # Читаем медленнее
    
    minutes = len(words) / adjusted_wpm
    return int(minutes * 60)


def clean_text_for_tts(text: str) -> str:
    """
    Очищает текст от символов, которые не подходят для TTS обучения.
    """
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
    
    # Убираем множественные пробелы и переносы строк
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip()


def is_valid_chunk(text: str, min_words: int = 2) -> bool:
    """
    Проверяет, является ли чанк валидным для TTS обучения.
    """
    text = text.strip()
    
    if not text:
        return False
    
    # Проверяем наличие хотя бы одной буквы
    if not re.search(r'[а-яёА-ЯЁa-zA-Z]', text):
        return False
    
    # Проверяем минимальное количество слов
    words = text.split()
    if len(words) < min_words:
        return False
    
    # Проверяем процент спецсимволов (не должно быть больше 30%)
    total_chars = len(text)
    special_chars = len(re.findall(r'[^а-яёА-ЯЁa-zA-Z0-9\s.,!?;:\-—"\']', text))
    if total_chars > 0 and (special_chars / total_chars) > 0.3:
        return False
    
    # Проверяем, не состоит ли текст только из заглавных букв (часто метаданные)
    letters = re.findall(r'[а-яёА-ЯЁa-zA-Z]', text)
    if letters and all(c.isupper() for c in letters):
        return False
    
    # Проверяем, не слишком ли много цифр (более 50% - подозрительно)
    digits = len(re.findall(r'\d', text))
    if total_chars > 0 and (digits / total_chars) > 0.5:
        return False
    
    return True


def split_into_sentences(text: str) -> List[str]:
    """
    Разбивает текст на предложения по основным знакам препинания.
    """
    # Паттерн для разбиения на предложения
    # Учитываем: . ! ? ... и их комбинации с кавычками
    pattern = r'([.!?]+["»"]?\s+|\.{2,}\s+)'
    
    parts = re.split(pattern, text)
    
    # Объединяем предложения с их разделителями
    sentences = []
    i = 0
    while i < len(parts):
        sentence = parts[i]
        # Добавляем разделитель, если он есть
        if i + 1 < len(parts) and re.match(pattern, parts[i + 1]):
            sentence += parts[i + 1]
            i += 2
        else:
            i += 1
        
        sentence = sentence.strip()
        if sentence:
            sentences.append(sentence)
    
    return sentences


def split_by_punctuation(text: str) -> List[str]:
    """
    Разбивает текст по знакам препинания (запятая, точка с запятой, двоеточие, тире).
    """
    # Паттерн для разбиения по знакам препинания
    pattern = r'([,;:—\-]\s+)'
    
    parts = re.split(pattern, text)
    
    # Объединяем части с их разделителями
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


def split_by_words(text: str, max_duration: int) -> List[str]:
    """
    Разбивает текст по словам (крайний случай для очень длинных фрагментов).
    """
    words = text.split()
    chunks = []
    current_chunk = ""
    
    for word in words:
        test_chunk = (current_chunk + " " + word).strip() if current_chunk else word
        duration = estimate_reading_time(test_chunk)
        
        if duration <= max_duration:
            current_chunk = test_chunk
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = word
    
    if current_chunk:
        chunks.append(current_chunk)
    
    return chunks


def split_text_into_chunks(
    text: str,
    min_duration: int = None,
    max_duration: int = None,
    sentence_threshold: int = None
) -> List[str]:
    """
    Разбивает текст на чанки оптимальной длины для TTS обучения.
    
    Стратегия:
    1. Очистка текста от нежелательных символов
    2. Разбиение на предложения
    3. Объединение коротких предложений
    4. Разбиение длинных по знакам препинания
    5. Валидация и фильтрация чанков
    
    Оптимальная длительность: 5-10 секунд
    Допустимая длительность: 3-12 секунд
    """
    # Используем оптимальные значения для TTS
    min_duration = min_duration or 3   # Минимум 3 секунды
    max_duration = max_duration or 12  # Максимум 12 секунд
    optimal_min = 5  # Оптимальный минимум 5 секунд
    optimal_max = 10  # Оптимальный максимум 10 секунд
    
    # Очищаем текст
    text = clean_text_for_tts(text)
    
    if not text:
        return []
    
    # Разбиваем на предложения
    sentences = split_into_sentences(text)
    
    if not sentences:
        return []
    
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        
        if not sentence:
            continue
        
        # Проверяем длительность предложения
        sentence_duration = estimate_reading_time(sentence)
        
        # Случай 1: Предложение оптимальной длины (5-10 сек)
        if optimal_min <= sentence_duration <= optimal_max:
            # Сохраняем текущий чанк, если есть
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            # Добавляем предложение как отдельный чанк
            chunks.append(sentence)
            continue
        
        # Случай 2: Предложение короткое (< 5 сек)
        if sentence_duration < optimal_min:
            # Пробуем объединить с текущим чанком
            test_chunk = (current_chunk + " " + sentence).strip() if current_chunk else sentence
            test_duration = estimate_reading_time(test_chunk)
            
            # Если вместе получается оптимально (5-10 сек)
            if optimal_min <= test_duration <= optimal_max:
                chunks.append(test_chunk)
                current_chunk = ""
            # Если вместе все еще коротко (< 5 сек), продолжаем накапливать
            elif test_duration < optimal_min:
                current_chunk = test_chunk
            # Если вместе допустимо (10-12 сек), все равно объединяем
            elif test_duration <= max_duration:
                chunks.append(test_chunk)
                current_chunk = ""
            # Если вместе слишком длинно (> 12 сек)
            else:
                # Сохраняем текущий чанк
                if current_chunk:
                    chunks.append(current_chunk)
                # Начинаем новый с этого предложения
                current_chunk = sentence
            continue
        
        # Случай 3: Предложение допустимое (10-12 сек)
        if optimal_max < sentence_duration <= max_duration:
            # Сохраняем текущий чанк, если есть
            if current_chunk:
                chunks.append(current_chunk)
                current_chunk = ""
            # Добавляем предложение как отдельный чанк
            chunks.append(sentence)
            continue
        
        # Случай 4: Предложение слишком длинное (> 12 сек)
        # Сохраняем текущий чанк, если есть
        if current_chunk:
            chunks.append(current_chunk)
            current_chunk = ""
        
        # Разбиваем по знакам препинания
        fragments = split_by_punctuation(sentence)
        
        if len(fragments) > 1:
            # Обрабатываем каждый фрагмент
            for fragment in fragments:
                fragment = fragment.strip()
                if not fragment:
                    continue
                
                fragment_duration = estimate_reading_time(fragment)
                
                # Если фрагмент оптимальный
                if min_duration <= fragment_duration <= max_duration:
                    if current_chunk:
                        test_chunk = (current_chunk + " " + fragment).strip()
                        test_duration = estimate_reading_time(test_chunk)
                        
                        if test_duration <= max_duration:
                            current_chunk = test_chunk
                        else:
                            chunks.append(current_chunk)
                            current_chunk = fragment
                    else:
                        current_chunk = fragment
                # Если фрагмент короткий
                elif fragment_duration < min_duration:
                    current_chunk = (current_chunk + " " + fragment).strip() if current_chunk else fragment
                # Если фрагмент длинный - разбиваем по словам
                else:
                    if current_chunk:
                        chunks.append(current_chunk)
                        current_chunk = ""
                    
                    word_chunks = split_by_words(fragment, max_duration)
                    for wc in word_chunks[:-1]:
                        chunks.append(wc)
                    if word_chunks:
                        current_chunk = word_chunks[-1]
        else:
            # Не удалось разбить по знакам препинания - разбиваем по словам
            word_chunks = split_by_words(sentence, max_duration)
            for wc in word_chunks[:-1]:
                chunks.append(wc)
            if word_chunks:
                current_chunk = word_chunks[-1]
    
    # Добавляем последний чанк
    if current_chunk:
        chunks.append(current_chunk)
    
    # Финальная обработка: объединяем слишком короткие чанки
    final_chunks = []
    
    for chunk in chunks:
        chunk = chunk.strip()
        
        if not chunk:
            continue
        
        # Проверяем валидность
        if not is_valid_chunk(chunk):
            continue
        
        duration = estimate_reading_time(chunk)
        
        # Если чанк короткий и есть предыдущий
        if duration < min_duration and final_chunks:
            # Пробуем объединить с предыдущим
            combined = (final_chunks[-1] + " " + chunk).strip()
            combined_duration = estimate_reading_time(combined)
            
            # Если объединенный не превышает максимум
            if combined_duration <= max_duration:
                final_chunks[-1] = combined
            else:
                # Не помещается - оставляем отдельно
                final_chunks.append(chunk)
        else:
            final_chunks.append(chunk)
    
    # Финальная валидация всех чанков
    validated_chunks = [chunk for chunk in final_chunks if is_valid_chunk(chunk)]
    
    return validated_chunks