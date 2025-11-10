# Test Plan – Sessione di Collaudo di Sabato

## 1. Obiettivo e Contesto
Verificare end-to-end lo stato attuale del backend FastAPI, del database PostgreSQL e del microservizio OTP (email + SMS simulato) prima di procedere con le integrazioni Identity/Frontend. La sessione è pianificata per **sabato** e coinvolge l’esecuzione di test automatici e manuali sui componenti disponibili.

## 2. Prerequisiti
- Docker (per PostgreSQL) avviato con `docker compose up -d postgres`.
- Virtualenv backend attiva (`backend\.venv`).
- File `.env` configurato con parametri di default (DB e servizi interni).
- Postgres popolato tramite `python -m backend.db.manage bootstrap`.
- SMTP fittizio o account di test per verifica email OTP.
- Strumenti CLI: `curl` o `httpie`, `pytest`, `psql`.

## 3. Sequenza Test
### 3.1 Bootstrap database
1. `python -m backend.db.manage migrate`
2. `python -m backend.db.manage seed`
3. Verifica tabelle/righe (`SELECT COUNT(*) FROM ...`)

### 3.2 Test automatici backend
1. `pytest` (copertura `tests/test_accounts.py`, `tests/test_transactions.py`)
2. Verifica exit code 0, analisi warnings (UTC deprecation, da monitorare)

### 3.3 Test manuali API
1. Avvio `uvicorn app.main:app --reload`
2. Healthcheck: `curl http://localhost:8000/health`
3. Richiesta token Keycloak (client test) e `GET /accounts` con `Authorization: Bearer <token>`
4. `GET /transactions` con filtri (category, from/to) usando lo stesso token
5. `POST /transactions` con idem_key e ripetizione richiesta (verifica HTTP 201/200)

### 3.4 Microservizio OTP
1. Avvio servizio email/SMS simulato (script interno o stub)
2. Richiedi la OTP tramite `POST http://localhost:8000/otp/send` con token valido (channel EMAIL) e verifica l'email ricevuta
3. Controllo log per SMS simulato (stdout/file)
4. Verifica conservazione audit in tabella `otp_audits`

### 3.5 Observability e log
1. Controllo log backend (richieste 200)
2. Verifica errori non attesi

### 3.6 Regressione rapida post-test
1. Rilancio `pytest`
2. Riepilogo comandi e output

## 4. Criteri di superamento
- Tutti i comandi completati senza errori critici
- API rispondono con dati attesi (seed)
- OTP email inviata, SMS simulato registrato
- Nessun errore persistente nel log

## 5. Follow-up
- Raccogliere screenshot/output principali
- Annotare eventuali bug o gap (issue o backlog)
- Aggiornare documentazione post-sessione (progress, stato)
