---
description: Skip the current prompt and move to the next one
---

# MVP Skip Command

To skip the current prompt and move to the next, perform these steps:

1. Check if the state file exists at `mvp-builder.local.md`

2. If the file does NOT exist:
   - Report: "No active MVP Builder session found."

3. If the file EXISTS and phase is "executing":
   - Read the current prompt index
   - Mark current prompt as "skipped"
   - Increment the prompt index
   - If no more prompts, advance to QA phase
   - Write updated state

4. Report the skip:

```
⏭️ Skipped Prompt

Skipped: prompt_XX.md
Moving to: prompt_YY.md (or "QA Phase" if no more prompts)

Note: The skipped prompt can be executed later manually.
```

## When to Use

Use `/mvp-skip` when:
- A prompt is stuck in an infinite loop
- You've already implemented the feature manually
- The prompt requirements have changed
- You want to defer a feature to later

## Example

```
/mvp-skip
```

Output:
```
⏭️ Skipped Prompt

Skipped: prompt_03.md - Mock Data & Seed Scripts
Moving to: prompt_04.md - Feature: User Authentication

Note: The skipped prompt can be executed later manually.
```
