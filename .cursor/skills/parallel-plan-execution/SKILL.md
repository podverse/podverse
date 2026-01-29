---
name: parallel-plan-execution
description: Create decomposed, parallelizable execution plans with copy-pasta prompts for multi-agent workflows. Use when planning large migrations, refactoring tasks, or any work that can benefit from parallel execution across multiple agents.
---

# Parallel Plan Execution Strategy

This skill guides you through creating execution plans that can be efficiently parallelized across multiple Cursor agents, maximizing throughput while minimizing user effort.

## When to Use This Skill

Use this approach when:

- Working on tasks affecting 10+ files
- Multiple independent changes can be made simultaneously
- User wants to leverage parallel agent execution
- Task can be broken into logical, independent units of work

## Core Principles

> **🚀 AGENT BEHAVIOR**: When a copy-pasta prompt is pasted, execute it immediately. The act of pasting IS the instruction to execute. See "Executing Copy-Pasta Prompts" section below for details.

### 1. Dependency Analysis

Before creating plans, identify:

- **Sequential dependencies**: Task B requires Task A completion (phases must run in order)
- **Parallel opportunities**: Tasks can execute simultaneously (agents within a phase)
- **Shared resources**: Files modified by multiple tasks (requires coordination)

**Critical distinction**:

- **Phases**: Run sequentially (Phase 1 completes → Phase 2 starts → Phase 3 starts)
- **Agents within a phase**: Run in parallel (all Phase 2 agents execute simultaneously)

### 2. Plan Hierarchy

Create a clear hierarchy:

```
migration-00-EXECUTION-ORDER.md    # Master orchestration guide
migration-00-SUMMARY.md            # Complete scope and file inventory
migration-01-feature-area-1.md    # Focused execution plan
migration-02-feature-area-2.md    # Focused execution plan
...
migration-COPY-PASTA.md           # Ready-to-paste agent prompts
```

### 3. DRY Principle for Plans

**Detailed plans**: Keep full instructions, file lists, code examples in numbered plan files
**Copy-pasta file**: Should REFERENCE plan files, not duplicate their content

Example copy-pasta prompt:

```
Read and execute .llm/plans/active/feature/migration-08-podcast-pages.md

Follow all instructions to update 5 podcast-related files.

Core rule: [One-line reminder of key principle]
```

## Step-by-Step Workflow

### Step 1: Analyze Scope

1. **Count affected files** - Get precise numbers
2. **Identify file groups** - Group by feature area, directory, or logical domain
3. **Map dependencies** - Which groups depend on others?
4. **Estimate complexity** - Files per group, change types

### Step 2: Create Master Summary

File: `migration-00-SUMMARY.md`

Include:

- Total file count
- Breakdown by category
- Files that need changes vs already correct
- High-level strategy overview

### Step 3: Create Execution Order

File: `migration-00-EXECUTION-ORDER.md`

Define phases:

```markdown
## Phase 1: Critical Path (Sequential)

- Files that MUST be done first
- Blockers for other work

## Phase 2: Feature Groups (Parallel)

- Group A: Files 1-5 (can run in parallel with B, C, D)
- Group B: Files 6-10 (can run in parallel with A, C, D)
- Group C: Files 11-15 (can run in parallel with A, B, D)
- Group D: Files 16-20 (can run in parallel with A, B, C)

## Phase 3: Cleanup/Utils (Parallel)

- Utility files
- Documentation updates
```

### Step 4: Create Focused Execution Plans

One file per parallelizable group:

`migration-08-podcast-pages.md`:

````markdown
# Migration Part 8: Podcast Pages

## Scope

Update QueryParams imports in podcast-related pages.

## Files to Update (5)

### 1. apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts

**Current**:

```typescript
[exact current code]
```
````

**Fixed**:

```typescript
[exact new code]
```

### 2. apps/web/src/app/podcast/[channel_id]/PodcastClient.tsx

[... detailed instructions ...]

## Verification

```bash
[verification commands]
```

````

