-- 0016: Stable per-account sender_guid for MetaBoost mbrss-v1 (never exposed on public Podverse APIs).

CREATE TABLE account_metaboost (
    account_id integer NOT NULL PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    sender_guid uuid NOT NULL UNIQUE
);

CREATE INDEX idx_account_metaboost_sender_guid ON account_metaboost(sender_guid);
