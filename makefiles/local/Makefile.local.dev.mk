# --- Dev: Podcast Index feeds CSV (local only). ---
# Downloads the public SQLite dump, exports to CSV, then deletes .db and .tgz.
# Do not run in CI or alpha; for alpha, upload a CSV generated locally.
# Requires: curl, tar, sqlite3 (e.g. from nix develop).

FEEDS_CSV_DIR := infra/data/dev/podcast-index-feeds
FEEDS_CSV_URL := https://public.podcastindex.org/podcastindex_feeds.db.tgz

.PHONY: dev_pi_feeds_download_csv

dev_pi_feeds_download_csv:
	@test ! -f "$(FEEDS_CSV_DIR)/podcastindex_feeds.csv" || (echo "CSV already exists at $(FEEDS_CSV_DIR)/podcastindex_feeds.csv; aborting." && exit 1)
	@mkdir -p "$(FEEDS_CSV_DIR)"
	@cd "$(FEEDS_CSV_DIR)" && \
		echo "Downloading Podcast Index feeds dump..." && \
		curl -L -o podcastindex_feeds.db.tgz "$(FEEDS_CSV_URL)" && \
		echo "Extracting..." && \
		tar xzf podcastindex_feeds.db.tgz -C . && \
		echo "Exporting to CSV..." && \
		sqlite3 -header -csv podcastindex_feeds.db "SELECT id, url, dead FROM podcasts WHERE (dead = 0 OR dead IS NULL) ORDER BY id;" > podcastindex_feeds.csv && \
		echo "Removing .db and .tgz..." && \
		rm -f podcastindex_feeds.db podcastindex_feeds.db.tgz && \
		echo "Done. CSV at $(FEEDS_CSV_DIR)/podcastindex_feeds.csv"
