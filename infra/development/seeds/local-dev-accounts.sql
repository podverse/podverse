-- Seed script for local development accounts
-- Password for both: Test!1Aa (bcrypt below)
-- Each membership expires 1 year from seed run time.
--
-- Emails:
--   local-trial@example.com    — trial tier
--   local-premium@example.com — premium tier
--
-- To regenerate the hash if needed, run:
-- cd dev/local-utils && npm run generate-password-hash "Test!1Aa"

DO $$
DECLARE
    private_status_id INTEGER;
    trial_membership_id INTEGER;
    premium_membership_id INTEGER;
    rec RECORD;
    new_account_id INTEGER;
    existing_account_id INTEGER;
    new_account_settings_id INTEGER;
    new_account_settings_notification_id INTEGER;
BEGIN
    SELECT id INTO private_status_id FROM sharable_status WHERE status = 'private';

    SELECT id INTO trial_membership_id FROM account_membership WHERE tier = 'trial';
    SELECT id INTO premium_membership_id FROM account_membership WHERE tier = 'premium';

    FOR rec IN
        SELECT *
        FROM (
            VALUES
                ('local-trial@example.com'::varchar_email, 'localtrial01'::nano_id_v2, 'trial'::text),
                ('local-premium@example.com'::varchar_email, 'localprem001'::nano_id_v2, 'premium'::text)
        ) AS seed(email, id_text, tier)
    LOOP
        SELECT ac.account_id INTO existing_account_id
        FROM account_credentials ac
        WHERE ac.email = rec.email;

        IF existing_account_id IS NOT NULL THEN
            RAISE NOTICE 'Local dev account already exists: % (id: %)', rec.email, existing_account_id;
            CONTINUE;
        END IF;

        INSERT INTO account (id_text, verified, sharable_status_id)
        VALUES (
            rec.id_text,
            TRUE,
            private_status_id
        )
        RETURNING id INTO new_account_id;

        INSERT INTO account_credentials (account_id, email, password)
        VALUES (
            new_account_id,
            rec.email,
            '$2b$10$EhgpdpaFQooB.xrpHMdMBe.uJOBeuttpQOEcp1XG9EndaseZRoSee'
        );

        INSERT INTO account_profile (account_id)
        VALUES (new_account_id);

        INSERT INTO account_membership_status (account_id, account_membership_id, membership_expires_at)
        VALUES (
            new_account_id,
            CASE rec.tier
                WHEN 'trial' THEN trial_membership_id
                WHEN 'premium' THEN premium_membership_id
            END,
            NOW() + INTERVAL '1 year'
        );

        INSERT INTO account_settings (account_id)
        VALUES (new_account_id)
        RETURNING id INTO new_account_settings_id;

        INSERT INTO account_settings_locale (account_settings_id, locale)
        VALUES (new_account_settings_id, 'en-US');

        INSERT INTO account_settings_notification (account_settings_id)
        VALUES (new_account_settings_id)
        RETURNING id INTO new_account_settings_notification_id;

        INSERT INTO account_settings_notification_type (account_settings_notification_id, type)
        VALUES
            (new_account_settings_notification_id, 'new-item'),
            (new_account_settings_notification_id, 'livestream-started');

        RAISE NOTICE 'Local dev account created: % / Test!1Aa (id: %)', rec.email, new_account_id;
    END LOOP;
END $$;

-- Stable sender_guid for MetaBoost mbrss-v1 (matches signup). Idempotent: fixes rows created before
-- account_metaboost existed, and runs after new-account creation above.
INSERT INTO account_metaboost (account_id, sender_guid)
SELECT ac.account_id, gen_random_uuid()
FROM account_credentials ac
WHERE ac.email IN ('local-trial@example.com', 'local-premium@example.com')
  AND NOT EXISTS (
    SELECT 1 FROM account_metaboost am WHERE am.account_id = ac.account_id
  );
