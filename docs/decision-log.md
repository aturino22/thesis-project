# Decision Log

## Autenticazione
- **Data**: 2025-10-20 – **Giorno di sviluppo**: Day 1  
  **Decisione**: Abilitare l’accesso cliente con email+password e OTP a due fattori della durata di 1 minuto inviato via SMS o email.  
  **Motivo**: Rafforzare l’autenticazione con un secondo fattore temporaneo mantenendo una buona UX (canale a scelta dell’utente).  
  **Benefici**: Riduce il rischio di accessi non autorizzati, soddisfa requisiti di sicurezza elevati e offre flessibilità operativa sui canali.

## Sicurezza
- **Data**: 2025-10-20 – **Giorno di sviluppo**: Day 1  
  **Decisione**: Modellare un threat-user per tentativi di brute force sul login e registrare log dedicati.  
  **Motivo**: Validare la robustezza del sistema contro attacchi ripetitivi e avere tracciabilità per le investigazioni.  
  **Benefici**: Rilevazione precoce di pattern sospetti, semplificazione degli audit e base per contromisure (rate limiting, alerting).
- **Data**: 2025-10-24 – **Giorno di sviluppo**: Day 4  
  **Decisione**: Abilitare Row-Level Security su `accounts`, `transactions`, `otp_audits`, `security_logs` con policy basate su `app.current_user_id`.  
  **Motivo**: Isolare nativamente i dati multi-tenant e preparare l’integrazione con token OIDC.  
  **Benefici**: Minimizza il rischio di data leakage, applica un controllo uniforme e rende verificabile l’isolamento lato database.
- **Data**: 2025-11-02 – **Giorno di sviluppo**: Day 5  
  **Decisione**: Richiedere lo scope `transactions:write` e un bearer token valido per l’endpoint `POST /otp/send`, gestendo 401/403 espliciti.  
  **Motivo**: Limitare la generazione delle OTP ai flussi autorizzati e distinguere rapidamente token mancanti da permessi insufficienti.  
  **Benefici**: Maggior controllo sugli abusi, tracciabilità coerente con le policy RLS e messaggi d’errore chiari per i client.

## Trasferimenti
- **Data**: 2025-10-20 – **Giorno di sviluppo**: Day 1  
  **Decisione**: Persistire l’idempotency key dei trasferimenti insieme ai metadati.  
  **Motivo**: Evitare perdite di dati in caso di riavvio/timeout e mantenere uno storico completo delle richieste.  
  **Benefici**: Idempotenza garantita anche in scenari di fault, riconciliazione semplificata e audit completo sulle operazioni ripetute.

## Presentazione dati
- **Data**: 2025-10-20 – **Giorno di sviluppo**: Day 1  
  **Decisione**: Offrire filtri combinabili e ordinamenti su conti/transazioni.  
  **Motivo**: Allineare l’interfaccia alle esigenze degli utenti multi-conto, facilitando l’analisi.  
  **Benefici**: Consultazione più rapida, focalizzazione su subset rilevanti e percezione di controllo migliorata.

- **Data**: 2025-11-15 - **Giorno di sviluppo**: Day 8  
  **Decisione**: Introdurre la ricarica simulata del conto (POST /accounts/{id}/topup) con validazione di numero carta, scadenza e CVV nella UI.  
  **Motivo**: Consentire agli utenti/tester di ripristinare i saldi senza script SQL e validare i flussi di accredito direttamente dall'interfaccia.  
  **Benefici**: Esperienza completa deposito/acquisto/vendita, test automatizzati dedicati e riduzione delle operazioni manuali sul DB.
- **Data**: 2025-11-15 - **Giorno di sviluppo**: Day 8  
  **Decisione**: Arrotondare per difetto le quantita massime negli ordini crypto e semplificare le azioni della pagina asset.  
  **Motivo**: Eliminare gli errori di validazione dovuti alle frazioni eccedenti e mantenere la UI focalizzata sulle operazioni principali.  
  **Benefici**: Ordini senza falsi errori e interfaccia piu pulita/coerente con i pattern del resto dell'app.

## Database

- **Data**: 2025-11-15 - **Giorno di sviluppo**: Day 8  
  **Decisione**: Aggiungere le tabelle ccount_balances, withdrawal_methods e withdrawals per supportare il blocco fondi e la registrazione dei metodi bancari.  
  **Motivo**: Preparare il backend all'esecuzione di richieste di prelievo con fondi congelati, audit e simulazione dei controlli AML.  
  **Benefici**: Stato saldo chiaro (available/frozen), tracciamento dei payout e base dati consistente per futuri workflow asincroni e verifiche.

- **Data**: 2025-10-22 – **Giorno di sviluppo**: Day 3  
  **Decisione**: Automatizzare migrazioni e seed con `python -m backend.db.manage {migrate|seed|bootstrap}`.  
  **Motivo**: Ridurre errori manuali e garantire coerenza tra ambienti.  
  **Benefici**: Avvio più rapido, migrazioni idempotenti e integrazione semplificata in CI/CD.