### Step 5: Create Copy-Pasta File

File: `migration-COPY-PASTA.md`

**CRITICAL**: Make execution rules clear at the top:
- Phases are SEQUENTIAL (must wait for each to complete)
- Agents WITHIN phases run in PARALLEL

Structure:
```markdown
# [Feature] - Copy-Pasta Prompts for Parallel Execution

## ⚠️ CRITICAL: Execution Rules

**SEQUENTIAL PHASES** - Each phase must COMPLETE before the next:
- Phase 1 → WAIT → Phase 2 → WAIT → Phase 3 → WAIT → Verify

**DO NOT** run phases simultaneously
**DO** run agents within each phase simultaneously

## How to Use
1. Phase 1: Copy prompt → paste → execute (1 agent) → **WAIT FOR COMPLETION**
2. Phase 2: Copy 4 prompts → paste into 4 agents → execute all → **WAIT FOR ALL TO COMPLETE**
3. Phase 3: Copy 2 prompts → paste into 2 agents → execute both → **WAIT FOR BOTH TO COMPLETE**

---

## PHASE 1: CRITICAL (Sequential)

### Agent 1: Critical Fix
````

Read and execute .llm/plans/active/feature/migration-06-critical.md

[2-3 line summary of what this fixes]

Verify: [quick verification command]

```

---

## PHASE 2: PARALLEL EXECUTION (4 Agents)

### Agent 2A: Group A
```

Read and execute .llm/plans/active/feature/migration-08-group-a.md

[1 line core rule reminder]

```

### Agent 2B: Group B
```

Read and execute .llm/plans/active/feature/migration-09-group-b.md

[1 line core rule reminder]

```
[... etc for all parallel groups ...]
```

## Naming Conventions

### Plan Files

- `00-` prefix: Meta files (summary, execution order)
- `01-99`: Execution plans (numbered by phase/group)
- Descriptive names: `migration-08-podcast-pages.md` not `migration-8.md`

### Copy-Pasta Prompts

- Clear phase markers: "PHASE 1", "PHASE 2", etc.
- Agent labels: "Agent 2A", "Agent 2B" for easy reference
- Parallel indicators: "(Execute in Parallel - 4 Agents)"

## Efficiency Metrics

Track and communicate:

- **Total files**: Overall scope
- **Parallel groups**: How many can run simultaneously
- **Time savings**: Sequential time vs parallel time
- **Max parallelization**: "4 agents simultaneously in Phase 2!"

Example:

```
Sequential: 45-60 minutes
Parallel (4 agents): 12-18 minutes
Savings: ~70% time reduction
```

## Common Patterns

### Pattern 1: Import Migration

**Scenario**: Moving imports from package A to package B across many files

**Strategy**:

- Group by feature area (podcast pages, music pages, utils)
- Each group processes independently
- Shared rule: Types X,Y stay in A; types Z move to B

### Pattern 2: Codebase-Wide Refactor

**Scenario**: Renaming/moving functions across 100+ files

**Strategy**:

- Phase 1: Update function definition
- Phase 2: Update imports in parallel by directory
- Phase 3: Update function calls in parallel by directory

### Pattern 3: Feature Implementation

**Scenario**: Adding new feature across multiple layers

**Strategy**:

- Phase 1: Backend API (sequential - foundation)
- Phase 2: Multiple frontend components (parallel)
- Phase 3: Tests and documentation (parallel)

## Anti-Patterns to Avoid

❌ **Don't**: Copy all details into copy-pasta prompts
✅ **Do**: Reference detailed plan files from copy-pasta prompts

❌ **Don't**: Create artificial parallelization (files that could conflict)
✅ **Do**: Only parallelize truly independent work

❌ **Don't**: Make phases too granular (1 file per plan)
✅ **Do**: Group related files (3-7 files per plan is ideal)

❌ **Don't**: Skip verification steps
✅ **Do**: Include verification in each plan and copy-pasta prompt

## Template: Quick Start

Use this template for new parallel planning tasks:

```markdown
# [Task Name] - Execution Plans

