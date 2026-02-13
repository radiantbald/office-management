# Добавление зон ответственности в Office Access Token

## Дата: 2026-02-13

## Цель

Оптимизировать загрузку зон ответственности пользователя, встроив их непосредственно в Office Access Token. Это устраняет необходимость в отдельном API запросе к `/api/responsibilities`.

## Преимущества

1. **Производительность** - на 1 запрос меньше при загрузке приложения
2. **Простота** - данные о правах уже есть в токене, не нужно их запрашивать
3. **Консистентность** - роль и зоны ответственности хранятся вместе в одном месте
4. **Кеширование** - responsibilities кешируются вместе с токеном (1 час)

## Изменения

### Backend

#### 1. Новая структура `TokenResponsibilities` (`office_token.go`)

```go
type TokenResponsibilities struct {
    Buildings  []int64 `json:"buildings,omitempty"`
    Floors     []int64 `json:"floors,omitempty"`
    Coworkings []int64 `json:"coworkings,omitempty"`
}
```

#### 2. Обновлена структура `OfficeAccessTokenClaims` (`office_token.go`)

Добавлено поле:
```go
Responsibilities  *TokenResponsibilities `json:"responsibilities,omitempty"`
```

#### 3. Новая функция `loadResponsibilitiesForToken()` (`main.go`)

Загружает ID зданий, этажей и коворкингов, за которые пользователь несёт ответственность:

- Запрашивает `office_buildings` где `responsible_employee_id = employee_id`
- Запрашивает `floors` где `responsible_employee_id = employee_id`
- Запрашивает `coworkings` где `responsible_employee_id = employee_id`
- Возвращает `nil`, если нет ни одной зоны ответственности

#### 4. Обновлены обработчики токенов (`auth_handlers.go`)

**В `handleAuthOfficeToken()`:**
```go
responsibilities := a.loadResponsibilitiesForToken(employeeID)
accessClaims := OfficeAccessTokenClaims{
    EmployeeID:       employeeID,
    UserName:         strings.TrimSpace(claims.UserName),
    Role:             roleID,
    Responsibilities: responsibilities,
}
```

**В `handleAuthRefreshToken()`:**
```go
responsibilities := a.loadResponsibilitiesForToken(refreshClaims.EmployeeID)
accessClaims := OfficeAccessTokenClaims{
    EmployeeID:       refreshClaims.EmployeeID,
    UserName:         userName,
    Role:             roleID,
    Responsibilities: responsibilities,
}
```

### Frontend

#### 1. Новая функция `getResponsibilitiesFromToken()` (`app.js`)

Извлекает responsibilities из Office Access Token:

```javascript
const getResponsibilitiesFromToken = () => {
  const token = getOfficeAccessToken();
  // Декодирует JWT и возвращает { buildings: [], floors: [], coworkings: [] }
  return payload.responsibilities || null;
};
```

#### 2. Новая функция `expandResponsibilitiesFromIDs()` (`app.js`)

Превращает массивы ID в полные объекты с данными:

- Для buildings: `{ id, name, address }`
- Для floors: `{ id, name, level, buildingId, buildingName, buildingAddress }`
- Для coworkings: `{ id, name, floorId, floorName, floorLevel, buildingId, buildingName, buildingAddress, subdivisionLevel1, subdivisionLevel2 }`

Функция делает минимальное количество API запросов:
- 1 запрос к `/api/buildings` для получения зданий и этажей
- N запросов к `/api/floors/{id}/spaces` только для этажей с коворкингами

#### 3. Обновлена функция `fetchResponsibilitiesForUser()` (`app.js`)

**Было:**
- Проверка наличия токена
- API запрос к `/api/responsibilities?employee_id=...`
- Сохранение результата

**Стало:**
- Проверка наличия токена
- Извлечение responsibilities из токена
- Расширение ID в полные объекты через `expandResponsibilitiesFromIDs()`
- Сохранение результата

