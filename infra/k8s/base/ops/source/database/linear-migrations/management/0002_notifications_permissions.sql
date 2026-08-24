ALTER TABLE ONLY public.admin_account_permissions
    ADD COLUMN notifications_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.admin_account_permissions
    ADD CONSTRAINT admin_account_permissions_notifications_crud_check CHECK (((notifications_crud >= 0) AND (notifications_crud <= 15)));

ALTER TABLE ONLY public.management_admin_role
    ADD COLUMN notifications_crud integer DEFAULT 0 NOT NULL;

ALTER TABLE ONLY public.management_admin_role
    ADD CONSTRAINT management_admin_role_notifications_crud_check CHECK (((notifications_crud >= 0) AND (notifications_crud <= 15)));
