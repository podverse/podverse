UNAME := $(shell uname)
# Use bash from PATH (e.g. from nix develop); avoid hardcoding MacPorts or system paths
SHELL := /usr/bin/env bash
ifeq ($(UNAME),Darwin)
	OS_X  := true
else ifneq (,$(wildcard /etc/redhat-release))
	RHEL := true
else
	OS_DEB  := true
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
# Include makefile fragments
# ==========================================

include makefiles/local/Makefile.local.mk
include makefiles/git/Makefile.git.mk
include makefiles/alpha/Makefile.alpha.mk
include makefiles/jenkins/Makefile.jenkins-alpha.mk
