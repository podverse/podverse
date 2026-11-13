-- Public ids can be 7 characters. Generated ids stay 10.

ALTER DOMAIN public.nano_id_v2 DROP CONSTRAINT nano_id_v2_len_check;
ALTER DOMAIN public.nano_id_v2 ADD CONSTRAINT nano_id_v2_len_check
  CHECK (VALUE IS NULL OR (char_length(VALUE) >= 7 AND char_length(VALUE) <= 15));
