# Data Flow Diagram — Office Management System

## Контекстная диаграмма (Level 0)

```mermaid
graph LR
    User["👤 Пользователь\n(Browser)"]
    System["🏢 Office Management\nSystem"]
    WBTeam["🔐 team.wb.ru\nExternal Auth"]

    User -- "HTTP Request" --> System
    System -- "HTTP Response" --> User
    System -- "Auth Request" --> WBTeam
    WBTeam -- "User Info + Token" --> System
    
    style System fill:#4A90E2,stroke:#2E5C8A,stroke-width:3px,color:#fff
    style User fill:#50C878,stroke:#2D7A4F,stroke-width:2px,color:#fff
    style WBTeam fill:#FF6B6B,stroke:#C92A2A,stroke-width:2px,color:#fff
```

---

## Детализированная диаграмма (Level 1)

```mermaid
graph LR
    Browser["🖥️ Browser\nSPA"]
    Nginx["🌐 Nginx\nStatic + Proxy"]
    MW["🛡️ authMiddleware\nVerify Office-Access-Token\n(kid-aware: RS256 primary, HS256 legacy)"]
    API["⚙️ Go API\nREST Handlers"]
    DB[("💾 PostgreSQL")]
    FS["📁 File Storage\nuploads/buildings/"]
    WB["🔐 team.wb.ru\nExternal Auth"]

    Browser -- "HTTP/HTTPS" --> Nginx
    Nginx -- "Static files" --> Browser
    Nginx -- "Proxy /api/*" --> MW
    MW -- "claims in context" --> API
    API -- "JSON Response" --> Nginx
    API -- "SQL Queries" --> DB
    DB -- "Result Sets" --> API
    API -- "Read/Write" --> FS
    API -- "Proxy (auth endpoints only)" --> WB
    WB -- "User Info" --> API

    style Browser fill:#E8F4F8,stroke:#4A90E2,stroke-width:2px
    style Nginx fill:#FFF4E6,stroke:#FD7E14,stroke-width:2px
    style MW fill:#FFF7E6,stroke:#FA8C16,stroke-width:2px
    style API fill:#E6F7FF,stroke:#1890FF,stroke-width:2px
    style DB fill:#F0F5FF,stroke:#597EF7,stroke-width:2px
    style FS fill:#F6FFED,stroke:#52C41A,stroke-width:2px
    style WB fill:#FFF1F0,stroke:#FF4D4F,stroke-width:2px
```

---

## API Endpoints (Level 2 — Auth)

