# PG-2a execution order

Run COPY-PASTA prompts in sequence. Do not skip ahead.

| Order | Plan file                      | Steps        | Model     |
| ----- | ------------------------------ | ------------ | --------- |
| 1     | `01-expo-workspace-scaffold.md` | 3.1–3.5      | Codex 5.3 |
| 2     | `02-prebuild-hello-world.md`    | 3.6–3.10     | Codex 5.3 |
| 3     | `03-native-perms-scaffold.md`   | 3.11–3.13    | Codex 5.3 |
| 4     | `04-device-verify-exit.md`      | 3.14–3.16    | Auto      |

After prompt 4: archive to `.llm/plans/completed/mobile-pg2a-hello-world/` per plan-completion skill.

**Note:** Steps 3.14–3.15 require a physical iOS device and Android device with local Xcode / Android
SDK (outside Nix). Step 3.16 updates master plan status after operator sign-off.
