# Version Bump Audit Remediation

- Started: 2026-04-23
- Status: Active

### Session 1 - 2026-04-23

#### Prompt (Developer)

handle the upgrades so that we fix the vulnerabilities that are blocking the bump version

#### Key Decisions

- (in progress)

#### Files Modified

- (in progress)

### Session 2 - 2026-04-23

#### Prompt (Agent)

[Terminal 6ff34016-e8c7-4e68-a5fa-e6529d924f1a notification: command completed with exit code 0. Use send_to_terminal to send another command or kill_terminal to stop it.]

#### Key Decisions

- Continued from `npm audit fix` partial remediation and moved to targeted dependency-chain investigation for remaining `uuid`/`@tootallnate/once` vulnerabilities.

#### Files Modified

- .llm/history/active/version-bump-audit-remediation/version-bump-audit-remediation-part-01.md (this update)

### Session 3 - 2026-04-23

#### Prompt (Agent)

[Terminal f0d36837-cf93-4ac5-b4df-5923ad89eed1 notification: command is waiting for input. Determine the answer and call send_to_terminal. Then call get_terminal_output to read the next prompt. Repeat one prompt at a time. A normal shell prompt does NOT count as waiting for input.]

#### Key Decisions

- Confirmed the terminal was not actually blocked; acknowledged with Enter and continued.
- Upgraded direct `uuid` workspace dependencies to `^14.0.0` in API/helpers/web/management-web.
- Attempted root-level npm `overrides` for `uuid` and `@tootallnate/once` plus nested chains (`teeny-request`, `gaxios`, `google-gax`, `typeorm`), but npm resolution still retained vulnerable transitive nodes under Firebase/Google packages.
- Attempted `npm audit fix --force`; this introduced risky downgraded manifests (`typeorm` to `0.2.x`, `firebase-admin` to `10.1.0`) and increased vulnerabilities.
- Manually restored unintended manifest downgrades and reinstalled to return to stable pre-force state.
- Final status for `npm audit --omit=dev --audit-level=moderate`: still failing with 11 vulnerabilities, all in Firebase/Google/TypeORM transitive chain requiring breaking major shifts not available in current latest upstream combinations.

#### Files Modified

- apps/api/package.json
- apps/web/package.json
- apps/management-web/package.json
- packages/helpers/package.json
- package.json
- apps/management-api/package.json
- apps/workers/package.json
- packages/orm/package.json
- packages/external-services-firebase/package.json
- tools/web-perf/lighthouse/package.json
- apps/management-web/sidecar/package.json
- apps/web/sidecar/package.json
- package-lock.json
- .llm/history/active/version-bump-audit-remediation/version-bump-audit-remediation-part-01.md

### Session 4 - 2026-04-23

#### Prompt (Developer)

Start implementation

#### Key Decisions

- Implement the practical unblock by updating the bump-version audit gate to support a narrow allowlist for known upstream-only advisories.
- Added a JSON-based audit parser in the bump script with an advisory-ID allowlist for `1113977` and `1116970` only.
- Preserved strict blocking for all non-allowlisted moderate/high/critical advisories.
- Verified the updated script passes the audit gate and reaches the version prompt.

#### Files Modified

- scripts/publish/bump-version.sh
- .llm/history/active/version-bump-audit-remediation/version-bump-audit-remediation-part-01.md

### Session 5 - 2026-04-23

#### Prompt (Developer)

implement what you think is recommended. also update skills in both podverse and metaboost so that you know how to handle these cases in the future. also, we would like to remove these overrides when they are no longer needed. can you remind yourself to do that when we work on npm audits

#### Key Decisions

- Investigated npm override behavior: verified that root-level overrides for uuid@14.0.0 do not cascade into teeny-request's nested node_modules due to npm's optional dependency resolver limitations.
- Confirmed no safe upgrade path exists: @google-cloud/storage@7.19.0 (latest 7-series) still pins teeny-request@9.0.0, which pins uuid@9.0.1 (vulnerable).
- Validated that allowlist approach is justified and not a code smell—this is documented upstream ecosystem constraint.
- Created comprehensive npm-audit investigation skill for both Podverse and Metaboost codebases.
- Added detailed documentation explaining why advisories 1113977 and 1116970 are allowlisted, with clear revisit criteria.
- Created persistent memory note at `/memories/user/npm-audit-overrides.md` tracking these overrides and when to remove them.
- Updated bump-version.sh to reference audit allowlist documentation.

#### Files Modified

- docs/development/NPM-AUDIT-ALLOWLIST.md (new)
- scripts/publish/bump-version.sh (updated comment to reference docs)
- .github/skills/npm-audit/SKILL.md (new in Podverse)
- /memories/user/npm-audit-overrides.md (new persistent memory)
- .llm/history/active/version-bump-audit-remediation/version-bump-audit-remediation-part-01.md (this update)

#### Also Created in Metaboost

- .github/skills/npm-audit/SKILL.md (identical npm-audit handling guidance)
