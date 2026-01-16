# MVP Builder Plugin for OpenCode

Automate your entire MVP development workflow. Based on the Ralph Wiggum technique and the MVP Prompt Framework.

## What It Does

**Set it and forget it.** This plugin:

1. 📋 Reads your `project_overview.md`
2. 📝 Generates a prompt sequence plan
3. 🔧 Creates individual execution prompts (01-XX)
4. ⚡ Executes each prompt sequentially
5. ✅ Commits changes after each step
6. 🔍 Runs QA integration checks
7. 📊 Verifies feature completeness
8. 📚 Generates documentation
9. 🎉 Outputs completion signal

**All automatically, without manual prompting.**

## Installation

### Option 1: Global Install (All Projects)

```bash
# Clone the plugin
git clone https://github.com/your-username/mvp-builder-plugin.git
cd mvp-builder-plugin

# Create symlinks to global OpenCode config
# Windows (PowerShell as Admin):
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\plugin\mvp-builder.ts" -Target "$(Get-Location)\plugin\mvp-builder.ts"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\command\mvp-start.md" -Target "$(Get-Location)\command\mvp-start.md"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\command\mvp-status.md" -Target "$(Get-Location)\command\mvp-status.md"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\command\mvp-cancel.md" -Target "$(Get-Location)\command\mvp-cancel.md"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\command\mvp-skip.md" -Target "$(Get-Location)\command\mvp-skip.md"
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.config\opencode\command\mvp-help.md" -Target "$(Get-Location)\command\mvp-help.md"

# Linux/macOS:
mkdir -p ~/.config/opencode/plugin ~/.config/opencode/command
ln -s "$(pwd)/plugin/mvp-builder.ts" ~/.config/opencode/plugin/mvp-builder.ts
ln -s "$(pwd)/command/"*.md ~/.config/opencode/command/
```

### Option 2: Project-Level Install

```bash
# Copy to your project's .opencode folder
cp -r mvp-builder-plugin/plugin your-project/.opencode/
cp -r mvp-builder-plugin/command your-project/.opencode/
```

### Option 3: Direct Copy

```bash
# Copy files directly
cp plugin/mvp-builder.ts ~/.config/opencode/plugin/
cp command/*.md ~/.config/opencode/command/
```

## Quick Start

1. **Create your project overview:**
   ```
   your-project/
   └── instructions/
       └── project_overview.md
   ```

2. **Start OpenCode in your project:**
   ```bash
   cd your-project
   opencode
   ```

3. **Launch the builder:**
   ```bash
   /mvp-start
   ```

4. **Walk away.** The plugin handles everything.

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

--max-iterations <n>      Safety limit (default: 100)
--project-path <path>     Custom overview path (default: instructions/project_overview.md)
--reference-docs <paths>  Comma-separated doc paths for context
```

### Reference Docs Example

Include documentation for integrations like Stripe, Dodo Payments, or Convex:

```bash
/mvp-start --reference-docs docs/stripe-api.md,docs/convex-guide.md,knowledge/auth-patterns.md
```

These files are included as context for **every prompt execution**, giving the AI complete knowledge about:
- Payment integration patterns
- Database/backend specifics
- Authentication flows
- Your project's specific conventions

## Workflow Phases

```
┌────────────────────────────────────┐
│ 1A: Generate Prompt Sequence Plan  │
│     → prompt_sequence_plan.md      │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 1B: Generate Execution Prompts     │
│     → prompt_01.md ... prompt_XX.md│
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 2: Execute Prompts Sequentially    │
│    For each: Execute → Test → Git  │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 3A: QA Integration Check           │
│     → integration_issues.md        │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 3B: Feature Completeness Audit     │
│     → mvp_readiness_report.md      │
└────────────────────────────────────┘
           ↓
┌────────────────────────────────────┐
│ 4: Generate Documentation          │
│    → README, DEPLOYMENT, API docs  │
└────────────────────────────────────┘
           ↓
        COMPLETE 🎉
```

## State File

Progress is tracked in `mvp-builder.local.md`:

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

## Prerequisites

Before running:

- ✅ `instructions/project_overview.md` with detailed MVP specs
- ✅ Clean git state (commit pending changes)
- ✅ Time - full build: 20-40+ hours autonomous work
- ✅ Sufficient API credits for your AI provider

## Project Overview Template

Create `instructions/project_overview.md`:

```markdown
# Project Name

## Problem Statement
What problem does this solve?

## ICP (Ideal Customer Profile)
Who is this for?

## MVP Features
1. Feature 1 - description
2. Feature 2 - description
...

## Tech Stack
- Frontend: Next.js 14, React, TailwindCSS
- Backend: Convex
- Auth: Clerk
- Payments: Stripe / Dodo

## User Flow
1. User lands on homepage
2. Signs up with Clerk
3. ...

## Design Guide
- Primary color: #...
- Typography: Inter
- Style: Modern, minimal
```

## Tips for Best Results

1. **Detailed project overview** → Better generated prompts
2. **Include reference docs** → Accurate integrations
3. **Monitor occasionally** → `/mvp-status`
4. **Review git history** → See all changes
5. **Set max iterations** → Safety net

## Troubleshooting

**Q: Plugin doesn't load**
```bash
# Check plugin path
ls ~/.config/opencode/plugin/mvp-builder.ts
```

**Q: Stuck in a loop**
```bash
/mvp-cancel
# Then restart with /mvp-start
```

**Q: Want to skip a prompt**
```bash
/mvp-skip
```

**Q: Commands not recognized**
```bash
# Ensure command files are in place
ls ~/.config/opencode/command/mvp-*.md
```

## Files

```
mvp-builder-plugin/
├── plugin/
│   └── mvp-builder.ts      # Main plugin logic
├── command/
│   ├── mvp-start.md        # Start workflow
│   ├── mvp-status.md       # Check status
│   ├── mvp-cancel.md       # Cancel workflow
│   ├── mvp-skip.md         # Skip prompt
│   └── mvp-help.md         # Help docs
├── opencode.json           # Plugin config
├── .gitignore
└── README.md
```

## Based On

- [Ralph Wiggum Technique](https://ghuntley.com/ralph/) by Geoffrey Huntley
- MVP Prompt Framework for systematic AI-driven development

## License

MIT
