ALTER TABLE account_topups
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY account_topups_user_isolation_policy
    ON account_topups
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
