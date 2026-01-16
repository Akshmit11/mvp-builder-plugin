---
description: Skip the current story and move to the next one
---

# MVP Skip Command

To skip the current story:

1. Load prd.json from instructions path
2. Find the current story (highest priority where passes: false)
3. Set that story's `passes: true` (marking it as skipped)
4. Add a note: "Skipped by user"
5. Save prd.json

Report:
```
⏭️ Skipped Story

Skipped: US-XXX - Story title
Reason: Marked as passes: true (skipped by user)
Next: US-YYY - Next story title

Note: The skipped story is marked complete. If you need to
implement it later, manually set passes: false in prd.json.
```

## When to Use

- Story is stuck in a loop
- Already implemented manually
- Want to defer to later
- Requirements changed

## Example

```bash
/mvp-skip
```

Output:
```
⏭️ Skipped Story

Skipped: US-003 - Add auth middleware
Next: US-004 - Create dashboard

To un-skip: Edit prd.json and set passes: false for US-003
```
