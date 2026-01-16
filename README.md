# MVP Builder Plugin for OpenCode

Automate your entire MVP development workflow. Based on the Ralph Wiggum technique and the MVP Prompt Framework.

## What It Does

**Set it and forget it.** This plugin:

1. 📋 Reads your `project_overview.md`
2. 📝 Generates a prompt sequence plan → `prompt_sequence_plan.md`
3. 🔧 Creates execution prompts → `prompt_01.md` through `prompt_XX.md`
4. ⚡ Executes each prompt sequentially with git commits
5. 🔍 Runs QA checks → `integration_issues.md`, `mvp_readiness_report.md`
6. 📚 Generates documentation → README, DEPLOYMENT, API docs
7. 🎉 Completes automatically

**All files are stored in your instructions folder.**

## Installation

### Option 1: Project-Level Install (Recommended)

Copy to your project's `.opencode/` folder:

```bash
# From mvp-builder-plugin directory
cp -r plugin command /path/to/your/project/.opencode/
```

### Option 2: Global Install

**Windows (PowerShell as Admin):**
```powershell
$configPath = "$env:USERPROFILE\.config\opencode"
New-Item -ItemType Directory -Force -Path "$configPath\plugin"
New-Item -ItemType Directory -Force -Path "$configPath\command"

Copy-Item .\plugin\* "$configPath\plugin\"
Copy-Item .\command\* "$configPath\command\"
```

**Linux/macOS:**
```bash
mkdir -p ~/.config/opencode/plugin ~/.config/opencode/command
cp plugin/* ~/.config/opencode/plugin/
cp command/* ~/.config/opencode/command/
```

## Quick Start

1. **Create your project overview:**
   ```
   your-project/
   └── instructions/
       └── project_overview.md   # Your MVP specification
   ```

2. **Start OpenCode:**
   ```bash
   opencode
   ```

3. **Launch the builder:**
   ```bash
   /mvp-start
   ```

4. **Walk away.** Check back periodically with `/mvp-status`.

## Commands

| Command | Description |
|---------|-------------|
| `/mvp-start` | Begin the automated build workflow |
| `/mvp-status` | Check current progress |
| `/mvp-cancel` | Stop the workflow (preserves code) |
| `/mvp-skip` | Skip current prompt, move to next |
| `/mvp-help` | Show detailed help |

## Options

```bash
/mvp-start [OPTIONS]

--instructions-path <path>  Folder for all generated files (default: instructions)
--reference-docs <paths>    Comma-separated doc paths for context
--max-iterations <n>        Safety limit (default: 100)
```

## Reference Docs (For Integrations)

Include documentation for Stripe, Dodo Payments, Convex, etc.:

```bash
/mvp-start --reference-docs docs/dodo-payments.md,docs/stripe.md,knowledge/auth.md
```

These files are loaded as context for **every prompt execution**.

## File Storage

**All generated files go in your instructions folder:**

```
instructions/
├── project_overview.md          # YOUR input (must exist)
├── prompt_sequence_plan.md      # Step 1 output
├── prompt_01.md                 # Step 2 output
├── prompt_02.md
├── ...
├── integration_issues.md        # Step 4A output
└── mvp_readiness_report.md      # Step 4B output
```

## Workflow Phases

```
STEP 1 → prompt_sequence_plan.md   (Meta-Prompt 1A)
STEP 2 → prompt_01.md ... XX.md    (Meta-Prompt 1B)
STEP 3 → Execute all prompts       (Meta-Prompt 2, loop)
STEP 4A → integration_issues.md    (Meta-Prompt 3A)
STEP 4B → mvp_readiness_report.md  (Meta-Prompt 3B)
STEP 5 → Documentation files       (Meta-Prompt 4)
STEP 6 → COMPLETE! 🎉
```

Each step commits to git automatically.

## Starter Kit Support

The plugin is designed for projects with:
- ✅ Next.js 16 + Convex + Clerk already configured
- ✅ Google sign-in working
- ✅ Basic project structure in place

It will skip redundant setup and focus on MVP features.

## Context Window

**Q: What happens when context fills up?**

The Ralph technique handles this:
- Same prompt fed each iteration (doesn't grow)
- Progress tracked in files and git history
- AI reads its work from filesystem, not conversation
- Each iteration = fresh context + same instructions

## State File

Progress tracked in `mvp-builder.local.md`:
```yaml
---
active: true
phase: "executing"
current_prompt_index: 3
total_prompts: 12
---
```

Add to `.gitignore`:
```
mvp-builder.local.md
```

## Troubleshooting

**Plugin doesn't load:**
```bash
# Check files exist
ls ~/.config/opencode/plugin/mvp-builder.ts
ls ~/.config/opencode/command/mvp-*.md
```

**Stuck in a loop:**
```bash
/mvp-cancel
# Then restart
/mvp-start
```

**Want to skip a prompt:**
```bash
/mvp-skip
```

## Based On
- [Ralph Wiggum Technique](https://ghuntley.com/ralph/)
- MVP Prompt Framework