```mermaid
graph LR
    subgraph Client
        JS["🎨 Frontend JS"]
    end

    subgraph AuthAPI["Auth Endpoints (public — не за authMiddleware)"]
        Code["/api/v2/auth/code/wb-captcha\nPOST — Запрос кода"]
        Confirm["/api/v2/auth/confirm\nPOST — Подтверждение кода"]
        UserInfo["/api/user/info\nGET — Информация о пользователе"]
        WbBand["/api/user/wb-band\nGET — WB Band пользователя"]
        OfficeToken["/api/auth/office-token\nPOST — Выдача Office JWT"]
        Refresh["/api/auth/refresh\nPOST — cookie + X-CSRF-Token + X-Device-ID"]
        Session["/api/auth/session\nGET — restore session + CSRF cookie"]
        Logout["/api/auth/logout\nPOST — cookie + X-CSRF-Token"]
    end

    subgraph Ext["External"]
        AuthHR["auth-hrtech.wb.ru"]
        TeamWB["team.wb.ru"]
    end

    subgraph Data
        JWTMod["🔑 JWT Key Manager\n(RS256 + kid, HS256 legacy fallback)"]
        DB[("💾 PostgreSQL\nusers\noffice_refresh_tokens")]
    end

    JS -- "phone + captcha" --> Code
    Code -- "proxy" --> AuthHR
    JS -- "confirmation code" --> Confirm
    Confirm -- "proxy" --> AuthHR

    JS -- "Authorization: Bearer" --> UserInfo
    UserInfo -- "proxy" --> TeamWB
    UserInfo -- "upsert user" --> DB

    JS -- "Authorization: Bearer" --> OfficeToken
    OfficeToken -- "verify token (upstream call)" --> TeamWB
    TeamWB -- "user identity (employee_id, wbUserID)" --> OfficeToken
    OfficeToken -- "resolve role" --> DB
    OfficeToken -- "sign tokens" --> JWTMod
    JWTMod -- "store refresh token (hashed)" --> DB
    OfficeToken -- "Set-Cookie: access + refresh + csrf" --> JS

    JS -- "office_refresh_token + X-CSRF-Token + X-Device-ID" --> Refresh
    Refresh -- "Origin/Referer + double-submit check" --> Refresh
    Refresh -- "validate hash" --> DB
    Refresh -- "sign new tokens" --> JWTMod
    Refresh -- "Set-Cookie: new access + refresh + csrf" --> JS

    JS -- "cookie auto" --> Session
    Session -- "session claims (+ ensure CSRF cookie)" --> JS

    JS -- "cookie auto + X-CSRF-Token" --> Logout
    Logout -- "Origin/Referer + double-submit check" --> Logout
    Logout -- "revoke refresh + clear all auth cookies" --> DB

    style Client fill:#FFF4E6,stroke:#FD7E14,stroke-width:2px
    style AuthAPI fill:#FFF7E6,stroke:#FA8C16,stroke-width:2px
    style Ext fill:#FFF1F0,stroke:#FF4D4F,stroke-width:2px
    style Data fill:#F0F5FF,stroke:#597EF7,stroke-width:2px
```

---

## API Endpoints (Level 2 — Buildings & Spaces)

```mermaid
graph LR
    subgraph Client
        JS["🎨 Frontend JS"]
    end

    subgraph BuildAPI["Building Endpoints"]
        Buildings["/api/buildings\nGET / POST"]
        Floors["/api/floors\nGET / POST / PUT / DELETE"]
        Spaces["/api/spaces\nGET / POST / PUT / DELETE"]
        Desks["/api/desks\nGET / POST / PUT / DELETE"]
        DeskBulk["/api/desks/bulk\nPOST — Массовое создание"]
        MeetRooms["/api/meeting-rooms\nGET / POST / PUT / DELETE"]
    end

    subgraph Data
        DB[("💾 PostgreSQL")]
        FS["📁 uploads/buildings/"]
    end

    JS -- "Office-Access-Token" --> Buildings
    JS -- "Office-Access-Token" --> Floors
    JS -- "Office-Access-Token" --> Spaces
    JS -- "Office-Access-Token" --> Desks
    JS -- "Office-Access-Token" --> DeskBulk
    JS -- "Office-Access-Token" --> MeetRooms

    Buildings -- "office_buildings" --> DB
    Buildings -- "image upload" --> FS
    Floors -- "floors" --> DB
    Spaces -- "coworkings" --> DB
    Desks -- "workplaces" --> DB
    DeskBulk -- "workplaces (batch)" --> DB
    MeetRooms -- "meeting_rooms" --> DB

    style Client fill:#FFF4E6,stroke:#FD7E14,stroke-width:2px
    style BuildAPI fill:#E6FFFB,stroke:#13C2C2,stroke-width:2px
    style Data fill:#F0F5FF,stroke:#597EF7,stroke-width:2px
```

---

## API Endpoints (Level 2 — Bookings & Users)

