# web-ui-theme-emoji

**Started:** 2026-05-07
**Author:** Agent
**Context:** Remove emojis from web Settings theme dropdown labels (i18n).

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

remove the emojis from the theme selectors

#### Key Decisions

- Theme option copy comes from **`settings.ui_theme.*`** in [`apps/web/i18n/originals/`](apps/web/i18n/originals/); removed leading emoji + space from **`light`**, **`dark`**, **`dracula`**, **`violet`** in **en-US**, **es**, **fr**, **el-GR**.

#### Files Created/Modified

- `apps/web/i18n/originals/en-US.json`
- `apps/web/i18n/originals/es.json`
- `apps/web/i18n/originals/fr.json`
- `apps/web/i18n/originals/el-GR.json`
