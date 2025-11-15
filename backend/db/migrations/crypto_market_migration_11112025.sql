CREATE TABLE IF NOT EXISTS crypto (
    id TEXT PRIMARY KEY,
    symbol VARCHAR(12) NOT NULL,
    name VARCHAR(120) NOT NULL,
    rank INTEGER NOT NULL,
    explorer_url TEXT,
    max_supply NUMERIC(36, 12),
    tokens JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crypto
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS uq_crypto_symbol
    ON crypto (UPPER(symbol));

CREATE INDEX IF NOT EXISTS idx_crypto_rank
    ON crypto (rank);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_crypto_updated_at'
    ) THEN
        CREATE TRIGGER trg_crypto_updated_at
        BEFORE UPDATE ON crypto
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS crypto_variation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crypto_id TEXT NOT NULL REFERENCES crypto(id) ON DELETE CASCADE,
    price NUMERIC(24, 8) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE crypto_variation
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_crypto_variation_crypto_fetched
    ON crypto_variation (crypto_id, created_at DESC);

INSERT INTO crypto (id, symbol, name, rank, explorer_url, max_supply, tokens)
VALUES
    (
        'bitcoin',
        'BTC',
        'Bitcoin',
        1,
        'https://blockchain.info/',
        21000000.000000000000000000,
        '{}'::jsonb
    ),
    (
        'ethereum',
        'ETH',
        'Ethereum',
        2,
        'https://etherscan.io/',
        NULL,
        '{}'::jsonb
    ),
    (
        'xrp',
        'XRP',
        'XRP',
        4,
        'https://xrpcharts.ripple.com/#/graph/',
        100000000000.000000000000000000,
        '{"56": ["0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe"]}'::jsonb
    ),
    (
        'dogecoin',
        'DOGE',
        'Dogecoin',
        10,
        'http://dogechain.info/chain/Dogecoin',
        NULL,
        '{"56": ["0xba2ae424d960c26247dd6c32edc70b295c744c43"]}'::jsonb
    ),
    (
        'solana',
        'SOL',
        'Solana',
        6,
        'https://explorer.solana.com/',
        NULL,
        '{"101": ["so11111111111111111111111111111111111111112"]}'::jsonb
    )
ON CONFLICT (id) DO UPDATE
SET
    symbol = EXCLUDED.symbol,
    name = EXCLUDED.name,
    rank = EXCLUDED.rank,
    explorer_url = EXCLUDED.explorer_url,
    max_supply = EXCLUDED.max_supply,
    tokens = EXCLUDED.tokens,
    updated_at = NOW();
