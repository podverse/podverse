# --- Podverse E2E testing (local). Ports 403x (web), 413x (management-web).
#     Same overall shape as the shared Makefile.local.e2e pattern; Podverse-specific ports and paths.
#     Depends on Makefile.local.test.mk (test_deps, test containers). ---

.PHONY: e2e_deps e2e_seed e2e_seed_web e2e_seed_management_web
.PHONY: e2e_test e2e_test_playwright e2e_test_api e2e_test_web e2e_test_management_web
.PHONY: e2e_test_management_web_storage_enabled
.PHONY: e2e_test_report e2e_test_web_report_spec e2e_test_web_custom_themes_report e2e_test_management_web_report_spec e2e_test_report_scoped
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
	npm run test:e2e:cloudflare-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:cookie-consent-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:signup-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:cloudflare-enabled -w @podverse/management-web -- --reporter=list || exit_code=$$?; \
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
	npm run test:e2e:cloudflare-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:cookie-consent-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:signup-enabled -w @podverse/web -- --reporter=list || exit_code=$$?; \
	npm run test:e2e:cloudflare-enabled -w @podverse/management-web -- --reporter=list || exit_code=$$?; \
	exit $$exit_code

# --- Report targets (HTML step reporter with screenshots) ---

# Full E2E with HTML reports
e2e_test_report: e2e_deps e2e_seed
	@echo "=== Full E2E report suite ==="
	@ROOT_DIR="$$(pwd)"; \
	TS="$(E2E_REPORT_TIMESTAMP)"; \
	REPORT_BASE="$$ROOT_DIR/.artifacts/e2e-reports/$$TS"; \
	WEB_REPORT="$$REPORT_BASE/web"; \
	WEB_CF_REPORT="$$REPORT_BASE/web-cloudflare-enabled"; \
	WEB_COOKIE_REPORT="$$REPORT_BASE/web-cookie-consent-enabled"; \
	WEB_SIGNUP_REPORT="$$REPORT_BASE/web-signup-enabled"; \
	WEB_CUSTOM_THEMES_NATIVE_REPORT="$$REPORT_BASE/web-custom-themes-native"; \
	WEB_CUSTOM_THEMES_REMOTE_REPORT="$$REPORT_BASE/web-custom-themes-remote"; \
	WEB_CUSTOM_THEMES_COMBO_REPORT="$$REPORT_BASE/web-custom-themes-combo"; \
	MGMT_REPORT="$$REPORT_BASE/management-web"; \
	MGMT_CF_REPORT="$$REPORT_BASE/management-web-cloudflare-enabled"; \
	mkdir -p "$$WEB_REPORT" "$$WEB_CF_REPORT" "$$WEB_COOKIE_REPORT" "$$WEB_SIGNUP_REPORT" \
		"$$WEB_CUSTOM_THEMES_NATIVE_REPORT" "$$WEB_CUSTOM_THEMES_REMOTE_REPORT" "$$WEB_CUSTOM_THEMES_COMBO_REPORT" \
		"$$MGMT_REPORT" "$$MGMT_CF_REPORT"; \
	rm -f "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	ln -s "$$TS" "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	exit_code=0; \
	echo "--- API integration tests ---"; \
	npm run test -w apps/api && npm run test -w apps/management-api || exit_code=$$?; \
	echo "--- Web E2E report ---"; \
	E2E_SPEC_ORDER="$(E2E_SPEC_ORDER_WEB)" \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web Cloudflare-enabled E2E report ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_CF_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:cloudflare-enabled -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web cookie-consent-enabled E2E report ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_COOKIE_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:cookie-consent-enabled -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web signup-enabled E2E report ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_SIGNUP_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:signup-enabled -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web custom themes (native) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_CUSTOM_THEMES_NATIVE_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-native -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web custom themes (remote) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_CUSTOM_THEMES_REMOTE_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-remote -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web custom themes (combo) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_CUSTOM_THEMES_COMBO_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-combo -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Management-web E2E report ---"; \
	E2E_SPEC_ORDER="$(E2E_SPEC_ORDER_MANAGEMENT_WEB)" \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$MGMT_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Management-web Cloudflare-enabled E2E report ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$MGMT_CF_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:cloudflare-enabled -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo ""; \
	echo "=== E2E reports ==="; \
	echo "  Web:                         $$WEB_REPORT/index.html"; \
	echo "  Web (Cloudflare enabled):    $$WEB_CF_REPORT/index.html"; \
	echo "  Web (cookie consent):      $$WEB_COOKIE_REPORT/index.html"; \
	echo "  Web (signup enabled):      $$WEB_SIGNUP_REPORT/index.html"; \
	echo "  Web (custom themes native):  $$WEB_CUSTOM_THEMES_NATIVE_REPORT/index.html"; \
	echo "  Web (custom themes remote):  $$WEB_CUSTOM_THEMES_REMOTE_REPORT/index.html"; \
	echo "  Web (custom themes combo):   $$WEB_CUSTOM_THEMES_COMBO_REPORT/index.html"; \
	echo "  Management-web:              $$MGMT_REPORT/index.html"; \
	echo "  Management-web (CF enabled): $$MGMT_CF_REPORT/index.html"; \
	echo "  Latest symlink:              $$ROOT_DIR/.artifacts/e2e-reports/latest/"; \
	RUN_DIRS=$$((ls -1d "$$ROOT_DIR/.artifacts/e2e-reports"/20??????-?????? 2>/dev/null || true) | sort); \
	RUN_COUNT=$$(printf "%s\n" "$$RUN_DIRS" | sed '/^$$/d' | wc -l | tr -d ' '); \
	if [ "$$RUN_COUNT" -gt 10 ]; then \
		REMOVE_COUNT=$$((RUN_COUNT - 10)); \
		printf "%s\n" "$$RUN_DIRS" | sed '/^$$/d' | head -n "$$REMOVE_COUNT" | while IFS= read -r OLD_DIR; do \
			if [ -n "$$OLD_DIR" ]; then \
				rm -rf "$$OLD_DIR"; \
			fi; \
		done; \
		echo "Rotated old E2E reports: kept newest 10 timestamped directories."; \
	fi; \
	if command -v open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && open "$$WEB_REPORT/index.html" "$$WEB_CF_REPORT/index.html" "$$MGMT_REPORT/index.html" "$$MGMT_CF_REPORT/index.html" 2>/dev/null || true; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && xdg-open "$$WEB_REPORT/index.html" >/dev/null 2>&1 || true; \
		[ -f "$$WEB_CF_REPORT/index.html" ] && xdg-open "$$WEB_CF_REPORT/index.html" >/dev/null 2>&1 || true; \
		[ -f "$$MGMT_REPORT/index.html" ] && xdg-open "$$MGMT_REPORT/index.html" >/dev/null 2>&1 || true; \
		[ -f "$$MGMT_CF_REPORT/index.html" ] && xdg-open "$$MGMT_CF_REPORT/index.html" >/dev/null 2>&1 || true; \
	fi; \
	exit $$exit_code

