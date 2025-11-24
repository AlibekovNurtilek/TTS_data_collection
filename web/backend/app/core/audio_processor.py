import re
from pathlib import Path
from typing import Tuple, Optional
import wave
import io

from fastapi import HTTPException, status
from app.config import settings


def sanitize_filename(filename: str) -> str:
    """Очищает имя файла от недопустимых символов"""
    # Удаляем недопустимые символы для файловой системы
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Удаляем пробелы в начале и конце
    filename = filename.strip()
    # Заменяем множественные пробелы на один
    filename = re.sub(r'\s+', '_', filename)
    return filename


def detect_audio_format(audio_data: bytes, filename: Optional[str] = None) -> Optional[str]:
    """
    Определяет формат аудио файла по его содержимому (magic bytes).
    
    Returns:
        Формат файла (wav, mp3, webm, ogg, m4a, flac, aac) или None
    """
    if len(audio_data) < 12:
        return None
    
    # Проверяем magic bytes
    if audio_data[:4] == b'RIFF' and audio_data[8:12] == b'WAVE':
        return 'wav'
    elif audio_data[:3] == b'ID3' or audio_data[:2] == b'\xff\xfb':
        return 'mp3'
    elif audio_data[:4] == b'fLaC':
        return 'flac'
    elif audio_data[:4] == b'OggS':
        return 'ogg'
    elif audio_data[4:8] == b'ftyp':
        # MP4/M4A
        if b'm4a' in audio_data[8:20] or b'M4A' in audio_data[8:20]:
            return 'm4a'
        return 'm4a'  # По умолчанию считаем m4a
    elif audio_data[:4] == b'\x1aE\xdf\xa3':  # WebM magic bytes
        return 'webm'
    elif audio_data[:11] == b'RIFF' and b'WEBM' in audio_data[:20]:
        return 'webm'
    
    # Если не удалось определить по содержимому, пробуем по расширению
    if filename:
        ext = filename.lower().split('.')[-1]
        if ext in ['wav', 'mp3', 'm4a', 'ogg', 'flac', 'aac', 'webm', 'opus']:
            return ext
    
    return None


def get_audio_duration(audio_data: bytes) -> float:
    """Получает длительность аудио в секундах"""
    try:
        # Пробуем через pydub, если доступен
        try:
            from pydub import AudioSegment
            audio = AudioSegment.from_file(io.BytesIO(audio_data))
            return len(audio) / 1000.0  # pydub возвращает длительность в миллисекундах
        except ImportError:
            pass
        
        # Пробуем через wave для WAV файлов
        with wave.open(io.BytesIO(audio_data), 'rb') as wav_file:
            frames = wav_file.getnframes()
            sample_rate = wav_file.getframerate()
            duration = frames / float(sample_rate)
            return duration
    except Exception:
        # Если не удалось определить длительность, возвращаем 0
        return 0.0


