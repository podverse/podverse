# Alpha common targets (shared by alpha env/infra; used when running alpha makefile only).
# E.g. docker_prune_images — generic Docker maintenance, not alpha-service-specific.

.PHONY: docker_prune_images
docker_prune_images:
	docker image prune -a -f
