CREATE TABLE IF NOT EXISTS otp_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    otp_channel UUID NOT NULL,
    status VARCHAR(20) NOT NULL,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE otp_audits
    ADD CONSTRAINT fk_otp_audits_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE;

ALTER TABLE otp_audits
    ADD CONSTRAINT fk_otp_audits_channel
        FOREIGN KEY (otp_channel)
        REFERENCES otp_channels (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT;

ALTER TABLE otp_audits
    ADD CONSTRAINT ck_otp_audits_status
        CHECK (status IN ('success', 'failed', 'blocked'));
