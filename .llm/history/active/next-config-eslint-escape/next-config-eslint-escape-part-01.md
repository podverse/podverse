# next-config-eslint-escape

**Started:** 2026-05-06  
**Author:** Session  
**Context:** ESLint no-useless-escape on `apps/web/next.config.mjs` ContextReplacementPlugin regex.

### Session 1 - 2026-05-06

#### Prompt (Developer)

For the code present, we get this error:

```
Unnecessary escape character: \/.
```

Fix it, verify, and then give a concise explanation. @podverse/apps/web/next.config.mjs:42-45

#### Key Decisions

- Replaced `[\/\\]` with `[/\\]` in `/date-fns[/\\]locale/` — inside a character class, `/` does not require escaping in JavaScript regex literals, satisfying `no-useless-escape` while still matching both POSIX and Windows path separators before `locale`.

#### Files Created/Modified

- apps/web/next.config.mjs
- .llm/history/active/next-config-eslint-escape/next-config-eslint-escape-part-01.md
