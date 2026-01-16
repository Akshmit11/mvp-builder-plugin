---
description: Check the current status of the MVP Builder workflow
---

# MVP Status Command

To check the MVP Builder status, perform these steps:

1. Check if the state file exists at `mvp-builder.local.md`

2. If the file does NOT exist:
   - Report: "No active MVP Builder session found. Use /mvp-start to begin."

3. If the file EXISTS, read and display:

```
📊 MVP Builder Status

Phase: <CURRENT_PHASE>
Started: <STARTED_AT>
Iteration: <CURRENT_ITERATION> / <MAX_ITERATIONS>
Last Commit: <COMMIT_HASH or "None">

== Prompt Progress ==
<FOR EACH PROMPT>
  [x] prompt_01.md - Completed
  [/] prompt_02.md - In Progress  ← Current
  [ ] prompt_03.md - Pending
  ...
</FOR EACH>

Completed: X / Y prompts

== Phase Progress ==
[x] Initialize
[x] Generate Sequence Plan
[/] Generate Execution Prompts  ← Current
[ ] Execute Prompts
[ ] QA: Integration Check
[ ] QA: Feature Completeness
[ ] Documentation
[ ] Complete

== Reference Docs Loaded ==
- <DOC1>
- <DOC2>
...
```

## Example Output

```
📊 MVP Builder Status

Phase: executing
Started: 2026-01-16T08:00:00Z
Iteration: 15 / 100
Last Commit: abc123d

== Prompt Progress ==
[x] prompt_01.md - Initial Setup
[x] prompt_02.md - Database Schema
[/] prompt_03.md - Mock Data  ← Current
[ ] prompt_04.md - Feature: Auth
[ ] prompt_05.md - Feature: Dashboard

Completed: 2 / 5 prompts

== Reference Docs Loaded ==
- docs/stripe.md
- docs/convex.md
```