Created: [Date]
Total Files: [N]
Parallel Groups: [M]

## Phase 1: [Critical/Foundation]

- [Essential task that blocks others]

## Phase 2: [Main Work] (Parallel)

- Group A: [3-7 files]
- Group B: [3-7 files]
- Group C: [3-7 files]

## Phase 3: [Cleanup] (Parallel)

- Group X: [Final touches]
- Group Y: [Documentation]

---

migration-00-SUMMARY.md: Complete inventory
migration-00-EXECUTION-ORDER.md: Master guide
migration-01-_.md through migration-NN-_.md: Execution plans
migration-COPY-PASTA.md: Ready-to-paste prompts
```

## Verification Checklist

Before finalizing plans:

- [ ] All files accounted for in summary
- [ ] Dependencies clearly identified
- [ ] Parallel groups don't have conflicts
- [ ] Each plan has verification steps
- [ ] Copy-pasta references plans (doesn't duplicate)
- [ ] Execution order is clear
- [ ] Time estimates provided

## Example Output Structure

```
.llm/plans/active/feature-name/
├── migration-00-EXECUTION-ORDER.md     # Master guide
├── migration-00-SUMMARY.md             # Complete scope
├── migration-01-verify-correct.md      # Files already correct
├── migration-06-critical-fix.md        # Phase 1
├── migration-08-group-a.md            # Phase 2 (parallel)
├── migration-09-group-b.md            # Phase 2 (parallel)
├── migration-10-group-c.md            # Phase 2 (parallel)
├── migration-11-group-d.md            # Phase 2 (parallel)
├── migration-12-cleanup.md            # Phase 3 (parallel)
├── migration-13-utils.md              # Phase 3 (parallel)
└── migration-COPY-PASTA.md            # Prompts referencing above
```

## Success Indicators

You've done this well when:

- **Execution rules are at the top** - User immediately understands phase sequencing
- **Phase dependencies are crystal clear** - "WAIT FOR COMPLETION" explicit between phases
- User can copy-paste 4-6 prompts and execute in parallel **within each phase**
- Each prompt is 3-5 lines (references detailed plan)
- Detailed plans are comprehensive (50-100+ lines each)
- No redundant information across files
- Clear phase dependencies (sequential) vs agent parallelization (within phase)
- Measurable time savings from parallelization
- All verification steps included

**User should never wonder**: "Can I start Phase 2 while Phase 1 is running?" Answer must be obvious: NO.

## Executing Copy-Pasta Prompts

**CRITICAL BEHAVIOR**: When a copy-pasta prompt from `migration-COPY-PASTA.md` is pasted into an agent:

### Immediate Execution Rule

- **Execute immediately** - Do NOT ask for confirmation or additional instructions
- **Prompt is self-contained** - All necessary context is included in the prompt
- **No explanation needed** - User pasting = user requesting execution

### Recognition Pattern

If the pasted message:

1. References a plan file (e.g., "Read and execute .llm/plans/active/...")
2. Comes from the copy-pasta file structure
3. Contains no additional user instructions beyond the prompt itself

**Then**: Execute the prompt immediately without requesting clarification.

### Example Scenarios

**User pastes**:

```
Read and execute .llm/plans/active/helpers-split/migration-08-podcast-pages.md

Follow all instructions to update 5 podcast-related files.

Core rule: Move QueryParams to @podverse/helpers-browser
```

**Agent should**: Immediately read the plan file and begin execution.

**Agent should NOT**: Ask "Would you like me to execute this?" or wait for additional confirmation.

### Why This Matters

- Copy-pasta prompts are designed for efficient parallel execution
- User has already made the decision to execute by pasting the prompt
- Asking for confirmation adds unnecessary friction and delay
- The prompt structure itself IS the user's instruction

## Related Skills

- `create-plan`: For creating individual plan files
- `llm-history`: For tracking execution and decisions
- `Task` tool with `subagent_type: "explore"`: For initial scope analysis
