# Архитектура аутентификации

## Обзор

Система использует **два типа токенов** для аутентификации:

1. **Authorization Token** (Bearer token от team.wb.ru) - внешний токен
2. **Office-Access-Token** (JWT, подписанный сервером) - внутренний токен

## Логика работы

### Публичные эндпоинты (не требуют токенов)

- `/api/health` - проверка здоровья сервиса
- `/api/auth/*` - все эндпоинты аутентификации

### Защищенные эндпоинты (требуют Office-Access-Token)

Все остальные API эндпоинты (`/api/*`) требуют заголовок `Office-Access-Token`.

**Middleware проверяет:**
- Наличие заголовка `Office-Access-Token`
- Валидность подписи токена
- Срок действия токена (не истек)
- Наличие `employee_id` в claims

### Auth-эндпоинты (используют Authorization)

Следующие эндпоинты используют внешний `Authorization` токен:

1. **`GET /api/user/info`** - получение информации о пользователе от team.wb.ru
   - Требует: `Authorization: Bearer <token>`
   - Проксирует запрос к `team.wb.ru/api/v1/user/info`

2. **`GET /api/user/wb-band`** - получение wb_band пользователя
   - Требует: `Authorization: Bearer <token>`
   - Проксирует запрос к `team.wb.ru/api/v1/user/profile/{id}/wbband`

3. **`POST /api/auth/office-token`** - получение Office Access Token
   - Требует: `Authorization: Bearer <token>`
   - **Верификация:** сервер вызывает `team.wb.ru/api/v1/user/info` с переданным токеном для подтверждения личности пользователя. Локально декодированные JWT claims **не доверяются** — подпись внешнего токена не может быть проверена без ключа team.wb.ru.
   - Rate-limited: применяется IP rate limiter (как для login-эндпоинтов)
   - Возвращает: `{ office_access_token, office_refresh_token }`

4. **`POST /api/auth/refresh`** - обновление Office Access Token
   - Требует: `{ office_refresh_token }` в теле запроса
   - Возвращает: `{ office_access_token, office_refresh_token }`

5. **`POST /api/v2/auth/code/wb-captcha`** - запрос кода для входа
   - Не требует токенов

6. **`POST /api/v2/auth/confirm`** - подтверждение кода
   - Не требует токенов

## Поток аутентификации

### Шаг 1: Получение Authorization токена

Клиент получает `Authorization` токен через:
- Вход через team.wb.ru
- Или через эндпоинты `/api/v2/auth/code/wb-captcha` и `/api/v2/auth/confirm`

### Шаг 2: Получение Office Access Token

```http
POST /api/auth/office-token
Authorization: Bearer <authorization_token>
```

Ответ:
```json
{
  "office_access_token": "eyJhbGc...",
  "office_refresh_token": "eyJhbGc..."
}
```

### Шаг 3: Использование Office Access Token

Все последующие запросы к защищенным эндпоинтам:

```http
GET /api/buildings
Office-Access-Token: eyJhbGc...
```

### Шаг 4: Обновление токена (Rotation)

