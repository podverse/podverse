-- 0037 migration: optional default play item for embed demo list showcase slots

ALTER TABLE embed_demo_showcase
    ADD COLUMN play_resource_id_text VARCHAR(15);
