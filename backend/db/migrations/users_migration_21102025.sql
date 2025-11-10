CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    cognome VARCHAR(100) NOT NULL,
    birthday DATE,
    preferred_otp_channel UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
    ADD CONSTRAINT uq_users_email UNIQUE (email);

ALTER TABLE users
    ADD CONSTRAINT fk_users_preferred_otp_channel
        FOREIGN KEY (preferred_otp_channel)
        REFERENCES otp_channels (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL;
