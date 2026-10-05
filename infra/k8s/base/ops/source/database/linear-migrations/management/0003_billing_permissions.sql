ALTER TABLE ONLY public.admin_account_permissions
    ADD COLUMN billing_channels_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_billing_channels_crud_check CHECK (((billing_channels_crud >= 0) AND (billing_channels_crud <= 15)));

ALTER TABLE ONLY public.admin_account_permissions
    ADD COLUMN billing_processor_products_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_billing_processor_products_crud_check CHECK (((billing_processor_products_crud >= 0) AND (billing_processor_products_crud <= 15)));

ALTER TABLE ONLY public.admin_account_permissions
    ADD COLUMN billing_account_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_billing_account_crud_check CHECK (((billing_account_crud >= 0) AND (billing_account_crud <= 15)));

ALTER TABLE ONLY public.admin_account_permissions
    ADD COLUMN billing_webhook_events_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_billing_webhook_events_crud_check CHECK (((billing_webhook_events_crud >= 0) AND (billing_webhook_events_crud <= 15)));

ALTER TABLE ONLY public.management_admin_role
    ADD COLUMN billing_channels_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_billing_channels_crud_check CHECK (((billing_channels_crud >= 0) AND (billing_channels_crud <= 15)));

ALTER TABLE ONLY public.management_admin_role
    ADD COLUMN billing_processor_products_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_billing_processor_products_crud_check CHECK (((billing_processor_products_crud >= 0) AND (billing_processor_products_crud <= 15)));

ALTER TABLE ONLY public.management_admin_role
    ADD COLUMN billing_account_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_billing_account_crud_check CHECK (((billing_account_crud >= 0) AND (billing_account_crud <= 15)));

ALTER TABLE ONLY public.management_admin_role
    ADD COLUMN billing_webhook_events_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_billing_webhook_events_crud_check CHECK (((billing_webhook_events_crud >= 0) AND (billing_webhook_events_crud <= 15)));