```mermaid
graph LR
    subgraph Client
        JS["🎨 Frontend JS"]
    end

    subgraph BookingAPI["Booking Endpoints"]
        Bookings["/api/bookings\nGET / POST"]
        BookingSub["/api/bookings/:id\nDELETE — Отмена"]
        MRBook["/api/meeting-room-bookings\nGET / POST"]
        MRBookSub["/api/meeting-room-bookings/:id\nDELETE — Отмена"]
    end

    subgraph UserAPI["User Endpoints"]
        Users["/api/users\nGET — Список"]
        UserRole["/api/users/role\nPUT — Смена роли"]
        Resp["/api/responsibilities\nGET — Зоны ответственности"]
    end

    subgraph Data
        DB[("💾 PostgreSQL")]
    end

    JS -- "Office-Access-Token" --> Bookings
    JS -- "Office-Access-Token" --> BookingSub
    JS -- "Office-Access-Token" --> MRBook
    JS -- "Office-Access-Token" --> MRBookSub

    JS -- "Office-Access-Token" --> Users
    JS -- "Office-Access-Token" --> UserRole
    JS -- "Office-Access-Token" --> Resp

    Bookings -- "workplace_bookings" --> DB
    BookingSub -- "UPDATE cancelled_at" --> DB
    MRBook -- "meeting_room_bookings" --> DB
    MRBookSub -- "UPDATE cancelled_at" --> DB

    Users -- "users" --> DB
    UserRole -- "UPDATE users.role" --> DB
    Resp -- "buildings + floors + coworkings" --> DB

    style Client fill:#FFF4E6,stroke:#FD7E14,stroke-width:2px
    style BookingAPI fill:#F9F0FF,stroke:#722ED1,stroke-width:2px
    style UserAPI fill:#FFF0F6,stroke:#EB2F96,stroke-width:2px
    style Data fill:#F0F5FF,stroke:#597EF7,stroke-width:2px
```

---

## Сценарий аутентификации (Auth Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Server
    participant W as team.wb.ru
    participant DB as PostgreSQL
    participant J as JWT Key Manager

    Note over U,J: Шаг 1 — Получение Authorization Token
    U->>F: Открыть приложение
    F->>U: Показать форму входа
    U->>F: Ввести телефон
    F->>A: POST /api/v2/auth/code/wb-captcha
    A->>W: Запрос кода подтверждения (proxy)
    W-->>A: Код отправлен
    A-->>F: success: true
    F->>U: Показать поле для кода
    U->>F: Ввести код
    F->>A: POST /api/v2/auth/confirm
    A->>W: Подтвердить код (proxy)
    W-->>A: Authorization Token
    A-->>F: authorization_token
    
    Note over U,J: Шаг 2 — Получение информации + Office Token
    F->>A: GET /api/user/info (Authorization: Bearer)
    A->>W: proxy → GET /api/v1/user/info
    W-->>A: User Info (employee_id, name, wbUserID)
    A->>DB: Upsert user (full_name, employee_id, wb_user_id)
    A-->>F: user data + role
    
    F->>A: POST /api/auth/office-token (Authorization: Bearer)
    Note right of A: Rate limit (IP) → верификация через upstream
    A->>W: GET /api/v1/user/info (Bearer token)
    W-->>A: 200 OK — user identity (employee_id, wbUserID, fullName)
    Note right of A: Identity получена от team.wb.ru, НЕ из локального парсинга JWT
    A->>DB: Resolve employee_id + role
    DB-->>A: role
    A->>J: Подписать Office Access + Refresh JWT (RS256 + kid)
    J-->>A: office_access_token + office_refresh_token
    A->>DB: Сохранить refresh token (HMAC-SHA256 hash, family_id, device_id, ip, ua)
    A-->>F: Set-Cookie: HttpOnly + session claims (JSON)
    F->>F: Сохранить session claims в памяти (не localStorage!)
    
    Note over U,J: Шаг 3 — Работа с защищёнными API
    U->>F: Просмотр зданий
    F->>A: GET /api/buildings (Cookie: office_access_token)
    Note right of A: authMiddleware: VerifyOfficeAccessToken (kid-aware local verify — без внешних вызовов)
    A->>A: claims injected в context
    A->>DB: SELECT * FROM office_buildings
    DB-->>A: Buildings data
    A-->>F: JSON response
    F->>U: Показать список зданий
    
    Note over U,J: Шаг 4 — Обновление токена (Rotation + Replay Protection)
    F->>F: access_exp из session claims истёк
    F->>A: POST /api/auth/refresh (Cookie: office_refresh_token + X-CSRF-Token + X-Device-ID)
    A->>A: CSRF middleware: Origin/Referer + double-submit
    A->>A: HMAC-SHA256(token_id, pepper) → token_hash
    A->>DB: ATOMIC: UPDATE SET revoked_at=now() WHERE hash AND revoked_at IS NULL RETURNING ...
    Note right of DB: Row-level atomicity: only 1 of N parallel requests gets the row
    DB-->>A: family_id="abc123", device_id, ip (token already consumed)
    A->>J: Подписать новый Access + Refresh JWT (same family_id)
    J-->>A: new tokens
    A->>DB: Сохранить новый refresh token (hashed, family_id, device_id, ip, ua)
    A-->>F: Set-Cookie: HttpOnly + new session claims
    F->>F: Обновить session claims в памяти

    Note over U,J: Шаг 4a — Восстановление сессии (перезагрузка страницы)
    F->>A: GET /api/auth/session (Cookie: office_access_token)
    A->>A: Verify JWT из cookie
    A->>A: If CSRF cookie missing → mint office_csrf_token
    A-->>F: session claims (employee_id, user_name, role, access_exp, refresh_exp)
    F->>F: Сохранить в памяти

    Note over U,J: Шаг 4b — Logout
    U->>F: Нажать "Выход"
    F->>A: POST /api/auth/logout (Cookie + X-CSRF-Token)
    A->>A: CSRF middleware: Origin/Referer + double-submit
    A->>DB: Revoke refresh token
    A-->>F: Clear-Cookie: access + refresh + csrf
    F->>F: Очистить in-memory session

    Note over U,J: Шаг 5 — Replay Detection (atomic, race-safe)
    Note right of A: Атакующий отправляет старый refresh token
    A->>DB: UPDATE ... WHERE hash AND revoked_at IS NULL RETURNING ...
    DB-->>A: 0 rows (already consumed atomically)
    A->>DB: SELECT → revoked_at NOT NULL → REPLAY!
    A->>DB: Revoke ALL tokens WHERE family_id = "abc123"
    A-->>F: 401 — session invalidated
