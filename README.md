# Office Management

Минимальный веб-проект для управления офисными зданиями.

## Как запустить

### 1) Только фронтенд (без API)

Откройте `frontend/index.html` в браузере.

Если браузер блокирует доступ к локальным файлам, запустите простой сервер:

```
python3 -m http.server 8080
```

и откройте `http://localhost:8080/frontend` в браузере.

### 2) Полный запуск (Go + API + статика)

```
go run ./backend
```

Откройте `http://localhost:8080`.

### База данных (Postgres)

По умолчанию API подключается к Postgres. Можно задать строку подключения:

```
export DATABASE_URL="postgres://user:pass@localhost:5432/office?sslmode=disable"
```

Или задать параметры по отдельности:

- `PGHOST` (по умолчанию `localhost`)
- `PGPORT` (по умолчанию `5432`)
- `PGUSER` (по умолчанию `postgres`)
- `PGPASSWORD` (по умолчанию пусто)
- `PGDATABASE` (по умолчанию `office`)
- `PGSSLMODE` (по умолчанию `disable`)

### Миграция данных из SQLite

Перед миграцией запустите API один раз, чтобы создать схему в Postgres.

```
go run ./backend/cmd/migrate_sqlite --sqlite backend/office.db
```

Флаги:
- `--sqlite` — путь к SQLite файлу
- `--pg` — строка подключения Postgres (если не хотите использовать env)
- `--truncate` — очистить таблицы перед импортом (по умолчанию `true`)

## Структура проекта

- `frontend/` — клиентская часть
- `backend/` — Go API и раздача статики