# Scoped web report for one spec (SPEC=apps/web/e2e/foo.spec.ts)
e2e_test_web_report_spec: e2e_deps e2e_seed_web
	@test -n "$(SPEC)" || (echo "Usage: make e2e_test_web_report_spec SPEC=apps/web/e2e/foo.spec.ts"; exit 1)
	@ROOT_DIR="$$(pwd)"; \
	TS="$(E2E_REPORT_TIMESTAMP)"; \
	WEB_REPORT="$$ROOT_DIR/.artifacts/e2e-reports/$$TS/web"; \
	mkdir -p "$$WEB_REPORT"; \
	rm -f "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	ln -sfn "$$TS" "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	WEB_E2E_CMD="npm run test:e2e -w @podverse/web"; \
	case "$(SPEC)" in \
	  *cookie-consent-enabled*) WEB_E2E_CMD="npm run test:e2e:cookie-consent-enabled -w @podverse/web" ;; \
	  *sign-up-legal-consent*) WEB_E2E_CMD="npm run test:e2e:signup-enabled -w @podverse/web" ;; \
	  *custom-themes-native*) WEB_E2E_CMD="npm run test:e2e:custom-themes-native -w @podverse/web" ;; \
	  *custom-themes-remote*) WEB_E2E_CMD="npm run test:e2e:custom-themes-remote -w @podverse/web" ;; \
	  *custom-themes-combo*) WEB_E2E_CMD="npm run test:e2e:custom-themes-combo -w @podverse/web" ;; \
	esac; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	$$WEB_E2E_CMD -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(SPEC)" | tr ',' ' '); \
	if command -v open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && open "$$WEB_REPORT/index.html" 2>/dev/null || true; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && xdg-open "$$WEB_REPORT/index.html" >/dev/null 2>&1 || true; \
	fi; \
	echo "E2E report: $$WEB_REPORT/index.html"

