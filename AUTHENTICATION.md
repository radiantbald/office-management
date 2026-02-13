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

1. **`POST /api/auth/user/info`** - получение информации о пользователе от team.wb.ru
   - Требует: `Authorization: Bearer <token>`
   - Проксирует запрос к `team.wb.ru/api/v1/user/info`

2. **`GET /api/auth/user/wb-band`** - получение wb_band пользователя
   - Требует: `Authorization: Bearer <token>`
   - Проксирует запрос к `team.wb.ru/api/v1/user/profile/{id}/wbband`

3. **`POST /api/auth/office-token`** - получение Office Access Token
   - Требует: `Authorization: Bearer <token>`
   - Возвращает: `{ office_access_token, office_refresh_token }`

4. **`POST /api/auth/refresh`** - обновление Office Access Token
   - Требует: `{ office_refresh_token }` в теле запроса
   - Возвращает: `{ office_access_token, office_refresh_token }`

5. **`POST /api/auth/v2/code/wb-captcha`** - запрос кода для входа
   - Не требует токенов

6. **`POST /api/auth/v2/auth`** - подтверждение кода
   - Не требует токенов

## Поток аутентификации

### Шаг 1: Получение Authorization токена

Клиент получает `Authorization` токен через:
- Вход через team.wb.ru
- Или через эндпоинты `/api/auth/v2/code/wb-captcha` и `/api/auth/v2/auth`

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

### Шаг 4: Обновление токена

Когда `office_access_token` истекает (через 1 час):

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "office_refresh_token": "eyJhbGc..."
}
```

Ответ:
```json
{
  "office_access_token": "eyJhbGc...",
  "office_refresh_token": "eyJhbGc..."
}
```

## Преимущества Office Access Token

1. **Производительность** - нет необходимости обращаться к внешнему API при каждом запросе
2. **Безопасность** - токен подписан сервером, содержит минимальную информацию
3. **Роль в токене** - роль пользователя уже включена в токен, не нужно запрашивать из БД
4. **Зоны ответственности** - ID объектов, которые пользователь может редактировать, встроены в токен
5. **Контроль** - сервер полностью контролирует выпуск и проверку токенов

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
  "token_id": "unique-token-id",
  "exp": 1710488400,
  "iat": 1707896400
}
```

**TTL:** 30 дней

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
