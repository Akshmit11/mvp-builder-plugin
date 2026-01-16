# MVP Builder Plugin for OpenCode

Automate your entire MVP development workflow using the **actual Ralph Wiggum pattern**.

Based on [snarktank/ralph](https://github.com/snarktank/ralph) - the original Ralph implementation.

## How It Works

**One story per iteration.** Memory lives in files, not context.

```
prd.json       → User stories with passes: true/false
progress.txt   → Append-only learnings between iterations
project_overview.md → Your MVP specification
```

Each iteration:
1. Read prd.json, pick highest priority story where `passes: false`
2. Implement that ONE story
3. Run quality checks (typecheck, lint, test)
4. Commit if passing
5. Update prd.json to `passes: true`
6. Append learnings to progress.txt
7. Repeat until all stories pass → `<promise>COMPLETE</promise>`

## Installation

### Project-Level (Recommended)

```bash
cp -r plugin command /path/to/your/project/.opencode/
```

### Global

**Windows:**
```powershell
Copy-Item .\plugin\* "$env:USERPROFILE\.config\opencode\plugin\"
Copy-Item .\command\* "$env:USERPROFILE\.config\opencode\command\"
```

**Linux/macOS:**
```bash
cp plugin/* ~/.config/opencode/plugin/
cp command/* ~/.config/opencode/command/
```

## Quick Start

1. Create `instructions/project_overview.md` with your MVP spec

2. Start OpenCode and run:
   ```bash
   /mvp-start
   ```

3. MVP Builder will:
   - Create `prd.json` from your overview (first iteration)
   - Work through each story automatically
   - Commit after each completed story
   - Stop when all stories pass

## Commands

| Command | Description |
|---------|-------------|
| `/mvp-start` | Start the automated build |
| `/mvp-status` | Check current progress |
| `/mvp-cancel` | Stop the workflow |
| `/mvp-skip` | Skip current story |
| `/mvp-help` | Show help |

## Options

```bash
/mvp-start [OPTIONS]

--instructions-path <path>  Folder for files (default: instructions)
--reference-docs <paths>    Comma-separated docs for context
--max-iterations <n>        Safety limit (default: 100)
```

## prd.json Format

```json
{
  "project": "MyApp",
  "branchName": "ralph/feature-name",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Add database schema",
      "description": "As a developer, I need...",
      "acceptanceCriteria": [
        "Schema created",
        "Typecheck passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
```

**Key rules:**
- Each story should be small (completable in one iteration)
- Priority 1 = highest (done first)
- All start with `passes: false`
- MVP Builder marks `passes: true` when done

## progress.txt Format

Append-only learnings:

```
## 2026-01-16 - US-001: Add database schema
- Created users table with id, email, name
- Files: convex/schema.ts
- **Learnings:**
  - Use defineTable() not defineSchema()
  - Index on email for lookups
---
```

## Reference Docs

Include external docs as context:

```bash
/mvp-start --reference-docs docs/stripe.md,docs/convex.md
```

These are included in every iteration.

## Context Window

**Q: What happens when context fills up?**

- Each iteration is fresh context
- Memory lives in files: prd.json, progress.txt, git history
- The prompt is static - doesn't grow
- This is the core Ralph insight!

## Completion Signals

| Signal | Meaning |
|--------|---------|
| `<promise>PRD_CREATED</promise>` | prd.json created |
| `<promise>STORY_COMPLETE</promise>` | One story done |
| `<promise>COMPLETE</promise>` | ALL stories done |

## Troubleshooting

**Plugin doesn't start:**
```bash
ls ~/.config/opencode/plugin/mvp-builder.ts
```

**Stuck on a story:**
```bash
/mvp-skip
```

**Reset everything:**
```bash
rm mvp-builder.local.md
rm instructions/prd.json
rm instructions/progress.txt
/mvp-start
```

## Key Differences from v1

| v1 (our old plugin) | v2 (actual Ralph) |
|---------------------|-------------------|
| Complex phase machine | Simple story loop |
| Generated prompt_01..XX.md | Uses prd.json stories |
| Multi-hour prompts | Small, focused stories |
| Large context needed | Fresh context each iteration |

## Based On

- [snarktank/ralph](https://github.com/snarktank/ralph) - Original implementation
- [Geoffrey Huntley's Ralph](https://ghuntley.com/ralph/) - The technique
