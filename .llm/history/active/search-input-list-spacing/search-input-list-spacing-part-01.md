### Session 1 - 2026-04-19

#### Prompt (Developer)

there should be more consistent space between the search input and the first item in the list below it

#### Key Decisions

- Add spacing at the search page header wrapper level so separation from the first search result is stable regardless of list row internals.
- Use the design token `--spacing-md` for consistency with existing vertical rhythm in the web app.

#### Files Modified

- apps/web/src/app/search/SearchPageListHeader.tsx
- apps/web/src/app/search/SearchPageListHeader.module.scss
