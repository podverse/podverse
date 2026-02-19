-- 0015: Add metaBoost tables linked to value records.

ALTER TABLE channel_value
    DROP COLUMN IF EXISTS meta_boost_schema,
    DROP COLUMN IF EXISTS meta_boost_url;

ALTER TABLE item_value
    DROP COLUMN IF EXISTS meta_boost_schema,
    DROP COLUMN IF EXISTS meta_boost_url;

CREATE TABLE channel_value_meta_boost (
    id serial PRIMARY KEY,
    channel_value_id int NOT NULL REFERENCES channel_value(id) ON DELETE CASCADE,
    type varchar_short NOT NULL,
    schema varchar_short NOT NULL,
    license varchar_url,
    node varchar_url NOT NULL,
    UNIQUE (channel_value_id)
);

CREATE TABLE item_value_meta_boost (
    id serial PRIMARY KEY,
    item_value_id int NOT NULL REFERENCES item_value(id) ON DELETE CASCADE,
    type varchar_short NOT NULL,
    schema varchar_short NOT NULL,
    license varchar_url,
    node varchar_url NOT NULL,
    UNIQUE (item_value_id)
);