```

---

## Сценарий бронирования рабочих мест (Booking Flow)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API Server
    participant DB as PostgreSQL
    
    Note over U,DB: Просмотр доступных рабочих мест
    U->>F: Выбрать здание и этаж
    F->>A: GET /api/spaces?floor_id=X
    A->>DB: SELECT coworkings WHERE floor_id
    DB-->>A: Spaces data
    A-->>F: JSON
    F->>A: GET /api/desks?space_id=Y&date=2026-02-14
    A->>DB: SELECT workplaces LEFT JOIN workplace_bookings
    DB-->>A: Desks + booking status
    A-->>F: Desks with booking info
    F->>U: Показать план этажа
    
    Note over U,DB: Создание бронирования
    U->>F: Выбрать свободный стол
    U->>F: Подтвердить бронь
    F->>A: POST /api/bookings (workplace_id, date, tenant_employee_id)
    A->>A: Проверить права из JWT claims
    A->>DB: INSERT INTO workplace_bookings
    DB-->>A: Booking created
    A-->>F: booking_id + details
    F->>U: Бронь создана
    
    Note over U,DB: Отмена бронирования
    U->>F: Отменить бронь
    F->>A: DELETE /api/bookings/:id
    A->>A: Проверить права
    A->>DB: UPDATE workplace_bookings SET cancelled_at = NOW()
    DB-->>A: OK
    A-->>F: Success
    F->>U: Бронь отменена
```

---

## Сценарий управления зданиями (Building Management)

