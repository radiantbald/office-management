# Исправление порядка загрузки responsibilities

## Проблема

После изменения middleware (требование Office-Access-Token для всех защищенных эндпоинтов), запрос к `/api/responsibilities` выполнялся **до получения** Office-Access-Token, что приводило к ошибке `401 Unauthorized`.

### Порядок был:
1. `updateAuthUserBlock(cachedUser)` → вызывал `fetchResponsibilitiesForUser()`
2. `/api/responsibilities` запрос (без Office-Access-Token) ❌
3. `fetchOfficeToken()` - получение токена

## Решение

### 1. Убрали автоматический вызов из `updateAuthUserBlock`

**Файл:** `frontend/src/app.js`, строка 825

**Было:**
```javascript
updateBreadcrumbProfile(user);
void fetchResponsibilitiesForUser();
```

**Стало:**
```javascript
updateBreadcrumbProfile(user);
// Note: fetchResponsibilitiesForUser() is called explicitly after Office-Access-Token is obtained
```

### 2. Добавили явный вызов ПОСЛЕ получения токена

#### В `initializeAuth()` (строка 1273):
```javascript
if (userResult.success) {
  setUserInfo(userResult.user);
  updateAuthUserBlock(userResult.user);
  refreshDeskBookingOwnership();
  void fetchResponsibilitiesForUser(); // ← Явный вызов после токена
  if (authGate) {
    hideAuthGate();
  }
  return;
}
```

#### В `handleAuthSuccess()` (строка 12258):
```javascript
// Obtain the server-signed Office_Token before making any API requests.
await fetchOfficeToken(token);

// Fetch responsibilities after Office-Access-Token is obtained
void fetchResponsibilitiesForUser(); // ← Явный вызов после токена

await runAppInit();
```

### 3. Добавили защиту в `fetchResponsibilitiesForUser`

**Файл:** `frontend/src/app.js`, строка 1544-1554

Добавлена проверка наличия валидного Office-Access-Token перед выполнением запроса:

```javascript
// Ensure Office-Access-Token is available before making protected API requests
if (!isOfficeAccessTokenValid()) {
  const empty = getEmptyResponsibilities();
  responsibilitiesState = {
    status: "loaded",
    data: empty,
    error: null,
    loadedAt: Date.now(),
  };
  return empty;
}
```

## Результат

### Правильный порядок загрузки:

1. ✅ `updateAuthUserBlock(cachedUser)` - показ UI с кешированными данными
2. ✅ `await fetchOfficeToken(token)` - получение Office-Access-Token
3. ✅ `void fetchResponsibilitiesForUser()` - запрос к API с токеном

### Преимущества:

- ✅ Нет ошибок 401 при загрузке responsibilities
- ✅ Все запросы к защищенным API выполняются с валидным токеном
- ✅ Добавлена дополнительная защита от вызова без токена
- ✅ UI быстро показывается пользователю (из кеша)
- ✅ Данные загружаются в фоне после получения токена

## Тестирование

- ✅ Frontend компилируется без ошибок
- ✅ Нет линтерных ошибок
- ✅ Порядок вызовов исправлен в обоих местах (initializeAuth и handleAuthSuccess)
- ✅ Добавлена защита от вызова без токена

## Связанные изменения

- Backend: Middleware теперь требует только Office-Access-Token (см. CHANGELOG_AUTH.md)
- Frontend: Исправлен порядок загрузки данных
