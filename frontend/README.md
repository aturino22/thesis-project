# Thesis Wallet Frontend

Interfaccia React + TypeScript in Material Design (MUI v7) per il progetto wallet fintech della tesi. Il bootstrap e stato configurato con Vite 5, alias `@` verso `src/` e un set minimo di variabili ambiente per API e OIDC. Lo stato dati è gestito tramite `@tanstack/react-query` e l'autenticazione client con `react-oidc-context`.

## Requisiti

- Node.js >= 18 (testato con 20.10)
- npm >= 10

## Setup rapido

1. Copia le variabili esempio
   ```bash
   cp .env.example .env.local
   ```
2. Installa le dipendenze
   ```bash
   npm install
   ```
3. Avvia il dev server
   ```bash
   npm run dev
   ```

Il server si avvia su `http://localhost:5173` (override con `VITE_DEV_SERVER_PORT`). Le richieste verso `/api` vengono proxate al backend usando `VITE_API_BASE_URL`. Il tema Material Design e definito tramite `@mui/material` (`extendTheme`) con CSS variables attive (supporto light/dark) e il client OIDC e gestito da `react-oidc-context`.

## Script disponibili

- `npm run dev` - avvia Vite in modalita sviluppo con HMR.
- `npm run build` - esegue la type-check (`tsc -b`) e produce l'output in `dist/`.
- `npm run preview` - anteprima della build di produzione.
- `npm run lint` - esegue ESLint con la configurazione base inclusa.
- `npm run test:e2e` - builda l'app e lancia i test Playwright (richiede `npm install` + `npx playwright install`).

## Variabili ambiente

| Variabile | Descrizione | Default |
| --- | --- | --- |
| `VITE_APP_NAME` | Nome visualizzato nell'interfaccia | `Thesis Wallet` |
| `VITE_APP_VERSION` | Versione mostrata nel footer | `dev` |
| `VITE_API_BASE_URL` | Base URL del backend FastAPI | `http://localhost:8000` |
| `VITE_OIDC_ISSUER` | Issuer Keycloak (realm tesi) | `http://localhost:8080/realms/thesis` |
| `VITE_OIDC_CLIENT_ID` | Client ID pubblico per il frontend | `rontend` |
| `VITE_OIDC_REDIRECT_URI` | Redirect dopo login OIDC | `http://localhost:5173/auth/callback` |
| `VITE_OIDC_SILENT_REDIRECT_URI` | Redirect silente per silent refresh | `http://localhost:5173/auth/silent-refresh` |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | Redirect dopo il logout Keycloak | `http://localhost:5173/` |
| `VITE_OIDC_SCOPE` | Scopes OIDC richiesti dal frontend | `openid thesis-access` |
| `VITE_ENABLE_MOCKED_AUTH` | Abilita autenticazione mock per sviluppo (`true`/`false`) | `false` |
| `VITE_DEV_SERVER_HOST` | Host del dev server | `0.0.0.0` |
| `VITE_DEV_SERVER_PORT` | Porta del dev server | `5173` |
| `VITE_PREVIEW_HOST` | Host per `npm run preview` | `0.0.0.0` |
| `VITE_PREVIEW_PORT` | Porta per `npm run preview` | `4173` |

## Struttura cartelle

- `src/App.tsx` - routing principale (home, callback OIDC, silent renew, not found).
- `src/pages/HomePage.tsx` - landing Material Design con stato configurazione, login/logout e next steps.
- `src/config/appConfig.ts` - mapping delle variabili ambiente con fallback sensati.
- `src/env.d.ts` - tipizzazione esplicita delle variabili `VITE_*`.
- `src/auth/` - configurazione `react-oidc-context` (`OidcProvider`, `oidcConfig`).
- `src/routes/` - pagine tecniche (`AuthCallbackPage`, `SilentRenewPage`, `NotFoundPage`).
- `src/theme.ts` - definizione tema MUI (palette Material 3, shape, component overrides).
- `src/index.css` - reset minimo per body e root.
- `vite.config.ts` - alias `@`, proxy `/api`, override host/port e configurazione plugin React.

## Prossimi step suggeriti

1. Integrare le API protette (accounts/transactions) con React Query e gestire refresh token.
2. Aggiornare la UI con layout navigazione (app bar, navigation rail) e viste dashboard/transazioni.
3. Abilitare gestione errori/sessione (es. toast globali, re-login automatico).
4. Ampliare i pattern Material Design: DataGrid, componenti grafici, modalita dark e test E2E di login.