```mermaid
sequenceDiagram
    participant A as Admin
    participant F as Frontend
    participant API as API Server
    participant DB as PostgreSQL
    participant FS as File Storage
    
    Note over A,FS: Все /api/* запросы проходят через authMiddleware (kid-aware verify, claims в context)
    
    Note over A,FS: Создание здания
    A->>F: Заполнить форму здания
    F->>API: POST /api/buildings (multipart, Office-Access-Token)
    Note right of API: authMiddleware → claims в context
    API->>API: Проверить роль из claims (role=2 Admin)
    API->>FS: Сохранить изображение
    FS-->>API: /uploads/buildings/123.png
    API->>DB: INSERT INTO office_buildings
    DB-->>API: Building ID
    API-->>F: building_id + image_url
    F->>A: Здание создано
    
    Note over A,FS: Создание этажа
    A->>F: Добавить этаж
    F->>API: POST /api/floors (building_id, name, level, plan_svg)
    API->>API: Проверить responsibility из claims
    API->>DB: INSERT INTO floors
    DB-->>API: Floor ID
    API-->>F: floor_id
    
    Note over A,FS: Создание пространства (коворкинг)
    A->>F: Нарисовать зону на плане
    F->>API: POST /api/spaces (floor_id, name, points, subdivision)
    API->>API: Проверить responsibility из claims
    API->>DB: INSERT INTO coworkings
    DB-->>API: Space ID
    API-->>F: space_id
    
    Note over A,FS: Массовое добавление столов
    A->>F: Разместить столы в зоне
    F->>API: POST /api/desks/bulk (space_id, label, x, y, width, height)
    API->>API: Проверить responsibility из claims
    API->>DB: INSERT INTO workplaces (batch)
    DB-->>API: Desk IDs
    API-->>F: desk_ids
```

---

## Структура базы данных (ER-диаграмма)

```mermaid
erDiagram
    users ||--o{ workplace_bookings : "books"
    users ||--o{ meeting_room_bookings : "books"
    users ||--o{ office_refresh_tokens : "has"
    
    office_buildings ||--|{ floors : "contains"
    
    floors ||--|{ coworkings : "contains"
    floors ||--|{ meeting_rooms : "contains"
    
    coworkings ||--|{ workplaces : "contains"
    
    workplaces ||--o{ workplace_bookings : "booked_as"
    
    meeting_rooms ||--o{ meeting_room_bookings : "booked_as"
    
    users {
        bigint id PK
        text full_name
        text employee_id UK
        text wb_team_profile_id
        text wb_user_id UK
        text avatar_url
        text wb_band
        int role "1=Employee 2=Admin"
        timestamptz created_at
    }
    
    office_buildings {
        bigint id PK
        text name
        text address
        text timezone
        text image_url
        text responsible_employee_id
        text floors_json
        timestamptz created_at
    }
    
    floors {
        bigint id PK
        bigint building_id FK
        text name
        int level
        text plan_svg
        text responsible_employee_id
        timestamptz created_at
    }
    
    coworkings {
        bigint id PK
        bigint floor_id FK
        text name
        text subdivision_level_1
        text subdivision_level_2
        text responsible_employee_id
        text points_json
        text color
        int snapshot_hidden
        timestamptz created_at
    }
    
    workplaces {
        bigint id PK
        bigint coworking_id FK
        text label
        float x
        float y
        float width
        float height
        float rotation
        timestamptz created_at
    }
    
    workplace_bookings {
        bigint id PK
        bigint workplace_id FK
        text applier_employee_id
        text tenant_employee_id
        text date
        timestamptz cancelled_at
        text canceller_employee_id
        timestamptz created_at
    }
    
    meeting_rooms {
        bigint id PK
        bigint floor_id FK
        text name
        int capacity
        text points_json
        text color
        timestamptz created_at
    }
    
    meeting_room_bookings {
        bigint id PK
        bigint meeting_room_id FK
        text applier_employee_id
        timestamptz start_at
        timestamptz end_at
        timestamptz cancelled_at
        text canceller_employee_id
        timestamptz created_at
    }
    
    office_refresh_tokens {
        bigint id PK
        text token_hash UK "HMAC-SHA256(token_id, pepper)"
        text employee_id
        text family_id "token family for replay detection"
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz last_used_at
        text ip_address
        text user_agent
        timestamptz created_at
    }
```

---

## Основные потоки данных

