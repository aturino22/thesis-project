# Diagramma UML - Fintech Wallet Application

## Diagramma delle Classi (Class Diagram)

```mermaid
classDiagram
    %% ========== DOMAIN ENTITIES ==========
    
    class User {
        +UUID id
        +String email
        +String nome
        +String cognome
        +Date birthday
        +UUID preferred_otp_channel
        +DateTime created_at
    }
    
    class Account {
        +UUID id
        +UUID user_id
        +String currency
        +Decimal balance
        +String name
        +DateTime created_at
    }
    
    class AccountBalance {
        +UUID account_id
        +Decimal available_amount
        +Decimal frozen_amount
        +DateTime updated_at
    }
    
    class AccountTopUp {
        +UUID id
        +UUID user_id
        +UUID account_id
        +Decimal amount
        +String currency
        +DateTime created_at
    }
    
    class Transaction {
        +UUID id
        +UUID user_id
        +UUID account_id
        +Decimal amount
        +String currency
        +String category
        +String idem_key
        +String direction
        +DateTime created_at
    }
    
    class CryptoPosition {
        +UUID id
        +UUID user_id
        +UUID account_id
        +String asset_symbol
        +String asset_name
        +String network
        +Decimal amount
        +Decimal book_cost_eur
        +Decimal last_valuation_eur
        +String price_source
        +DateTime synced_at
        +DateTime created_at
        +DateTime updated_at
    }
    
    class WithdrawalMethod {
        +UUID id
        +UUID user_id
        +String type
        +String iban
        +String bic
        +String bank_name
        +String account_holder_name
        +Boolean is_default
        +String status
        +DateTime created_at
        +DateTime updated_at
        +DateTime verified_at
    }
    
    class Withdrawal {
        +UUID id
        +UUID user_id
        +UUID method_id
        +UUID account_id
        +Decimal amount
        +Decimal fee
        +String currency
        +Decimal total_debit
        +String status
        +DateTime requested_at
        +String requested_ip
        +String requested_user_agent
        +String reference
    }
    
    %% ========== SECURITY & OTP ==========
    
    class OtpChannel {
        +UUID id
        +String code
        +String description
        +Boolean is_active
        +DateTime created_at
    }
    
    class OtpChallenge {
        +UUID id
        +UUID user_id
        +UUID channel_id
        +String destination
        +String context
        +String code_hash
        +JSON metadata
        +String status
        +Integer attempts
        +DateTime expires_at
        +DateTime verified_at
        +DateTime created_at
    }
    
    class OtpAudit {
        +UUID id
        +UUID user_id
        +UUID otp_channel
        +String status
        +DateTime attempted_at
    }
    
    class MfaSession {
        +UUID user_id
        +String context
        +DateTime verified_at
        +DateTime expires_at
    }
    
    class SecurityLog {
        +UUID id
        +UUID user_id
        +String event_type
        +JSON metadata
        +DateTime logged_at
    }
    
    %% ========== RELATIONSHIPS ==========
    
    User "1" --> "0..1" Account : owns
    User "1" --> "0..*" Transaction : performs
    User "1" --> "0..*" CryptoPosition : holds
    User "1" --> "0..*" WithdrawalMethod : registers
    User "1" --> "0..*" Withdrawal : requests
    User "1" --> "0..*" OtpAudit : generates
    User "1" --> "0..*" OtpChallenge : initiates
    User "1" --> "0..*" MfaSession : has
    User "1" --> "0..*" SecurityLog : triggers
    User "1" --> "0..*" AccountTopUp : performs
    User "0..*" --> "0..1" OtpChannel : prefers
    
    Account "1" --> "1" AccountBalance : has
    Account "1" --> "0..*" Transaction : contains
    Account "1" --> "0..*" CryptoPosition : links
    Account "1" --> "0..*" Withdrawal : sources
    Account "1" --> "0..*" AccountTopUp : receives
    
    WithdrawalMethod "1" --> "0..*" Withdrawal : used_in
    
    OtpChannel "1" --> "0..*" OtpAudit : logs
    OtpChannel "1" --> "0..*" OtpChallenge : delivers
    
    Transaction ..> Account : validates
    Withdrawal ..> WithdrawalMethod : validates
    Withdrawal ..> Account : debits
```

