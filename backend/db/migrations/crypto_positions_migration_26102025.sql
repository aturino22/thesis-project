CREATE TABLE IF NOT EXISTS user_crypto_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    account_id UUID,
    asset_symbol VARCHAR(12) NOT NULL,
    asset_name VARCHAR(80) NOT NULL,
    network VARCHAR(40),
    amount NUMERIC(28, 10) NOT NULL DEFAULT 0,
    book_cost_eur NUMERIC(18, 2),
    last_valuation_eur NUMERIC(18, 2),
    price_source VARCHAR(80),
    synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_crypto_positions
    ADD CONSTRAINT fk_user_crypto_positions_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE user_crypto_positions
    ADD CONSTRAINT fk_user_crypto_positions_account
        FOREIGN KEY (account_id)
        REFERENCES accounts (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_crypto_positions_user_asset
    ON user_crypto_positions (user_id, asset_symbol);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_user_crypto_positions_updated_at'
    ) THEN
        CREATE TRIGGER trg_user_crypto_positions_updated_at
        BEFORE UPDATE ON user_crypto_positions
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;