### 1. Аутентификация
- **Вход:** User → Frontend → API → auth-hrtech.wb.ru (код) → team.wb.ru (user info)
- **Выдача office-токенов:** Frontend → API `/api/auth/office-token` → **upstream verification** (team.wb.ru/api/v1/user/info) → resolve role → JWT Handler → **HttpOnly cookies** (access + refresh) + session claims (JSON, convenience-only) → Frontend (in-memory)
- **Восстановление сессии:** Frontend → `GET /api/auth/session` → validate access cookie → session claims → Frontend (in-memory)
- **Обновление:** Frontend → API `/api/auth/refresh` (cookie + `X-CSRF-Token` + `X-Device-ID`) → **CSRF middleware** (`Origin/Referer` + double-submit) → hash token_id → **atomic consume** (UPDATE…RETURNING, race-safe) → **device_id check** → issue new pair (same family_id) → новые cookies (access + refresh + csrf)
- **Sliding expiration (по активности):** авто-refresh запускается только при недавней активности пользователя; idle-сессия не продлевается бесконечно
- **Выход:** Frontend → `POST /api/auth/logout` (`X-CSRF-Token`) → **CSRF middleware** → revoke refresh in DB → clear cookies (access + refresh + csrf)
- **Replay protection:** повторный revoked refresh → `revokeTokenFamily(family_id)` → 401 для всей цепочки
- **Device binding:** refresh привязан к `device_id`; несовпадение → revoke family → 401
- **IP/UA:** audit-only — логируются для forensics, **не блокируют** (VPN, NAT, mobile)
- **Rate limiting:** `/api/auth/office-token` и login-эндпоинты защищены IP rate limiter
- **XSS-защита:** токены в HttpOnly cookies — JS не имеет доступа к raw JWT
- **CSRF-защита:** double-submit cookie (`office_csrf_token` + `X-CSRF-Token`) + `Origin/Referer` check + SameSite=Strict (по умолчанию; конфигурируется)

### 2. Управление зданиями (CRUD)
- **Чтение:** Frontend → API → PostgreSQL → JSON → Frontend
- **Создание:** Frontend → API (multipart) → File Storage + PostgreSQL → Frontend
- **Проверка прав:** authMiddleware → claims в context (`employee_id`, `role`) → handler проверяет роль из JWT и ответственность в БД по `employee_id`

### 3. Бронирование рабочих мест
- **Просмотр:** Frontend → API → `workplaces LEFT JOIN workplace_bookings` → Frontend
- **Создание:** Frontend → API → `INSERT INTO workplace_bookings` → Frontend
- **Отмена:** Frontend → API → `UPDATE cancelled_at = NOW()` → Frontend (Soft Delete)

### 4. Бронирование переговорных
- **Просмотр:** Frontend → API → `meeting_room_bookings WHERE end_at > NOW()` → Frontend
- **Создание:** Frontend → API → проверка пересечений → `INSERT INTO meeting_room_bookings`
- **Отмена:** Frontend → API → `UPDATE cancelled_at = NOW()`

### 5. Управление пользователями
- **Роли:** Admin → API → `UPDATE users SET role` (1=Employee, 2=Admin)
- **Responsibilities:** через `responsible_employee_id` в таблицах buildings, floors, coworkings → проверяются в БД при изменяющих операциях

### 6. Файловое хранилище
- **Загрузка:** Frontend → API → `/uploads/buildings/` (local FS)
- **Отдача:** Browser → Nginx `/uploads/*` → File System

---

## Технологический стек

| Компонент | Технология |
|-----------|------------|
| **Frontend** | Vanilla JavaScript, HTML5, CSS3, Vite |
| **Backend** | Go 1.21+, net/http, pgx driver |
| **Database** | PostgreSQL 16 Alpine |
| **Auth** | JWT RS256 + kid (custom, HS256 legacy fallback), team.wb.ru API |
| **File Storage** | Local filesystem (`uploads/`) |
| **Web Server** | Nginx (prod), Go http.FileServer (dev) |
| **Containerization** | Docker, Docker Compose |
| **API Style** | REST JSON |

---

## Безопасность

