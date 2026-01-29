# Mega-Prompt for Unattended Helpers-Split Execution

Copy and paste this entire prompt to execute the helpers-split plan unattended.

---

Execute the complete helpers-split refactoring plan located at .llm/plans/completed/helpers-split/00-overview.md. This is a critical refactoring that must complete fully without interruption.

## EXECUTION REQUIREMENTS

### Autonomy Rules (CRITICAL):

- Do NOT ask for confirmation at any stage
- Do NOT stop for user input unless there's a blocking compilation error
- Fix all linting, formatting, and minor build errors automatically
- Use best judgment on ambiguous decisions - document choices in .llm/history/
- If you encounter a context window limit, IMMEDIATELY resume from where you stopped
- Work continuously until ALL 4 phases are 100% complete

### Execution Order (STRICT):

**PHASE 1: Create New Packages (Execute in Parallel if Possible)**

1. 01a-create-helpers-validation.md
2. 01b-create-helpers-requests.md
3. 01c-create-helpers-backend.md
4. 01d-create-helpers-browser.md
5. 01e-create-helpers-config.md

Wait for ALL Phase 1 to complete before starting Phase 2.

**PHASE 2: Update Core Helpers (Sequential)** 6. 02-update-helpers-core.md

Wait for Phase 2 to complete before starting Phase 3.

**PHASE 3: Update All Imports (Execute in Parallel if Possible)** 7. 03a-update-web-app.md 8. 03b-update-api-app.md 9. 03c-update-workers-app.md 10. 03d-update-management-api.md 11. 03e-update-orm-package.md 12. 03f-update-parser-package.md 13. 03g-update-mq-package.md 14. 03h-update-notifications-package.md 15. 03i-update-documentation.md 16. 03j-update-management-web.md

Wait for ALL Phase 3 to complete before starting Phase 4.

**PHASE 4: Verification (Sequential)** 17. 04-verification.md

### Progress Tracking Requirements:

1. Create TODO items for each phase at start
2. Mark each plan file as completed when finished
3. Update .llm/history/active/helpers-split/helpers-split.md with:
   - Timestamp for each phase start/completion
   - Any decisions made
   - Files modified in each phase
4. Run `npm run lint:fix` after completing each phase
5. Commit after each phase completes with descriptive messages

### Error Handling Protocol:

- **Build errors**: Fix immediately, don't ask
- **Import errors**: Resolve by checking actual file locations
- **TypeScript errors**: Fix type issues, add proper types
- **Linting errors**: Auto-fix with npm run lint:fix
- **Test failures**: Fix if obvious, document if complex
- **Ambiguous code**: Use best judgment, document in history

### Success Criteria:

Phase completion checklist:

- [ ] All 5 packages created (Phase 1)
- [ ] Core helpers updated (Phase 2)
- [ ] All 10 import updates complete (Phase 3)
- [ ] All builds pass: `npm run build:packages && npm run build:apps`
- [ ] All linting passes: `npm run lint`
- [ ] Type checking passes: `npm run type-check`
- [ ] Verification complete (Phase 4)

### Final Deliverable:

When complete, provide summary showing:

1. All phases completed ✓
2. Total files modified
3. Build/lint/type-check status
4. Bundle size comparison (before/after)
5. Any deviations from plan with justification

## START EXECUTION NOW

Begin with Phase 1. Create all 5 packages following their respective plan files. Do not stop until all phases are complete.
