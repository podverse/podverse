# Podverse alpha Makefile (included from root Makefile).
# Alpha Jenkins pipelines use this file only: make -f makefiles/alpha/Makefile.alpha.mk <target>
# so that local/V4V makefiles are never loaded on the alpha server.

include makefiles/alpha/Makefile.alpha.common.mk
include makefiles/alpha/Makefile.alpha.env.mk
include makefiles/alpha/Makefile.alpha.infra.mk
