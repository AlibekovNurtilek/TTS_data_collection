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
    # Короткие слова (3-4 символа) читаются быстрее
    # Длинные слова (7+ символов) читаются медленнее
    if avg_word_length <= 4:
        adjusted_wpm = words_per_minute * 1.1  # Читаем быстрее
    elif avg_word_length <= 6:
        adjusted_wpm = words_per_minute  # Нормальная скорость
    else:
        adjusted_wpm = words_per_minute * 0.85  # Читаем медленнее
    
    minutes = len(words) / adjusted_wpm
    return int(minutes * 60)


def split_text_into_chunks(
    text: str,
    min_duration: int = None,
    max_duration: int = None,
    sentence_threshold: int = None
) -> List[str]:
    """
    Разбивает текст на чанки с учетом длительности чтения.
    
    Стратегия разбиения:
    - Если предложение > threshold символов: разбиваем по предложениям (. ! ? : ; ...)
    - Если предложение < threshold символов: разбиваем по любым знакам препинания
    
    Цель: каждый чанк должен читаться min_duration - max_duration секунд.
    """
    # Используем значения из конфига, если не указаны
    min_duration = min_duration or settings.CHUNK_MIN_DURATION
    max_duration = max_duration or settings.CHUNK_MAX_DURATION
    sentence_threshold = sentence_threshold or settings.SENTENCE_LENGTH_THRESHOLD
    
    # Нормализуем пробелы
    text = re.sub(r'\s+', ' ', text).strip()
    if not text:
        return []
    
    chunks = []
    
    # Шаг 1: Разбиваем текст на предложения по основным разделителям
    # Используем более полный паттерн для предложений: . ! ? : ; ... (многоточие)
    sentence_pattern = r'([.!?:;]\s+|\.{2,}\s*)'
    parts = re.split(sentence_pattern, text)
    
    # Объединяем предложения с их разделителями
    sentences = []
    for i in range(0, len(parts), 2):
        if i < len(parts):
            sentence = parts[i]
            if i + 1 < len(parts):
                sentence += parts[i + 1]
            sentence = sentence.strip()
            if sentence:
                sentences.append(sentence)
    
    current_chunk = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        # Определяем стратегию разбиения в зависимости от длины предложения
        if len(sentence) > sentence_threshold:
            # Длинное предложение: разбиваем по предложениям (. ! ? : ; ...)
            parts_to_process = [sentence]
        else:
            # Короткое предложение: разбиваем по любым знакам препинания
            # Запятые, точки с запятой, тире, двоеточия и т.д.
            punctuation_pattern = r'([,;:–—\-]\s+)'
            parts_split = re.split(punctuation_pattern, sentence)
            
            # Объединяем части с разделителями
            parts_to_process = []
            for i in range(0, len(parts_split), 2):
                if i < len(parts_split):
                    part = parts_split[i]
                    if i + 1 < len(parts_split):
                        part += parts_split[i + 1]
                    part = part.strip()
                    if part:
                        parts_to_process.append(part)
            
            # Если не удалось разбить по знакам препинания, используем предложение целиком
            if not parts_to_process:
                parts_to_process = [sentence]
        
        # Обрабатываем каждую часть
        for part in parts_to_process:
            part = part.strip()
            if not part:
                continue
            
            # Проверяем, поместится ли часть в текущий чанк
            test_chunk = (current_chunk + " " + part).strip() if current_chunk else part
            duration = estimate_reading_time(test_chunk)
            
            if duration <= max_duration:
                # Часть помещается в текущий чанк
                current_chunk = test_chunk
            else:
                # Часть слишком длинная
                # Сохраняем текущий чанк, если он есть
                if current_chunk:
                    chunks.append(current_chunk)
                    current_chunk = ""
                
                # Пытаемся разбить часть дальше
                if len(part) > sentence_threshold:
                    # Длинная часть: разбиваем по предложениям
                    sub_parts = re.split(r'([.!?:;]\s+|\.{2,}\s*)', part)
                    sub_sentences = []
                    for i in range(0, len(sub_parts), 2):
                        if i < len(sub_parts):
                            sub_sent = sub_parts[i]
                            if i + 1 < len(sub_parts):
                                sub_sent += sub_parts[i + 1]
                            sub_sent = sub_sent.strip()
                            if sub_sent:
                                sub_sentences.append(sub_sent)
                    
                    for sub_sent in sub_sentences:
                        test_chunk = (current_chunk + " " + sub_sent).strip() if current_chunk else sub_sent
                        duration = estimate_reading_time(test_chunk)
                        
                        if duration <= max_duration:
                            current_chunk = test_chunk
                        else:
                            # Все еще слишком длинное, разбиваем по словам
                            if current_chunk:
                                chunks.append(current_chunk)
                                current_chunk = ""
                            
                            words = sub_sent.split()
                            temp_chunk = ""
                            
                            for word in words:
                                test_chunk = (temp_chunk + " " + word).strip() if temp_chunk else word
                                duration = estimate_reading_time(test_chunk)
                                
                                if duration <= max_duration:
                                    temp_chunk = test_chunk
                                else:
                                    if temp_chunk:
                                        chunks.append(temp_chunk)
                                    temp_chunk = word
                            
                            if temp_chunk:
                                current_chunk = temp_chunk
                else:
                    # Короткая часть, но не помещается - разбиваем по словам
                    words = part.split()
                    temp_chunk = ""
                    
                    for word in words:
                        test_chunk = (temp_chunk + " " + word).strip() if temp_chunk else word
                        duration = estimate_reading_time(test_chunk)
                        
                        if duration <= max_duration:
                            temp_chunk = test_chunk
                        else:
                            if temp_chunk:
                                chunks.append(temp_chunk)
                            temp_chunk = word
                    
                    if temp_chunk:
                        current_chunk = temp_chunk
    
    # Добавляем последний чанк
    if current_chunk:
        chunks.append(current_chunk)
    
    # Фильтруем слишком короткие чанки (объединяем с предыдущим)
    filtered_chunks = []
    for chunk in chunks:
        chunk = chunk.strip()
        if not chunk:
            continue
        
        duration = estimate_reading_time(chunk)
        if duration < min_duration and filtered_chunks:
            # Объединяем с предыдущим, если не превышает максимум
            combined = (filtered_chunks[-1] + " " + chunk).strip()
            combined_duration = estimate_reading_time(combined)
            if combined_duration <= max_duration:
                filtered_chunks[-1] = combined
            else:
                # Не помещается, оставляем отдельно
                filtered_chunks.append(chunk)
        else:
            filtered_chunks.append(chunk)
    
    return filtered_chunks
