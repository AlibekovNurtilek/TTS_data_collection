import wave
import os
import sys

def analyze_wav(file_path):
    """
    Анализирует WAV файл и выводит все его характеристики
    """
    try:
        # Проверяем существование файла
        if not os.path.exists(file_path):
            print(f"❌ Файл не найден: {file_path}")
            return
        
        # Открываем WAV файл
        with wave.open(file_path, 'rb') as wav_file:
            # Получаем параметры
            num_channels = wav_file.getnchannels()
            sample_width = wav_file.getsampwidth()
            sample_rate = wav_file.getframerate()
            num_frames = wav_file.getnframes()
            compression_type = wav_file.getcomptype()
            compression_name = wav_file.getcompname()
            
            # Вычисляем дополнительные параметры
            duration = num_frames / sample_rate
            bit_depth = sample_width * 8
            bitrate = sample_rate * num_channels * bit_depth
            file_size = os.path.getsize(file_path)
            
            # Определяем тип каналов
            channel_type = {
                1: "Моно",
                2: "Стерео",
                6: "5.1 Surround",
                8: "7.1 Surround"
            }.get(num_channels, f"{num_channels} каналов")
            
            # Выводим информацию
            print("=" * 60)
            print(f"📊 АНАЛИЗ WAV ФАЙЛА")
            print("=" * 60)
            print(f"📁 Файл: {os.path.basename(file_path)}")
            print(f"📂 Путь: {os.path.dirname(os.path.abspath(file_path))}")
            print(f"💾 Размер файла: {file_size:,} байт ({file_size / (1024**2):.2f} МБ)")
            print("-" * 60)
            print(f"🎵 АУДИО ПАРАМЕТРЫ:")
            print("-" * 60)
            print(f"   Частота дискретизации: {sample_rate:,} Гц ({sample_rate / 1000:.1f} кГц)")
            print(f"   Битовая глубина: {bit_depth} бит")
            print(f"   Количество каналов: {num_channels} ({channel_type})")
            print(f"   Битрейт: {bitrate:,} бит/с ({bitrate / 1000:.0f} кбит/с)")
            print(f"   Длительность: {duration:.2f} сек ({int(duration // 60)}:{int(duration % 60):02d})")
            print(f"   Количество фреймов: {num_frames:,}")
            print(f"   Размер сэмпла: {sample_width} байт")
            print("-" * 60)
            print(f"🔧 ТЕХНИЧЕСКИЕ ДАННЫЕ:")
            print("-" * 60)
            print(f"   Тип сжатия: {compression_type if compression_type != 'NONE' else 'Без сжатия (PCM)'}")
            print(f"   Название сжатия: {compression_name if compression_name != 'not compressed' else 'Без сжатия'}")
            print(f"   Байт в секунду: {sample_rate * num_channels * sample_width:,}")
            print("=" * 60)
            
    except wave.Error as e:
        print(f"❌ Ошибка при чтении WAV файла: {e}")
    except Exception as e:
        print(f"❌ Неожиданная ошибка: {e}")

def main():
    """
    Главная функция
    """
    if len(sys.argv) < 2:
        print("Использование: python wav_analyzer.py <путь_к_файлу.wav>")
        print("\nПример: python wav_analyzer.py audio.wav")
        
        # Если аргументов нет, запрашиваем путь
        file_path = input("\nВведите путь к WAV файлу: ").strip()
    else:
        file_path = sys.argv[1]
    
    if file_path:
        analyze_wav(file_path)
    else:
        print("❌ Путь к файлу не указан")

if __name__ == "__main__":
    main()
