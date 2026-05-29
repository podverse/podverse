-- 0032: Per-account terms-of-service acceptance audit row.

CREATE TABLE account_terms_acceptance (
    account_id integer NOT NULL PRIMARY KEY REFERENCES account(id) ON DELETE CASCADE,
    terms_version varchar(64) NOT NULL,
    accepted_at timestamp NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_account_terms_acceptance_terms_version ON account_terms_acceptance(terms_version);
