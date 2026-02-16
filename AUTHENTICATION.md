# Архитектура аутентификации

## Обзор

Система использует **два типа токенов** для аутентификации:

1. **Authorization Token** (Bearer token от team.wb.ru) - внешний токен
2. **Office-Access-Token** (JWT, подписанный сервером) - внутренний токен

## Хранение токенов (XSS-защита)

Office-токены (access + refresh) хранятся **исключительно в HttpOnly Secure cookies**.
JavaScript не имеет доступа к самим JWT-строкам — это защищает от угона сессии при XSS.

| Назначение | Cookie | Path | HttpOnly | Secure | SameSite | MaxAge |
|---|---|---|---|---|---|---|
| Access JWT | `office_access_token` | `/api/` | ✅ | ✅ (HTTPS) | Lax | 1 час |
| Refresh JWT | `office_refresh_token` | `/api/auth/` | ✅ | ✅ (HTTPS) | Lax | 30 дней |
| CSRF token (double-submit) | `office_csrf_token` | `/api/` | ❌ (доступен JS) | ✅ (HTTPS) | Lax | sync c refresh/session |

**Почему HttpOnly cookies:**
- `HttpOnly` — JavaScript (и XSS-код) не может прочитать cookie через `document.cookie`
- `Secure` — cookie отправляется только по HTTPS (в dev на HTTP флаг снимается автоматически)
- `SameSite=Lax` — cookie не отправляется при cross-site POST/PUT/DELETE (защита от CSRF)
- `Path` — refresh-cookie ограничен путём `/api/auth/` и не отправляется к обычным API-эндпоинтам

**CSRF-защита (фактическая реализация):**
1. **Double-submit cookie**: `office_csrf_token` (cookie) + `X-CSRF-Token` (header) должны совпасть
2. **Origin check**: для unsafe `/api/*` сервер проверяет `Origin` (или `Referer`) и отклоняет недоверенные источники
3. `SameSite=Lax` для всех auth-cookie — дополнительный защитный слой
4. Проверка применяется middleware для state-changing методов (`POST/PUT/DELETE/...`)

**Передача claims на фронтенд:**
Вместо raw JWT бэкенд возвращает объект `session` с нечувствительными claims
(employee_id, role, responsibilities, access_exp, refresh_exp).
Фронтенд хранит их **в памяти** (JS-переменная), НЕ в localStorage.
При перезагрузке страницы `GET /api/auth/session` восстанавливает сессию из cookie.

## Логика работы

### Публичные эндпоинты (не требуют токенов)

- `/api/health` - проверка здоровья сервиса
- `/api/auth/*` - все эндпоинты аутентификации
- `/api/auth/session` - проверка текущей сессии (читает access cookie)
- `/api/auth/logout` - завершение сессии (очищает cookies, revoke refresh в БД)

### Защищенные эндпоинты (требуют Office-Access-Token)

Все остальные API эндпоинты (`/api/*`) требуют Office-Access-Token.

**Middleware проверяет (в порядке приоритета):**
1. Заголовок `Office-Access-Token` (для API-клиентов / legacy)
2. Cookie `office_access_token` (для браузерного SPA)
- Валидность подписи токена
- Срок действия токена (не истек)
- Наличие `employee_id` в claims

**Middleware цепочка:**
`loggingMiddleware` → `securityHeadersMiddleware` → `corsMiddleware` → `csrfProtectionMiddleware` → `authMiddleware`

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
   - Устанавливает: HttpOnly cookies `office_access_token` + `office_refresh_token`
   - Возвращает: `{ "session": { employee_id, user_name, role, responsibilities, access_exp, refresh_exp } }`

4. **`POST /api/auth/refresh`** - обновление Office Access Token
   - Читает `office_refresh_token` из HttpOnly cookie (fallback: JSON body для legacy)
   - Требует: `X-CSRF-Token` (значение из cookie `office_csrf_token`)
   - Проверяет: `Origin/Referer` + double-submit
   - Устанавливает: новые cookies `office_access_token` + `office_refresh_token` + `office_csrf_token`
   - Возвращает: `{ "session": { ... } }`

5. **`GET /api/auth/session`** - проверка текущей сессии
   - Читает `office_access_token` из HttpOnly cookie
   - Если отсутствует `office_csrf_token`, сервер выставляет его (migration path)
   - Возвращает: `{ "session": { ... } }` или 401

