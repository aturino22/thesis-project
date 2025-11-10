# Fintech Thesis Wallet
> Wallet fintech ispirato a Revolut che enfatizza sicurezza (RLS, MFA, OIDC) e automazione per una tesi sperimentale.

_Badges_: pipeline CI/CD e metriche saranno pubblicate dopo l’attivazione di GitHub Actions.

## Descrizione
Applicazione full-stack (backend FastAPI + future frontend React) che offre conti multi-valuta, transazioni simulate con idempotenza e un microservizio OTP interno. Il progetto dimostra come implementare controlli di sicurezza per linea (Row-Level Security, MFA, OIDC) e come industrializzare migrazioni, seed e test automatici in un contesto accademico.

## Indice
1. [Installazione](#installazione)
2. [Utilizzo rapido](#utilizzo-rapido)
3. [Esempi di utilizzo](#esempi-di-utilizzo)
4. [Configurazione](#configurazione)
5. [Keycloak & OIDC](#keycloak--oidc)
6. [Architettura e documentazione tecnica](#architettura-e-documentazione-tecnica)
7. [Limitazioni, problemi noti e TODO](#limitazioni-problemi-noti-e-todo)
8. [Come contribuire](#come-contribuire)
9. [Licenza](#licenza)
10. [Contatti e crediti](#contatti-e-crediti)

## Installazione
1. **Clona il repository**
   ```bash
   git clone https://github.com/aturino22/revolut-like-project.git
   cd revolut-like-project
   ```
2. **Servizi di base**
   ```bash
   cd infra
   docker compose up -d postgres
   docker compose ps
   cd ..
   ```
3. **Backend Python**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate          # Windows
   pip install -r requirements.txt
   Copy-Item ..\.env.example .env  # facoltativo
   cd ..
   ```
4. **Migrazioni e seed**
   ```bash
   python -m backend.db.manage bootstrap   # migrazioni + seed
   ```
5. **(Opzionale) Frontend**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Utilizzo rapido
- **Stack Docker completo (Postgres + Keycloak + backend)**  
  ```bash
  cd infra
  docker compose up -d --build postgres keycloak otp backend
  docker compose ps
  cd ..
  ```
  L'import del realm Keycloak avviene automaticamente da `infra/keycloak/realms/thesis-realm.json`.

- **Avvio backend (dev locale senza Docker)**  
  ```bash
  cd backend
  .venv\Scripts\activate
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Gestione database**  
  ```bash
  python -m backend.db.manage migrate   # solo migrazioni
  python -m backend.db.manage seed      # solo seed
  ```
- **Test di integrazione**  
  ```bash
  backend\.venv\Scripts\python.exe -m pytest
  ```
- **Connessione da DBeaver / client SQL**
  ```
  Host: 127.0.0.1
  Porta: 5432
  DB: thesis_fintech
  User: thesis_admin
  Password: thesis_admin
  ```

## Esempi di utilizzo
### 1. Ottenere un access token da Keycloak
```bash
curl -X POST http://localhost:8080/realms/thesis/protocol/openid-connect/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_id=frontend" \
     -d "grant_type=password" \
     -d "username=demo-user" \
     -d "password=DemoPassword!123"
```
Risposta: JSON con `access_token`, `refresh_token`, `scope` (`thesis-access`) e claim `user_id`.

### 2. Chiamate API con Bearer token
```bash
ACCESS_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8000/accounts

curl -X POST http://localhost:8000/transactions \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -H "Idempotency-Key: demo-1" \
     -d '{"account_id":"bbbbbbbb-1111-2222-3333-555555555555","amount":"50.00","currency":"EUR","category":"food","direction":"buy"}'
```
### 3. Richiedere una OTP
```bash
curl -X POST http://localhost:8000/otp/send \
     -H "Authorization: Bearer $ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"channel_code":"EMAIL"}'
```
Per l'invio SMS impostare `"channel_code": "SMS"` e specificare `destination` con il numero simulato.

### Accesso al database da FastAPI
```python
from fastapi import APIRouter, Depends
from psycopg import AsyncConnection

from backend.app.db import get_connection_with_rls

router = APIRouter(prefix="/accounts", tags=["Accounts"])

@router.get("")
async def list_accounts(conn: AsyncConnection = Depends(get_connection_with_rls)):
    async with conn.cursor() as cur:
        await cur.execute("SELECT id, balance FROM accounts ORDER BY created_at")
        return await cur.fetchall()
```
La dipendenza `get_connection_with_rls` imposta `app.current_user_id` nella sessione PostgreSQL, sbloccando le policy Row-Level Security per ogni richiesta.

## Configurazione
- **Variabili d'ambiente principali (`.env`)**
  ```
  DB_HOST=postgres            # usare 127.0.0.1 se si avvia tutto senza Docker
  DB_PORT=5432
  DB_NAME=thesis_fintech
  DB_USER=thesis_admin
  DB_PASSWORD=thesis_admin
  DB_POOL_MIN_SIZE=1
  DB_POOL_MAX_SIZE=10
  DB_POOL_TIMEOUT=30.0
  OIDC_ENABLED=true
  OIDC_ISSUER=http://localhost:8080/realms/thesis
  OIDC_CLIENT_ID=frontend
  OIDC_AUDIENCE=backend
  OIDC_JWKS_URL=http://localhost:8080/realms/thesis/protocol/openid-connect/certs
  OIDC_USER_ID_CLAIM=user_id
  OIDC_JWKS_CACHE_TTL_SECONDS=300
  OIDC_CLOCK_SKEW_SECONDS=60
  OIDC_DEV_DEFAULT_SCOPES=accounts:read transactions:read transactions:write
  OTP_SERVICE_BASE_URL=http://localhost:9000
  OTP_SERVICE_TIMEOUT_SECONDS=5.0
  OTP_CODE_TTL_SECONDS=60
  ```
- **Autenticazione**: con `OIDC_ENABLED=true` il backend valida i token JWT emessi da Keycloak, propaga `user_id` nelle policy RLS e richiede gli scope `accounts:read` / `transactions:*`.  
- **Microservizio OTP**: il servizio FastAPI (porta 9000) invia email reali se configurato con `OTP_SMTP_*` e scrive gli SMS simulati a log (`OTP_SMS_LOG_FILE`).  
- **Dipendenze esterne**: PostgreSQL 16 via Docker Compose; in roadmap Keycloak, gateway NGINX, servizi OTP reali.  
- **File da consultare**: `infra/docker-compose.yml`, `docs/openapi.yaml`, `backend/db/er/`.

## Keycloak & OIDC
- **Provisioning automatico**: `infra/keycloak/realms/thesis-realm.json` importa realm `thesis`, client `frontend` (PKCE/public) e `backend` (confidential), client scope `thesis-access` con mapper:
  - `realm-roles-scope`: espone i realm role come claim `scope`.
  - `user-id-attribute`: mappa l'attributo utente `user_id` nella claim omonima.
- **Utente demo**: `demo-user` / `DemoPassword!123`, con attributo `user_id=aaaaaaaa-1111-2222-3333-444444444444` e ruoli `accounts:read`, `transactions:read`, `transactions:write`.
- **Audience**: mapper `frontend-audience-backend` aggiunge `aud=["backend"]` ai token del client `frontend`; il backend accetta solo token destinati a quell'audience.
- **Servizio OTP**: endpoint `http://localhost:9000/otp/send` gestito dal microservizio FastAPI incluso nel compose (`otp`). Il backend lo invoca via `/otp/send` e registra audit in `otp_audits`.
- **Flusso password grant per test**: comando `curl` mostrato negli esempi; in produzione usare PKCE/Authorization Code tramite frontend.
- **Aggiornamenti manuali rapidi**:
  - `docker compose -f infra/docker-compose.yml exec keycloak /opt/keycloak/bin/kcadm.sh ...` per gestire utenti/mapper da CLI.
  - `Realm Settings → User profile` definisce l'attributo custom `user_id`.
  - I nuovi utenti devono valorizzare `user_id` per passare le required action.

## Architettura e documentazione tecnica
- **Struttura repo**
  ```
  backend/   # FastAPI, migrazioni SQL, test Python
  frontend/  # React/Vite (in preparazione)
  infra/     # Docker Compose, NGINX, provisioning
  docs/      # Decision log, ER, test plan
  progress/  # Log giornalieri (Day X)
  ```
- **Componenti chiave**
  - Backend FastAPI con connessione asincrona a PostgreSQL e controlli d’idempotenza.
  - Row-Level Security su `accounts`, `transactions`, `otp_audits`, `security_logs`, applicata via `set_current_user_id`.
  - Documentazione di sicurezza e test plan in `docs/`.
  - Script di migrazione/seed orchestrati da `python -m backend.db.manage {migrate|seed|bootstrap}`.
- **Referenze**
  - `README_Fintech_Thesis.md`: panoramica estesa, principi di sicurezza, roadmap.
  - `stato_avanzamento.md`: sintesi progressi, rischi, prossimi passi.
  - `docs/test-plan-saturday.md`: piano E2E per la sessione di collaudo.

## Limitazioni, problemi noti e TODO
- Microservizio OTP email/SMS in lavorazione, da integrare con gli endpoint di backend.
- Frontend React/Vite non ancora implementato; il prototipo è backend-only.
- Mancano pipeline CI/CD e test di hardening (rate limiting, headers di sicurezza su gateway).
- Sessione di test end-to-end da completare (vedi `docs/test-plan-saturday.md`).

## Come contribuire
1. Fork del repository e creazione di un branch tematico.
2. Segui le guideline di commit riportate in `guidelines.std` (`[<SCOPE> - <ACTION>] - descrizione`).
3. Aggiorna/aggiungi test (`pytest`) e assicurati che `python -m backend.db.manage bootstrap` giri senza errori.
4. Apri una pull request descrivendo:
   - Motivazione della modifica.
   - Impatto su migrazioni/configurazioni.
   - Istruzioni di test/verifica.

## Licenza
Licenza in definizione: il file `LICENSE` verrà aggiunto prima della pubblicazione pubblica. Nel frattempo l’uso è limitato al progetto di tesi dell’autore.

## Contatti e crediti
- **Autore**: Alessandro Turino — <turino.alessandro2201@gmail.com>
- **Documentazione**: `docs/decision-log.md`, `progress/Day N - ddmmyyyy.md`
- Ringraziamenti a relatori e colleghi che supportano il progetto accademico.

