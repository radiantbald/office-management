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
    API["⚙️ Go API\nREST Server"]
    Auth["🔑 Auth Module\nJWT Handler"]
    DB[("💾 PostgreSQL")]
    FS["📁 File Storage\nuploads/buildings/"]
    WB["🔐 team.wb.ru\nExternal Auth"]

    Browser -- "HTTP/HTTPS" --> Nginx
    Nginx -- "Static files" --> Browser
    Nginx -- "Proxy /api/*" --> API
    API -- "JSON Response" --> Nginx
    API -- "SQL Queries" --> DB
    DB -- "Result Sets" --> API
    API -- "Read/Write" --> FS
    API -- "Validate JWT" --> Auth
    Auth -- "Claims" --> API
    Auth -- "Verify Token" --> WB
    WB -- "User Info" --> Auth

    style Browser fill:#E8F4F8,stroke:#4A90E2,stroke-width:2px
    style Nginx fill:#FFF4E6,stroke:#FD7E14,stroke-width:2px
    style API fill:#E6F7FF,stroke:#1890FF,stroke-width:2px
    style Auth fill:#FFF7E6,stroke:#FA8C16,stroke-width:2px
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

    subgraph AuthAPI["Auth Endpoints"]
        Code["/api/auth/v2/code/wb-captcha\nPOST — Запрос кода"]
        Confirm["/api/auth/v2/auth\nPOST — Подтверждение кода"]
        UserInfo["/api/auth/user/info\nGET — Информация о пользователе"]
        WbBand["/api/auth/user/wb-band\nGET — WB Band пользователя"]
        OfficeToken["/api/auth/office-token\nPOST — Получение Office JWT"]
        Refresh["/api/auth/refresh\nPOST — Обновление токена"]
    end

    subgraph Ext["External"]
        AuthHR["auth-hrtech.wb.ru"]
        TeamWB["team.wb.ru"]
    end

    subgraph Data
        JWTMod["🔑 JWT Handler"]
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
    OfficeToken -- "verify identity" --> TeamWB
    OfficeToken -- "sign tokens" --> JWTMod
    JWTMod -- "store refresh token" --> DB
    OfficeToken -- "access + refresh tokens" --> JS

    JS -- "office_refresh_token" --> Refresh
    Refresh -- "validate" --> DB
    Refresh -- "sign new tokens" --> JWTMod
    Refresh -- "new tokens" --> JS

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
    participant J as JWT Handler

    Note over U,J: Шаг 1 — Получение Authorization Token
    U->>F: Открыть приложение
    F->>U: Показать форму входа
    U->>F: Ввести телефон
    F->>A: POST /api/auth/v2/code/wb-captcha
    A->>W: Запрос кода подтверждения
    W-->>A: Код отправлен
    A-->>F: success: true
    F->>U: Показать поле для кода
    U->>F: Ввести код
    F->>A: POST /api/auth/v2/auth
    A->>W: Подтвердить код
    W-->>A: Authorization Token
    A-->>F: authorization_token
    
    Note over U,J: Шаг 2 — Получение Office Access Token
    F->>A: POST /api/auth/office-token (Authorization: Bearer)
    A->>W: GET /api/v1/user/info
    W-->>A: User Info (employee_id, name)
    A->>DB: Upsert user
    A->>DB: Получить роль + responsibilities
    DB-->>A: role, building_ids, floor_ids, coworking_ids
    A->>J: Создать Office JWT
    J->>DB: Сохранить refresh token
    J-->>A: office_access_token + office_refresh_token
    A-->>F: Токены
    F->>F: Сохранить в localStorage
    
    Note over U,J: Шаг 3 — Работа с защищёнными API
    U->>F: Просмотр зданий
    F->>A: GET /api/buildings (Office-Access-Token)
    A->>J: Валидировать токен
    J-->>A: Valid, claims
    A->>DB: SELECT * FROM office_buildings
    DB-->>A: Buildings data
    A-->>F: JSON response
    F->>U: Показать список зданий
    
    Note over U,J: Шаг 4 — Обновление токена (Rotation)
    F->>F: Office-Access-Token истёк
    F->>A: POST /api/auth/refresh (office_refresh_token)
    A->>DB: Проверить refresh token (not revoked)
    DB-->>A: Valid
    A->>DB: Revoke old refresh token
    A->>J: Создать новый Office JWT + новый Refresh
    J->>DB: Сохранить новый refresh token
    J-->>A: new tokens
    A-->>F: office_access_token + office_refresh_token
    F->>F: Обновить в localStorage
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
    participant JWT as JWT Handler
    participant DB as PostgreSQL
    participant FS as File Storage
    
    Note over A,FS: Создание здания
    A->>F: Заполнить форму здания
    F->>API: POST /api/buildings (multipart/form-data)
    API->>JWT: Проверить роль (role=2 Admin)
    JWT-->>API: OK
    API->>FS: Сохранить изображение
    FS-->>API: /uploads/buildings/123.png
    API->>DB: INSERT INTO office_buildings
    DB-->>API: Building ID
    API-->>F: building_id + image_url
    F->>A: Здание создано
    
    Note over A,FS: Создание этажа
    A->>F: Добавить этаж
    F->>API: POST /api/floors (building_id, name, level, plan_svg)
    API->>JWT: Проверить responsibility
    JWT-->>API: Has responsibility for building
    API->>DB: INSERT INTO floors
    DB-->>API: Floor ID
    API-->>F: floor_id
    
    Note over A,FS: Создание пространства (коворкинг)
    A->>F: Нарисовать зону на плане
    F->>API: POST /api/spaces (floor_id, name, points, subdivision)
    API->>JWT: Проверить responsibility
    API->>DB: INSERT INTO coworkings
    DB-->>API: Space ID
    API-->>F: space_id
    
    Note over A,FS: Массовое добавление столов
    A->>F: Разместить столы в зоне
    F->>API: POST /api/desks/bulk (space_id, label, x, y, width, height)
    API->>JWT: Проверить responsibility
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
        text token_id UK
        text employee_id
        timestamptz expires_at
        timestamptz revoked_at
        timestamptz created_at
    }
