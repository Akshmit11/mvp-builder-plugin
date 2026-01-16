---
description: Start the MVP Builder workflow to automate your entire development process
---

# MVP Start Command

You are initializing the MVP Builder workflow based on the actual Ralph Wiggum pattern.

## Setup Instructions

Execute the following steps to initialize MVP Builder:

1. Parse the arguments from: `$ARGUMENTS`

   Arguments format: `[--max-iterations N] [--instructions-path PATH] [--reference-docs PATH1,PATH2,...]`

   - `--max-iterations`: Safety limit (default: 100)
   - `--instructions-path`: Folder containing files (default: instructions)
   - `--reference-docs`: Comma-separated paths to documentation files

2. Check if `<instructions-path>/prd.json` exists:
   - If YES: MVP Builder will pick up the next pending story
   - If NO: First iteration will create prd.json from project_overview.md

3. Initialize `<instructions-path>/progress.txt` if it doesn't exist:
   ```
   # MVP Builder Progress Log
   Started: <CURRENT_DATE>
   ---
   ```

4. Create the state file at `mvp-builder.local.md`:

```markdown
---
active: true
iteration: 1
max_iterations: <MAX_ITERATIONS>
instructions_path: "<INSTRUCTIONS_PATH>"
reference_docs: ["<PATH1>", "<PATH2>"]
started_at: "<CURRENT_ISO_TIMESTAMP>"
---

MVP Builder is running. Check prd.json for story status and progress.txt for learnings.

To stop: /mvp-cancel
To check status: /mvp-status
```

5. Output the activation message:

```
🚀 MVP Builder Activated!

Instructions Path: <INSTRUCTIONS_PATH>
Max Iterations: <N>
Reference Docs: <COUNT> files

== HOW IT WORKS (Ralph Pattern) ==

1. Each iteration = ONE user story
2. Story status tracked in prd.json (passes: true/false)
3. Learnings saved to progress.txt (append-only)
4. Fresh context each iteration - memory lives in files
5. Commits after each completed story

== FILES ==

prd.json      → User stories with acceptance criteria
progress.txt  → Append-only learnings between iterations
project_overview.md → Your MVP specification

== COMPLETION ==

When all stories have passes: true, outputs:
<promise>COMPLETE</promise>

To stop: /mvp-cancel
To check: /mvp-status
```

6. Begin working:
   - If prd.json exists: Pick highest priority story where passes: false
   - If no prd.json: Create it from project_overview.md

**DO NOT ASK FOR CONFIRMATION. BEGIN IMMEDIATELY.**

## Example Usage

```bash
# Basic usage
/mvp-start

# With reference docs
/mvp-start --reference-docs instructions/stripe.md,instructions/convex.md

# Full options
/mvp-start --instructions-path instructions --reference-docs docs/api.md --max-iterations 50
```
