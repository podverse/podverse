# Execution order — mobile-pg8-car-native-cache

Run COPY-PASTA prompts **in sequence**. Do not start the next prompt until the previous is
finished (schema before storage; storage before JS wiring; wiring before spikes).

| Order | Plan file                         | Steps     | Model    | Notes                                      |
| ----- | --------------------------------- | --------- | -------- | ------------------------------------------ |
| 1     | `01-native-cache-schema.md`       | 12.1      | Opus 4.8 | Types + docs only; no durable persist yet  |
| 2     | `02-ios-android-storage.md`       | 12.2–12.3 | Opus 4.8 | iOS + Android persist in one prompt        |
| 3     | `03-js-cache-write-path.md`       | 12.4      | Opus 4.8 | Wire projections → bridge                  |
| 4     | `04-spikes-cache-read-no-js.md`   | 12.5–12.6 | Opus 4.8 | Spike notes + native read proof            |

**Follow-on (not this set):** CarPlay / Android Auto surfaces (12.7–12.21) as a separate plan
directory once this set is archived.