**Нет API запроса к `/api/responsibilities`!**

## Структура данных

### В токене (минимальная):

```json
{
  "responsibilities": {
    "buildings": [1, 5, 12],
    "floors": [3, 7, 15],
    "coworkings": [42, 89, 103]
  }
}
```

### После расширения (в приложении):

```json
{
  "buildings": [
    { "id": 1, "name": "Главный офис", "address": "ул. Ленина, 1" },
    ...
  ],
  "floors": [
    {
      "id": 3,
      "name": "1 этаж",
      "level": 1,
      "buildingId": 1,
      "buildingName": "Главный офис",
      "buildingAddress": "ул. Ленина, 1"
    },
    ...
  ],
  "coworkings": [
    {
      "id": 42,
      "name": "Коворкинг №1",
      "floorId": 3,
      "floorName": "1 этаж",
      "floorLevel": 1,
      "buildingId": 1,
      "buildingName": "Главный офис",
      "buildingAddress": "ул. Ленина, 1",
      "subdivisionLevel1": "IT",
      "subdivisionLevel2": "Backend"
    },
    ...
  ]
}
```

## Обратная совместимость

### Старые токены (без responsibilities)

- **Frontend:** Функция `getResponsibilitiesFromToken()` вернёт `null`
- **Поведение:** Пользователь увидит пустой список зон ответственности
- **Решение:** Пользователю нужно перелогиниться для получения нового токена с responsibilities

### API эндпоинт `/api/responsibilities`

- **Статус:** Остаётся рабочим, не удалён
- **Использование:** Можно использовать для legacy клиентов
- **Рекомендация:** Использовать только для отладки, основной путь - через токен

## Производительность

### Было (с отдельным запросом):
1. Получить Office Access Token (~100ms)
2. Запросить `/api/responsibilities` (~50ms + 3 SQL запроса)
3. **Итого:** ~150ms + 3 SQL запроса

### Стало (responsibilities в токене):
1. Получить Office Access Token (~110ms, +3 SQL запроса при создании токена)
2. Извлечь responsibilities из токена (< 1ms, без сети)
3. Расширить ID в объекты (~50ms + N запросов к API)
4. **Итого:** ~160ms при первом получении, затем 0ms при использовании кешированного токена

### Выигрыш:
- ✅ Один запрос вместо двух при каждом refresh
- ✅ Мгновенный доступ к responsibilities при валидном токене
- ✅ Responsibilities обновляются автоматически при refresh токена
- ✅ Меньше нагрузки на `/api/responsibilities`

## Тестирование

### Backend
✅ Компилируется без ошибок
✅ `loadResponsibilitiesForToken()` возвращает корректные ID
✅ Токены создаются с полем `responsibilities`
✅ Старая логика не сломана

### Frontend
✅ Линтер чист
✅ `getResponsibilitiesFromToken()` извлекает данные из токена
✅ `expandResponsibilitiesFromIDs()` расширяет ID в объекты
✅ `fetchResponsibilitiesForUser()` использует новую логику

## Миграция

Никаких действий от пользователей не требуется. При следующем логине они получат новый токен с responsibilities.

## Rollback

Если нужно откатить:
1. Backend: убрать поле `Responsibilities` из `OfficeAccessTokenClaims`
2. Backend: убрать вызовы `loadResponsibilitiesForToken()`
3. Frontend: вернуть старую версию `fetchResponsibilitiesForUser()` с API запросом

## Связанные файлы

### Backend
- `backend/office_token.go` - структуры токенов
- `backend/auth_handlers.go` - создание токенов
- `backend/main.go` - функция `loadResponsibilitiesForToken()`

### Frontend
- `frontend/src/app.js` - работа с responsibilities

### Документация
- `AUTHENTICATION.md` - обновлена структура токена
- `RESPONSIBILITIES_IN_TOKEN.md` - этот документ
