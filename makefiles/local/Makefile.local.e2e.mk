# --- Podverse E2E testing (local). Ports 403x (web), 413x (management-web).
#     Same overall shape as the shared Makefile.local.e2e pattern; Podverse-specific ports and paths.
#     Depends on Makefile.local.test.mk (test_deps, test containers). ---

.PHONY: e2e_deps e2e_seed e2e_seed_web e2e_seed_management_web
.PHONY: e2e_test e2e_test_playwright e2e_test_api e2e_test_web e2e_test_management_web
.PHONY: e2e_test_management_web_storage_enabled
.PHONY: e2e_test_report e2e_test_web_report_spec e2e_test_management_web_report_spec e2e_test_report_scoped
.PHONY: e2e_teardown

# Report output directory (timestamped)
E2E_REPORT_TIMESTAMP := $(shell date +%Y%m%d-%H%M%S)
E2E_REPORT_BASE := .artifacts/e2e-reports/$(E2E_REPORT_TIMESTAMP)

# Spec order files (optional; create makefiles/local/e2e-spec-order-web.txt when needed)
E2E_SPEC_ORDER_WEB := $(shell cat makefiles/local/e2e-spec-order-web.txt 2>/dev/null | tr '\n' ';')
E2E_SPEC_ORDER_MANAGEMENT_WEB := $(shell cat makefiles/local/e2e-spec-order-management-web.txt 2>/dev/null | tr '\n' ';')

# Ensure test DBs exist
e2e_deps: test_deps
	@echo "E2E dependencies ready."

# Seed web test database with deterministic E2E data
e2e_seed_web: e2e_deps
	@echo "Seeding web E2E data..."
	@node tools/web/seed-e2e.mjs
	@echo "Web E2E seed complete."

# Seed management-web test database with deterministic E2E data
e2e_seed_management_web: e2e_deps
	@echo "Seeding management-web E2E data..."
	@node tools/management-web/seed-e2e.mjs
	@echo "Management-web E2E seed complete."

# Seed both
e2e_seed: e2e_seed_web e2e_seed_management_web
	@echo "All E2E seeds complete."

# Run API integration tests only
e2e_test_api:
	@echo "Running API integration tests..."
	@npm run test -w apps/api && npm run test -w apps/management-api

# Web + management-web Playwright only (seeds both DBs). Does not run API Vitest; use with `npm run test:e2e:api` (or the `npm test` root script) to avoid running apps/api tests twice and duplicate Valkey/HTTP side effects.
e2e_test_playwright: e2e_deps e2e_seed
	@echo "=== Playwright E2E (web + management-web) ==="
	@exit_code=0; \
	npm run test:e2e -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e -w @podverse/management-web -- --reporter=list || exit_code=$$?; \
	exit $$exit_code

# Run web Playwright tests (default list reporter)
e2e_test_web: e2e_deps e2e_seed_web
	@echo "Running web E2E tests..."
	@npm run test:e2e -w @podverse/web -- --reporter=list

# Run management-web Playwright tests (default list reporter)
e2e_test_management_web: e2e_deps e2e_seed_management_web
	@echo "Running management-web E2E tests..."
	@npm run test:e2e -w @podverse/management-web -- --reporter=list

# Management-web storage list chrome (requires fake bucket env; see playwright.storage-enabled.config.ts)
e2e_test_management_web_storage_enabled: e2e_deps e2e_seed_management_web
	@echo "Running management-web storage-enabled E2E..."
	@npm run test:e2e:storage-enabled -w @podverse/management-web -- --reporter=list

# Full E2E: API Vitest (apps/api + management-api) + both Playwright apps. For local `npm test`, prefer `test:e2e:api` + `e2e_test_playwright` instead; this target remains for a single all-in-one run.
e2e_test: e2e_deps e2e_seed
	@echo "=== Full E2E suite ==="
	@exit_code=0; \
	npm run test -w apps/api && npm run test -w apps/management-api || exit_code=$$?; \
	npm run test:e2e -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e -w @podverse/management-web -- --reporter=list || exit_code=$$?; \
	exit $$exit_code

