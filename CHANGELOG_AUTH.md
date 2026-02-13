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

- `POST /api/auth/user/info` - проксирует к team.wb.ru
- `GET /api/auth/user/wb-band` - проксирует к team.wb.ru
- `POST /api/auth/office-token` - выпускает Office токены
- `POST /api/auth/refresh` - обновляет Office токены
- `POST /api/auth/v2/code/wb-captcha` - запрос кода
- `POST /api/auth/v2/auth` - подтверждение кода

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
