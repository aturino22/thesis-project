# Stato avanzamento - Fintech Thesis Project

## Sintesi attuale
- Visione complessiva del wallet fintech e obiettivi accademici descritti con chiarezza.
- Architettura logica, componenti tecnologici e requisiti di sicurezza definiti nel dettaglio.
- Roadmap iniziale di due settimane delineata con attivita sequenziali.
- Backend FastAPI operativo con endpoint `/health`, `/accounts`, `/transactions` e suite di test d'integrazione.
- Row-Level Security attivata sulle tabelle multi-tenant con propagazione dell'`app.current_user_id` lato backend e test che ne verificano l'enforcement.
- Suite `pytest` (accounts/transactions) eseguita con successo su stack Docker (backend + postgres).
- Migrazioni e seed automatizzati via `python -m backend.db.manage {migrate|seed|bootstrap}`.
- Microservizio OTP (email reali + SMS simulato) operativo via servizio FastAPI dedicato e collegato al backend.

## Output documentali e tecnici disponibili
- **Descrizione progetto:** panoramica funzionale e allineamento normativo (AgID, PSD2).
- **Architettura di riferimento:** diagramma ad alto livello con frontend, backend, IdP, gateway, database e osservabilita.
- **Stack tecnologico:** scelte tecniche per ogni componente con responsabilita associate.
- **Principi di sicurezza:** misure previste (OIDC, MFA, RLS, cifratura, audit trail, hardening).
- **Installazione e bootstrap:** prerequisiti, migrazioni/seed automatizzati e orchestratore `backend.db.manage`.
- **Configurazione OIDC:** `.env.example` aggiornato con i parametri Keycloak e supporto a Authlib/python-jose lato backend.
- **Backend API:** FastAPI con pool asincrono PostgreSQL, logica di idempotenza e test `pytest`/HTTPX.
- **Documentazione test:** piano di collaudo `docs/test-plan-saturday.md` per la sessione di sabato.
- **Roadmap iniziale:** pianificazione attivita su 14 giorni con milestone tecniche.

## Elementi ancora da completare
- **Frontend e UX:** mancano implementazione React/Vite e relative integrazioni con le API.
- **Identity & Security:** integrazione Keycloak/OIDC in preparazione (realm `thesis`, client PKCE/API) e collegamento dei token utente al parametro `app.current_user_id` per eliminare l'header provvisorio `X-User-Id`.
- **DevOps:** pipeline CI/CD, ambienti automatizzati e copertura test ampliata (errori, scenari limite, sicurezza).
- **Deployment reale:** non ancora verificato uno stack completo via Docker Compose con gateway/Keycloak.
- **QA programmata:** sessione di test end-to-end fissata per sabato (migrazioni, seed, API, OTP).

## Rischi e dipendenze
- Dipendenza da servizi esterni (Keycloak, Vault, stack osservabilita) che richiedono provisioning coordinato.
- Compliance e hardening necessitano di verifiche pratiche oltre la documentazione.
- Frontend e Identity ancora da sviluppare possono posticipare la validazione end-to-end.

## Prossimi passi suggeriti
1. Preparare ed eseguire la sessione di test di sabato seguendo `docs/test-plan-saturday.md`, raccogliendo evidenze strutturate.
2. Ampliare la suite di test (edge case, errori, validazioni) e predisporre pipeline CI minima.
3. Avviare l'implementazione del frontend React con flusso OIDC.
4. Rafforzare osservabilità e hardening applicando gateway reverse-proxy, rate limiting e logging strutturato.
5. Pianificare la verifica end-to-end dell'autenticazione (Keycloak + OTP) con scenari di successo ed errore.

## Piano di sviluppo prime 2 settimane

### Settimana 1 - Fondamenta, API e database
- **Giorno 1-2: Impianto progetto & specifiche**
  - Repo mono/multi con directory `frontend/`, `backend/`, `infra/`.
  - `README.md` con obiettivi, stack e comandi base.
  - Definizione use case MVP: login, lista conti/transazioni, trasferimento simulato (idempotency).
  - Bozza `openapi.yaml` per `/auth`, `/accounts`, `/transactions`.
  - Modello dati minimo (users, accounts, transactions, budgets opzionale).
  - *Output previsto:* repo inizializzato, OpenAPI bozza, ER in `docs/`.
  - *Criterio di accettazione:* OpenAPI valida/versionata, endpoint e schemi definiti.
