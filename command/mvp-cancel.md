---
description: Cancel the active MVP Builder workflow
---

# MVP Cancel Command

To cancel the MVP Builder workflow, perform these steps:

1. Check if the state file exists at `mvp-builder.local.md`

2. If the file does NOT exist:
   - Report: "No active MVP Builder session found."

3. If the file EXISTS:
   - Read the file to get the current phase and iteration from the frontmatter
   - Delete the file `mvp-builder.local.md`
   - Report the cancellation

Execute:
```bash
if [ -f mvp-builder.local.md ]; then
  PHASE=$(grep '^phase:' mvp-builder.local.md | sed 's/phase: *"//' | sed 's/"//')
  ITERATION=$(grep '^current_iteration:' mvp-builder.local.md | sed 's/current_iteration: *//')
  PROMPT_IDX=$(grep '^current_prompt_index:' mvp-builder.local.md | sed 's/current_prompt_index: *//')
  rm mvp-builder.local.md
  echo "🛑 MVP Builder Cancelled"
  echo ""
  echo "Final state:"
  echo "  Phase: $PHASE"
  echo "  Iteration: $ITERATION"
  echo "  Prompt Index: $PROMPT_IDX"
  echo ""
  echo "Your code changes have been preserved."
  echo "To resume from where you left off, use /mvp-start"
else
  echo "No active MVP Builder session found."
fi
```

## Important Notes

- Cancelling does NOT revert any code changes made during the build
- All generated prompt files in `/instructions` are preserved
- Git commits made during the build are preserved
- You can restart the build later with `/mvp-start`
