-- 0015: Add channel-level metaBoost table (RSS podcast:metaBoost standard + node).

CREATE TABLE channel_meta_boost (
    id serial PRIMARY KEY,
    channel_id int NOT NULL REFERENCES channel(id) ON DELETE CASCADE,
    standard varchar_short NOT NULL,
    node varchar_url NOT NULL,
    UNIQUE (channel_id)
);