def convert_to_wav_16bit_mono(audio_data: bytes, input_format: str = None, filename: str = None) -> bytes:
    """
    Конвертирует аудио в WAV формат с настройками качества из config.
    
    Args:
        audio_data: Байты аудио файла
        input_format: Формат входного файла (если известен)
        filename: Имя файла (для определения формата, если не указан)
    
    Returns:
        Байты WAV файла в формате, указанном в настройках (по умолчанию высокое качество)
    """
    try:
        # Определяем формат по содержимому, если не указан
        if not input_format:
            input_format = detect_audio_format(audio_data, filename)
        
        # Пробуем использовать pydub для конвертации (если установлен)
        pydub_available = False
        try:
            from pydub import AudioSegment
            pydub_available = True
        except ImportError:
            pass
        
        if pydub_available:
            try:
                # Определяем формат по расширению или используем auto-detect
                if input_format:
                    # Для webm и opus pydub может не работать напрямую, пробуем через ffmpeg
                    if input_format in ['webm', 'opus']:
                        raise ValueError(f"pydub may not support {input_format} format, using ffmpeg")
                    
                    audio = AudioSegment.from_file(io.BytesIO(audio_data), format=input_format)
                else:
                    # Auto-detect формат
                    audio = AudioSegment.from_file(io.BytesIO(audio_data))
                
                # Конвертируем с настройками качества из config
                sample_rate = settings.AUDIO_SAMPLE_RATE
                bit_depth = settings.AUDIO_BIT_DEPTH
                channels = settings.AUDIO_CHANNELS
                
                # Устанавливаем параметры качества
                audio = audio.set_channels(channels)
                # sample_width: 1=8-bit, 2=16-bit, 3=24-bit, 4=32-bit
                sample_width = (bit_depth + 7) // 8  # Округляем до байтов
                audio = audio.set_sample_width(sample_width)
                audio = audio.set_frame_rate(sample_rate)
                
                # Экспортируем в WAV
                wav_buffer = io.BytesIO()
                audio.export(wav_buffer, format="wav")
                return wav_buffer.getvalue()
                
            except Exception as pydub_error:
                # Если pydub не смог обработать, пробуем через ffmpeg
                # Это нормально для webm/opus форматов
                pass
        
        # Если pydub не установлен или не смог обработать, пробуем другие методы
        if not pydub_available:
            # Если pydub не установлен, пробуем обработать как WAV напрямую
            try:
                with wave.open(io.BytesIO(audio_data), 'rb') as wav_in:
                    # Читаем параметры
                    n_channels = wav_in.getnchannels()
                    sample_width = wav_in.getsampwidth()
                    framerate = wav_in.getframerate()
                    n_frames = wav_in.getnframes()
                    audio_frames = wav_in.readframes(n_frames)
                    
                    # Конвертируем в моно, если стерео
                    if n_channels == 2:
                        # Преобразуем стерео в моно (усредняем каналы)
                        if sample_width == 1:
                            # 8-bit
                            audio_frames = bytes([(audio_frames[i] + audio_frames[i+1]) // 2 
                                                 for i in range(0, len(audio_frames), 2)])
                        elif sample_width == 2:
                            # 16-bit
                            audio_frames = bytes([(audio_frames[i] + audio_frames[i+2]) // 2 
                                                 for i in range(0, len(audio_frames), 4)])
                            audio_frames = bytes([audio_frames[i] for i in range(0, len(audio_frames), 2)])
                        elif sample_width == 4:
                            # 32-bit
                            audio_frames = bytes([(audio_frames[i] + audio_frames[i+4]) // 2 
                                                 for i in range(0, len(audio_frames), 8)])
                            audio_frames = bytes([audio_frames[i] for i in range(0, len(audio_frames), 4)])
                    
                    # Конвертируем в 16-bit, если нужно
                    if sample_width != 2:
                        # Упрощенная конвертация (для полной нужен более сложный алгоритм)
                        # В реальном проекте лучше использовать pydub
                        pass
                    
                    # Нормализуем sample rate до 44100
                    if framerate != 44100:
                        # Упрощенная ресемплизация (для полной нужен более сложный алгоритм)
                        # В реальном проекте лучше использовать pydub
                        pass
                    
                    # Создаем новый WAV файл
                    wav_buffer = io.BytesIO()
                    with wave.open(wav_buffer, 'wb') as wav_out:
                        wav_out.setnchannels(1)  # Моно
                        wav_out.setsampwidth(2)  # 16-bit
                        wav_out.setframerate(44100)  # 44.1 kHz
                        wav_out.writeframes(audio_frames)
                    
                    return wav_buffer.getvalue()
                    
            except Exception as e:
                # Если не удалось обработать как WAV, пробуем через ffmpeg
                pass
        
        # Используем ffmpeg для конвертации (работает с большинством форматов)
        try:
            import subprocess
            import tempfile
            import os
            
            # Определяем расширение для временного файла
            suffix = f'.{input_format}' if input_format else '.tmp'
            
            # Создаем временный файл для входных данных
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as input_file:
                input_file.write(audio_data)
                input_file_path = input_file.name
            
            # Создаем временный файл для выходных данных
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as output_file:
                output_file_path = output_file.name
            
            try:
                # Используем настройки качества из config
                sample_rate = settings.AUDIO_SAMPLE_RATE
                bit_depth = settings.AUDIO_BIT_DEPTH
                channels = settings.AUDIO_CHANNELS
                
                # Определяем кодек PCM в зависимости от битности
                if bit_depth == 8:
                    pcm_codec = 'pcm_u8'
                elif bit_depth == 16:
                    pcm_codec = 'pcm_s16le'
                elif bit_depth == 24:
                    pcm_codec = 'pcm_s24le'
                elif bit_depth == 32:
                    pcm_codec = 'pcm_s32le'
                else:
                    # По умолчанию используем 24-bit для высокого качества
                    pcm_codec = 'pcm_s24le'
                    bit_depth = 24
                
                # Используем ffmpeg для конвертации с высоким качеством
                cmd = [
                    'ffmpeg',
                    '-i', input_file_path,
                    '-acodec', pcm_codec,  # PCM с указанной битностью
                    '-ac', str(channels),  # Количество каналов
                    '-ar', str(sample_rate),  # Частота дискретизации
                    '-y',  # Перезаписать выходной файл
                    output_file_path
                ]
                
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode != 0:
                    raise Exception(f"Decoding failed. ffmpeg returned error code: {result.returncode}\n\nOutput from ffmpeg/avlib:\n\n{result.stderr}")
                
                # Читаем результат
                with open(output_file_path, 'rb') as f:
                    wav_data = f.read()
                
                if len(wav_data) == 0:
                    raise Exception("ffmpeg produced empty output file")
                
                return wav_data
                
            finally:
                # Удаляем временные файлы
                try:
                    os.unlink(input_file_path)
                except:
                    pass
                try:
                    os.unlink(output_file_path)
                except:
                    pass
                    
        except FileNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось обработать аудио файл. Установите ffmpeg для поддержки этого формата."
            )
        except Exception as ffmpeg_error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ошибка конвертации аудио: {str(ffmpeg_error)}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ошибка конвертации аудио: {str(e)}"
        )


