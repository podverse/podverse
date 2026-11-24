-- Channel value rows come from the RSS parse.

ALTER TABLE public.channel
  DROP COLUMN has_podcast_index_value;