1. **Двухуровневая аутентификация**
   - Authorization Token (внешний, от team.wb.ru / auth-hrtech.wb.ru)
   - Office-Access-Token (внутренний JWT, TTL по умолчанию 10 минут; конфиг `OFFICE_ACCESS_TTL_MINUTES`, clamp 5..10)
   - Office-Refresh-Token (TTL по умолчанию 30 дней; конфиг `OFFICE_REFRESH_TTL_DAYS`, clamp 7..30; ротация при каждом обновлении)
   - **Upstream token verification** — `/api/auth/office-token` **не доверяет** локально-декодированным JWT claims; вместо этого вызывает `team.wb.ru/api/v1/user/info` для подтверждения identity. Signing key внешнего токена нам недоступен, поэтому upstream-валидация — единственный надёжный способ.
   - **Rate limiting** — `/api/auth/office-token` защищён IP rate limiter (как login-эндпоинты)
   - **Key management** — Office JWT подписываются RS256 с `kid`; активный ключ выбирается через `OFFICE_JWT_ACTIVE_KID`, верификация выполняется по key ring (`OFFICE_JWT_PUBLIC_KEYS_JSON`), legacy HS256 токены поддерживаются на период миграции
   - **Token hashing** — token_id хранится как HMAC-SHA256(token_id, pepper), не в открытом виде; pepper задаётся отдельно (`OFFICE_REFRESH_PEPPER`, fallback на `OFFICE_JWT_SECRET`)
   - **Token families** — family_id связывает цепочку ротации для replay detection
   - **Фактические JWT claims (по коду):**
     - Access JWT: `employee_id`, `user_name`, `role`, `exp`, `iat`
     - Refresh JWT: `employee_id`, `token_id`, `family_id`, `exp`, `iat`
   - **Replay protection** — повторное использование revoked refresh → инвалидация всей семьи токенов; **atomic consume** (UPDATE…RETURNING) исключает race condition при параллельных refresh
   - **Audit fields** — last_used_at, ip_address, user_agent в каждом refresh token

2. **Middleware цепочка** (оборачивает весь mux — невозможно «забыть» проверку)
   - loggingMiddleware
   - securityHeadersMiddleware (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
   - corsMiddleware (whitelist origins)
   - csrfProtectionMiddleware (unsafe `/api/*`: Origin/Referer + double-submit)
   - **authMiddleware** — проверяет Office-Access-Token (kid-aware local verify: RS256 primary, HS256 legacy fallback) для всех `/api/*` кроме public paths; инжектирует claims в request context

3. **Контроль доступа**
   - Роли: Employee (1), Admin (2)
   - Responsibilities не хранятся в JWT; проверка выполняется по БД (`responsible_employee_id`) с `employee_id` из access claims
   - Rate limiting на auth endpoints + office-token (10 req/min per IP)

4. **Защита данных**
   - Параметризованные SQL-запросы (pgx)
   - Валидация входных данных
   - HTTPS в production
   - Statement timeout (30 сек)
   - MaxBytesReader для загрузок (5 MB)

---

## Особенности архитектуры

1. **Stateless API** — в JWT хранятся минимальные claims для авторизации, без массивов responsibilities
2. **Graceful Shutdown** — корректное завершение при SIGTERM/SIGINT
3. **Health Check** — `GET /api/health` для мониторинга
4. **Auto Migrations** — автоматическое применение миграций при старте сервера
5. **Connection Pooling** — настроенный пул соединений к PostgreSQL
6. **Timezone Support** — каждое здание имеет свою временную зону
7. **Soft Delete** — бронирования отменяются через `cancelled_at`, не удаляются
8. **Token Rotation + Replay Detection** — при обновлении refresh token старый отзывается (revoked_at + last_used_at) **атомарно** через `UPDATE … RETURNING` (защита от race condition параллельных запросов), выдаётся новый с тем же family_id; повторное использование revoked token → инвалидация всего семейства

---

**Дата создания:** 2026-02-13
**Обновлено:** 2026-02-16
**Версия:** 2.5 — RS256+kid key management + DFD sync
