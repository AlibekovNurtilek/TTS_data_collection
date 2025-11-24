# Запуск проекта через Docker

## Быстрый старт

1. **Настройте переменные окружения для бекенда:**
   ```bash
   cd backend
   # Создайте .env файл с необходимыми переменными (DATABASE_URL, SECRET_KEY, и т.д.)
   cd ..
   ```

2. **Настройте URL бекенда для фронтенда (опционально):**
   
   В `docker-compose.yml` можно изменить `VITE_API_BASE_URL` в секции `frontend.build.args`, если бекенд будет доступен по другому адресу.

3. **Запустите весь проект одной командой:**
   ```bash
   docker-compose up -d
   ```

4. **Проверьте статус:**
   ```bash
   docker-compose ps
   ```

5. **Просмотр логов:**
   ```bash
   docker-compose logs -f
   ```

## Остановка

```bash
docker-compose down
```

## Пересборка после изменений

```bash
docker-compose up -d --build
```

## Доступ к приложению

- **Фронтенд:** http://localhost:8400
- **Бекенд API:** http://localhost:8440
- **API документация:** http://localhost:8440/docs

