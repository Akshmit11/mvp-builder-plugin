---
description: Get help and overview of the MVP Builder plugin
---

# MVP Builder Help

Explain the following to the user:

## What is MVP Builder?

MVP Builder automates your entire development workflow using the **Ralph Wiggum pattern** - a technique for autonomous AI agent loops.

Based on [snarktank/ralph](https://github.com/snarktank/ralph) and [Geoffrey Huntley's original article](https://ghuntley.com/ralph/).

## Core Concept

**One story per iteration. Memory lives in files.**

Each iteration:
1. Read prd.json, pick highest priority story where `passes: false`
2. Implement that ONE story  
3. Run quality checks
4. Commit if passing
5. Update prd.json to `passes: true`
6. Append learnings to progress.txt
7. Loop until all stories pass

## Key Files

| File | Purpose |
|------|---------|
| `prd.json` | User stories with acceptance criteria and `passes` status |
| `progress.txt` | Append-only learnings between iterations |
| `project_overview.md` | Your MVP specification |
| `mvp-builder.local.md` | Plugin state (add to .gitignore) |

## Commands

| Command | Description |
|---------|-------------|
| `/mvp-start` | Start the build loop |
| `/mvp-status` | Check current progress |
| `/mvp-cancel` | Stop the loop |
| `/mvp-skip` | Skip current story |
| `/mvp-help` | Show this help |

## Options

```bash
/mvp-start [OPTIONS]

--instructions-path <path>  Where prd.json lives (default: instructions)
--reference-docs <paths>    Docs to include as context
--max-iterations <n>        Safety limit (default: 100)
```

## prd.json Structure

```json
{
  "project": "MyApp",
  "branchName": "ralph/feature",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a user, I want...",
      "acceptanceCriteria": ["Criteria 1", "Criteria 2"],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

**Key rules:**
- Stories should be SMALL (one context window)
- Priority 1 = highest = done first
- All start `passes: false`
- MVP Builder sets `passes: true` when done

## Why One Story Per Iteration?

Context windows are limited. By keeping tasks small:
- Each iteration has fresh context
- No context overflow mid-task
- Progress persists in files, not memory
- Can resume after any interruption

## Completion Signals

| Signal | Meaning |
|--------|---------|
| `<promise>PRD_CREATED</promise>` | Created prd.json |
| `<promise>STORY_COMPLETE</promise>` | Finished one story |
| `<promise>COMPLETE</promise>` | ALL stories done! |

## Example Workflow

```bash
# 1. Create project overview
echo "My MVP specs..." > instructions/project_overview.md

# 2. Start MVP Builder
/mvp-start --reference-docs docs/stripe.md

# 3. First iteration creates prd.json
# 4. Subsequent iterations implement stories
# 5. Commits after each story
# 6. Completes when all pass
```

## Troubleshooting

**Stuck on a story:** `/mvp-skip`

**Reset everything:**
```bash
rm mvp-builder.local.md
rm instructions/prd.json
rm instructions/progress.txt
```

**Check progress:**
```bash
cat instructions/prd.json | jq '.userStories[] | {id, title, passes}'
```
