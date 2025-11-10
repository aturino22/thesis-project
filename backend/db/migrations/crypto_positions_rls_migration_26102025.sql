ALTER TABLE user_crypto_positions
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_crypto_positions_isolation_policy
    ON user_crypto_positions
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
