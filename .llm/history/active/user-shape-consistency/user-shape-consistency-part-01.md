### Session 1 - 2026-04-22

#### Prompt (Developer)

User Shape Consistency Improvements

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Canonical apps/api authenticated request-user shape remains `id`, `id_text`, and `verified`, populated after account validation.
- Optional auth behavior remains unchanged (`req.user` may be undefined when no token).
- Added runtime JWT `id` validation guards in both API and management-api auth verification paths.
- Added regression coverage for malformed JWT payload ids and identity-shape-dependent playlist/profile-content flows.

#### Files Modified

- apps/api/src/lib/auth/index.ts
- apps/management-api/src/lib/auth/index.ts
- apps/api/src/test/auth.test.ts
- apps/api/src/test/profile-content.test.ts
- apps/api/src/test/playlist.test.ts
- apps/management-api/src/routes/auth.integration.test.ts
- .llm/history/active/user-shape-consistency/user-shape-consistency-part-01.md
