---
description: Start the MVP Builder workflow to automate your entire development process
---

# MVP Start Command

You are initializing the MVP Builder workflow. This will automate the complete development process from project overview to deployed MVP.

## Setup Instructions

Execute the following steps to initialize the MVP Builder:

1. Parse the arguments from: `$ARGUMENTS`

   Arguments format: `[--max-iterations N] [--project-path PATH] [--reference-docs PATH1,PATH2,...]`

   - Extract `--max-iterations` value if provided (default: 100)
   - Extract `--project-path` value if provided (default: instructions/project_overview.md)
   - Extract `--reference-docs` value if provided (comma-separated paths, default: empty)

2. Verify the project overview file exists at the specified path

3. Create the state file at `mvp-builder.local.md` (in the project root) with this exact format:

```markdown
---
active: true
phase: "generating_plan"
current_prompt_index: 0
total_prompts: 0
completion_promise: "MVP_COMPLETE"
started_at: "<CURRENT_ISO_TIMESTAMP>"
last_commit: null
project_overview_path: "<PROJECT_PATH>"
reference_docs: ["<PATH1>", "<PATH2>", ...]
max_iterations: <MAX_ITERATIONS>
current_iteration: 1
---

## Prompt Sequence
No prompts generated yet.

## Phase Progress
- [/] Initialize
- [ ] Generate Sequence Plan
- [ ] Generate Execution Prompts
- [ ] Execute Prompts (0/0)
- [ ] QA: Integration Check
- [ ] QA: Feature Completeness
- [ ] Documentation
- [ ] Complete
```

4. Output the activation message:

```
🚀 MVP Builder Activated!

Project Overview: <PROJECT_PATH>
Max Iterations: <N>
Reference Docs: <COUNT> files loaded
  - <DOC1>
  - <DOC2>
  ...

== WORKFLOW PHASES ==
1. Generate Prompt Sequence Plan (Meta-Prompt 1A)
2. Generate Execution Prompts (Meta-Prompt 1B)
3. Execute Prompts Sequentially (Meta-Prompt 2)
4. QA: Integration Check (Meta-Prompt 3A)
5. QA: Feature Completeness (Meta-Prompt 3B)
6. Generate Documentation (Meta-Prompt 4)

The plugin will now begin Phase 1. Each phase will:
- Complete its work
- Commit changes to git
- Automatically progress to the next phase

To stop at any time: /mvp-cancel
To check status: /mvp-status
```

5. Now begin Phase 1: Read the project overview and generate the prompt sequence plan.

## Example Usage

```
/mvp-start
/mvp-start --max-iterations 50
/mvp-start --project-path instructions/my_project.md
/mvp-start --reference-docs docs/stripe.md,docs/convex.md,docs/clerk.md
/mvp-start --max-iterations 100 --reference-docs knowledge/payments.md,knowledge/auth.md
```
