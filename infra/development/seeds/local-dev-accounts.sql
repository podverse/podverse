-- Seed script for local development accounts
-- Password for all email/username accounts below: Test!1Aa (bcrypt in this file)
-- Each membership expires 1 year from seed run time.
--
-- Naming (do not collide with tests or embed):
--   Operator login: local-trial@ / local-premium@ on example.com
--     (id_text localtrial01 / localprem001). Tests use e2e-* and *-test@example.com.
--   Dummy catalog: dummyNN@podverse.local, id_text dummyuserNN (11 chars),
--     username dummyNN. Domain and dummy* prefix stay off E2E / API-test fixtures.
--   Embed demo stays username-only `demo` / embeddemo01 (separate block below).
--
-- Dummy and operator login accounts are public so /profile/{id_text} resolves.
--
-- To regenerate the hash if needed, run:
-- cd dev/local-utils && npm run generate-password-hash "Test!1Aa"

DROP TABLE IF EXISTS local_dev_account_seed;
CREATE TEMP TABLE local_dev_account_seed (
    email varchar_email NOT NULL,
    id_text nano_id_v2 NOT NULL,
    username varchar(32),
    display_name varchar(255) NOT NULL,
    bio varchar(2500),
    tier text NOT NULL
);

INSERT INTO local_dev_account_seed (email, id_text, username, display_name, bio, tier)
VALUES
    (
        'local-trial@example.com',
        'localtrial01',
        NULL,
        'Local Trial',
        'Operator trial login for local development.',
        'trial'
    ),
    (
        'local-premium@example.com',
        'localprem001',
        NULL,
        'Local Premium',
        'Operator premium login for local development.',
        'premium'
    ),
    (
        'dummy01@podverse.local',
        'dummyuser01',
        'dummy01',
        'Ada Chen',
        'Public dummy profile for local lists and /profile pages.',
        'premium'
    ),
    (
        'dummy02@podverse.local',
        'dummyuser02',
        'dummy02',
        'Bev Okonkwo',
        'Public dummy profile for local lists and /profile pages.',
        'trial'
    ),
    (
        'dummy03@podverse.local',
        'dummyuser03',
        'dummy03',
        'Cam Rivera',
        'Public dummy profile for local lists and /profile pages.',
        'premium'
    ),
    (
        'dummy04@podverse.local',
        'dummyuser04',
        'dummy04',
        'Dee Nakamura',
        'Public dummy profile for local lists and /profile pages.',
        'trial'
    ),
    (
        'dummy05@podverse.local',
        'dummyuser05',
        'dummy05',
        'Eli Voss',
        'Public dummy profile for local lists and /profile pages.',
        'premium'
    ),
    (
        'dummy06@podverse.local',
        'dummyuser06',
        'dummy06',
        'Fay Patel',
        'Public dummy profile for local lists and /profile pages.',
        'trial'
    );

DO $$
DECLARE
    public_status_id INTEGER;
    trial_membership_id INTEGER;
    premium_membership_id INTEGER;
    rec RECORD;
    new_account_id INTEGER;
    existing_account_id INTEGER;
    new_account_settings_id INTEGER;
    new_account_settings_notification_id INTEGER;
BEGIN
    SELECT id INTO public_status_id FROM sharable_status WHERE status = 'public';

    SELECT id INTO trial_membership_id FROM account_membership WHERE tier = 'trial';
    SELECT id INTO premium_membership_id FROM account_membership WHERE tier = 'premium';

    FOR rec IN SELECT * FROM local_dev_account_seed
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
            public_status_id
        )
        RETURNING id INTO new_account_id;

        INSERT INTO account_credentials (account_id, email, username, password)
        VALUES (
            new_account_id,
            rec.email,
            rec.username,
            '$2b$10$EhgpdpaFQooB.xrpHMdMBe.uJOBeuttpQOEcp1XG9EndaseZRoSee'
        );

        INSERT INTO account_profile (account_id, display_name, bio)
        VALUES (new_account_id, rec.display_name, rec.bio);

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

-- Public visibility, display name, bio, and dummy usernames for every seed email.
DO $$
DECLARE
    public_status_id INTEGER;
BEGIN
    SELECT id INTO public_status_id FROM sharable_status WHERE status = 'public';

    UPDATE account a
    SET sharable_status_id = public_status_id
    FROM account_credentials ac
    INNER JOIN local_dev_account_seed s ON s.email = ac.email
    WHERE a.id = ac.account_id;

    UPDATE account_profile ap
    SET display_name = s.display_name,
        bio = s.bio
    FROM account_credentials ac
    INNER JOIN local_dev_account_seed s ON s.email = ac.email
    WHERE ap.account_id = ac.account_id;

    UPDATE account_credentials ac
    SET username = s.username
    FROM local_dev_account_seed s
    WHERE s.email = ac.email
      AND s.username IS NOT NULL
      AND (ac.username IS NULL OR ac.username IS DISTINCT FROM s.username);
END $$;

-- Embed demo system account (username-only; password hash of discarded random secret)
DO $$
DECLARE
    private_status_id INTEGER;
    premium_membership_id INTEGER;
    existing_account_id INTEGER;
    new_account_id INTEGER;
    new_account_settings_id INTEGER;
    new_account_settings_notification_id INTEGER;
BEGIN
    SELECT id INTO private_status_id FROM sharable_status WHERE status = 'private';
    SELECT id INTO premium_membership_id FROM account_membership WHERE tier = 'premium';

    SELECT ac.account_id INTO existing_account_id
    FROM account_credentials ac
    WHERE ac.username = 'demo';

    IF existing_account_id IS NOT NULL THEN
        UPDATE account_membership_status
        SET account_membership_id = premium_membership_id,
            membership_expires_at = NOW() + INTERVAL '100 years'
        WHERE account_id = existing_account_id;

        RAISE NOTICE 'Local embed demo account already exists: demo (id: %)', existing_account_id;
        RETURN;
    END IF;

    INSERT INTO account (id_text, verified, sharable_status_id)
    VALUES (
        'embeddemo01'::nano_id_v2,
        TRUE,
        private_status_id
    )
    RETURNING id INTO new_account_id;

    INSERT INTO account_credentials (account_id, email, username, password)
    VALUES (
        new_account_id,
        NULL,
        'demo',
        '$2b$10$hhALeI8Aowf/2tAttZMzION.TNszTWqLwegwm9ygZeuvOiZl2udoi'
    );

    INSERT INTO account_profile (account_id)
    VALUES (new_account_id);

    INSERT INTO account_membership_status (account_id, account_membership_id, membership_expires_at)
    VALUES (
        new_account_id,
        premium_membership_id,
        NOW() + INTERVAL '100 years'
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

    RAISE NOTICE 'Local embed demo account created: demo (id: %)', new_account_id;
END $$;

-- Stable sender_guid for MetaBoost mbrss-v1 (matches signup). Idempotent: fixes rows created before
-- account_metaboost existed, and runs after new-account creation above.
INSERT INTO account_metaboost (account_id, sender_guid)
SELECT ac.account_id, gen_random_uuid()
FROM account_credentials ac
WHERE ac.email IN (SELECT email FROM local_dev_account_seed)
  AND NOT EXISTS (
    SELECT 1 FROM account_metaboost am WHERE am.account_id = ac.account_id
  );
