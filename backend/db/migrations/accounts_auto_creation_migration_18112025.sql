CREATE OR REPLACE FUNCTION create_default_account_for_user()
RETURNS TRIGGER AS $$
DECLARE
    generated_name VARCHAR(120);
BEGIN
    generated_name := COALESCE(
        REGEXP_REPLACE(LOWER(NEW.email), '[^a-z0-9]+', '-', 'g'),
        NEW.id::text
    );

    IF NOT EXISTS (SELECT 1 FROM accounts WHERE user_id = NEW.id) THEN
        INSERT INTO accounts (user_id, currency, balance, name)
        VALUES (NEW.id, 'EUR', 0, generated_name);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_create_account ON users;

CREATE TRIGGER trg_users_create_account
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_account_for_user();