# Custom themes E2E (native / remote / combo) with separate HTML reports
e2e_test_web_custom_themes_report: e2e_deps e2e_seed_web
	@echo "=== Web custom themes E2E reports ==="
	@ROOT_DIR="$$(pwd)"; \
	TS="$(E2E_REPORT_TIMESTAMP)"; \
	REPORT_BASE="$$ROOT_DIR/.artifacts/e2e-reports/$$TS"; \
	NATIVE_REPORT="$$REPORT_BASE/web-custom-themes-native"; \
	REMOTE_REPORT="$$REPORT_BASE/web-custom-themes-remote"; \
	COMBO_REPORT="$$REPORT_BASE/web-custom-themes-combo"; \
	mkdir -p "$$NATIVE_REPORT" "$$REMOTE_REPORT" "$$COMBO_REPORT"; \
	rm -f "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	ln -sfn "$$TS" "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	exit_code=0; \
	echo "--- Web custom themes (native) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$NATIVE_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-native -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web custom themes (remote) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$REMOTE_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-remote -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo "--- Web custom themes (combo) ---"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$COMBO_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e:custom-themes-combo -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \
	echo ""; \
	echo "=== Custom themes E2E reports ==="; \
	echo "  Native:  $$NATIVE_REPORT/index.html"; \
	echo "  Remote:  $$REMOTE_REPORT/index.html"; \
	echo "  Combo:   $$COMBO_REPORT/index.html"; \
	echo "  Latest:  $$ROOT_DIR/.artifacts/e2e-reports/latest/"; \
	if command -v open >/dev/null 2>&1; then \
		[ -f "$$COMBO_REPORT/index.html" ] && open "$$NATIVE_REPORT/index.html" "$$REMOTE_REPORT/index.html" "$$COMBO_REPORT/index.html" 2>/dev/null || true; \
	fi; \
	exit $$exit_code

# Scoped management-web report for one spec (SPEC=apps/management-web/e2e/foo.spec.ts)
e2e_test_management_web_report_spec: e2e_deps e2e_seed_management_web
	@test -n "$(SPEC)" || (echo "Usage: make e2e_test_management_web_report_spec SPEC=apps/management-web/e2e/foo.spec.ts"; exit 1)
	@ROOT_DIR="$$(pwd)"; \
	TS="$(E2E_REPORT_TIMESTAMP)"; \
	MGMT_REPORT="$$ROOT_DIR/.artifacts/e2e-reports/$$TS/management-web"; \
	mkdir -p "$$MGMT_REPORT"; \
	rm -f "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	ln -sfn "$$TS" "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$MGMT_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(SPEC)" | tr ',' ' '); \
	if command -v open >/dev/null 2>&1; then \
		[ -f "$$MGMT_REPORT/index.html" ] && open "$$MGMT_REPORT/index.html" 2>/dev/null || true; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		[ -f "$$MGMT_REPORT/index.html" ] && xdg-open "$$MGMT_REPORT/index.html" >/dev/null 2>&1 || true; \
	fi; \
	echo "E2E report: $$MGMT_REPORT/index.html"

# Scoped both apps (WEB_SPEC=... MGMT_SPEC=...)
e2e_test_report_scoped: e2e_deps e2e_seed
	@test -n "$(WEB_SPEC)" || (echo "Usage: make e2e_test_report_scoped WEB_SPEC=... MGMT_SPEC=..."; exit 1)
	@ROOT_DIR="$$(pwd)"; \
	TS="$(E2E_REPORT_TIMESTAMP)"; \
	REPORT_BASE="$$ROOT_DIR/.artifacts/e2e-reports/$$TS"; \
	WEB_REPORT="$$REPORT_BASE/web"; \
	MGMT_REPORT="$$REPORT_BASE/management-web"; \
	mkdir -p "$$WEB_REPORT" "$$MGMT_REPORT"; \
	rm -f "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	ln -sfn "$$TS" "$$ROOT_DIR/.artifacts/e2e-reports/latest"; \
	exit_code=0; \
	PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_REPORT" \
	E2E_STEP_SCREENSHOTS=true \
	PLAYWRIGHT_HTML_OPEN=never \
	npm run test:e2e -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(WEB_SPEC)" | tr ',' ' ') || exit_code=$$?; \
	if [ -n "$(MGMT_SPEC)" ]; then \
		PLAYWRIGHT_HTML_OUTPUT_DIR="$$MGMT_REPORT" \
		E2E_STEP_SCREENSHOTS=true \
		PLAYWRIGHT_HTML_OPEN=never \
		npm run test:e2e -w @podverse/management-web -- --reporter=../../scripts/e2e-html-steps-reporter.ts $$(echo "$(MGMT_SPEC)" | tr ',' ' ') || exit_code=$$?; \
	fi; \
	if command -v open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && open "$$WEB_REPORT/index.html" 2>/dev/null || true; \
		[ -f "$$MGMT_REPORT/index.html" ] && open "$$MGMT_REPORT/index.html" 2>/dev/null || true; \
	elif command -v xdg-open >/dev/null 2>&1; then \
		[ -f "$$WEB_REPORT/index.html" ] && xdg-open "$$WEB_REPORT/index.html" >/dev/null 2>&1 || true; \
		[ -f "$$MGMT_REPORT/index.html" ] && xdg-open "$$MGMT_REPORT/index.html" >/dev/null 2>&1 || true; \
	fi; \
	echo "E2E reports: $$WEB_REPORT/index.html $$MGMT_REPORT/index.html"; \
	exit $$exit_code

e2e_teardown:
	@echo "To stop E2E processes, run: make test_clean"
	@echo "To clean all local infrastructure: make local_clean"
