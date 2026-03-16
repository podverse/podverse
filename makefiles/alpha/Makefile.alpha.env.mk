# --- Alpha env: validate_init and copy rules for infra/config/alpha/*.env. ---

.PHONY: alpha_validate_init

alpha_validate_init: infra/config/alpha/db.env infra/config/alpha/mq.env infra/config/alpha/keyvaldb.env infra/config/alpha/workers.env infra/config/alpha/api.env infra/config/alpha/web.env infra/config/alpha/management-api.env infra/config/alpha/management-web.env

# Auto-copy missing alpha env files from templates (infra/config/alpha/ exists via .gitkeep)
infra/config/alpha/db.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/db.env.example ./$@

infra/config/alpha/mq.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/mq.env.example ./$@

infra/config/alpha/keyvaldb.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/keyvaldb.env.example ./$@

infra/config/alpha/workers.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/workers.env.example ./$@

infra/config/alpha/api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/api.env.example ./$@

infra/config/alpha/web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/web.env.example ./$@

infra/config/alpha/management-api.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/management-api.env.example ./$@

infra/config/alpha/management-web.env:
	@echo "Missing: $@"
	@echo "Copying from example file"
	cp ./infra/config/env-templates/management-web.env.example ./$@