- **Giorno 2-3: Database & migrazioni**
  - PostgreSQL in Docker (`thesis_fintech`), migrazioni con Alembic (`001_init.sql`).
  - RLS su `transactions` per `user_id`, cifratura `pgcrypto`, indici su `created_at`.
  - `make migrate-up` deve eseguire le migrazioni; RLS e cifratura verificate.
- **Giorno 3-4: Identity (Keycloak) & sicurezza base**
  - Keycloak Docker (realm `thesis`, client frontend PKCE, client API).
  - Ruoli/scopes `transactions:read` / `transactions:write`.
  - Config FastAPI OIDC (Authlib), verifica token e scopes, Idempotency-Key su `POST /transactions`.
  - *Output:* login OIDC end-to-end; API protette rispondono 401/403 senza token/scope.
- **Giorno 4-5: Backend FastAPI (MVP)**
  - Endpoints `GET /health`, `GET /accounts`, `GET /transactions`, `POST /transactions`.
  - Validazione Pydantic, errori strutturati, seed dati per utenti/conti/transazioni.
  - Log JSON con `X-Request-ID`; test Postman/pytest coprono casi felici ed edge-case.
- **Giorno 5-7: Gateway, osservabilita & test**
  - NGINX api gateway (reverse proxy, CORS, rate limit), `/docs` Swagger, `/metrics` opzionale.
  - Test: pytest unit/integrazione, Postman+Newman, Docker Compose per stack completo.
  - *Output:* stack operativo con `docker compose up`; rate limit restituisce 429 se forzato.

### Settimana 2 - Frontend, integrazione e deploy
- **Giorno 8-9: Frontend React (MVP)**
  - Vite + React + TS + Router, login OIDC PKCE (token in-memory, refresh sicuro).
  - Pagine: dashboard saldi, movimenti filtrati, form nuova transazione (Idempotency-Key visibile).
  - UI accessibile (focus, aria-*) e i18n semplice (IT/EN).
  - *Output:* UI navigabile collegata alle API; creazione transazione simulata dal browser.
- **Giorno 10: Hardening rapido**
  - Headers di sicurezza (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) via NGINX.
  - CORS restrittivo (solo dominio FE), mascheramento PII nei log, limitazione payload.
  - *Output:* headers verificati con DevTools; scanner (es. ZAP baseline) senza high-risk.
- **Giorno 11: CI minimale**
  - GitHub Actions per lint (ESLint, ruff/flake8), build FE/BE, pytest, Newman, build immagini Docker, cache dipendenze.
  - *Output:* pipeline verde su ogni push; PR fallisce se test falliscono.
- **Giorno 12: Deploy locale/container**
  - `docker compose -f docker-compose.yml up -d`, volumi `pgdata/`, `keycloak/`, `nginx/`.
  - Variabili `.env` centralizzate, healthcheck container, restart policy.
  - *Output:* stack riproducibile; restart host non compromette volumi/servizi.
- **Giorno 13: Demo script & documentazione**
  - `make demo` crea utenti demo, esegue tre chiamate API, apre UI.
  - Screenshot flussi (login, lista, nuova transazione); OpenAPI aggiornata con esempi/errori.
  - *Output:* demo completabile in 2-3 minuti da qualunque persona con env corretto.
- **Giorno 14: Retrospettiva e backlog**
  - Review log errori/metriche, elenco bug/tech debt, backlog settimana 3 (budget, analytics, grafici, notifiche).
  - *Output:* issue tracker aggiornato; roadmap breve con obiettivi e stime.

### Struttura operativa di riferimento
- `docker-compose.yml` (versione 3.9) con servizi `db`, `keycloak`, `backend`, `frontend`, `gateway` e volumi `pgdata`, `keycloak`.
- Config `infra/nginx.conf` con security headers, rate limit, proxy verso backend/frontend, gestione CORS per `localhost:5173`.
- `.env` locale di esempio con `DB_PASSWORD`, `KC_ADMIN_PWD`, `OIDC_ISSUER`, `OIDC_AUDIENCE`.
- Comandi rapidi:
  - `docker compose up -d --build postgres keycloak otp backend`
  - `python -m backend.db.manage bootstrap`
  - `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
  - `pytest`
  - `newman run ./tests/postman/collection.json -e ./tests/postman/env.json`