6. **`POST /api/auth/logout`** - завершение сессии
   - Требует: `X-CSRF-Token` (double-submit)
   - Проверяет: `Origin/Referer`
   - Revoke refresh token в БД (best-effort)
   - Очищает три cookies: access + refresh + csrf (MaxAge=-1)
   - Возвращает: `{ "ok": true }`

7. **`POST /api/v2/auth/code/wb-captcha`** - запрос кода для входа
   - Не требует токенов

8. **`POST /api/v2/auth/confirm`** - подтверждение кода
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

Ответ (JSON body):
```json
{
  "session": {
    "employee_id": "12345",
    "user_name": "Иван Иванов",
    "role": 2,
    "responsibilities": { "buildings": [1, 5], "floors": [3, 7] },
    "access_exp": 1707900000,
    "refresh_exp": 1710488400
  }
}
```

Ответ (cookies в заголовках):
```
Set-Cookie: office_access_token=eyJ...; Path=/api/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
Set-Cookie: office_refresh_token=eyJ...; Path=/api/auth/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000
Set-Cookie: office_csrf_token=9g...; Path=/api/; Secure; SameSite=Lax; Max-Age=2592000
```

### Шаг 3: Использование Office Access Token

Все последующие запросы к защищенным эндпоинтам автоматически отправляют cookie:

```http
GET /api/buildings
Cookie: office_access_token=eyJhbGc...
```

Frontend использует `credentials: "include"` — браузер отправляет cookie автоматически.

### Шаг 4: Восстановление сессии (после перезагрузки страницы)

```http
GET /api/auth/session
Cookie: office_access_token=eyJhbGc...
```

Ответ:
```json
{
  "session": {
    "employee_id": "12345",
    "user_name": "Иван Иванов",
    "role": 2,
    "responsibilities": { "buildings": [1, 5] },
    "access_exp": 1707900000,
    "refresh_exp": 1710488400
  }
}
```

### Шаг 5: Обновление токена (Rotation)

Когда `office_access_token` истекает (через 1 час):

```http
POST /api/auth/refresh
Cookie: office_refresh_token=eyJhbGc...
X-CSRF-Token: <office_csrf_token>
Content-Type: application/json

{}
```

**Серверная логика:**
1. **CSRF middleware**: проверить `Origin/Referer` + совпадение `X-CSRF-Token` с cookie `office_csrf_token`
2. Прочитать refresh token из cookie (fallback: JSON body)
3. Проверить JWT-подпись и expiration
4. Вычислить `HMAC-SHA256(token_id, secret)` → `token_hash`
5. **Атомарный consume** (single-statement, race-free):
   ```sql
   UPDATE office_refresh_tokens
      SET revoked_at = now(), last_used_at = now()
    WHERE token_id = $1 AND employee_id = $2 AND revoked_at IS NULL
    RETURNING family_id, device_id, ip_address, expires_at
   ```
   - Если UPDATE вернул строку → токен валиден и **уже помечен consumed** (атомарно)
   - Если 0 строк → fallback-SELECT для диагностики: not-found / revoked (replay) / expired
6. Если replay → `revokeTokenFamily(family_id)` → 401
7. **Device binding:** Если `device_id` в запросе (`X-Device-ID`) не совпадает → `revokeTokenFamily(family_id)` → 401
8. **IP audit (soft):** Если IP изменился — логируем, но **не блокируем** (VPN, мобильные сети, NAT)
9. Выпустить новый access + refresh с тем же `family_id`
10. Сохранить новый refresh (hashed) с device_id, IP и User-Agent
11. Установить новые cookies: access + refresh + csrf
12. Вернуть `{ "session": { ... } }`

> **Почему атомарный consume?** Без `UPDATE … RETURNING` возникала race condition:
> два параллельных `/refresh` могли оба прочитать `revoked_at IS NULL` (SELECT),
> а затем оба выпустить новые токены, нарушая single-use гарантию. Одиночный
> `UPDATE` с `WHERE revoked_at IS NULL` гарантирует row-level atomicity в PostgreSQL —
> ровно один запрос получит строку через `RETURNING`, остальные получат 0 rows.

### Шаг 6: Выход (Logout)

```http
POST /api/auth/logout
Cookie: office_refresh_token=eyJhbGc...
X-CSRF-Token: <office_csrf_token>
```

1. CSRF middleware проверяет `Origin/Referer` + double-submit
2. Revoke refresh token в БД (best-effort)
3. Очистить три cookies (access + refresh + csrf, MaxAge=-1)
3. Frontend очищает in-memory session claims

### Replay Detection

