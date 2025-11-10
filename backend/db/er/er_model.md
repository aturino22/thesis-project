# ER model

## Visione d’insieme
Il modello ER iniziale copre gli attori principali del wallet fintech simulato e le relazioni tra utenti, conti, transazioni e componenti di sicurezza/idempotenza.

## Entità e attributi
- **User**
  - `id` (UUID, PK)
  - `email` (VARCHAR)
  - `nome` (VARCHAR)
  - `cognome` (VARCHAR)
  - `birthday` (DATE)
  - `preferred_otp_channel` (FK → OtpChannel)
  - `created_at` (TIMESTAMP)
- **Account**
  - `id` (UUID, PK)
  - `user_id` (FK → User)
  - `currency` (ISO 4217)
  - `balance`
  - `name`
  - `created_at`
- **Transaction**
  - `id` (UUID, PK)
  - `user_id` (FK → User)
  - `account_id` (FK → Account)
  - `amount`
  - `currency`
  - `category`
  - `idem_key` (unique)
  - `direction` (buy/sell)
  - `created_at`
- **OtpAudit**
  - `id` (UUID, PK)
  - `user_id` (FK → User)
  - `otp_channel` (FK → OtpChannel)
  - `status` (success/failed/blocked)
  - `attempted_at`
- **OtpChannel**
  - `id` (UUID, PK)
  - `code` (VARCHAR)
  - `description`
  - `is_active` (BOOLEAN)
  - `created_at`
- **SecurityLog**
  - `id` (UUID, PK)
  - `user_id` (FK → User, opzionale)
  - `event_type` (login_failed, brute_force_detected, ecc.)
  - `metadata` (JSONB)
  - `logged_at`

## Relazioni
- **User 1..N Account** — un utente possiede più conti; RLS su `user_id`.
- **Account 1..N Transaction** — un conto registra più transazioni; vincolo `user_id` coerente con l’account.
- **User 1..N Transaction** — mapping diretto per query rapide su transazioni dell’utente.
- **User 1..N OtpAudit** — ogni richiesta OTP è tracciata con esito e canale.
- **User 1..N SecurityLog** — eventi di sicurezza correlati all’utente o a tentativi anonimi (campo opzionale).
- **Transaction 1..1 Idempotency (idem_key)** — chiave idempotenza garantisce deduplicazione.
- **User 0..1 OtpChannel** — preferenza canale OTP per l’utente.
- **OtpChannel 1..N OtpAudit** — ogni audit OTP indica il canale utilizzato.

## Considerazioni
- Il campo `preferred_otp_channel` consente di supportare la user story sulla scelta del canale OTP.
- Le entità `OtpAudit` e `SecurityLog` supportano i casi d’uso di monitoraggio sicurezza e threat modeling.
- `idem_key` è unico per transazione, necessario all’obiettivo di deduplicare trasferimenti simulati.
- Estensioni future: entità `Budget`, `Notification`, `ExchangeRate` per backlog settimana 3.
