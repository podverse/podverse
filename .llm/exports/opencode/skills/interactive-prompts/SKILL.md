---
name: interactive-prompts
description: Do not complete steps that require interactive prompts (inquirer, CLI input). Tell the user their input is needed and provide exact instructions. Use when verification or workflows involve prompts, wizards, or interactive CLI tools.
---


# Interactive Prompts

When a workflow or verification step **requires the user to enter input at a prompt** (e.g. inquirer, readline, “Enter…”, “Select…”), the agent must **not** try to complete that step automatically (e.g. by piping input, simulating keystrokes, or assuming default choices).

## Rule

1. **Do not** run or “complete” steps that depend on interactive prompts.
2. **Do** stop before those steps and tell the user that **their input is needed** to finish.
3. **Do** give **clear, copy-pasteable instructions**: exact commands, what to choose at each prompt, and what to enter (e.g. report name, options).

## Example: Bundle Analyzer

The bundle analyzer (`tools/web-perf/bundle-analyzer`) prompts for:

- “Select a previous report to compare against (or Skip comparison)”
- “Enter a description for report N”

**Agent behavior:** Do not run the analyzer in the background expecting to satisfy prompts. Instead, after implementing changes, say that the user needs to run the analyzer and complete the prompts, and provide:

- The command to run (e.g. `cd tools/web-perf/bundle-analyzer && npm run analyze:web`).
- What to choose at each prompt (e.g. “Skip comparison” or which report to compare).
- What to enter for the report name (e.g. `post-measurement-fix`).
- What to check afterward (e.g. open the generated JSON and confirm `clientBundleSize` / `serverBundleSize` match total asset size).

## Summary

- **Don’t:** Pipe input, fake prompts, or mark interactive steps as “done” without user action.
- **Do:** State that the user must complete the prompt steps and give them the exact instructions to do it.
