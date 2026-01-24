ifeq ($(UNAME),Darwin)
	SHELL := /opt/local/bin/bash
	OS_X  := true
else ifneq (,$(wildcard /etc/redhat-release))
	RHEL := true
else
	OS_DEB  := true
	SHELL := /bin/bash
endif

# ==========================================
# Common Targets
# ==========================================

.PHONY: say_hello
say_hello:
	@echo "Hello Podverse"

.PHONY: docker_prune_images
docker_prune_images:
	docker image prune -a -f

# ==========================================
# Include Environment-Specific Makefiles
# ==========================================

include Makefile.local
include Makefile.alpha
