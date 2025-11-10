ALTER TABLE accounts
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY accounts_user_isolation_policy
    ON accounts
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
