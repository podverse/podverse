-- Equality lookups of an episode enclosure use a 16-byte md5 of guid_enclosure_url.
-- The URL column stays, so playback and list responses still read it.
-- The trigger fills the digest on insert and update. This file also fills rows
-- already stored, then replaces the btree of the full URL.

SET LOCAL statement_timeout = 0;

ALTER TABLE public.item
  ADD COLUMN guid_enclosure_url_digest bytea;

CREATE FUNCTION public.item_set_guid_enclosure_url_digest()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.guid_enclosure_url IS NULL THEN
    NEW.guid_enclosure_url_digest := NULL;
  ELSE
    NEW.guid_enclosure_url_digest := decode(md5(NEW.guid_enclosure_url), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER item_guid_enclosure_url_digest
  BEFORE INSERT OR UPDATE ON public.item
  FOR EACH ROW
  EXECUTE FUNCTION public.item_set_guid_enclosure_url_digest();

UPDATE public.item
SET guid_enclosure_url_digest = decode(md5(guid_enclosure_url), 'hex')
WHERE guid_enclosure_url IS NOT NULL;

CREATE INDEX idx_item_guid_enclosure_url_digest
  ON public.item USING btree (guid_enclosure_url_digest);

DROP INDEX public.idx_item_guid_enclosure_url;
