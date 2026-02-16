# Изменения в системе аутентификации

## Дата: 2026-02-13

### Цель
Упростить архитектуру аутентификации, оставив `Authorization` токен только для auth-эндпоинтов, а для всех защищенных API использовать только `Office-Access-Token`.

### Изменения

#### 1. Backend: `middleware.go`

**Было:**
- Middleware проверял сначала `Office-Access-Token`
- Если токен отсутствовал или был невалидным, fallback на `Authorization` токен
- `Authorization` токен парсился и проверялся для всех защищенных эндпоинтов

**Стало:**
- Middleware требует **только** `Office-Access-Token` для всех защищенных эндпоинтов
- Если токен отсутствует → ошибка `401 Unauthorized`
- Если токен невалидный или истек → ошибка `401 Unauthorized`
- Нет fallback на `Authorization`

#### 2. Auth-эндпоинты

Следующие эндпоинты остаются **публичными** (не проходят через authMiddleware) и сами проверяют `Authorization` внутри обработчиков:

- `GET /api/user/info` - проксирует к team.wb.ru
- `GET /api/user/wb-band` - проксирует к team.wb.ru
- `POST /api/auth/office-token` - выпускает Office токены
- `POST /api/auth/refresh` - обновляет Office токены
- `POST /api/v2/auth/code/wb-captcha` - запрос кода
- `POST /api/v2/auth/confirm` - подтверждение кода

#### 3. Документация

Создана документация:
- `AUTHENTICATION.md` - подробное описание архитектуры аутентификации
- Обновлен `README.md` - добавлена ссылка на документацию

### Преимущества

1. **Чистая архитектура** - один токен для одной цели
2. **Быстрее** - нет проверки внешнего токена при каждом запросе
3. **Безопаснее** - меньше кода, меньше точек отказа
4. **Понятнее** - явное разделение ответственности

### Обратная совместимость

**Frontend:** Не требует изменений.
- Фронтенд уже отправляет оба токена
- `Office-Access-Token` используется для защищенных API
- `Authorization` используется для auth-эндпоинтов

**Backend:** Breaking change для клиентов, которые:
- Используют только `Authorization` токен для защищенных эндпоинтов
- Не получают `Office-Access-Token` через `/api/auth/office-token`

### Миграция для сторонних клиентов

Если у вас есть клиенты, использующие только `Authorization`:

1. Получите `office_access_token`:
```bash
curl -X POST http://your-api/api/auth/office-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

2. Используйте `office_access_token` для всех защищенных запросов:
```bash
curl http://your-api/api/buildings \
  -H "Office-Access-Token: YOUR_OFFICE_ACCESS_TOKEN"
```

3. Обновляйте токен через refresh token:
```bash
curl -X POST http://your-api/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"office_refresh_token": "YOUR_REFRESH_TOKEN"}'
```

### Тестирование

✅ Backend компилируется без ошибок
✅ Middleware требует Office-Access-Token
✅ Auth-эндпоинты проверяют Authorization внутри
✅ Frontend не требует изменений

### Rollback

Если нужно откатить изменения, восстановите предыдущую версию `backend/middleware.go` с fallback логикой.

---

## Дата: 2026-02-15 — Refresh-токены: хеширование, token families, replay detection

### Цель
Усилить безопасность refresh-токенов: не хранить в открытом виде, добавить replay detection, расширить аудит.

### Изменения

#### 1. `backend/office_token.go`
- Добавлено поле `FamilyID` в `OfficeRefreshTokenClaims` — связывает цепочку ротации
- `SignOfficeRefreshToken` автоматически генерирует `FamilyID` если не задан
- Новая функция `hashTokenID(tokenID, pepper)` — `HMAC-SHA256(token_id, officeJWTSecret)`

#### 2. `backend/refresh_token_db.go` — полная переработка
- `storeRefreshToken` — принимает `tokenHash`, `familyID`, `ipAddress`, `userAgent`
- `checkRefreshToken` — возвращает `refreshTokenStatus` (NotFound/Valid/Revoked/Expired) + `familyID`
- `revokeRefreshToken` — ставит `revoked_at = now(), last_used_at = now()`
- **`revokeTokenFamily`** — инвалидирует **все** токены с тем же `family_id` (replay protection)
- Удалена `isRefreshTokenValid` (заменена на `checkRefreshToken`)

#### 3. `backend/auth_handlers.go`
- `handleAuthOfficeToken`: хеширует `token_id` перед сохранением, передаёт `family_id`, IP, UA
- `handleAuthRefreshToken`: полная переработка с replay detection:
  - `refreshTokenRevoked` → `revokeTokenFamily(familyID)` → 401
  - Revoke старого — теперь **критичен** (abort при ошибке, а не "continue")
  - Новый refresh наследует `family_id` старого
- Добавлена `truncateUA` для ограничения длины User-Agent

#### 4. `backend/main.go` — миграция
- CREATE TABLE обновлён: `family_id`, `last_used_at`, `ip_address`, `user_agent`
- `migrateRefreshTokenColumns` — добавляет новые колонки, ревокает старые plain-text токены

#### 5. Документация
- Обновлены `DATA_FLOW_DIAGRAM.md`, `dfd-viewer.html`, `AUTHENTICATION.md`

### Схема `office_refresh_tokens` (после)

| Поле | Тип | Описание |
|---|---|---|
| `token_id` | TEXT UNIQUE | HMAC-SHA256(token_id, pepper) — **хеш**, не plain text |
| `employee_id` | TEXT | владелец |
| `family_id` | TEXT | цепочка ротации |
| `expires_at` | TIMESTAMPTZ | срок жизни |
| `revoked_at` | TIMESTAMPTZ | consumed/revoked |
| `last_used_at` | TIMESTAMPTZ | аудит |
| `ip_address` | TEXT | IP при выдаче |
| `user_agent` | TEXT | UA при выдаче |
| `created_at` | TIMESTAMPTZ | время создания |

### Обратная совместимость

**Breaking:** Все ранее выданные refresh-токены инвалидированы миграцией (они хранили plain-text `token_id`, несовместимы с хеш-схемой). Пользователям потребуется повторная аутентификация.