- **Data**: 2025-10-26 - **Giorno di sviluppo**: Day 6  
  **Decisione**: Introdurre la tabella `user_crypto_positions` con RLS per tracciare le crypto detenute da ogni utente.  
  **Motivo**: Allineare la UI privata che mostra il portafoglio crypto con una fonte dati reale e pronta per sincronizzazione da exchange.  
  **Benefici**: Struttura dedicata, isolamento per utente e colonne di valorizzazione utili a dashboard, riconciliazioni e notifiche.

## Notifiche OTP
- **Data**: 2025-10-22 – **Giorno di sviluppo**: Day 3  
  **Decisione**: Costruire un microservizio interno per l’invio di OTP via email e simulare gli SMS.  
  **Motivo**: Gestire i canali in modo controllato nella fase prototipale e semplificare i test locali.  
  **Benefici**: Nessun costo/latenza esterna, osservabilità completa del flusso OTP e facile estensione a canali reali.
- **Data**: 2025-11-02 – **Giorno di sviluppo**: Day 5  
  **Decisione**: Containerizzare il servizio OTP (FastAPI) e integrarlo nello stack Docker con Mailpit come SMTP di test.  
  **Motivo**: Automatizzare l’avvio dello stack (Postgres, Keycloak, OTP) e avere test end-to-end ripetibili senza dipendenze esterne.  
  **Benefici**: Setup riproducibile con un unico `docker compose up`, osservabilità immediata delle email via UI e canale SMS simulato centralizzato.

## Identity & Access Management

- **Data**: 2025-11-15 - **Giorno di sviluppo**: Day 8  
  **Decisione**: Introdurre gli scope payouts:read / payouts:write e le API /payouts/* per registrare conti bancari e creare richieste di prelievo con blocco fondi.  
  **Motivo**: Estendere il perimetro di sicurezza oltre i trasferimenti interni e simulare il flusso di uscita verso IBAN verificati.  
  **Benefici**: Endpoint separati, autorizzazioni dedicate e workflow pronto per integrazioni reali (micro-deposito, PSP, notifiche).

- **Data**: 2025-11-02 – **Giorno di sviluppo**: Day 5  
  **Decisione**: Proteggere gli endpoint con token Keycloak e derivare `app.current_user_id` dalle claim (`user_id` oppure `sub`).  
  **Motivo**: Eliminare l’header temporaneo `X-User-Id` e garantire che ogni richiesta rispetti le policy RLS.  
  **Benefici**: Autenticazione uniforme, minori rischi di impersonation e tracciabilità completa delle operazioni.

## Qualità e Test
- **Data**: 2025-10-22 – **Giorno di sviluppo**: Day 3  
  **Decisione**: Pianificare una sessione di collaudo end-to-end documentata in `docs/test-plan-saturday.md`.  
  **Motivo**: Verificare lo stato attuale (backend, database, OTP) e raccogliere evidenze prima delle nuove integrazioni.  
  **Benefici**: Visione chiara della copertura, individuazione precoce dei gap e base condivisa per le attività successive.
- **Data**: 2025-11-02 – **Giorno di sviluppo**: Day 5  
  **Decisione**: Ampliare la suite `pytest` con casi OTP (successo email/SMS, failure microservizio, token/scope mancanti).  
  **Motivo**: Automatizzare la validazione dei flussi critici e rilevare regressioni senza test manuali.  
  **Benefici**: Copertura automatica multicanale, riduzione di falsi positivi in QA e documentazione viva degli scenari supportati.
## UI & Branding
- **Data**: 2025-11-04 - **Giorno di sviluppo**: Day 7  
  **Decisione**: Aggiornare la palette principale delle viste crypto usando verde #1ED760, rosso #FF4D6D, grigio di testo #B0BEC5 e accento secondario #7C4DFF.  
  **Motivo**: Ridurre l'affaticamento visivo dei precedenti colori neon (#00C853/#FF5252), migliorare la leggibilita dei testi secondari e dare coerenza alle call-to-action su sfondo scuro.  
  **Benefici**: Contrasti piu equilibrati per utenti con sensibilita cromatica, chip/badge piu leggibili e un'esperienza visiva piu accogliente mantenendo il look & feel "dark finance".
- **Data**: 2025-11-15 - **Giorno di sviluppo**: Day 8  
  **Decisione**: Restyling completo della pagina di login Keycloak con hero, copy e alert coerenti col design della dashboard.  
  **Motivo**: Evitare il cambio di contesto percepito dagli utenti al passaggio IdP → applicazione.  
  **Benefici**: Branding consistente e messaging uniforme anche in caso di errori di autenticazione.

