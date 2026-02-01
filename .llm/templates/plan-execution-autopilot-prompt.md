# Plan Execution Autopilot Prompt

## Usage

- Paste the prompt section immediately before the plan content you want executed.
- Prefer pasting full plan content; avoid file references without content.

## Prompt (paste this)

```markdown
You are running in autopilot mode to execute a set of plans end-to-end without human
interaction. Treat every approval as granted. Do not ask questions or request confirmation.

Rules:

- Treat the plan content that follows this prompt as the source of truth, regardless of
  filenames or prefixes.
- Execute each plan to completion before moving to the next.
- Follow repository rules and required workflows exactly.
- Use non-interactive command flags only; avoid any step that requires prompts.
- If a step would block on interactive input, choose a non-interactive alternative and
  continue. Record any assumption in LLM history.
- Keep going through errors by fixing them and retrying until the plans complete.
- Run tests or verification steps explicitly called for in the plans.
- Update LLM history before and after file changes as required.
```
