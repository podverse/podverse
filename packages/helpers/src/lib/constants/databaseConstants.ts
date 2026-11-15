export const DATABASE_CONSTANTS = {
  nano_id_v2: 15,
  varchar_short: 50,
  varchar_username: 32,
  varchar_normal: 255,
  varchar_long: 2500,
  varchar_longer: 10000,
  varchar_email: 255,
  varchar_fqdn: 253,
  varchar_guid: 36,
  varchar_md5: 32,
  varchar_sha256_hex: 64,
  varchar_password: 36,
  varchar_slug: 100,
  varchar_uri: 2083,
  varchar_url: 2083,
  varchar_fcm_token: 255,
  varchar_locale: 85,
  /** `media_player_time` is NUMERIC(10,2): at most 99,999,999.99. */
  media_player_time_max_exclusive: 100_000_000,
  mediaPlayerTimeOrNull: (num: number | null | undefined): string | null =>
    typeof num === 'number' && Number.isFinite(num) && num >= 0 && num < 100_000_000
      ? num.toFixed(2)
      : null,
  getMediaPlayerNumeric: (num: number) => num.toFixed(2),
};
