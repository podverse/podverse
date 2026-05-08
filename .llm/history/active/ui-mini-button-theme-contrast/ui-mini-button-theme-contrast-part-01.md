# ui-mini-button-theme-contrast

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Management stats ButtonTabs readability across themes.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

the tabs are not readable. either there is a problem with the components or there is a problem with the theme because all user facing text should be clearly readable against its background no matter what theme they are using and if you need to remember this in a skill you can add or update one

(Image: Stats page dark theme — inactive pill tabs white/low contrast.)

#### Key Decisions

- Inactive tabs use `Button` variant **`mini`**, which did not set **`background-color`**, so the UA default button surface (often light) appeared under theme-driven **light** text in dark mode → unreadable pills.
- Set **`background-color: var(--background-color-secondary)`** on `.mini` plus **`hover`** to **`--background-color-tertiary`**; documented in **`styles-source-of-truth`** that outline/tab buttons must not rely on native `<button>` backgrounds.

#### Files Created/Modified

- `packages/ui/src/components/button/Button/Button.module.scss`
- `.cursor/skills/styles-source-of-truth/SKILL.md`
- `.llm/history/active/ui-mini-button-theme-contrast/ui-mini-button-theme-contrast-part-01.md`
