# --- Mobile store builds (EAS cloud). Thin wrappers over scripts/mobile/eas-android.sh. ---
#     PROFILE is an apps/mobile/eas.json profile; beta and production produce a Play .aab.
#     Downloads land in .artifacts/mobile-builds/. build and submit always ask for confirmation;
#     submit leaves a Play draft unless ROLLOUT=1, which also requires typing the versionCode.

.PHONY: mobile_eas_android_build mobile_eas_android_download mobile_eas_android_submit mobile_eas_android_list mobile_eas_android_version

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
