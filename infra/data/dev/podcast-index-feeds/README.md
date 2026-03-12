# Podcast Index feeds (dev/test)

The SQLite dump from Podcast Index must **not** be stored on servers. Use a CSV instead.

- **Locally**: Run `make dev_pi_feeds_download_csv` from the monorepo root. This downloads the
  public dump, exports it to CSV, and removes the SQLite and .tgz files. The resulting
  `podcastindex_feeds.csv` is used by the workers command `devPiBulkFeedsAddFromFile`.
- **Alpha (or other non-local)**: Upload a CSV file generated locally to this directory on the
  target host. Sparse checkout keeps this directory available so the path exists on alpha.

This directory is for **dev and testing only**. The directory is committed (with `.gitkeep`) so
it exists in sparse-checkout environments; the `.csv`, `.db`, and `.tgz` files are gitignored.
