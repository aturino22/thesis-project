# Crypto Portfolio Data Model

## Overview
The frontend private dashboard now shows the crypto portfolio of the signed-in user, so we introduced a dedicated table `user_crypto_positions`. Each record represents the net position for a single asset held by a user. The table stores both the operational value (amount, network, link to a custody account) and valuation metadata needed for dashboards and reconciliations.

## Table schema
| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key generated via `gen_random_uuid()` |
| `user_id` | `uuid` | References `users.id`, cascades on delete |
| `account_id` | `uuid` | Optional reference to `accounts.id`, set to `NULL` if the account is removed |
| `asset_symbol` | `varchar(12)` | Uppercase ticker (BTC, ETH, SOL, ...) |
| `asset_name` | `varchar(80)` | Human readable name |
| `network` | `varchar(40)` | Mainnet/L2 identifier (es. `ethereum`, `solana`) |
| `amount` | `numeric(28,10)` | Quantity currently held |
| `book_cost_eur` | `numeric(18,2)` | Average cost basis converted in EUR |
| `last_valuation_eur` | `numeric(18,2)` | Most recent valuation in EUR |
| `price_source` | `varchar(80)` | Provider or oracle used for valuation |
| `synced_at` | `timestamptz` | Timestamp of the last successful sync/import |
| `created_at` | `timestamptz` | Defaults to `now()` |
| `updated_at` | `timestamptz` | Maintained by trigger `trg_user_crypto_positions_updated_at` |

Additional constraints:
- Unique index `(user_id, asset_symbol)` prevents duplicates per asset.
- Trigger `trg_user_crypto_positions_updated_at` keeps `updated_at` in sync through the shared `set_updated_at()` function.

## Security model
Row Level Security is enforced with the same policy pattern already used for `accounts` and `transactions`. The policy checks `app.current_user_id`, so once the backend sets that parameter (via the Keycloak token), each session can only read and write its own positions.

## API usage
- **Read**: expose `GET /crypto-positions` returning the portfolio for the authenticated user, mapping each row to the data model already consumed by the frontend (asset symbol, amount, EUR valuation, logo URL when available).
- **Write**: admin jobs or ingestion pipelines can `UPSERT` rows when syncing with exchanges or internal ledgers. A service account can set `app.current_user_id` before performing batch updates to satisfy the RLS policy.

## Next steps
1. Extend the backend service layer with repository methods (list positions, replace holdings for a user).
2. Wire the frontend `HomePage` crypto section to the new API so that mocked data can be removed.
3. Optionally add a historical valuations table for time-series charts, keeping `user_crypto_positions` focused on the latest snapshot.
