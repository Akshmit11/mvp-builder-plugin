---
description: Get help and overview of the MVP Builder plugin
---

# MVP Builder Help

Please explain the following to the user:

## What is MVP Builder?

MVP Builder is an OpenCode plugin that automates the complete MVP development workflow. Based on the Ralph Wiggum technique and the MVP Prompt Framework, it eliminates manual prompting by:

1. Reading your `project_overview.md`
2. Generating a prompt sequence plan
3. Creating individual execution prompts
4. Executing each prompt sequentially
5. Running QA checks
6. Generating documentation

All automatically, with git commits after each step.

## Available Commands

### /mvp-start [OPTIONS]

Start the automated MVP build workflow.

**Options:**
- `--max-iterations <n>` - Safety limit for loop iterations (default: 100)
- `--project-path <path>` - Path to project overview (default: instructions/project_overview.md)
- `--reference-docs <paths>` - Comma-separated documentation files to include as context

**Example:**
```
/mvp-start --reference-docs docs/stripe.md,docs/convex.md --max-iterations 50
```

---

### /mvp-status

Check the current workflow status, including:
- Current phase and iteration
- Prompt completion progress
- Reference docs loaded
- Last git commit

---

### /mvp-cancel

Stop the current workflow. Your code and git history are preserved.

---

## Workflow Phases

```
START
  ↓
┌─────────────────────────────────────┐
│ Phase 1A: Generate Sequence Plan    │
│ Input: project_overview.md          │
│ Output: prompt_sequence_plan.md     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Phase 1B: Generate Prompts          │
│ Output: prompt_01.md ... XX.md      │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Phase 2: Execute Sequentially       │
│ Loop: prompt_01 → 02 → ... → XX     │
│ + Git commit after each             │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Phase 3A: Integration Check         │
│ Output: integration_issues.md       │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Phase 3B: Feature Completeness      │
│ Output: mvp_readiness_report.md     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│ Phase 4: Documentation              │
│ Output: README, DEPLOYMENT, etc.    │
└─────────────────────────────────────┘
  ↓
COMPLETE 🎉
```

## Reference Docs Feature

Include external documentation as context for every prompt:

```
/mvp-start --reference-docs docs/stripe.md,docs/dodo-payments.md,knowledge/auth.md
```

These files will be read and included in EVERY prompt execution, giving the AI full context about:
- Payment integration patterns
- API documentation
- Framework-specific guides
- Your project's specific knowledge

## Prerequisites

Before running MVP Builder:

1. ✅ `/instructions/project_overview.md` exists with your MVP details
2. ✅ Clean git state (commit or stash pending changes)
3. ✅ Time - full build takes 20-40+ hours of autonomous work
4. ✅ Any reference docs you want included

## Best Practices

1. **Write a detailed project overview** - The more specific, the better the prompts
2. **Include reference docs** - For integrations like Stripe, Dodo, Clerk
3. **Set reasonable max iterations** - Start with 50-100
4. **Monitor occasionally** - Check `/mvp-status` periodically
5. **Review commits** - Git history shows all changes

## State File

Progress is tracked in `mvp-builder.local.md`:
- Add to `.gitignore` to avoid committing
- Delete to reset state

## Learn More

- Original Ralph technique: https://ghuntley.com/ralph/
- MVP Prompt Framework: Your `mvp_prompt_framework.md`
