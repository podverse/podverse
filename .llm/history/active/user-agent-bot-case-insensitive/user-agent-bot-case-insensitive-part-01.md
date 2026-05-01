# user-agent-bot-case-insensitive

**Started:** 2026-04-30  
**Author:** LLM session

### Session 1 - 2026-04-30

#### Prompt (Developer)

the requirements for ua should be case insensitive for validation across podverse and metaboost (not sure if metaboost even has this validation) 2026-04-30T17:47:57.692Z [error]: - USER_AGENT (required): Missing "Bot" in first part: "SUORCD ALPHA BOT/API/5"

#### Key Decisions

- Treat presence of the substring `bot` in the first slash-separated segment as **case-insensitive** (`firstPart.toLowerCase().includes('bot')`), matching e.g. `BOT`, `Bot`, `bot`.

#### Files Created/Modified

- apps/api/src/lib/startup/validation.ts
- apps/management-api/src/lib/startup/validation.ts
- apps/workers/src/lib/startup/validation.ts
- packages/helpers-config/src/startupValidation.ts (`validateProxyUserAgent`)
