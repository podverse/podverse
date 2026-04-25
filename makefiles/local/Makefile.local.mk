# Podverse local Makefile (included from root Makefile).
# Local override source files (manual values live here)
LOCAL_ENV_OVERRIDE_DIR := dev/env-overrides/local

include makefiles/local/Makefile.local.validate.mk
include makefiles/local/Makefile.local.env.mk
include makefiles/local/Makefile.local.infra.mk
include makefiles/local/Makefile.local.test.mk
include makefiles/local/Makefile.local.e2e.mk
include makefiles/local/Makefile.local.build.mk
include makefiles/local/Makefile.local.apps.mk
include makefiles/local/Makefile.example.com.mk