Когда `office_access_token` истекает (через 1 час):

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "office_refresh_token": "eyJhbGc..."
}
```

**Серверная логика:**
1. Проверить JWT-подпись и expiration
2. Вычислить `HMAC-SHA256(token_id, secret)` → `token_hash`
3. Найти в БД: `SELECT revoked_at, family_id WHERE token_id = token_hash`
4. Если `revoked_at IS NOT NULL` → **REPLAY DETECTED** → `revokeTokenFamily(family_id)` → 401
5. Если `revoked_at IS NULL` → пометить старый (`revoked_at = now(), last_used_at = now()`)
6. Выпустить новый access + refresh с тем же `family_id`
7. Сохранить новый refresh (hashed) с IP и User-Agent

Ответ:
```json
{
  "office_access_token": "eyJhbGc...",
  "office_refresh_token": "eyJhbGc..."
}
```

### Replay Detection

Если злоумышленник перехватил refresh token и использует его после того,
как легитимный пользователь уже выполнил ротацию:

1. Старый `token_id` в БД уже имеет `revoked_at IS NOT NULL`
2. Повторное предъявление → статус `refreshTokenRevoked`
3. Сервер вызывает `revokeTokenFamily(family_id)` — **все** токены в цепочке инвалидируются
4. И злоумышленник, и легитимный пользователь получают 401 → оба должны пройти полную аутентификацию
5. Это гарантирует, что украденный refresh token не может быть использован незаметно

## Безопасность /api/auth/office-token

### Механизм верификации

Эндпоинт `/api/auth/office-token` — это единственная точка обмена внешнего токена (от team.wb.ru) на внутренние office-токены. Для предотвращения подделки:

1. **Server-side верификация через upstream** — сервер вызывает `team.wb.ru/api/v1/user/info` с предъявленным Bearer-токеном. Если team.wb.ru возвращает `200 OK` с валидными данными пользователя — токен подлинный.

2. **Не доверяем локальному парсингу JWT** — подпись внешнего токена не может быть проверена, т.к. signing key принадлежит team.wb.ru. Функция `parseAuthClaimsFromToken` используется только для auth-прокси эндпоинтов, но **НЕ** для выдачи office-токенов.

3. **IP Rate Limiting** — эндпоинт защищён тем же rate limiter'ом, что и login-эндпоинты (`authRateLimiter`).

4. **Минимальные claims** — в выданный office-токен включаются только `employee_id`, `user_name`, `role` и `responsibilities`. Identity берётся исключительно из ответа team.wb.ru.

### Почему не mTLS / client secret / IP allowlist?

- **mTLS** — клиент — это браузер (SPA), mTLS для браузеров нецелесообразен.
- **Client secret** — SPA не может хранить секрет безопасно (код виден пользователю).
- **IP allowlist** — пользователи работают из разных сетей, ограничение по IP невозможно.
- **Текущий подход** — валидация через upstream (team.wb.ru) является стандартным паттерном для BFF (Backend-for-Frontend): проверяем внешний токен, выпускаем свой.

## Преимущества Office Access Token

1. **Производительность** - нет необходимости обращаться к внешнему API при каждом запросе
2. **Безопасность** - токен подписан сервером, содержит минимальную информацию
3. **Роль в токене** - роль пользователя уже включена в токен, не нужно запрашивать из БД
4. **Зоны ответственности** - ID объектов, которые пользователь может редактировать, встроены в токен
5. **Контроль** - сервер полностью контролирует выпуск и проверку токенов
6. **Hashed storage** - refresh token_id хранится как HMAC-SHA256 хеш (pepper = JWT secret)
7. **Token rotation** - каждый refresh → новый refresh, старый помечается consumed
8. **Replay detection** - повторный revoked refresh → инвалидация всего семейства (family_id)
9. **Audit trail** - ip_address, user_agent, last_used_at для каждого refresh token

## Структура токенов

### Office Access Token Claims

```json
{
  "employee_id": "12345",
  "user_name": "Иван Иванов",
  "role": 2,
  "responsibilities": {
    "buildings": [1, 5, 12],
    "floors": [3, 7, 15],
    "coworkings": [42, 89, 103]
  },
  "exp": 1707900000,
  "iat": 1707896400
}
```

**TTL:** 1 час

**Responsibilities:** Массивы ID объектов, за которые пользователь несёт ответственность (может редактировать). Поле `responsibilities` может отсутствовать, если у пользователя нет зон ответственности.

### Office Refresh Token Claims

```json
{
  "employee_id": "12345",
  "token_id": "a1b2c3...random-hex-64-chars",
  "family_id": "d4e5f6...random-hex-64-chars",
  "exp": 1710488400,
  "iat": 1707896400
}
```

**TTL:** 30 дней

**Хранение в БД:** `token_id` **не хранится** в открытом виде. В базу записывается
`HMAC-SHA256(token_id, OFFICE_JWT_SECRET)` — хеш с pepper. Даже при полном дампе
БД восстановить исходный `token_id` и подделать JWT невозможно.

**Token family:** Поле `family_id` связывает цепочку ротации. Первый refresh token при
логине получает новый `family_id`; при каждой ротации новый токен наследует тот же
`family_id`. Если предъявлен уже *использованный* (revoked) refresh — это replay-атака,
и **все** токены с этим `family_id` немедленно инвалидируются.

### Таблица `office_refresh_tokens`

| Поле | Тип | Описание |
|---|---|---|
| `id` | BIGSERIAL PK | auto-increment |
| `token_id` | TEXT UNIQUE | HMAC-SHA256 хеш token_id (не plain-text!) |
| `employee_id` | TEXT | кто владеет токеном |
| `family_id` | TEXT | цепочка ротации для replay detection |
| `expires_at` | TIMESTAMPTZ | срок жизни |
| `revoked_at` | TIMESTAMPTZ | когда токен был consumed/revoked |
| `last_used_at` | TIMESTAMPTZ | когда токен последний раз использован |
| `ip_address` | TEXT | IP клиента при создании токена |
| `user_agent` | TEXT | User-Agent при создании токена |
| `created_at` | TIMESTAMPTZ | время создания записи |

## Роли пользователей

- `1` - Employee (сотрудник)
- `2` - Admin (администратор)

## Конфигурация

Для работы Office токенов необходимо установить переменную окружения:

```bash
OFFICE_JWT_SECRET=your-secret-key-here
```
openssl rand -base64 32

Если секрет не установлен, сервер выдаст предупреждение, и Office токены не будут выпускаться/проверяться.

## CORS

Поддерживаемые заголовки:
- `Authorization` - для auth-эндпоинтов
- `Office-Access-Token` - для всех защищенных эндпоинтов
- `Office-Refresh-Token` - для обновления токенов
