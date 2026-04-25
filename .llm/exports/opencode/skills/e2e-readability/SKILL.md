---
name: e2e-readability
description: E2E specs use verbose complete sentences and explicit post-navigation verification.
version: 1.0.0
---


# E2E Readability

Use this skill when adding or editing E2E specs.

## Describe blocks

**Suite-level describe** (top-level): use a **concise, title-like** descriptor.
**Nested describe blocks and test titles**: keep **verbose sentence-style**.

- Good suite: "Home page for the unauthenticated user"
- Avoid suite: "This suite verifies the home page for the unauthenticated user."

## Test titles

Use **complete, verbose sentences**. Prefer "When ..., they ..." for readability.

- Good: "When an unauthenticated user tries to open the settings page, they are redirected to the login page."
- Avoid: "unauthenticated user is redirected to login"

## Post-navigation verification (required)

Every navigation must be followed by explicit verification that the destination loaded:

- URL assertion (`toHaveURL(...)`)
- At least one destination-specific element visibility (`toBeVisible()`)

## Screenshot shows verified element

When a step verifies a specific element, pass it to the capture helper. See **e2e-screenshot-verified-element**.
