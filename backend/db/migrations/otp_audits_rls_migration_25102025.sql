ALTER TABLE otp_audits
    ENABLE ROW LEVEL SECURITY;

CREATE POLICY otp_audits_user_isolation_policy
    ON otp_audits
    USING (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    )
    WITH CHECK (
        user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
