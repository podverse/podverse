---
name: time-format-local
description: Ensures client-side time displays use formatDateTimeAbbrev for localized, readable timestamps. Use when rendering dates/times in the UI or when the user mentions time formatting or local timezone display.
---

# Local Time Formatting

## Instructions

- For client-side UI that displays a time to users, use `formatDateTimeAbbrev` from `@podverse/helpers`.
- Pass the active locale (typically from `useLocale()` / `next-intl`) to keep i18n consistent.
- This ensures readable timestamps rendered in the user’s local timezone.

## Example

```ts
import { formatDateTimeAbbrev } from '@podverse/helpers';
import { useLocale } from 'next-intl';

const locale = useLocale();
const label = formatDateTimeAbbrev(lastParsedAt, locale);
```
