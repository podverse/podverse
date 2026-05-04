-- Add optional per-feed spam item limit override.
-- When set, parser uses this override before global default/spam-permitted limits.

ALTER TABLE feed
ADD COLUMN IF NOT EXISTS spam_item_limit_override integer NULL;

ALTER TABLE feed
DROP CONSTRAINT IF EXISTS feed_spam_item_limit_override_positive_check;

ALTER TABLE feed
ADD CONSTRAINT feed_spam_item_limit_override_positive_check
CHECK (
  spam_item_limit_override IS NULL OR spam_item_limit_override > 0
);
