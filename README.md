# Office Management

Минимальный веб-проект для управления офисными зданиями.

## Как запустить

### Docker (фронтенд + API + Postgres)

#### Быстрый старт

Скопируйте `env.example` в `.env` и задайте свои пароли:

```
cp env.example .env
```

Запуск:

```
docker compose up --build
```

- Веб: `http://localhost:8080`
- API: `http://localhost:8081`

#### Подготовка к продакшену

1) Обновите `.env`:
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `DATABASE_URL` (должен совпадать с Postgres)
   - `WEB_PORT`, `API_PORT` (если меняете внешние порты)

2) Запускайте в фоне:

```
docker compose up -d --build
```

3) Бэкапы базы:

```
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

#### Автодамп БД на событиях остановки контейнера `db`

Контейнер Postgres запускается через обёртку `docker/db/entrypoint-with-prestop-backup.sh`.
Она перехватывает сигналы остановки и создаёт дамп перед завершением процесса БД.

Покрываются стандартные сценарии:

- `docker compose stop db`
- `docker compose restart db`
- `docker compose down`
- остановка стека при перезапуске docker daemon

Где лежат файлы:

- `backend/db_dumps`
- имя: `db_dump_auto_on_db_stop_YYYYmmdd_HHMMSS.sql`

Параметры в `db` сервисе:

- `DB_DUMP_ON_STOP=true` — включить/выключить автодамп
- `DB_DUMP_DIR=/db_dumps` — путь внутри контейнера
- `DB_DUMP_TAG=auto_on_db_stop` — тег в имени файла

Проверка:

```bash
docker compose up -d --build
docker compose restart db
ls -lah backend/db_dumps | tail -n 20
```

Ограничения:

- принудительное завершение (`docker kill`, `SIGKILL`, аварийное выключение хоста) не гарантирует создание дампа
- для больших БД может потребоваться увеличить `stop_grace_period`

#### Порты и сервисы

- `web` — Nginx со статикой и прокси на API
- `api` — Go сервер
- `db` — Postgres
- `migrate` — одноразовый контейнер для применения миграций

### CI/CD (GitHub Actions)

- `CI` — запускает `go test`, `go vet`, и сборку docker-образов.
- `Publish Docker Images` — публикует образы в GHCR при пуше в `main` или теге `vX.Y.Z`.

После публикации можно использовать образы в отдельных окружениях/скриптах деплоя.

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

### Конфигурация через `.env`

Можно положить переменные в `.env` в корне проекта (он автоматически подхватывается при старте):

```
DATABASE_URL=postgres://user:pass@localhost:5432/office?sslmode=disable
PORT=8080
OFFICE_ADMIN_EMPLOYEE_IDS=12345,67890
```

## Аутентификация

Проект использует двухуровневую систему аутентификации:
- **Authorization Token** (от team.wb.ru) — для получения первого доступа
- **Office-Access-Token** (JWT) — для всех защищенных API запросов

Подробнее см. [AUTHENTICATION.md](./AUTHENTICATION.md)

### Быстрая настройка

Установите переменную окружения для подписи JWT токенов:

```bash
OFFICE_JWT_SECRET=your-secret-key-here
```

## Структура проекта

- `frontend/` — клиентская часть
- `backend/` — Go API и раздача статики
