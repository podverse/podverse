# --- Mobile store builds (EAS cloud). Thin wrappers over scripts/mobile/eas-store.sh. ---
#     PROFILE is an apps/mobile/eas.json profile; beta and production produce store binaries.
#     Downloads land in .artifacts/mobile-builds/. build and submit always ask for confirmation;
#     Android submit leaves a Play draft unless ROLLOUT=1, which also requires typing the
#     versionCode. iOS submit always requires typing the build number (no draft state).
#     mobile_eas_env_set writes one variable on the EAS environment for PROFILE
#     (beta → preview). NAME and VALUE are required. VISIBILITY defaults to plaintext.
#     TYPE is string (default) or file. A file VALUE is a local path.

.PHONY: mobile_eas_android_build mobile_eas_android_download mobile_eas_android_submit \
	mobile_eas_android_list mobile_eas_android_version mobile_eas_android_credentials \
	mobile_eas_ios_build mobile_eas_ios_download mobile_eas_ios_submit \
	mobile_eas_ios_list mobile_eas_ios_version mobile_eas_ios_credentials \
	mobile_eas_env_set mobile_eas_login

PROFILE ?= beta

mobile_eas_android_build:
	@npm run mobile:eas:android:build -- --profile $(PROFILE)

mobile_eas_android_download:
	@npm run mobile:eas:android:download -- --profile $(PROFILE) $(if $(BUILD_ID),--build-id $(BUILD_ID))

mobile_eas_android_submit:
	@npm run mobile:eas:android:submit -- --profile $(PROFILE) $(if $(BUILD_ID),--build-id $(BUILD_ID)) $(if $(filter 1,$(ROLLOUT)),--rollout)

mobile_eas_android_list:
	@npm run mobile:eas:android:list

mobile_eas_android_version:
	@npm run mobile:eas:android:version -- --profile $(PROFILE)

mobile_eas_ios_build:
	@npm run mobile:eas:ios:build -- --profile $(PROFILE)

mobile_eas_ios_download:
	@npm run mobile:eas:ios:download -- --profile $(PROFILE) $(if $(BUILD_ID),--build-id $(BUILD_ID))

mobile_eas_ios_submit:
	@npm run mobile:eas:ios:submit -- --profile $(PROFILE) $(if $(BUILD_ID),--build-id $(BUILD_ID))

mobile_eas_ios_list:
	@npm run mobile:eas:ios:list

mobile_eas_ios_version:
	@npm run mobile:eas:ios:version -- --profile $(PROFILE)

mobile_eas_ios_credentials:
	@npm run mobile:eas:ios:credentials

mobile_eas_android_credentials:
	@npm run mobile:eas:android:credentials

mobile_eas_env_set:
	@npm run mobile:eas:env:set -- --profile $(PROFILE) $(if $(EAS_ENV),--environment $(EAS_ENV)) --name "$(NAME)" --value "$(VALUE)" $(if $(VISIBILITY),--visibility $(VISIBILITY)) $(if $(TYPE),--type $(TYPE))

mobile_eas_login:
	@npm run mobile:eas:login
