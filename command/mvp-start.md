---
description: Start the MVP Builder workflow to automate your entire development process
---

# MVP Start Command

You are initializing the MVP Builder workflow. This will automate the complete development process from project overview to deployed MVP, following the step-by-step guide exactly.

## Setup Instructions

Execute the following steps to initialize the MVP Builder:

1. Parse the arguments from: `$ARGUMENTS`

   Arguments format: `[--max-iterations N] [--instructions-path PATH] [--reference-docs PATH1,PATH2,...]`

   - `--max-iterations`: Safety limit (default: 100)
   - `--instructions-path`: Folder containing project_overview.md where all files will be stored (default: instructions)
   - `--reference-docs`: Comma-separated paths to documentation files for context

2. Verify the project overview file exists at `<instructions-path>/project_overview.md`

3. Create the state file at `mvp-builder.local.md` (in the project root) with this exact format:

```markdown
---
active: true
phase: "generating_plan"
current_prompt_index: 0
total_prompts: 0
started_at: "<CURRENT_ISO_TIMESTAMP>"
last_commit: null
instructions_path: "<INSTRUCTIONS_PATH>"
reference_docs: ["<PATH1>", "<PATH2>", ...]
max_iterations: <MAX_ITERATIONS>
current_iteration: 1
---

## Prompt Sequence
No prompts generated yet.

## Phase Progress
- [/] Phase 1A: Generate Sequence Plan
- [ ] Phase 1B: Generate Execution Prompts
- [ ] Phase 2: Execute Prompts
- [ ] Phase 3A: QA Integration Check
- [ ] Phase 3B: Feature Completeness
- [ ] Phase 4: Documentation
- [ ] ✅ COMPLETE
```

4. Output the activation message:

```
🚀 MVP Builder Activated!

Instructions Path: <INSTRUCTIONS_PATH>
Project Overview: <INSTRUCTIONS_PATH>/project_overview.md
Max Iterations: <N>
Reference Docs: <COUNT> files
  - <DOC1>
  - <DOC2>

== WORKFLOW (following step-by-step-guide.md) ==

STEP 1: Generate Prompt Sequence Plan (Meta-Prompt 1A)
       → Creates: <instructions-path>/prompt_sequence_plan.md

STEP 2: Generate All Execution Prompts (Meta-Prompt 1B)
       → Creates: <instructions-path>/prompt_01.md through prompt_XX.md

STEP 3: Execute Each Prompt Sequentially (Meta-Prompt 2)
       → For each: Execute → Test → Git Commit → Next

STEP 4A: Quality Assurance - Integration Check (Meta-Prompt 3A)
       → Creates: <instructions-path>/integration_issues.md

STEP 4B: Quality Assurance - Feature Completeness (Meta-Prompt 3B)
       → Creates: <instructions-path>/mvp_readiness_report.md

STEP 5: Generate Documentation (Meta-Prompt 4)
       → Creates: README.md, DEPLOYMENT.md, API_DOCUMENTATION.md, etc.

STEP 6: COMPLETE! 🎉

== STARTER KIT ==
Next.js 16 + Convex + Clerk (with Google sign-in) already configured.
Skipping initial auth setup - focusing on MVP features.

To stop at any time: /mvp-cancel
To check status: /mvp-status
To skip current prompt: /mvp-skip
```

5. Now begin working on STEP 1: Read the project overview and generate the prompt sequence plan.

## Example Usage

```bash
# Basic usage (uses instructions/ folder)
/mvp-start

# Custom instructions path
/mvp-start --instructions-path project-docs

# With reference docs for integrations
/mvp-start --reference-docs docs/stripe.md,docs/convex-guide.md

# Full example
/mvp-start --instructions-path instructions --reference-docs knowledge/dodo-payments.md,knowledge/clerk.md --max-iterations 50
```

## Files Created by MVP Builder

All generated files are stored in the instructions folder:

```
<instructions-path>/
├── project_overview.md          # YOUR input (must exist)
├── prompt_sequence_plan.md      # Generated in Step 1
├── prompt_01.md                 # Generated in Step 2
├── prompt_02.md
├── prompt_03.md
├── ... (all execution prompts)
├── integration_issues.md        # Generated in Step 4A
└── mvp_readiness_report.md      # Generated in Step 4B
```

## Context Window Note

When the OpenCode context window fills up:
- Each iteration uses the SAME prompt (doesn't grow)
- Progress is tracked via FILES and GIT HISTORY
- The AI reads its previous work from the filesystem
- This is the core of the Ralph Wiggum technique