## Diagramma dei Componenti (Component Diagram)

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[React SPA<br/>TypeScript + Vite]
        AUTH[OIDC Provider<br/>Keycloak Integration]
        THEME[Theme Provider<br/>Color Vision Support]
    end
    
    subgraph "API Gateway Layer"
        GW[NGINX Gateway<br/>Reverse Proxy]
        CORS[CORS Handler]
        RATE[Rate Limiter]
    end
    
    subgraph "Backend Layer - FastAPI"
        MAIN[Main Application]
        
        subgraph "Routes"
            R_ACC[Accounts Router]
            R_TXN[Transactions Router]
            R_CRYPTO[Crypto Positions Router]
            R_MKT[Market Router]
            R_OTP[OTP Router]
            R_PROF[Profile Router]
            R_WD[Withdrawals Router]
        end
        
        subgraph "Services"
            S_KC[Keycloak Admin Service]
            S_OTP[OTP Client Service]
            S_COIN[CoinCap Service]
        end
        
        subgraph "Core"
            OIDC[OIDC Validator]
            MFA[MFA Manager]
            DB[Database Connection<br/>RLS Support]
            DEPS[Dependencies<br/>Auth & Scopes]
        end
    end
    
    subgraph "OTP Microservice"
        OTP_MAIN[OTP Service<br/>FastAPI]
        OTP_EMAIL[Email Dispatcher<br/>SMTP]
        OTP_SMS[SMS Dispatcher<br/>Simulated]
    end
    
    subgraph "Identity Provider"
        KC[Keycloak<br/>OIDC/OAuth2]
        KC_REALM[Thesis Realm]
        KC_USERS[User Management]
    end
    
    subgraph "Data Layer"
        PG[(PostgreSQL 16)]
        RLS[Row Level Security]
        CRYPTO_EXT[pgcrypto Extension]
    end
    
    subgraph "External Services"
        COINCAP[CoinCap API<br/>Market Data]
        MAILPIT[Mailpit<br/>Email Testing]
    end
    
    %% Frontend connections
    UI --> AUTH
    UI --> THEME
    UI --> GW
    
    %% Gateway connections
    GW --> CORS
    GW --> RATE
    GW --> MAIN
    
    %% Backend routing
    MAIN --> R_ACC
    MAIN --> R_TXN
    MAIN --> R_CRYPTO
    MAIN --> R_MKT
    MAIN --> R_OTP
    MAIN --> R_PROF
    MAIN --> R_WD
    
    %% Backend services
    R_ACC --> DB
    R_TXN --> DB
    R_CRYPTO --> DB
    R_CRYPTO --> S_COIN
    R_MKT --> S_COIN
    R_OTP --> S_OTP
    R_PROF --> S_KC
    R_WD --> DB
    
    %% Core dependencies
    MAIN --> OIDC
    MAIN --> MFA
    MAIN --> DB
    MAIN --> DEPS
    
    OIDC --> KC
    S_KC --> KC
    S_OTP --> OTP_MAIN
    S_COIN --> COINCAP
    
    %% OTP Service
    OTP_MAIN --> OTP_EMAIL
    OTP_MAIN --> OTP_SMS
    OTP_EMAIL --> MAILPIT
    
    %% Database
    DB --> PG
    PG --> RLS
    PG --> CRYPTO_EXT
    
    %% Auth flow
    AUTH -.->|JWT Token| KC
    DEPS -.->|Validate Token| OIDC
    
    style UI fill:#e3f2fd
    style GW fill:#fff3e0
    style MAIN fill:#f3e5f5
    style OTP_MAIN fill:#e8f5e9
    style KC fill:#fce4ec
    style PG fill:#fff9c4
