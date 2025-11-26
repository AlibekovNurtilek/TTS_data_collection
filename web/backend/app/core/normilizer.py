#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Кыргызча текст нормализатор TTS системасы үчүн
Сандарды, даталарды, убакытты, акча бирдиктерин жана башка форматтарды сөзгө айландырат
"""

import re
import sys


class KyrgyzTextNormalizer:
    def __init__(self):
        # Сандар 0-9
        self.ones = ['', 'бир', 'эки', 'үч', 'төрт', 'беш', 'алты', 'жети', 'сегиз', 'тогуз']
        self.tens = ['', 'он', 'жыйырма', 'отуз', 'кырк', 'элүү', 'алтымыш', 'жетимиш', 'сексен', 'токсон']
        self.hundreds = ['', 'жүз', 'эки жүз', 'үч жүз', 'төрт жүз', 'беш жүз', 
                        'алты жүз', 'жети жүз', 'сегиз жүз', 'тогуз жүз']
        
        # Иреттик сандар (порядковые)
        self.ordinal_ones = ['', 'биринчи', 'экинчи', 'үчүнчү', 'төртүнчү', 'бешинчи', 
                            'алтынчы', 'жетинчи', 'сегизинчи', 'тогузунчу']
        self.ordinal_tens = ['', 'онунчу', 'жыйырманчы', 'отузунчу', 'кыркынчы', 'элүүнчү', 
                            'алтымышынчы', 'жетимишинчи', 'сексенинчи', 'токсонунчу']
        
        # Айлар
        self.months = {
            '01': 'январь', '02': 'февраль', '03': 'март', '04': 'апрель',
            '05': 'май', '06': 'июнь', '07': 'июль', '08': 'август',
            '09': 'сентябрь', '10': 'октябрь', '11': 'ноябрь', '12': 'декабрь',
            '1': 'январь', '2': 'февраль', '3': 'март', '4': 'апрель',
            '5': 'май', '6': 'июнь', '7': 'июль', '8': 'август',
            '9': 'сентябрь', '10': 'октябрь', '11': 'ноябрь', '12': 'декабрь'
        }
        
        # Ай аттары (текст түрүндө)
        self.month_names = {
            'январь': 'январь', 'февраль': 'февраль', 'март': 'март', 'апрель': 'апрель',
            'май': 'май', 'июнь': 'июнь', 'июль': 'июль', 'август': 'август',
            'сентябрь': 'сентябрь', 'октябрь': 'октябрь', 'ноябрь': 'ноябрь', 'декабрь': 'декабрь'
        }
        
        # Кыскартуулар (чекиттүү)
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
        
        # Кыргызча аббревиатуралар
        self.kyrgyz_abbr = {
            'КР': 'кыргыз республикасы',
            'КТЖ': 'кыргыз темир жолу',
            'ЖОЖ': 'жогорку окуу жайы',
            'КМШ': 'көз карандысыз мамлекеттердин шериктештиги',
            'ААК': 'ачык акционердик коом',
            'ЖЧК': 'жоопкерчилиги чектелген коом',
            'БУУ': 'бириккен улуттар уюму',
            'АКШ': 'америка кошмо штаттары',
            'БШК': 'борбордук шайлоо комиссиясы',
            'ШКУ': 'шанхай кызматташтык уюму',
            'ЕККУ': 'европа коопсуздук жана кызматташуу уюму',
            'ЕБ': 'европалык биримдик',
            'ЕАЭБ': 'евразия экономикалык биримдиги',
            'СССР': 'советтик социалисттик республикалар союзу',
            'ФСК': 'сорос кыргызстан фонду',
            'ЭЭА': 'эркин экономикалык аймак',
            'ПРООН': 'бириккен улуттар уюмунун өнүктүрүү программасы',
            'UNICEF': 'бириккен улуттар уюмунун балдар фонду',
            'USAID': 'америка кошмо штаттарынын эл аралык өнүктүрүү агенттиги',
            'ИДП': 'ички дүң продукциясы',
            # Жаңы аббревиатуралар
            'ЖМК': 'жалпыга маалымдоо каражаттары',
            'ЖАМК': 'жаза аткаруу мамлекеттик кызматы',
            'УКМК': 'улуттук коопсуздук мамлекеттик комитети',
            'ТИМ': 'тышкы иштер министрлиги',
            'ӨКМ': 'өзгөчө кырдаалдар министрлиги',
            'ИИМ': 'ички иштер министрлиги',
            'ОИИБ': 'облустук ички иштер башкармалыгы',
            'ШИИББ': 'шаардык ички иштер башкы башкармалыгы',
            'РИИБ': 'райондук ички иштер башкармалыгы',
            'ЧЧК': 'чоң чүй каналы'
        }
        
        # Англисче аббревиатуралар (тамга боюнча окулат)
        self.english_abbr = {
            'IT': 'ай ти',
            'AI': 'эй ай',
            'GPU': 'жи пи ю',
            'CPU': 'си пи ю',
            'ML': 'эм эл',
            'API': 'эй пи ай',
            'URL': 'ю ар эл',
            'HTTP': 'эйч ти ти пи',
            'HTTPS': 'эйч ти ти пи эс',
            'HTML': 'эйч ти эм эл',
            'CSS': 'си эс эс',
            'PDF': 'пи ди эф',
            'USB': 'ю эс би',
            'WiFi': 'вай фай',
            'GPS': 'жи пи эс',
            'SMS': 'эс эм эс',
            'SIM': 'сим',
            'PIN': 'пин',
            'ATM': 'эй ти эм',
            'VPN': 'ви пи эн',
            'iOS': 'ай о эс',
            'RAM': 'рам',
            'ROM': 'ром',
            'SSD': 'эс эс ди',
            'HDD': 'эйч ди ди',
            'LED': 'лед',
            'LCD': 'эл си ди',
            'TV': 'ти ви',
            'DVD': 'ди ви ди',
            'CD': 'си ди',
            'PR': 'пи ар',
            'HR': 'эйч ар',
            'CEO': 'си и о',
            'ID': 'ай ди',
            'OK': 'окей',
            'QR': 'кю ар'
        }
        
        # Өлчөм бирдиктери
        self.units = {
            # Кыргызча
            'км': 'километр',
            'м': 'метр',
            'см': 'сантиметр',
            'мм': 'миллиметр',
            'кг': 'килограмм',
            'г': 'грамм',
            'мг': 'миллиграмм',
            'т': 'тонна',
            'л': 'литр',
            'мл': 'миллилитр',
            'га': 'гектар',
            'м²': 'квадрат метр',
            'м³': 'куб метр',
            'км²': 'квадрат километр',
            'см²': 'квадрат сантиметр',
            'км/ч': 'километр саатына',
            'м/с': 'метр секундасына',
            'кВт': 'киловатт',
            'Вт': 'ватт',
            'МВт': 'мегаватт',
            'ГГц': 'гигагерц',
            'МГц': 'мегагерц',
            'кГц': 'килогерц',
            'Гц': 'герц',
            'ГБ': 'гигабайт',
            'МБ': 'мегабайт',
            'КБ': 'килобайт',
            'ТБ': 'терабайт',
            'мин': 'мүнөт',
            'сек': 'секунд',
            'саат': 'саат',
            # Англисче/Эл аралык
            'km': 'километр',
            'km²': 'квадрат километр',
            'm': 'метр',
            'm²': 'квадрат метр',
            'm³': 'куб метр',
            'cm': 'сантиметр',
            'mm': 'миллиметр',
            'kg': 'килограмм',
            'g': 'грамм',
            'mg': 'миллиграмм',
            'l': 'литр',
            'ml': 'миллилитр',
            'ha': 'гектар',
            'km/h': 'километр саатына',
            'm/s': 'метр секундасына',
            'kW': 'киловатт',
            'W': 'ватт',
            'MW': 'мегаватт',
            'GHz': 'гигагерц',
            'MHz': 'мегагерц',
            'kHz': 'килогерц',
            'Hz': 'герц',
            'GB': 'гигабайт',
            'MB': 'мегабайт',
            'KB': 'килобайт',
            'TB': 'терабайт',
            'min': 'мүнөт',
            'sec': 'секунд',
            'h': 'саат'
        }
        
        # Валюталар
        self.currencies = {
            'сом': 'сом',
            '$': 'доллар',
            '€': 'евро',
            '₽': 'рубль',
            '¥': 'юань',
            '£': 'фунт',
            '₸': 'тенге',
            '₴': 'гривна'
        }
        
        # Чоң сандар
        self.large_numbers = {
            'млн': 'миллион',
            'млрд': 'миллиард',
            'трлн': 'триллион',
            'тыс': 'миң'
        }
        
        # Атайын символдор
        self.symbols = {
            '%': 'пайыз',
            '№': 'номур',
            '@': 'эт белгиси',
            '&': 'жана',
            '§': 'параграф',
            '©': 'автордук укук',
            '®': 'катталган',
            '™': 'соода белгиси',
            '°': 'градус',
            '×': 'көбөйтүү',
            '÷': 'бөлүү',
            '±': 'кошуу кемитүү',
            '≈': 'болжол менен',
            '≠': 'барабар эмес',
            '≤': 'кичине же барабар',
            '≥': 'чоң же барабар',
            '<': 'кичине',
            '>': 'чоң',
            '=': 'барабар',
            '+': 'кошуу',
            '−': 'кемитүү',
            '—': '',
            '–': '',
            '/': 'сызыкча'
        }
        
        # Шаарлар
        self.cities = {
            'г.': '',
            'ш.': 'шаары'
        }
    
    def number_to_words(self, num):
        """Санды сөзгө айландыруу"""
        if num == 0:
            return 'нөл'
        if num < 0:
            return 'минус ' + self.number_to_words(abs(num))
        
        result = ''
        
        # Триллион
        if num >= 1000000000000:
            trillions = num // 1000000000000
            result += self.number_to_words(trillions) + ' триллион '
            num %= 1000000000000
        
        # Миллиард
        if num >= 1000000000:
            billions = num // 1000000000
            result += self.number_to_words(billions) + ' миллиард '
            num %= 1000000000
        
        # Миллион
        if num >= 1000000:
            millions = num // 1000000
            result += self.number_to_words(millions) + ' миллион '
            num %= 1000000
        
        # Миң
        if num >= 1000:
            thousands = num // 1000
            result += self.number_to_words(thousands) + ' миң '
            num %= 1000
        
        # Жүз
        if num >= 100:
            result += self.hundreds[num // 100] + ' '
            num %= 100
        
        # Он
        if num >= 10:
            result += self.tens[num // 10] + ' '
            num %= 10
        
        # Бирдик
        if num > 0:
            result += self.ones[num] + ' '
        
        return result.strip()
    
    def number_to_ordinal(self, num):
        """Иреттик сан (порядковое числительное)"""
        if num >= 1000:
            thousands = num // 1000
            remainder = num % 1000
            if remainder == 0:
                return self.number_to_words(thousands) + ' миңинчи'
            else:
                return self.number_to_words(thousands) + ' миң ' + self.number_to_ordinal(remainder)
        
        if num >= 100:
            hundred_part = num // 100
            remainder = num % 100
            if remainder == 0:
                return self.hundreds[hundred_part] + 'үнчү'
            return self.hundreds[hundred_part] + ' ' + self.number_to_ordinal(remainder)
        
        if num >= 10:
            ten_part = num // 10
            remainder = num % 10
            if remainder == 0:
                return self.ordinal_tens[ten_part]
            return self.tens[ten_part] + ' ' + self.ordinal_ones[remainder]
        
        if num < len(self.ordinal_ones):
            return self.ordinal_ones[num]
        return self.number_to_words(num) + 'инчи'
    
    def decimal_to_words(self, num_str):
        """Ондук санды сөзгө айландыруу (0.5 → нөл бүтүн ондон беш)"""
        # Үтүрдү чекитке алмаштыруу
        num_str = num_str.replace(',', '.')
        
        parts = num_str.split('.')
        whole_part = int(parts[0]) if parts[0] else 0
        
        result = 'нөл' if whole_part == 0 else self.number_to_words(whole_part)
        
        if len(parts) > 1 and parts[1]:
            result += ' бүтүн'
            decimal = parts[1]
            
            # Разряд аныктоо
            if len(decimal) == 1:
                decimal_place = 'ондон'
            elif len(decimal) == 2:
                decimal_place = 'жүздөн'
            elif len(decimal) == 3:
                decimal_place = 'миңден'
            else:
                decimal_place = ''
            
            decimal_num = int(decimal)
            if decimal_place:
                result += ' ' + decimal_place + ' ' + self.number_to_words(decimal_num)
            else:
                result += ' ' + self.number_to_words(decimal_num)
        
        return result
    
    def normalize(self, text):
        """Негизги нормализация функциясы"""
        result = text
        
        # === 0. КЫСКАРТУУЛАР (эң биринчи) ===
        # б.з.ч., ж.б., м-н, б-ча ж.б.
        # НЕ используем IGNORECASE чтобы не путать инициалы (К. Алымбеков) с сокращениями (к. = кылым)
        for abbr, full in sorted(self.short_abbr.items(), key=lambda x: -len(x[0])):
            result = re.sub(re.escape(abbr), full, result)
        
        # === 1. ТЕЛЕФОН НОМЕРЛЕРИ ===
        # +996 555 123 456
        result = re.sub(
            r'\+(\d{3})\s*(\d{3})\s*(\d{3})\s*(\d{3})',
            lambda m: f"плюс {self.number_to_words(int(m.group(1)))} {self.number_to_words(int(m.group(2)))} {self.number_to_words(int(m.group(3)))} {self.number_to_words(int(m.group(4)))}",
            result
        )
        # 0555 12 34 56
        result = re.sub(
            r'\b0(\d{3})\s+(\d{2})\s+(\d{2})\s+(\d{2})\b',
            lambda m: f"нөл {self.number_to_words(int(m.group(1)))} {self.number_to_words(int(m.group(2)))} {self.number_to_words(int(m.group(3)))} {self.number_to_words(int(m.group(4)))}",
            result
        )
        # 123-45-67, 56-56-89 (телефон)
        result = re.sub(
            r'\b(\d{2,3})-(\d{2})-(\d{2})\b',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {self.number_to_words(int(m.group(2)))} {self.number_to_words(int(m.group(3)))}",
            result
        )
        
        # === 2. EMAIL ЖАНА URL ===
        # test@example.com
        result = re.sub(
            r'\b([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+)\.([a-zA-Z]{2,})\b',
            lambda m: f"{m.group(1)} эт белгиси {m.group(2)} чекит {m.group(3)}",
            result
        )
        
        # === 3. ДАТАЛАР ===
        # 2025-жылдын 8-марты
        result = re.sub(
            r'(\d{4})\s*-?\s*жылдын\s+(\d{1,2})\s*-?\s*(\w+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} жылдын {self.number_to_words(int(m.group(2)))} {m.group(3)}",
            result
        )
        
        # 8-март, 2024-жыл → сегиз март эки миң жыйырма төртүнчү жыл
        result = re.sub(
            r'(\d{1,2})\s*-?\s*(\w+),?\s*(\d{4})\s*[-\.]\s*жыл',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {m.group(2)} {self.number_to_ordinal(int(m.group(3)))} жыл",
            result
        )
        
        # 15-август 1991-жыл → он беш август бир миң тогуз жүз токсон биринчи жыл
        result = re.sub(
            r'(\d{1,2})\s*-?\s*(\w+)\s+(\d{4})\s*[-\.]\s*жыл',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {m.group(2)} {self.number_to_ordinal(int(m.group(3)))} жыл",
            result
        )
        
        # 2024-08-15 12:30 (ISO формат)
        result = re.sub(
            r'(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})',
            lambda m: f"{self.number_to_words(int(m.group(1)))} жылдын {self.months.get(m.group(2), m.group(2))} айынын {self.number_to_words(int(m.group(3)))} күнү саат {self.number_to_words(int(m.group(4)))} {self.number_to_words(int(m.group(5)))}",
            result
        )
        
        # 01.02.2024 → эки миң жыйырма төртүнчү жылдын биринчи февралы
        def format_date(m):
            year = self.number_to_ordinal(int(m.group(3)))
            day = self.number_to_ordinal(int(m.group(1)))
            month = self.months.get(m.group(2).zfill(2), m.group(2))
            # Айдын мүчөсү
            if month.endswith('ь'):
                month = month[:-1] + 'ы'
            elif month.endswith('й'):
                month = month[:-1] + 'ы'
            else:
                month = month + 'ы'
            return f"{year} жылдын {day} {month}"
        
        result = re.sub(r'(\d{1,2})\.(\d{1,2})\.(\d{4})', format_date, result)
        result = re.sub(r'(\d{1,2})/(\d{1,2})/(\d{4})', format_date, result)
        
        # === 4-5. ЖЫЛДАР (ЖАЛПЫ ПАТТЕРН) ===
        # Эреже: жыл маркери болсо (жыл, жылы, ж, жж, г, гг) → иреттик сан
        
        # Диапазон: 2024-2025-жж, 2024-2025 жж., 2020-2024-жылдары
        result = re.sub(
            r'(\d{4})\s*[-–—]\s*(\d{4})\s*[-.]?\s*(жылдары|жылдар|жж|гг)\.?',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} {self.number_to_ordinal(int(m.group(2)))} жылдар",
            result
        )
        
        # Жалгыз жыл: 2024-жыл, 2024-жылы, 2024ж, 2024 ж., 2024-жж
        result = re.sub(
            r'(\d{4})\s*[-.]?\s*(жылы|жыл|жж|гг|ж|г)\.?(?!\w)',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} жыл" + ('ы' if m.group(2) == 'жылы' else ''),
            result
        )
        
        # === 6. УБАКЫТ ===
        # 18:30да
        result = re.sub(
            r'(\d{1,2}):(\d{2})(да|де|та|те)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {self.number_to_words(int(m.group(2)))}{m.group(3)}",
            result
        )
        
        # 12:45, 00:15
        result = re.sub(
            r'\b(\d{1,2}):(\d{2})\b',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {self.number_to_words(int(m.group(2)))}",
            result
        )
        
        # === 7. АКЧА БИРДИКТЕРИ ===
        # 1.5 млн сом, 2 млрд сом
        result = re.sub(
            r'(\d+(?:[.,]\d+)?)\s*(млн|млрд|трлн)\s*(сом|доллар|евро|рубль)',
            lambda m: f"{self.decimal_to_words(m.group(1))} {self.large_numbers.get(m.group(2), m.group(2))} {m.group(3)}",
            result
        )
        
        # 3 450,50 сом (боштук менен)
        result = re.sub(
            r'(\d{1,3}(?:\s\d{3})*)[,.](\d{2})\s*сом',
            lambda m: f"{self.number_to_words(int(m.group(1).replace(' ', '')))} сом {self.number_to_words(int(m.group(2)))} тыйын",
            result
        )
        
        # 1 250 сом (боштук менен чоң сан)
        result = re.sub(
            r'(\d{1,3}(?:\s\d{3})+)\s*сом\b',
            lambda m: f"{self.number_to_words(int(m.group(1).replace(' ', '')))} сом",
            result
        )
        
        # 1500 сом, 1000сом (боштуксуз)
        result = re.sub(
            r'(\d+)\s*сом\b',
            lambda m: f"{self.number_to_words(int(m.group(1)))} сом",
            result
        )
        
        # $20, 15€, 500₽
        for symbol, name in self.currencies.items():
            if symbol in ['$', '€', '₽', '£', '¥', '₸', '₴']:
                # Символ алдында: $20
                result = re.sub(
                    re.escape(symbol) + r'(\d+(?:[.,]\d+)?)',
                    lambda m, n=name: f"{self.decimal_to_words(m.group(1))} {n}",
                    result
                )
                # Символ артында: 20$
                result = re.sub(
                    r'(\d+(?:[.,]\d+)?)' + re.escape(symbol),
                    lambda m, n=name: f"{self.decimal_to_words(m.group(1))} {n}",
                    result
                )
        
        # === 8. ИРЕТТИК САНДАР (порядковые) ===
        # Сан-сөз формасы: 2-кылымда, 3-курста, 5-класс → иреттик сан
        result = re.sub(
            r'(\d+)-([а-яөүңА-ЯӨҮҢ]+)',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} {m.group(2)}",
            result
        )
        
        # 1-чи, 5-чи, 10-чу, 21чи, 100-чү
        result = re.sub(
            r'(\d+)\s*-?\s*(чи|чу|чү|нчи|нчу|нчү|ынчы|инчи|үнчү|унчу)',
            lambda m: self.number_to_ordinal(int(m.group(1))),
            result
        )
        
        # === 9. ЖАШ, КЛАСС (боштуксуз) ===
        # 25жашта, 5чи класста
        result = re.sub(
            r'(\d+)жашта',
            lambda m: f"{self.number_to_words(int(m.group(1)))} жашта",
            result
        )
        result = re.sub(
            r'(\d+)(чи|чу|чү)\s*класста',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} класста",
            result
        )
        
        # 30мин шейин
        result = re.sub(
            r'(\d+)(мин|мүн|сек|саат)\b',
            lambda m: f"{self.number_to_words(int(m.group(1)))} {self.units.get(m.group(2), m.group(2))}",
            result
        )
        
        # === 10. КУРСТАР ===
        # 3-курста
        result = re.sub(
            r'(\d+)\s*-?\s*курста',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} курста",
            result
        )
        
        # === 11. ӨЛЧӨМ БИРДИКТЕРИ ===
        # 15 км, 5 кг, 100 м²
        for unit, name in sorted(self.units.items(), key=lambda x: -len(x[0])):
            result = re.sub(
                r'(\d+(?:[.,]\d+)?)\s*' + re.escape(unit) + r'\b',
                lambda m, n=name: f"{self.decimal_to_words(m.group(1))} {n}",
                result
            )
        
        # === 12. ПАЙЫЗ ДИАПАЗОНУ ===
        # 1—2% → бир эки пайыз
        result = re.sub(
            r'(\d+(?:[.,]\d+)?)\s*[-–—]\s*(\d+(?:[.,]\d+)?)\s*%',
            lambda m: f"{self.decimal_to_words(m.group(1))} {self.decimal_to_words(m.group(2))} пайыз",
            result
        )
        
        # === 13. ПАЙЫЗ ===
        # 5%
        result = re.sub(
            r'(\d+(?:[.,]\d+)?)\s*%',
            lambda m: f"{self.decimal_to_words(m.group(1))} пайыз",
            result
        )
        
        # === 14. МАТЕМАТИКА (кемитүү) ===
        # 45-56 → кырк беш кемитүү элүү алты
        result = re.sub(
            r'\b(\d+)\s*[-–—]\s*(\d+)\b',
            lambda m: f"{self.number_to_words(int(m.group(1)))} кемитүү {self.number_to_words(int(m.group(2)))}",
            result
        )
        
        # === 15. МАТЕМАТИКА ===
        # Теңдик менен: 3×4=12, 5+3=8
        result = re.sub(
            r'(\d+)\s*[×xXхХ*]\s*(\d+)\s*=\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} көбөйтүү {self.number_to_words(int(m.group(2)))} барабар {self.number_to_words(int(m.group(3)))}",
            result
        )
        result = re.sub(
            r'(\d+)\s*\+\s*(\d+)\s*=\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} кошуу {self.number_to_words(int(m.group(2)))} барабар {self.number_to_words(int(m.group(3)))}",
            result
        )
        result = re.sub(
            r'(\d+)\s*[-−]\s*(\d+)\s*=\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} кемитүү {self.number_to_words(int(m.group(2)))} барабар {self.number_to_words(int(m.group(3)))}",
            result
        )
        result = re.sub(
            r'(\d+)\s*/\s*(\d+)\s*=\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} бөлүү {self.number_to_words(int(m.group(2)))} барабар {self.number_to_words(int(m.group(3)))}",
            result
        )
        
        # Теңдиксиз: 45+65, 44*56, 56/56
        result = re.sub(
            r'(\d+)\s*\+\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} кошуу {self.number_to_words(int(m.group(2)))}",
            result
        )
        result = re.sub(
            r'(\d+)\s*[×xXхХ*]\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} көбөйтүү {self.number_to_words(int(m.group(2)))}",
            result
        )
        result = re.sub(
            r'(\d+)\s*/\s*(\d+)',
            lambda m: f"{self.number_to_words(int(m.group(1)))} бөлүү {self.number_to_words(int(m.group(2)))}",
            result
        )
        
        # === 16. АББРЕВИАТУРАЛАР ===
        # Кыргызча аббревиатуралар (мүчөлөр менен: БУУнун, КРнын, ЖЧКга)
        # Сингармонизм эрежеси (үндүү + үнсүз гармониясы)
        def apply_harmony(word, suffix):
            if not suffix:
                return word
            
            word_lower = word.lower()
            last_char = word_lower[-1] if word_lower else ''
            
            # Үндүүлөр жана үнсүздөр
            hard_vowels = 'аоуы'
            soft_vowels = 'эеөүи'
            all_vowels = hard_vowels + soft_vowels
            voiced_consonants = 'бвгджзйлмнрңь'
            voiceless_consonants = 'кпстфхцчшщ'
            
            # Акыркы үндүүнү табуу (үндүү гармониясы үчүн)
            last_vowel = ''
            for char in reversed(word_lower):
                if char in all_vowels:
                    last_vowel = char
                    break
            
            is_soft = last_vowel in soft_vowels
            ends_with_vowel = last_char in all_vowels
            ends_with_voiceless = last_char in voiceless_consonants
            
            # 1. Үнсүз гармониясы (д/т/н тандоо)
            consonant_map = {
                # Үндүүдөн кийин → н
                ('д', True): 'н', ('т', True): 'н',
                # Үнсүз жумшактан кийин → д
                ('т', False): 'д',
                # Каткалаң үнсүздөн кийин → т
                ('д', False): 'т' if ends_with_voiceless else 'д',
                ('н', False): 'д' if not ends_with_voiceless else 'т',
            }
            
            # Мүчөнүн башындагы үнсүздү оңдоо
            new_suffix = suffix
            if suffix and suffix[0] in 'дт':
                if ends_with_vowel:
                    new_suffix = 'н' + suffix[1:]
                elif ends_with_voiceless:
                    new_suffix = 'т' + suffix[1:]
                else:
                    new_suffix = 'д' + suffix[1:]
            elif suffix and suffix[0] in 'гк':
                if ends_with_voiceless:
                    new_suffix = 'к' + suffix[1:]
                else:
                    new_suffix = 'г' + suffix[1:]
            
            # 2. Үндүү гармониясы 
            # Тоголок: о, у, ө, ү
            # Жазык: а, ы, е, и
            rounded_vowels = 'оуөү'
            is_rounded = last_vowel in rounded_vowels
            
            # Мүчөнүн үндүүлөрүн өзгөртүү
            result_suffix = ''
            for char in new_suffix:
                if char == 'ы':
                    if is_soft:
                        result_suffix += 'и'
                    elif is_rounded:
                        result_suffix += 'у'
                    else:
                        result_suffix += 'ы'
                elif char == 'а':
                    if is_soft and is_rounded:
                        result_suffix += 'ө'
                    elif is_soft:
                        result_suffix += 'е'
                    elif is_rounded:
                        result_suffix += 'о'
                    else:
                        result_suffix += 'а'
                elif char == 'и':
                    if is_rounded:
                        result_suffix += 'ү'
                    else:
                        result_suffix += 'и'
                elif char == 'е':
                    if is_rounded:
                        result_suffix += 'ө'
                    else:
                        result_suffix += 'е'
                else:
                    result_suffix += char
            
            return word + result_suffix
        
        kyrgyz_suffixes = r'(нын|нун|нүн|нин|дын|дун|дүн|дин|тын|тун|түн|тин|га|ге|ка|ке|го|гө|ко|кө|да|де|та|те|до|дө|то|тө|дан|ден|тан|тен|дон|дөн|тон|төн|н|ы|и|у|ү)?'
        for abbr, full in self.kyrgyz_abbr.items():
            result = re.sub(r'\b' + re.escape(abbr) + kyrgyz_suffixes + r'\b', 
                          lambda m, f=full: apply_harmony(f, m.group(1)), 
                          result)
        
        # Англисче аббревиатуралар
        for abbr, full in self.english_abbr.items():
            result = re.sub(r'\b' + re.escape(abbr) + r'\b', full, result)
        
        # === 17. АДРЕСТЕР ===
        # г. Бишкек
        result = re.sub(r'\bг\.\s*', '', result)
        # 7-кичи район
        result = re.sub(
            r'(\d+)\s*-?\s*кичи\s*район',
            lambda m: f"{self.number_to_ordinal(int(m.group(1)))} кичи район",
            result
        )
        # 54/1 (үй номуру)
        # Бөлчөктөр: 5/8 → сегизден беш
        def fraction_to_words(m):
            numerator = int(m.group(1))
            denominator = int(m.group(2))
            denom_word = self.number_to_words(denominator)
            numer_word = self.number_to_words(numerator)
            
            # Мүчө тандоо (сингармонизм)
            last_vowel = ''
            for char in reversed(denom_word):
                if char in 'аоуыэеөүи':
                    last_vowel = char
                    break
            
            if last_vowel in 'өү':
                suffix = 'дөн'
            elif last_vowel in 'оу':
                suffix = 'дон'
            elif last_vowel in 'еи':
                suffix = 'ден'
            else:
                suffix = 'дан'
            
            # Үнсүз гармониясы
            if denom_word[-1] in 'кпстфхцчшщ':
                suffix = 'т' + suffix[1:]
            elif denom_word[-1] in 'аоуыэеөүи':
                suffix = 'н' + suffix[1:]
            
            return f"{denom_word}{suffix} {numer_word}"
        
        result = re.sub(r'\b(\d+)/(\d+)\b', fraction_to_words, result)
        
        # === 18. АПОСТРОФ МЕНЕН СӨЗДӨР ===
        # Google'га, GitHub'тан
        result = re.sub(r"(\w+)'(\w+)", r'\1\2', result)
        
        # === 19. АТАЙЫН СИМВОЛДОР ===
        # Тырмакчалар
        result = re.sub(r'[«»„"""]', '', result)
        result = re.sub(r"[''‚']", '', result)
        
        # №
        result = re.sub(
            r'№\s*(\d+)',
            lambda m: f"номур {self.number_to_words(int(m.group(1)))}",
            result
        )
        
        # Жалгыз турган символдор
        result = re.sub(r'(?<=[,\s])%(?=[,\s]|$)', 'пайыз', result)
        result = re.sub(r'(?<=[,\s])№(?=[,\s]|$)', 'номур', result)
        result = re.sub(r'(?<=[,\s])@(?=[,\s]|$)', 'эт белгиси', result)
        result = re.sub(r'(?<=[,\s])&(?=[,\s]|$)', 'жана', result)
        
        # === 20. ОНДУК САНДАР ===
        # 3.14, 1,25, 0,001
        result = re.sub(
            r'\b(\d+[.,]\d+)\b',
            lambda m: self.decimal_to_words(m.group(1)),
            result
        )
        
        # === 21. БОШТУК МЕНЕН ЖАЗЫЛГАН ЧОҢ САНДАР ===
        # 1 234 567
        def replace_spaced_number(match):
            num_str = match.group(0).replace(' ', '')
            return self.number_to_words(int(num_str))
        result = re.sub(r'\b\d{1,3}(?:\s\d{3})+\b', replace_spaced_number, result)
        
        # === 22. ЖӨНӨКӨЙ САНДАР ===
        result = re.sub(
            r'\b(\d+)\b',
            lambda m: self.number_to_words(int(m.group(1))),
            result
        )
        
        # === 23. ТАЗАЛОО ===
        # Ашыкча боштуктарды алып салуу
        result = re.sub(r'\s+', ' ', result)
        result = result.strip()
        
        return result


def main():
    """Негизги функция"""
    normalizer = KyrgyzTextNormalizer()
    
    if len(sys.argv) > 1:
        input_text = ' '.join(sys.argv[1:])
        output = normalizer.normalize(input_text)
        print(output)
    else:
        print("Кыргызча текст нормализатор (TTS үчүн)")
        print("=" * 50)
        print("Текст киргизиңиз (чыгуу үчүн 'exit'):")
        print()
        
        while True:
            try:
                user_input = input("> ")
                if user_input.lower() in ['exit', 'quit', 'чыгуу']:
                    break
                if user_input.strip():
                    output = normalizer.normalize(user_input)
                    print(f"Жыйынтык: {output}")
                    print()
            except KeyboardInterrupt:
                print("\nЧыгуу...")
                break
            except EOFError:
                break


if __name__ == "__main__":
    main()
