# TTS Data Collection Backend

FastAPI backend для проекта сбора данных TTS.

## Установка

1. Создайте виртуальное окружение:
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# или
venv\Scripts\activate  # Windows
```

2. Установите зависимости:
```bash
pip install -r requirements.txt
```

3. Настройте `.env` файл (скопируйте из `.env.example` и заполните своими данными)

   Пример `.env` файла:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/tts_db
   SECRET_KEY=your-secret-key-here
   
   # Настройки разбиения текста на чанки
   CHUNK_MIN_DURATION=5      # Минимальная длительность чанка в секундах (по умолчанию: 5)
   CHUNK_MAX_DURATION=15     # Максимальная длительность чанка в секундах (по умолчанию: 15)
   SENTENCE_LENGTH_THRESHOLD=100  # Порог длины предложения в символах для выбора стратегии разбиения (по умолчанию: 100)
   ```

4. Создайте базу данных PostgreSQL:
```bash
createdb tts_db
# или через psql:
# psql -U postgres
# CREATE DATABASE tts_db;
```

5. Примените миграции:
```bash
alembic upgrade head
```

6. Запустите сервер:
```bash
uvicorn app.main:app --reload
```

## Миграции

### Создание новой миграции:
```bash
alembic revision --autogenerate -m "описание изменений"
```

### Применение миграций:
```bash
alembic upgrade head
```

### Откат миграции:
```bash
alembic downgrade -1
```

## API Endpoints

- `GET /api/v1/health` - Проверка здоровья сервиса
- `POST /api/v1/auth/login` - Авторизация (возвращает JWT в cookie)
- `POST /api/v1/auth/logout` - Выход из системы

## Структура проекта

```
app/
├── api/           # API роуты
│   └── v1/
│       └── routes/
├── core/          # Ядро приложения (security, utils)
├── models/        # SQLAlchemy модели
├── schemas/       # Pydantic схемы
├── services/      # Бизнес-логика
├── repositories/  # Работа с БД
├── config.py      # Конфигурация
├── database.py    # Подключение к БД
├── dependencies.py # FastAPI зависимости
└── main.py        # Точка входа
alembic/           # Миграции базы данных
```