Если злоумышленник перехватил refresh token и использует его после того,
как легитимный пользователь уже выполнил ротацию:

1. Старый `token_id` в БД уже имеет `revoked_at IS NOT NULL`
2. Повторное предъявление → статус `refreshTokenRevoked`
3. Сервер вызывает `revokeTokenFamily(family_id)` — **все** токены в цепочке инвалидируются
4. И злоумышленник, и легитимный пользователь получают 401 → оба должны пройти полную аутентификацию
5. Это гарантирует, что украденный refresh token не может быть использован незаметно

### Атомарность refresh (защита от race condition)

Типовая проблема: браузер может отправить два параллельных `/refresh` запроса
(например, при нескольких XHR, которые одновременно обнаружили истёкший access token).

**Без атомарности** возникает TOCTOU-гонка:
```
Request A: SELECT → valid ✅
Request B: SELECT → valid ✅  (A ещё не сделал UPDATE!)
Request A: UPDATE → consumed
Request B: UPDATE → 0 rows (но код не проверяет!)
→ ОБА выпускают новые токены → неконсистентность
```

**Решение** — `consumeRefreshToken()` использует **один** SQL-statement:
```sql
UPDATE office_refresh_tokens
   SET revoked_at = now(), last_used_at = now()
 WHERE token_id = $1 AND employee_id = $2 AND revoked_at IS NULL
 RETURNING family_id, device_id, ip_address, expires_at
```

PostgreSQL гарантирует row-level atomicity: из двух параллельных UPDATE только
один получит строку через `RETURNING`. Второй получит 0 rows → fallback-SELECT
определит причину (replay / expired / not found) и ответит 401.

### Device Binding (привязка refresh token к устройству)

Refresh token привязан к стабильному `device_id`, который генерируется на клиенте при первом входе и сохраняется в `localStorage`:

- **Генерация:** `crypto.randomUUID()` (fallback: `Date.now()-random`)
- **Передача:** заголовок `X-Device-ID` (fallback: `deviceid`)
- **Хранение:** колонка `device_id` в таблице `office_refresh_tokens`

**Проверка при refresh:**
- **Device ID — жёсткая проверка:** если `device_id` в запросе не совпадает с сохранённым при выдаче → `revokeTokenFamily(family_id)` → 401. Это защита от использования украденного refresh token с другого устройства.
- **IP — мягкая эвристика (audit-only):** при изменении IP логируется предупреждение, но запрос **не блокируется**. Причина: мобильные сети, VPN, корпоративные NAT, облачные прокси регулярно меняют IP — жёсткая привязка вызвала бы ложные логауты.
- **User-Agent — только аудит:** записывается при создании и ротации, не проверяется (обновления браузера меняют UA).

**Почему device_id, а не IP/UA?**
- `device_id` **стабилен** на одном устройстве/браузере (сохраняется в `localStorage`)
- IP меняется при переключении WiFi→LTE, VPN on/off, корпоративном NAT ≈ несколько раз в день
- UA меняется при обновлении браузера ≈ раз в 2-6 недель
- При компрометации `localStorage` (XSS) — токены в HttpOnly cookies всё равно недоступны JS
- При перехвате cookie через сеть — `device_id` из другого контекста не совпадёт

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

### Почему перешли на RS256 + kid

**Контекст:** HS256 — симметричный алгоритм (один секрет для подписи и проверки). RS256 — асимметричный (приватный ключ подписывает, публичный ключ проверяет).

В системе добавлен key manager с поддержкой:

1. **RS256-подписи с `kid`** в JWT header.
2. **Ротации ключей**: активный `kid` используется для подписи, несколько публичных ключей — для верификации токенов старых поколений.
3. **Legacy fallback HS256** через `OFFICE_JWT_SECRET` для плавной миграции уже выданных токенов.

Такой подход лучше масштабируется, когда verifier'ов становится больше одного сервиса, и снижает blast radius компрометации verifier-узла.

**Замечание по refresh-хешам:** `token_id` хешируется через `OFFICE_REFRESH_PEPPER`. Если этот pepper не задан, используется fallback к `OFFICE_JWT_SECRET` (legacy-режим). Для независимой ротации refresh-хешей всегда задавайте отдельный `OFFICE_REFRESH_PEPPER`.

## Преимущества Office Access Token

