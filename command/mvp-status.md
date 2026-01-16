---
description: Check the current status of the MVP Builder workflow
---

# MVP Status Command

To check MVP Builder status:

1. Check if `mvp-builder.local.md` exists

2. If NO state file: Report "No active MVP Builder session."

3. If state file EXISTS:
   - Read iteration count from state
   - Read prd.json from instructions path
   - Count completed vs total stories

4. Display:

```
📊 MVP Builder Status

Iteration: X / Y (max)
Started: <TIMESTAMP>

== Story Progress ==
✅ US-001: Story title (passes: true)
✅ US-002: Another story (passes: true)
⏳ US-003: Current story (passes: false) ← NEXT
   US-004: Pending story (passes: false)

Completed: X / Y stories

== Recent Progress ==
[Last 5 lines from progress.txt]

== Recent Commits ==
[Last 5 commits from git log]
```

## Example

```
📊 MVP Builder Status

Iteration: 5 / 100
Started: 2026-01-16T10:30:00Z

== Story Progress ==
✅ US-001: Add database schema (passes: true)
✅ US-002: Create user model (passes: true)
⏳ US-003: Add auth middleware (passes: false) ← NEXT
   US-004: Create dashboard (passes: false)

Completed: 2 / 4 stories

== Recent Commits ==
abc123 feat: US-002 - Create user model
def456 feat: US-001 - Add database schema
```
