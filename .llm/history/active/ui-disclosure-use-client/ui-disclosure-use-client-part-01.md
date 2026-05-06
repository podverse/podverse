### Metadata

- Started: 2026-05-06
- Author: Agent
- Context: Disclosure Client Component boundary for useState in Next.js App Router

### Session 1 - 2026-05-06

#### Prompt (Developer)

fix

(Context: Next.js build error — `Disclosure.tsx` uses `useState` without `'use client'` when imported from Server Components.)

#### Key Decisions

- Added `'use client'` at top of `packages/ui/src/components/layout/Disclosure/Disclosure.tsx` so hooks are valid when the component is used from server `page.tsx` trees.

#### Files Created/Modified

- `packages/ui/src/components/layout/Disclosure/Disclosure.tsx`