1. **Производительность** - нет необходимости обращаться к внешнему API при каждом запросе
2. **Безопасность** - токен подписан сервером, содержит минимальную информацию
3. **XSS-защита** - токены в HttpOnly cookies, JS не может их прочитать
4. **CSRF-защита** - double-submit (`office_csrf_token` + `X-CSRF-Token`) + `Origin/Referer` check + SameSite=Lax
5. **Роль в токене** - роль пользователя уже включена в токен, не нужно запрашивать из БД
6. **Зоны ответственности** - ID объектов, которые пользователь может редактировать, встроены в токен
7. **Контроль** - сервер полностью контролирует выпуск и проверку токенов
8. **Hashed storage** - refresh token_id хранится как HMAC-SHA256 хеш (pepper = JWT secret)
9. **Token rotation** - каждый refresh → новый refresh, старый помечается consumed
10. **Replay detection** - повторный revoked refresh → инвалидация всего семейства (family_id)
11. **Atomic refresh** - `UPDATE … RETURNING` вместо SELECT+UPDATE, защита от race condition при параллельных запросах
12. **Audit trail** - ip_address, user_agent, last_used_at для каждого refresh token

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
**Доставка:** HttpOnly cookie `office_access_token` (Path=/api/)

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
**Доставка:** HttpOnly cookie `office_refresh_token` (Path=/api/auth/)

**Хранение в БД:** `token_id` **не хранится** в открытом виде. В базу записывается
`HMAC-SHA256(token_id, OFFICE_REFRESH_PEPPER)` — хеш с pepper. Даже при полном дампе
БД восстановить исходный `token_id` и подделать JWT невозможно.

**Token family:** Поле `family_id` связывает цепочку ротации. Первый refresh token при
логине получает новый `family_id`; при каждой ротации новый токен наследует тот же
`family_id`. Если предъявлен уже *использованный* (revoked) refresh — это replay-атака,
и **все** токены с этим `family_id` немедленно инвалидируются.

### Session Response (возвращается фронтенду)

```json
{
  "session": {
    "employee_id": "12345",
    "user_name": "Иван Иванов",
    "role": 2,
    "responsibilities": { "buildings": [1, 5], "floors": [3, 7], "coworkings": [42] },
    "access_exp": 1707900000,
    "refresh_exp": 1710488400
  }
}
```

Фронтенд хранит `session` **в памяти** (JS-переменная).
При перезагрузке страницы — `GET /api/auth/session` восстанавливает claims из cookie.

### Таблица `office_refresh_tokens`

| Поле | Тип | Описание |
|---|---|---|
| `id` | BIGSERIAL PK | auto-increment |
| `token_id` | TEXT UNIQUE | HMAC-SHA256 хеш token_id (не plain-text!) |
| `employee_id` | TEXT | кто владеет токеном |
| `family_id` | TEXT | цепочка ротации для replay detection |
| `device_id` | TEXT | идентификатор устройства (привязка, **проверяется жёстко** при refresh) |
| `expires_at` | TIMESTAMPTZ | срок жизни |
| `revoked_at` | TIMESTAMPTZ | когда токен был consumed/revoked |
| `last_used_at` | TIMESTAMPTZ | когда токен последний раз использован |
| `ip_address` | TEXT | IP клиента при создании токена (audit-only, **не блокирует**) |
| `user_agent` | TEXT | User-Agent при создании токена (audit-only, **не блокирует**) |
| `created_at` | TIMESTAMPTZ | время создания записи |

## Роли пользователей

- `1` - Employee (сотрудник)
- `2` - Admin (администратор)

## Конфигурация

Для работы Office токенов рекомендуется RS256-конфигурация:

```bash
OFFICE_JWT_ACTIVE_KID=kid-2026-01
OFFICE_JWT_PRIVATE_KEYS_JSON='{"kid-2026-01":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"}'
OFFICE_JWT_PUBLIC_KEYS_JSON='{"kid-2026-01":"-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"}'
OFFICE_REFRESH_PEPPER=your-independent-random-secret
```

Для обратной совместимости можно оставить:

```bash
OFFICE_JWT_SECRET=your-legacy-hs256-secret
```

Если signing/verification ключи не заданы, сервер выдаст предупреждение и соответствующие операции (issue/verify) будут недоступны.

## CORS

Поддерживаемые заголовки:
- `Authorization` - для auth-эндпоинтов
- `Office-Access-Token` - для API-клиентов (legacy header; браузер использует cookie)
- `X-Device-ID` - идентификатор устройства для привязки refresh token
- `X-CSRF-Token` - double-submit CSRF header для unsafe запросов
- `Access-Control-Allow-Credentials: true` - для отправки cookies
