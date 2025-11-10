ALTER TABLE security_logs
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY security_logs_user_isolation_policy
    ON security_logs
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid OR user_id IS NULL
    );
