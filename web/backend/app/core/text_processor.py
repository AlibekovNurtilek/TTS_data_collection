"""
Текст процессор для TTS дата коллектора.
Разбивает текст на чанки по 3-15 секунд для озвучки.
"""

import re
from typing import List


class KyrgyzTextNormalizer:
    """Упрощенная версия нормализатора из normilizer.py"""
    
    def __init__(self):
        self.ones = ['', 'бир', 'эки', 'үч', 'төрт', 'беш', 'алты', 'жети', 'сегиз', 'тогуз']
        self.tens = ['', 'он', 'жыйырма', 'отуз', 'кырк', 'элүү', 'алтымыш', 'жетимиш', 'сексен', 'токсон']
        self.hundreds = ['', 'жүз', 'эки жүз', 'үч жүз', 'төрт жүз', 'беш жүз', 
                        'алты жүз', 'жети жүз', 'сегиз жүз', 'тогуз жүз']
        
        self.months = {
            '01': 'январь', '02': 'февраль', '03': 'март', '04': 'апрель',
            '05': 'май', '06': 'июнь', '07': 'июль', '08': 'август',
            '09': 'сентябрь', '10': 'октябрь', '11': 'ноябрь', '12': 'декабрь',
            '1': 'январь', '2': 'февраль', '3': 'март', '4': 'апрель',
            '5': 'май', '6': 'июнь', '7': 'июль', '8': 'август',
            '9': 'сентябрь', '10': 'октябрь', '11': 'ноябрь', '12': 'декабрь'
        }
        
        self.short_abbr = {
            'ж.б.у.с.': 'жана башка ушул сыяктуу',
            'ж.б.': 'жана башка',
            'б.з.ч.': 'биздин заманга чейин',
            'б.з.ч': 'биздин заманга чейин',
            'б.з.': 'биздин заман',
            'кк.': 'кылымдар',
            'жж.': 'жылдар',
            'к.': 'кылым',
            'көч.': 'көчөсү',
            'м-н': 'менен',
            'б-ча': 'боюнча',
            'ж-а': 'жана',
            'т.б.': 'тагыраак болсо',
            'ө.к.': 'өңдүү көп',
            'б.а.': 'башкача айтканда',
            'мис.': 'мисалы',
        }
        
        self.kyrgyz_abbr = {
            'КР': 'кыргыз республикасы',
            'КТЖ': 'кыргыз темир жолу',
            'ЖОЖ': 'жогорку окуу жайы',
            'КМШ': 'көз карандысыз мамлекеттердин шериктештиги',
            'ААК': 'ачык акционердик коом',
            'ЖЧК': 'жоопкерчилиги чектелген коом',
            'БУУ': 'бириккен улуттар уюму',
            'АКШ': 'америка кошмо штаттары',
            'СССР': 'советтик социалисттик республикалар союзу',
        }
        
        self.english_abbr = {
            'IT': 'ай ти', 'AI': 'эй ай', 'GPU': 'жи пи ю', 'CPU': 'си пи ю',
            'URL': 'ю ар эл', 'PDF': 'пи ди эф', 'USB': 'ю эс би',
            'WiFi': 'вай фай', 'GPS': 'жи пи эс', 'SMS': 'эс эм эс',
            'TV': 'ти ви', 'OK': 'окей',
        }
        
        self.units = {
            'км': 'километр', 'м': 'метр', 'см': 'сантиметр', 'мм': 'миллиметр',
            'кг': 'килограмм', 'г': 'грамм', 'л': 'литр', 'мл': 'миллилитр',
            'га': 'гектар', 'км²': 'квадрат километр', 'м²': 'квадрат метр',
        }

    def number_to_words(self, num: int) -> str:
        if num == 0:
            return 'нөл'
        if num < 0:
            return 'минус ' + self.number_to_words(abs(num))
        
        result = ''
        
        if num >= 1000000000:
            billions = num // 1000000000
            result += self.number_to_words(billions) + ' миллиард '
            num %= 1000000000
        
        if num >= 1000000:
            millions = num // 1000000
            result += self.number_to_words(millions) + ' миллион '
            num %= 1000000
        
        if num >= 1000:
            thousands = num // 1000
            result += self.number_to_words(thousands) + ' миң '
            num %= 1000
        
        if num >= 100:
            result += self.hundreds[num // 100] + ' '
            num %= 100
        
        if num >= 10:
            result += self.tens[num // 10] + ' '
            num %= 10
        
        if num > 0:
            result += self.ones[num] + ' '
        
        return result.strip()

    def normalize(self, text: str) -> str:
        result = text
        
        # Кыскартуулар
        for abbr, full in sorted(self.short_abbr.items(), key=lambda x: -len(x[0])):
            result = re.sub(re.escape(abbr), full, result, flags=re.IGNORECASE)
        
        # Аббревиатуралар
        for abbr, full in self.kyrgyz_abbr.items():
            result = re.sub(r'\b' + re.escape(abbr) + r'\b', full, result)
        
        for abbr, full in self.english_abbr.items():
            result = re.sub(r'\b' + re.escape(abbr) + r'\b', full, result)
        
        # Өлчөм бирдиктери
        for unit, name in sorted(self.units.items(), key=lambda x: -len(x[0])):
            result = re.sub(
                r'(\d+)\s*' + re.escape(unit) + r'\b',
                lambda m, n=name: f"{self.number_to_words(int(m.group(1)))} {n}",
                result
            )
        
        # Сандарды сөзгө
        result = re.sub(
            r'\b(\d+)\b',
            lambda m: self.number_to_words(int(m.group(1))),
            result
        )
        
        return result


# Глобальный экземпляр нормализатора
_normalizer = KyrgyzTextNormalizer()


# Кириллица (кыргызский + русский) + допустимые знаки препинания
ALLOWED_CHARS_PATTERN = re.compile(r'[^а-яА-ЯөүңӨҮҢёЁ\s.,!?;:\-–—]')

# Паттерн для URL
URL_PATTERN = re.compile(
    r'https?://[^\s]+|'
    r'www\.[^\s]+|'
    r'[a-zA-Z0-9.-]+\.(com|org|net|kg|ru|kz|uz|info|edu)[^\s]*',
    re.IGNORECASE
)

# Паттерн для email
EMAIL_PATTERN = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

# Минимум и максимум слов для чанка (примерно 3-15 секунд озвучки)
# Средняя скорость речи ~130-160 слов/мин, значит:
# 3 сек ≈ 7-8 слов, 15 сек ≈ 32-40 слов
MIN_WORDS = 5
MAX_WORDS = 40

# Минимальное количество букв в валидном чанке
MIN_LETTERS = 10


def _remove_urls_and_emails(text: str) -> str:
    """Удаляет URL и email адреса."""
    text = URL_PATTERN.sub('', text)
    text = EMAIL_PATTERN.sub('', text)
    return text


def _clean_text(text: str) -> str:
    """
    Очищает текст: удаляет все кроме букв и знаков препинания.
    """
    # Удаляем кавычки разных видов (используем unicode коды)
    # « » „ " " " ' ' ' ‚ '
    quote_pattern = '[\u00AB\u00BB\u201E\u201C\u201D\u0022\u0027\u2018\u2019\u201A\u0060]'
    text = re.sub(quote_pattern, '', text)
    
    # Удаляем скобки и их содержимое (часто там ссылки, примечания)
    text = re.sub(r'\([^)]*\)', '', text)
    text = re.sub(r'\[[^\]]*\]', '', text)
    text = re.sub(r'\{[^}]*\}', '', text)
    
    # Заменяем различные тире на обычное (– — −)
    text = re.sub('[\u2013\u2014\u2212]', '-', text)
    
    # Удаляем все недопустимые символы (оставляем только буквы и пунктуацию)
    text = ALLOWED_CHARS_PATTERN.sub(' ', text)
    
    # Нормализуем пробелы
    text = re.sub(r'\s+', ' ', text)
    
    # Убираем пробелы перед знаками препинания
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    
    # Добавляем пробел после знаков препинания если его нет
    text = re.sub(r'([.,!?;:])([а-яА-ЯөүңӨҮҢёЁ])', r'\1 \2', text)
    
    return text.strip()


def _has_letters(text: str) -> bool:
    """Проверяет, содержит ли текст буквы."""
    return bool(re.search(r'[а-яА-ЯөүңӨҮҢёЁ]', text))


def _count_letters(text: str) -> int:
    """Считает количество букв в тексте."""
    return len(re.findall(r'[а-яА-ЯөүңӨҮҢёЁ]', text))


def _count_words(text: str) -> int:
    """Считает количество слов в тексте."""
    words = re.findall(r'[а-яА-ЯөүңӨҮҢёЁ]+', text)
    return len(words)


def _split_into_sentences(text: str) -> List[str]:
    """
    Разбивает текст на предложения.
    """
    # Разделяем по точке, восклицательному и вопросительному знакам
    # Но сохраняем знак в предложении
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def _split_long_sentence(sentence: str, max_words: int) -> List[str]:
    """
    Разбивает длинное предложение по знакам препинания.
    """
    # Пробуем разбить по запятой, точке с запятой, двоеточию
    parts = re.split(r'(?<=[,;:])\s+', sentence)
    
    if len(parts) == 1:
        # Если не получилось разбить, разбиваем по тире
        parts = re.split(r'\s+-\s+', sentence)
    
    if len(parts) == 1:
        # Если всё ещё одна часть, возвращаем как есть
        return [sentence]
    
    # Объединяем слишком короткие части
    result = []
    current = ""
    
    for part in parts:
        part = part.strip()
        if not part:
            continue
            
        if not current:
            current = part
        elif _count_words(current + " " + part) <= max_words:
            current = current + " " + part
        else:
            if current:
                result.append(current)
            current = part
    
    if current:
        result.append(current)
    
    return result if result else [sentence]


def _merge_short_sentences(sentences: List[str], min_words: int, max_words: int) -> List[str]:
    """
    Объединяет слишком короткие предложения.
    """
    if not sentences:
        return []
    
    result = []
    current = ""
    
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        
        current_words = _count_words(current)
        sentence_words = _count_words(sentence)
        combined_words = _count_words(current + " " + sentence) if current else sentence_words
        
        if not current:
            current = sentence
        elif combined_words <= max_words:
            # Можем объединить
            current = current + " " + sentence
        else:
            # Не можем объединить, сохраняем текущий
            if current_words >= min_words or not result:
                result.append(current)
            elif result:
                # Слишком короткий - добавляем к предыдущему если возможно
                prev_words = _count_words(result[-1])
                if prev_words + current_words <= max_words:
                    result[-1] = result[-1] + " " + current
                else:
                    result.append(current)
            current = sentence
    
    # Добавляем последний чанк
    if current:
        current_words = _count_words(current)
        if current_words >= min_words or not result:
            result.append(current)
        elif result:
            prev_words = _count_words(result[-1])
            if prev_words + current_words <= max_words:
                result[-1] = result[-1] + " " + current
            else:
                result.append(current)
    
    return result


def split_text_into_chunks(
    text: str,
    min_words: int = MIN_WORDS,
    max_words: int = MAX_WORDS,
    normalize: bool = True
) -> List[str]:
    """
    Разбивает текст на чанки для TTS.
    
    Каждый чанк:
    - Содержит только буквы и знаки препинания
    - Нормализован (числа -> слова, аббревиатуры -> полные формы)
    - Длиной примерно 3-15 секунд озвучки (5-40 слов)
    - 1 чанк ≈ 1 предложение (или часть длинного предложения)
    
    Args:
        text: Исходный текст
        min_words: Минимальное количество слов в чанке
        max_words: Максимальное количество слов в чанке
        normalize: Применять ли нормализацию (числа в слова и т.д.)
    
    Returns:
        Список чанков готовых для TTS озвучки
    """
    if not text or not text.strip():
        return []
    
    # 1. Удаляем URL и email
    text = _remove_urls_and_emails(text)
    
    # 2. Нормализуем текст (числа -> слова, аббревиатуры и т.д.)
    if normalize:
        text = _normalizer.normalize(text)
    
    # 3. Очищаем текст (оставляем только буквы и пунктуацию)
    text = _clean_text(text)
    
    # 4. Разбиваем на предложения
    sentences = _split_into_sentences(text)
    
    # 5. Обрабатываем каждое предложение
    processed = []
    for sentence in sentences:
        word_count = _count_words(sentence)
        
        if word_count > max_words:
            # Слишком длинное - разбиваем
            parts = _split_long_sentence(sentence, max_words)
            processed.extend(parts)
        else:
            processed.append(sentence)
    
    # 6. Объединяем слишком короткие
    chunks = _merge_short_sentences(processed, min_words, max_words)
    
    # 7. Финальная фильтрация
    result = []
    for chunk in chunks:
        chunk = chunk.strip()
        
        # Пропускаем пустые и чанки без букв
        if not chunk or not _has_letters(chunk):
            continue
        
        # Пропускаем слишком короткие (меньше MIN_LETTERS букв)
        if _count_letters(chunk) < MIN_LETTERS:
            continue
        
        # Финальная очистка
        chunk = re.sub(r'\s+', ' ', chunk)
        chunk = chunk.strip()
        
        # Убираем висящие знаки препинания в начале
        chunk = re.sub(r'^[.,;:\-–—\s]+', '', chunk)
        
        if chunk and _has_letters(chunk):
            result.append(chunk)
    
    return result
