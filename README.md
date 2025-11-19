# 💳 Fintech Wallet - Progetto di Tesi

![Python](https://img.shields.io/badge/python-3.12-blue)
![React](https://img.shields.io/badge/react-18-blue)
![TypeScript](https://img.shields.io/badge/typescript-5.6-blue)
![FastAPI](https://img.shields.io/badge/fastapi-0.115-green)
![PostgreSQL](https://img.shields.io/badge/postgresql-16-blue)
![License](https://img.shields.io/badge/license-MIT-green)

> Wallet digitale full-stack ispirato a Revolut con focus su sicurezza (RLS, MFA, OIDC), gestione crypto e operazioni bancarie simulate. Progetto di tesi per il corso di laurea L-31 Informatica per le Aziende Digitali - Unipegaso.

**⚠️ DISCLAIMER**: Questo è un ambiente di simulazione a scopo esclusivamente didattico. Tutte le operazioni (transazioni, ricariche, prelievi, trading crypto) sono simulate e non comportano movimentazione di denaro reale.

---

## 📑 Indice

1. [Descrizione](#-descrizione)
2. [Funzionalità Principali](#-funzionalità-principali)
3. [Stack Tecnologico](#-stack-tecnologico)
4. [Architettura](#-architettura)
5. [Prerequisiti](#-prerequisiti)
6. [Installazione](#-installazione)
7. [Utilizzo](#-utilizzo)
8. [Esempi API](#-esempi-api)
9. [Configurazione](#-configurazione)
10. [Testing](#-testing)
11. [Sicurezza e Conformità](#-sicurezza-e-conformità)
12. [Documentazione](#-documentazione)
13. [Limitazioni](#-limitazioni)
14. [Troubleshooting](#-troubleshooting)
15. [Contatti](#-contatti)

---

## 📖 Descrizione

Fintech Wallet è un'applicazione full-stack che implementa un wallet digitale moderno con funzionalità di:
- **Gestione conti** con saldi in tempo reale
- **Portafoglio crypto** con trading simulato (acquisto/vendita)
- **Ricariche istantanee** con validazione carta
- **Prelievi bancari** con sistema frozen funds e MFA
- **Quotazioni real-time** da CoinCap API
- **Autenticazione forte** con OIDC/PKCE e OTP

Il progetto dimostra l'implementazione di pattern architetturali moderni (microservizi, API-first, Row-Level Security) e conformità a standard normativi (GDPR, PSD2, OWASP API Security Top 10) in un contesto accademico.

### Contesto Accademico

- **Università**: Unipegaso
- **Corso di Laurea**: L-31 Informatica per le Aziende Digitali
- **Studente**: Alessandro Turino
- **Anno Accademico**: 2024-2025
- **Ispirazione**: Revolut (neobank europea)

---

## ✨ Funzionalità Principali

### 🏦 Gestione Conti
- Conti
- Visualizzazione saldo disponibile e bloccato
- Cronologia transazioni con filtri per data e categoria
- Sistema di idempotenza per prevenire duplicazioni

### 💰 Portafoglio Crypto
- Acquisto e vendita criptovalute (BTC, ETH, USDT, ecc.)
- Valutazione portfolio in tempo reale
- Aggregazione posizioni per ticker
- Integrazione CoinCap API per quotazioni live

### 💳 Ricariche
- Ricarica istantanea con simulazione carta
- Validazione numero carta (16 cifre)
- Controllo scadenza carta (MM/YYYY)
- Validazione CVV (3 cifre)

### 🏧 Prelievi Bancari
- Registrazione metodi di prelievo (IBAN)
- Validazione IBAN con checksum
- Sistema frozen funds (blocco temporaneo fondi)
- Calcolo fee automatico (1% con minimo €2)
- Richiesta MFA per operazioni sensibili

### 📊 Market Data
- Quotazioni crypto real-time
- Variazioni percentuali 24h
- Capitalizzazione di mercato
- Volume di scambio

### 🔐 Sicurezza
- Autenticazione OIDC con Keycloak (PKCE flow)
- Multi-Factor Authentication (OTP via email/SMS)
- Row-Level Security su PostgreSQL
- Scope-based authorization
- Audit trail completo

---

## 🛠 Stack Tecnologico

### Frontend
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| React | 18 | UI framework |
| TypeScript | 5.6 | Type safety |
| Vite | 5 | Build tool |
| Material-UI | 7 | Component library |
| React Query | 5 | Data fetching & caching |
| React Router | 7 | Routing |
| oidc-client-ts | 3 | OIDC authentication |

### Backend
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| Python | 3.12 | Language |
| FastAPI | 0.115 | Web framework |
| Pydantic | 2.x | Data validation |
| psycopg | 3.x | PostgreSQL driver (async) |
| PyJWT | 2.x | JWT validation |

### Database & Infrastructure
| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| PostgreSQL | 16 | Database |
| pgcrypto | - | Data encryption |
| Keycloak | 26 | Identity Provider (OIDC) |
| Docker Compose | - | Orchestration |
| NGINX | - | API Gateway (roadmap) |
| Mailpit | - | Email testing |

### External Services
| Servizio | Ruolo |
|----------|-------|
| CoinCap API v2 | Quotazioni crypto real-time |

---

## 🏗 Architettura

### Diagramma Componenti

```
┌─────────────────┐
│  React Frontend │ (Port 5173)
│  TypeScript     │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │ (Port 8080 - roadmap)
│  NGINX          │
└────────┬────────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│Backend │ │   OTP    │ │Keycloak  │
│FastAPI │ │ Service  │ │  OIDC    │
│(8000)  │ │  (9000)  │ │  (8080)  │
└───┬────┘ └────┬─────┘ └──────────┘
    │           │
    └─────┬─────┘
          ▼
    ┌──────────────┐
    │ PostgreSQL 16│
    │   + RLS      │
    │   + pgcrypto │
    └──────────────┘
```

### Pattern Implementati

- **Microservizi**: Backend principale + OTP service separato
- **API-First**: Documentazione OpenAPI auto-generata
- **Row-Level Security**: Isolamento dati a livello database
- **Dependency Injection**: FastAPI dependencies per auth e DB
- **Repository Pattern**: Accesso dati tramite connessioni con RLS
- **Idempotency**: Chiavi univoche per transazioni
- **Event Sourcing**: Audit logs per tracciabilità

Per diagrammi dettagliati (class, sequence, deployment), consulta [`docs/uml-diagram.md`](docs/uml-diagram.md).

---

## 📋 Prerequisiti

### Software Richiesto

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **Node.js** >= 18 (opzionale, per sviluppo frontend)
- **Python** >= 3.11 (opzionale, per sviluppo backend)

### Risorse Sistema

- **RAM**: Minimo 4GB (consigliato 8GB)
- **Spazio Disco**: ~2GB per immagini Docker
- **Porte Libere**: 5173, 8000, 8080, 9000, 5432, 8025

---

## 🚀 Installazione

### 1. Clone Repository

```bash
git clone https://github.com/aturino22/fintech-wallet.git
cd fintech-wallet
```

### 2. Configurazione Ambiente

```bash
# Copia file di esempio
cp .env.example .env

# (Opzionale) Modifica variabili se necessario
# nano .env
```

### 3. Avvio Stack Completo

```bash
# Avvia tutti i servizi
docker compose up -d --build

# Verifica stato servizi
docker compose ps

# Dovresti vedere:
# - postgres (healthy)
# - keycloak (healthy)
# - backend (healthy)
# - otp (healthy)
# - frontend (healthy)
# - mailpit (healthy)
```

### 4. Bootstrap Database

```bash
# Esegui migrazioni e seed
docker compose exec backend python -m backend.db.manage bootstrap

# Output atteso:
# ✓ Migrazioni applicate
# ✓ Seed dati inseriti
# ✓ Utente demo creato
```

### 5. Verifica Installazione

Apri il browser e verifica:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/health
- **Keycloak**: http://localhost:8080
- **Mailpit**: http://localhost:8025 (interfaccia email)

**Credenziali Demo**:
- Username: `demo-user`
- Password: `DemoPassword!123`

---

## 💻 Utilizzo

### Accesso Applicazione

1. Apri http://localhost:5173
2. Clicca su "Accedi"
3. Inserisci credenziali demo
4. Esplora le funzionalità:
   - **Home**: Dashboard con conti e transazioni
   - **Market**: Quotazioni crypto e trading
   - **Profile**: Gestione profilo e prelievi

### Gestione Database

```bash
# Solo migrazioni
docker compose exec backend python -m backend.db.manage migrate

# Solo seed
docker compose exec backend python -m backend.db.manage seed

# Reset completo (⚠️ cancella tutti i dati)
docker compose down -v
docker compose up -d
docker compose exec backend python -m backend.db.manage bootstrap
```

### Logs e Debugging

```bash
# Logs di tutti i servizi
docker compose logs -f

# Logs specifici
docker compose logs -f backend
docker compose logs -f keycloak
docker compose logs -f otp

# Accesso shell backend
docker compose exec backend bash

# Accesso PostgreSQL
docker compose exec postgres psql -U thesis_admin -d thesis_fintech
```

### Stop e Cleanup

```bash
# Stop servizi (mantiene volumi)
docker compose stop

# Stop e rimozione container
docker compose down

# Rimozione completa (inclusi volumi)
docker compose down -v
```

---

## 📡 Esempi API

### 1. Ottenere Access Token

```bash
curl -X POST http://localhost:8080/realms/thesis/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=frontend" \
  -d "grant_type=password" \
  -d "username=demo-user" \
  -d "password=DemoPassword!123"
```

**Risposta**:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "openid thesis-access accounts:read transactions:read transactions:write"
}
```

### 2. Lista Conti

```bash
ACCESS_TOKEN="<your_token>"

curl -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8000/accounts
```

### 3. Crea Transazione

```bash
curl -X POST http://localhost:8000/transactions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "account_id": "bbbbbbbb-1111-2222-3333-555555555555",
    "amount": "50.00",
    "currency": "EUR",
    "category": "food",
    "direction": "buy"
  }'
```

### 4. Ricarica Conto

```bash
curl -X POST http://localhost:8000/accounts/bbbbbbbb-1111-2222-3333-555555555555/topup \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "150.00"}'
```

### 5. Invia OTP

```bash
curl -X POST http://localhost:8000/otp/send \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel_code": "EMAIL"}'
```

### 6. Verifica OTP

```bash
curl -X POST http://localhost:8000/otp/verify \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "challenge_id": "<challenge_id_from_send>",
    "code": "123456"
  }'
```

### 7. Registra Metodo Prelievo

```bash
curl -X POST http://localhost:8000/payouts/withdrawal-methods \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_holder_name": "Mario Rossi",
    "iban": "IT60X0542811101000000123456",
    "bic": "BCITITMM",
    "bank_name": "Intesa Sanpaolo",
    "is_default": true
  }'
```

### 8. Richiedi Prelievo

```bash
curl -X POST http://localhost:8000/payouts/withdrawals \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "bbbbbbbb-1111-2222-3333-555555555555",
    "method_id": "<method_id_from_registration>",
    "amount": "120.50",
    "currency": "EUR"
  }'
```

### 9. Quotazioni Crypto

```bash
curl http://localhost:8000/market/assets
```

### 10. Ordine Crypto

```bash
curl -X POST http://localhost:8000/crypto/positions/orders \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "account_id": "bbbbbbbb-1111-2222-3333-555555555555",
    "asset_symbol": "BTC",
    "asset_name": "Bitcoin",
    "price_eur": "45000.00",
    "quantity": "0.01",
    "side": "buy"
  }'
```

---

## ⚙️ Configurazione

### Variabili d'Ambiente Principali

Il file `.env` contiene tutte le configurazioni. Le principali:

#### Database
```env
DB_HOST=postgres
DB_PORT=5432
DB_NAME=thesis_fintech
DB_USER=thesis_admin
DB_PASSWORD=thesis_admin
```

#### OIDC / Keycloak
```env
OIDC_ENABLED=true
OIDC_ISSUER=http://localhost:8080/realms/thesis
OIDC_CLIENT_ID=frontend
OIDC_JWKS_URL=http://localhost:8080/realms/thesis/protocol/openid-connect/certs
OIDC_USER_ID_CLAIM=user_id
```

#### OTP Service
```env
OTP_SERVICE_BASE_URL=http://localhost:9000
OTP_CODE_TTL_SECONDS=60
OTP_MAX_ATTEMPTS=5
MFA_SESSION_TTL_SECONDS=300
```

#### CORS
```env
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

#### Market Data
```env
COINCAP_BASE_URL=https://api.coincap.io/v2
COINCAP_API_KEY=  # Opzionale, aumenta rate limit
```

Per la lista completa, consulta `.env.example`.

---

## 🧪 Testing

### Test Backend

```bash
# Esegui tutti i test
docker compose exec backend pytest

# Test con coverage
docker compose exec backend pytest --cov=app --cov-report=html

# Test specifici
docker compose exec backend pytest tests/test_accounts.py
docker compose exec backend pytest tests/test_transactions.py -v
```

### Test Manuali E2E

1. **Login Flow**:
   - Accedi con demo-user
   - Verifica redirect a home
   - Controlla presenza token in localStorage

2. **Transazioni**:
   - Crea transazione con idempotency-key
   - Riprova con stessa chiave → 200 OK (non 201)
   - Verifica saldo non cambia

3. **Ricarica**:
   - Inserisci carta valida
   - Verifica validazione scadenza
   - Controlla saldo aggiornato

4. **Prelievo**:
   - Registra IBAN
   - Richiedi OTP
   - Verifica codice in Mailpit (http://localhost:8025)
   - Completa prelievo
   - Verifica frozen funds

5. **Crypto Trading**:
   - Visualizza market
   - Acquista BTC
   - Verifica posizione in portfolio
   - Vendi parzialmente
   - Controlla valutazione EUR

### Scenari Testati

- ✅ Autenticazione OIDC con PKCE
- ✅ Validazione JWT e scope
- ✅ RLS isolation tra utenti
- ✅ Idempotenza transazioni
- ✅ Frozen funds workflow
- ✅ OTP challenge/response
- ✅ MFA session management
- ✅ Validazione IBAN checksum
- ✅ Validazione scadenza carta
- ✅ Calcolo fee prelievi

---

## 🔒 Sicurezza e Conformità

### Misure di Sicurezza Implementate

#### Autenticazione e Autorizzazione
- **OIDC/OAuth2** con Keycloak
- **PKCE flow** per prevenire authorization code interception
- **JWT validation** con verifica firma RSA256
- **Scope-based authorization** granulare
- **MFA** con OTP challenge/response

#### Database Security
- **Row-Level Security (RLS)** su tutte le tabelle sensibili
- **pgcrypto** per cifratura dati (configurabile)
- **Prepared statements** per prevenire SQL injection
- **Connection pooling** con limiti configurabili

#### Application Security
- **Idempotency keys** per prevenire duplicazioni
- **Rate limiting** (roadmap con NGINX)
- **CORS** configurabile per origini autorizzate
- **Input validation** con Pydantic
- **Audit trail** completo per operazioni critiche

#### Data Protection
- **Frozen funds** per prelievi pending
- **Lock pessimistici** per prevenire race condition
- **Transazioni atomiche** per consistenza dati
- **Hashing OTP** prima del salvataggio

### Conformità Normativa

#### GDPR (Regolamento UE 2016/679)
- ✅ Privacy by design
- ✅ Minimizzazione dati
- ✅ Cifratura dati sensibili (configurabile)
- ✅ Audit trail per tracciabilità
- ✅ Retention policy configurabili

#### PSD2 (Direttiva UE 2015/2366)
- ✅ Strong Customer Authentication (SCA) con MFA
- ✅ Secure communication (TLS)
- ✅ Transaction monitoring

#### OWASP API Security Top 10
- ✅ Broken Object Level Authorization → RLS
- ✅ Broken Authentication → OIDC/JWT
- ✅ Excessive Data Exposure → Pydantic models
- ✅ Lack of Resources & Rate Limiting → Roadmap
- ✅ Broken Function Level Authorization → Scopes
- ✅ Mass Assignment → Pydantic validation
- ✅ Security Misconfiguration → Environment variables
- ✅ Injection → Prepared statements
- ✅ Improper Assets Management → OpenAPI docs
- ✅ Insufficient Logging & Monitoring → Audit trail

#### WCAG 2.1 Level AA
- ✅ Contrasto colori adeguato
- ✅ Navigazione da tastiera
- ✅ Etichette ARIA
- ✅ Focus visibile
- ✅ Responsive design

---

## 📚 Documentazione

### Documenti Disponibili

- **[`docs/uml-diagram.md`](docs/uml-diagram.md)**: Diagrammi UML completi (class, component, sequence, deployment, state)
- **[`docs/roadmap.md`](docs/roadmap.md)**: Roadmap di sviluppo dettagliata (20 giorni) con problemi riscontrati e soluzioni
- **[`docs/design-choices.md`](docs/design-choices.md)**: Scelte di design UI/UX e palette colori
- **[`docs/openapi.yaml`](docs/openapi.yaml)**: Specifica OpenAPI 3.1 delle API
- **[`README_Fintech_Thesis.md`](README_Fintech_Thesis.md)**: Panoramica estesa del progetto di tesi

### API Documentation

La documentazione interattiva Swagger è disponibile a:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Database Schema

Il modello ER è documentato in [`backend/db/er/er_model.md`](backend/db/er/er_model.md).

Tabelle principali:
- `users` - Utenti registrati
- `accounts` - Conti multi-valuta
- `account_balances` - Saldi disponibili/bloccati
- `transactions` - Transazioni finanziarie
- `user_crypto_positions` - Posizioni crypto
- `withdrawal_methods` - Metodi di prelievo (IBAN)
- `withdrawals` - Richieste di prelievo
- `otp_channels` - Canali OTP (EMAIL, SMS)
- `otp_challenges` - Challenge OTP attive
- `user_mfa_sessions` - Sessioni MFA verificate
- `otp_audits` - Audit tentativi OTP
- `security_logs` - Log eventi di sicurezza

---

## ⚠️ Limitazioni

### Ambiente Simulato

- ❌ **Nessun pagamento reale**: Tutte le operazioni sono simulate
- ❌ **No gateway di pagamento**: Stripe, PayPal, ecc. non integrati
- ❌ **No bonifici SEPA reali**: I prelievi non eseguono trasferimenti bancari
- ❌ **No exchange crypto reali**: Trading simulato senza connessione a exchange

### Limitazioni Tecniche

- ⚠️ **Cache in-memory**: JWKS cache non scala su deployment multi-istanza (serve Redis)
- ⚠️ **No retry automatici**: Chiamate a servizi esterni senza circuit breaker
- ⚠️ **No monitoring**: Mancano Prometheus/Grafana per osservabilità
- ⚠️ **No distributed tracing**: Assenza di Jaeger per tracciamento richieste
- ⚠️ **Rate limiting basilare**: Non protegge da attacchi DDoS coordinati
- ⚠️ **Cifratura opzionale**: pgcrypto configurabile ma non attivo di default

### Miglioramenti Futuri

1. Implementare cache distribuita (Redis) per JWT validation
2. Aggiungere circuit breaker per chiamate esterne (Resilience4j pattern)
3. Integrare monitoring (Prometheus + Grafana)
4. Implementare distributed tracing (Jaeger/OpenTelemetry)
5. Aggiungere rate limiting granulare per utente
6. Implementare notifiche push per eventi critici
7. Aggiungere supporto multi-lingua (i18n)
8. Implementare CI/CD pipeline con GitHub Actions
9. Aggiungere test E2E automatizzati con Playwright

---

## 🔧 Troubleshooting

### Problema: Keycloak non si avvia

**Sintomo**: Container keycloak in stato "unhealthy"

**Soluzione**:
```bash
# Aumenta memoria Docker (Settings → Resources → Memory: 4GB+)
# Riavvia container
docker compose restart keycloak

# Verifica logs
docker compose logs keycloak
```

### Problema: Database connection refused

**Sintomo**: Backend non riesce a connettersi a PostgreSQL

**Soluzione**:
```bash
# Verifica che postgres sia healthy
docker compose ps postgres

# Se non è avviato
docker compose up -d postgres

# Attendi che sia ready
docker compose logs -f postgres | grep "ready to accept connections"
```

### Problema: Frontend non carica

**Sintomo**: Pagina bianca o errore CORS

**Soluzione**:
```bash
# Verifica variabile CORS nel backend
docker compose exec backend env | grep CORS

# Deve includere http://localhost:5173
# Se manca, aggiungi in .env:
# CORS_ALLOWED_ORIGINS=http://localhost:5173

# Riavvia backend
docker compose restart backend
```

### Problema: OTP non arriva

**Sintomo**: Codice OTP non ricevuto

**Soluzione**:
```bash
# Verifica Mailpit
open http://localhost:8025

# Controlla logs OTP service
docker compose logs otp

# Verifica configurazione SMTP
docker compose exec backend env | grep OTP_SMTP
```

### Problema: Token JWT scaduto

**Sintomo**: 401 Unauthorized dopo alcuni minuti

**Soluzione**:
- Il token ha TTL di 5 minuti (configurabile in Keycloak)
- Il frontend dovrebbe gestire refresh automatico
- Manualmente: rifare login

### Problema: Reset completo necessario

**Soluzione**:
```bash
# Stop e rimozione completa
docker compose down -v

# Riavvio pulito
docker compose up -d --build

# Bootstrap database
docker compose exec backend python -m backend.db.manage bootstrap
```

### Logs Utili

```bash
# Tutti i servizi
docker compose logs -f

# Solo errori
docker compose logs -f | grep -i error

# Ultimi 100 righe
docker compose logs --tail=100

# Specifico servizio
docker compose logs -f backend
```

---

## 📞 Contatti

### Autore

**Alessandro Turino**
- 📧 Email: turino.alessandro2201@gmail.com
- 🎓 Università: Unipegaso
- 📚 Corso: L-31 Informatica per le Aziende Digitali
- 📅 Anno Accademico: 2024-2025

### Repository

- 🔗 GitHub: [github.com/aturino22/fintech-wallet](https://github.com/aturino22/fintech-wallet)

### Ringraziamenti

Ringraziamenti ai docenti e colleghi che hanno supportato lo sviluppo di questo progetto accademico.

---

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file [LICENSE](LICENSE) per dettagli.

Il progetto utilizza tecnologie open-source conformi alle [Linee Guida AgID per il riuso del software](https://www.agid.gov.it/it/linee-guida).

---

## 🎓 Nota Accademica

Questo progetto è stato sviluppato come elaborato finale per il corso di laurea L-31 Informatica per le Aziende Digitali presso l'Università Telematica Pegaso. Ha uno scopo esclusivamente didattico e dimostrativo.

**Tutte le operazioni finanziarie sono simulate e non comportano movimentazione di denaro reale.**

---

