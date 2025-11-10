ALTER TABLE transactions
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY transactions_user_isolation_policy
    ON transactions
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
