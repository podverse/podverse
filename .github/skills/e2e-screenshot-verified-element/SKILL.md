---
name: e2e-screenshot-verified-element
description: When an E2E test verifies a specific element, pass it to the capture helper so the step screenshot is taken with that element vertically centered.
version: 1.0.0
---

# E2E Screenshot: Center Verified Element

Use this skill when adding or editing E2E specs where the test verifies a specific element and then takes a step screenshot.

## Rule

When the goal of the step is to document verification of a **specific element**, pass that element as the optional `scrollToElement` argument to capture helpers so the screenshot is taken with that element **vertically centered** in the viewport.

## When not to pass

Generic "page loaded" or "navigation completed" captures with no single asserted element do not need `scrollToElement`.
