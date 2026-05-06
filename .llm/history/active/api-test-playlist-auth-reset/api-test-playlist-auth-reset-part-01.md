# api-test-playlist-auth-reset

**Started:** 2026-05-06  
**Author:** Session  
**Context:** API integration test failures (playlist membership 401, PayPal webhook timeout).

### Session 1 - 2026-05-06

#### Prompt (Developer)

debug

#### Key Decisions

- Reproduced: both failing tests **pass alone** and **full `apps/api` suite passes** locally; likely **mock queue / implementation drift** from many `getAccountMock.mockResolvedValueOnce` calls in `GET /private/* list endpoints`.
- Added `beforeEach` in that describe to **`mockReset` + `mockImplementation`** with the same default account as the hoisted `getAccountMock` (mirrors `paypal.test.ts`), so auth stays deterministic regardless of test order or earlier `once()` usage.

#### Files Created/Modified

- apps/api/src/test/playlist.test.ts
- .llm/history/active/api-test-playlist-auth-reset/api-test-playlist-auth-reset-part-01.md
