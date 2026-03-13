# Local Docker only: extends workers image with socat proxy so localhost:2111
# forwards to podverse_local_test_assets:2111. See docs in entrypoint.sh.
# FROM uses -base tag so we always use the locally built image (see Makefile.local).
FROM podverse-workers-base:latest

USER root

RUN apt-get update && apt-get install -y --no-install-recommends socat \
  && rm -rf /var/lib/apt/lists/*

COPY infra/docker/local/workers/entrypoint.sh /opt/entrypoint.sh
RUN chown node:node /opt/entrypoint.sh && chmod +x /opt/entrypoint.sh

USER node

ENTRYPOINT ["/opt/entrypoint.sh"]
