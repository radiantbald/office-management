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
   - `API_IMAGE`, `WEB_IMAGE` (если используете `docker-compose.prod.yml`)

2) Запускайте в фоне:

```
docker compose up -d --build
```

3) Бэкапы базы:

```
docker compose exec db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

#### Порты и сервисы

- `web` — Nginx со статикой и прокси на API
- `api` — Go сервер
- `db` — Postgres
- `migrate` — одноразовый контейнер для применения миграций

#### Продовый запуск из образов

1) Заполните `.env` и укажите `API_IMAGE`/`WEB_IMAGE`:

```
cp env.example .env
```

2) Запустите:

```
docker compose -f docker-compose.prod.yml up -d
```

### CI/CD (GitHub Actions)

- `CI` — запускает `go test`, `go vet`, и сборку docker-образов.
- `Publish Docker Images` — публикует образы в GHCR при пуше в `main` или теге `vX.Y.Z`.

После публикации:
- `API_IMAGE=ghcr.io/<owner>/office-management-api:latest`
- `WEB_IMAGE=ghcr.io/<owner>/office-management-web:latest`

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
```

## Структура проекта

- `frontend/` — клиентская часть
- `backend/` — Go API и раздача статики
