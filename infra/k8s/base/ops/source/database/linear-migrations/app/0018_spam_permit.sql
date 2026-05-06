-- Add SpamPermitted feed status and allow it in feed_flag_status status constraint.

ALTER TABLE feed_flag_status DROP CONSTRAINT feed_flag_status_status_check;

ALTER TABLE feed_flag_status
ADD CONSTRAINT feed_flag_status_status_check
CHECK (
  status IN (
    'active',
    'always-parse',
    'spam',
    'pending-archive',
    'archived',
    'takedown',
    'spam-permitted'
  )
);

INSERT INTO feed_flag_status (id, status)
VALUES (7, 'spam-permitted');