```

---

## Основные потоки данных

### 1. Аутентификация
- **Вход:** User → Frontend → API → auth-hrtech.wb.ru (код) → team.wb.ru (user info)
- **Выход:** API → JWT Handler → `office_access_token` + `office_refresh_token` → Frontend (localStorage)
- **Обновление:** Frontend → API `/api/auth/refresh` → revoke old token → issue new pair

### 2. Управление зданиями (CRUD)
- **Чтение:** Frontend → API → PostgreSQL → JSON → Frontend
- **Создание:** Frontend → API (multipart) → File Storage + PostgreSQL → Frontend
- **Проверка прав:** JWT claims (`role`, `responsibilities`) → Middleware

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
- **Responsibilities:** через `responsible_employee_id` в таблицах buildings, floors, coworkings → включаются в JWT

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
| **Auth** | JWT HS256 (custom), team.wb.ru API |
| **File Storage** | Local filesystem (`uploads/`) |
| **Web Server** | Nginx (prod), Go http.FileServer (dev) |
| **Containerization** | Docker, Docker Compose |
| **API Style** | REST JSON |

---

## Безопасность

1. **Двухуровневая аутентификация**
   - Authorization Token (внешний, от team.wb.ru / auth-hrtech.wb.ru)
   - Office-Access-Token (внутренний JWT, TTL 1 час)
   - Office-Refresh-Token (TTL 30 дней, ротация при каждом обновлении)

2. **Middleware цепочка**
   - CORS (whitelist origins)
   - Security Headers (X-Content-Type-Options, X-Frame-Options, CSP, HSTS)
   - Logging
   - JWT Validation (Office-Access-Token)

3. **Контроль доступа**
   - Роли: Employee (1), Admin (2)
   - Responsibilities в JWT: `building_ids`, `floor_ids`, `coworking_ids`
   - Rate limiting на auth endpoints (10 req/min per IP)

4. **Защита данных**
   - Параметризованные SQL-запросы (pgx)
   - Валидация входных данных
   - HTTPS в production
   - Statement timeout (30 сек)
   - MaxBytesReader для загрузок (5 MB)

---

## Особенности архитектуры

1. **Stateless API** — вся информация о пользователе хранится в JWT-токене
2. **Graceful Shutdown** — корректное завершение при SIGTERM/SIGINT
3. **Health Check** — `GET /api/health` для мониторинга
4. **Auto Migrations** — автоматическое применение миграций при старте сервера
5. **Connection Pooling** — настроенный пул соединений к PostgreSQL
6. **Timezone Support** — каждое здание имеет свою временную зону
7. **Soft Delete** — бронирования отменяются через `cancelled_at`, не удаляются
8. **Token Rotation** — при обновлении refresh token старый отзывается, выдаётся новый

---

**Дата создания:** 2026-02-13
**Обновлено:** 2026-02-15
**Версия:** 2.0