```

## Diagramma di Deployment

```mermaid
graph TB
    subgraph "Docker Compose Environment"
        subgraph "Frontend Container"
            FE[React App<br/>Nginx Server<br/>Port 5173]
        end
        
        subgraph "Backend Container"
            BE[FastAPI App<br/>Uvicorn<br/>Port 8000]
        end
        
        subgraph "OTP Service Container"
            OTP[OTP Service<br/>FastAPI<br/>Port 9000]
        end
        
        subgraph "Gateway Container"
            NGX[NGINX<br/>Reverse Proxy<br/>Port 8080]
        end
        
        subgraph "Identity Container"
            KC[Keycloak<br/>Port 8080]
        end
        
        subgraph "Database Container"
            PG[(PostgreSQL 16<br/>Port 5432)]
        end
        
        subgraph "Mail Testing Container"
            MP[Mailpit<br/>SMTP: 1025<br/>Web: 8025]
        end
    end
    
    subgraph "External"
        USER[User Browser]
        COINCAP_EXT[CoinCap API<br/>rest.coincap.io]
    end
    
    USER -->|HTTPS| NGX
    NGX -->|Proxy| FE
    NGX -->|Proxy /api| BE
    
    FE -->|Auth| KC
    BE -->|Validate JWT| KC
    BE -->|Admin API| KC
    BE -->|Query| PG
    BE -->|HTTP| OTP
    BE -->|HTTP| COINCAP_EXT
    
    OTP -->|SMTP| MP
    OTP -->|Query| PG
    
    style FE fill:#e3f2fd
    style BE fill:#f3e5f5
    style OTP fill:#e8f5e9
    style NGX fill:#fff3e0
    style KC fill:#fce4ec
    style PG fill:#fff9c4
    style MP fill:#f1f8e9
```

## Diagramma degli Stati - Withdrawal Process

```mermaid
stateDiagram-v2
    [*] --> PENDING: User requests withdrawal
    
    PENDING --> PROCESSING: Admin approves
    PENDING --> UNDER_REVIEW: Suspicious activity detected
    PENDING --> FAILED: Insufficient funds
    
    UNDER_REVIEW --> PROCESSING: Review passed
    UNDER_REVIEW --> FAILED: Review rejected
    
    PROCESSING --> COMPLETED: Bank transfer successful
    PROCESSING --> FAILED: Bank transfer failed
    
    COMPLETED --> [*]
    FAILED --> [*]
    
    note right of PENDING
        Funds frozen in account_balances
        available_amount reduced
        frozen_amount increased
    end note
    
    note right of COMPLETED
        Funds debited
        frozen_amount reduced
    end note
    
    note right of FAILED
        Funds unfrozen
        available_amount restored
        frozen_amount reduced
    end note
```

## Diagramma degli Stati - OTP Challenge

```mermaid
stateDiagram-v2
    [*] --> PENDING: OTP sent to user
    
    PENDING --> VERIFIED: Correct code entered
    PENDING --> EXPIRED: Time limit exceeded
    PENDING --> BLOCKED: Max attempts reached
    
    VERIFIED --> [*]: MFA session created
    EXPIRED --> [*]
    BLOCKED --> [*]
    
    note right of PENDING
        attempts = 0
        expires_at set
        code_hash stored
    end note
    
    note right of VERIFIED
        verified_at recorded
        user_mfa_sessions created
    end note
    
    note right of BLOCKED
        attempts >= max_attempts
        otp_audits: status=blocked
    end note
```

## Note Architetturali

### Sicurezza
- **Row-Level Security (RLS)**: Tutte le tabelle principali implementano RLS basato su `user_id`
- **OIDC/OAuth2**: Autenticazione tramite Keycloak con PKCE flow
- **Scope-based Authorization**: Endpoint protetti da scope specifici (es. `transactions:write`)
- **Idempotency**: Chiave `idem_key` univoca per prevenire transazioni duplicate
- **MFA**: Sistema OTP con challenge/response e sessioni temporanee
- **Audit Trail**: Logging completo di operazioni OTP e eventi di sicurezza

### Pattern Implementati
- **Repository Pattern**: Accesso al database tramite connessioni con RLS
- **Dependency Injection**: FastAPI dependencies per auth, scopes e connessioni DB
- **Microservices**: OTP service separato dal backend principale
- **API Gateway**: NGINX per routing, CORS e rate limiting
- **Event Sourcing**: Audit logs e security logs per tracciabilità

### Tecnologie Chiave
- **Backend**: FastAPI (Python), Pydantic, psycopg (async)
- **Frontend**: React, TypeScript, Vite, oidc-client-ts
- **Database**: PostgreSQL 16 con pgcrypto
- **Identity**: Keycloak (OIDC provider)
- **Infrastructure**: Docker Compose, NGINX