# --- Report targets (HTML step reporter with screenshots) ---

# Full E2E with HTML reports
e2e_test_report: e2e_deps e2e_seed
	@echo "=== Full E2E report suite ==="
	@mkdir -p $(E2E_REPORT_BASE)/web $(E2E_REPORT_BASE)/management-web
	@rm -f .artifacts/e2e-reports/latest
	@ln -s $(E2E_REPORT_TIMESTAMP) .artifacts/e2e-reports/latest
	@exit_code=0; \
	echo "--- API integration tests ---"; \
	npm run test -w apps/api && npm run test -w apps/management-api || exit_code=$$?; \
	echo "--- Web E2E report ---"; \
	E2E_SPEC_ORDER="$(E2E_SPEC_ORDER_WEB)" \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/web" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Management-web E2E report ---"; \
	E2E_SPEC_ORDER="$(E2E_SPEC_ORDER_MANAGEMENT_WEB)" \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/management-web" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo ""; \
	echo "=== E2E reports ==="; \
	echo "  Web:              $(E2E_REPORT_BASE)/web/index.html"; \
	echo "  Management-web:   $(E2E_REPORT_BASE)/management-web/index.html"; \
	echo "  Latest symlink:   .artifacts/e2e-reports/latest/"; \
	echo $$exit_code > .artifacts/e2e-reports/.last-exit-code
	@bash -c 'cd .artifacts/e2e-reports && ls -d */ 2>/dev/null | sort -r | tail -n +11 | xargs -r rm -rf' || true
	@(command -v open >/dev/null 2>&1 && open $(E2E_REPORT_BASE)/web/index.html $(E2E_REPORT_BASE)/management-web/index.html 2>/dev/null) \
	  || (command -v xdg-open >/dev/null 2>&1 && xdg-open $(E2E_REPORT_BASE)/web/index.html 2>/dev/null) || true
	@exit_code=$$(cat .artifacts/e2e-reports/.last-exit-code 2>/dev/null || echo 0); rm -f .artifacts/e2e-reports/.last-exit-code; exit $$exit_code

# Scoped web report for one spec (SPEC=apps/web/e2e/foo.spec.ts)
e2e_test_web_report_spec: e2e_deps e2e_seed_web
	@test -n "$(SPEC)" || (echo "Usage: make e2e_test_web_report_spec SPEC=apps/web/e2e/foo.spec.ts"; exit 1)
	@mkdir -p $(E2E_REPORT_BASE)/web
	PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/web" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(SPEC)" | tr ',' ' ')

# Scoped management-web report for one spec (SPEC=apps/management-web/e2e/foo.spec.ts)
e2e_test_management_web_report_spec: e2e_deps e2e_seed_management_web
	@test -n "$(SPEC)" || (echo "Usage: make e2e_test_management_web_report_spec SPEC=apps/management-web/e2e/foo.spec.ts"; exit 1)
	@mkdir -p $(E2E_REPORT_BASE)/management-web
	PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/management-web" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(SPEC)" | tr ',' ' ')

# Scoped both apps (WEB_SPEC=... MGMT_SPEC=...)
e2e_test_report_scoped: e2e_deps e2e_seed
	@test -n "$(WEB_SPEC)" || (echo "Usage: make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=..."; exit 1)
	@mkdir -p $(E2E_REPORT_BASE)/web $(E2E_REPORT_BASE)/management-web
	@exit_code=0; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/web" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(WEB_SPEC)" | tr ',' ' ') || exit_code=$$?; \
	if [ -n "$(MGMT_SPEC)" ]; then \
		PLAYWRIGHT_HTML_OUTPUT_DIR="$(E2E_REPORT_BASE)/management-web" \
		E2E_STEP_SCREENSHOTS=true \
		PLAYWRIGHT_HTML_OPEN=never \
		npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(MGMT_SPEC)" | tr ',' ' ') || exit_code=$$?; \
	fi; \
	exit $$exit_code

e2e_teardown:
	@echo "To stop E2E processes, run: make test_clean"
	@echo "To clean all local infrastructure: make local_clean"