def save_audio_file(
    audio_data: bytes,
    speaker_name: str,
    book_name: str,
    chunk_id: int
) -> Tuple[str, float]:
    """
    Сохраняет аудио файл в папку wavs/speaker_name с названием book_name_chunk_id.wav
    
    Args:
        audio_data: Байты WAV файла
        speaker_name: Имя спикера
        book_name: Название книги
        chunk_id: ID чанка
    
    Returns:
        Tuple[путь к файлу относительно корня проекта, длительность в секундах]
    """
    # Получаем абсолютный путь к директории wavs
    # WAVS_DIR задан относительно корня проекта (backend/)
    backend_dir = Path(__file__).parent.parent.parent  # Переходим из app/core/ в backend/
    # Разрешаем относительный путь от backend/
    if Path(settings.WAVS_DIR).is_absolute():
        wavs_dir = Path(settings.WAVS_DIR)
    else:
        wavs_dir = backend_dir / settings.WAVS_DIR
    
    # Создаем папку для спикера
    speaker_dir = wavs_dir / sanitize_filename(speaker_name)
    speaker_dir.mkdir(parents=True, exist_ok=True)
    
    # Формируем имя файла: book_name_chunk_id.wav
    book_name_clean = sanitize_filename(book_name)
    filename = f"{book_name_clean}_{chunk_id}.wav"
    file_path = speaker_dir / filename
    
    # Сохраняем файл
    with open(file_path, 'wb') as f:
        f.write(audio_data)
    
    # Получаем длительность
    duration = get_audio_duration(audio_data)
    
    # Возвращаем относительный путь от корня проекта
    # Путь будет вида: wavs/speaker_name/book_name_chunk_id.wav
    relative_path = f"{settings.WAVS_DIR}/{sanitize_filename(speaker_name)}/{filename}"
    
    return relative_path, duration

