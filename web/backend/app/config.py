import json
from pydantic_settings import BaseSettings
from typing import List
from pydantic import field_validator, Field


class Settings(BaseSettings):
    """
    Настройки приложения.
    Все секретные данные (пароли, ключи) должны быть указаны в .env файле.
    Дефолтные значения используются только для несекретных настроек.
    """
    
    # Database
    DATABASE_URL: str = Field(..., description="URL подключения к базе данных")
    
    # JWT - СЕКРЕТНЫЕ ДАННЫЕ (обязательны в .env)
    SECRET_KEY: str = Field(..., description="Секретный ключ для JWT токенов (ОБЯЗАТЕЛЬНО)")
    ALGORITHM: str = Field(default="HS256", description="Алгоритм шифрования JWT")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=3000, description="Время жизни access token в минутах")
    
    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:5173", "http://localhost:8080"],
        description="Разрешенные источники для CORS"
    )
    
    # App
    DEBUG: bool = Field(default=False, description="Режим отладки")
    
    # Default Admin - СЕКРЕТНЫЕ ДАННЫЕ (обязательны в .env)
    DEFAULT_ADMIN_USERNAME: str = Field(..., description="Имя пользователя администратора по умолчанию (ОБЯЗАТЕЛЬНО)")
    DEFAULT_ADMIN_PASSWORD: str = Field(..., description="Пароль администратора по умолчанию (ОБЯЗАТЕЛЬНО)")
    
    # Text Chunking Settings
    CHUNK_MIN_DURATION: int = Field(
        default=5,
        description="Минимальная длительность чанка в секундах"
    )
    CHUNK_MAX_DURATION: int = Field(
        default=15,
        description="Максимальная длительность чанка в секундах"
    )
    SENTENCE_LENGTH_THRESHOLD: int = Field(
        default=100,
        description="Порог длины предложения в символах для выбора стратегии разбиения"
    )
    
    # Audio Recording Settings
    WAVS_DIR: str = Field(
        default="../../wavs",
        description="Путь к директории для сохранения аудио записей (относительно корня проекта)"
    )
    
    # Audio Quality Settings - для максимального качества записи
    AUDIO_SAMPLE_RATE: int = Field(
        default=48000,
        description="Частота дискретизации аудио (Hz). Рекомендуется: 48000 (стандарт) или 96000 (максимальное качество)"
    )
    AUDIO_BIT_DEPTH: int = Field(
        default=24,
        description="Глубина бит аудио. Рекомендуется: 24 (высокое качество) или 32 (максимальное качество)"
    )
    AUDIO_CHANNELS: int = Field(
        default=1,
        description="Количество каналов: 1 (моно) или 2 (стерео). Для TTS обычно используется моно"
    )
    
    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v):
        """Парсит CORS_ORIGINS из JSON строки или списка"""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                # Если не JSON, разбиваем по запятой
                return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v
    
    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v):
        """Валидация секретного ключа"""
        if not v:
            raise ValueError("SECRET_KEY не может быть пустым")
        if len(v) < 32:
            import warnings
            warnings.warn(
                "SECRET_KEY должен быть не менее 32 символов для безопасности. "
                "Используйте более длинный ключ в production!",
                UserWarning
            )
        return v
    
    @field_validator('DEFAULT_ADMIN_PASSWORD')
    @classmethod
    def validate_admin_password(cls, v):
        """Валидация пароля администратора"""
        if not v or len(v) < 3:
            raise ValueError("DEFAULT_ADMIN_PASSWORD должен быть не менее 3 символов")
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        # Валидация при загрузке
        validate_assignment = True
        # Разрешаем дополнительные переменные окружения (например, HOST, PORT для uvicorn)
        extra = "ignore"


# Создаем экземпляр настроек (валидация происходит автоматически)
try:
    settings = Settings()
except Exception as e:
    raise RuntimeError(
        f"Ошибка загрузки настроек из .env файла: {e}\n"
        "Убедитесь, что все обязательные переменные указаны в .env файле."
    ) from e

