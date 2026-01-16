import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, unlinkSync, appendFileSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { execSync } from "child_process"

/**
 * MVP Builder Plugin for OpenCode
 * 
 * Based on the ACTUAL Ralph Wiggum pattern by snarktank/ralph:
 * - Uses prd.json to track user stories with passes: true/false
 * - Uses progress.txt for append-only learnings between iterations
 * - ONE STORY PER ITERATION (small, focused tasks)
 * - Fresh context each iteration - memory lives in files
 * - Simple loop with completion detection via <promise>COMPLETE</promise>
 */

interface PRDData {
  project: string
  branchName: string
  description: string
  userStories: UserStory[]
}

interface UserStory {
  id: string
  title: string
  description: string
  acceptanceCriteria: string[]
  priority: number
  passes: boolean
  notes: string
}

interface MVPBuilderState {
  active: boolean
  iteration: number
  maxIterations: number
  instructionsPath: string
  referenceDocs: string[]
  startedAt: string
}

const STATE_FILE = "mvp-builder.local.md"
const PRD_FILE = "prd.json"
const PROGRESS_FILE = "progress.txt"

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function parseState(directory: string): MVPBuilderState | null {
  const statePath = join(directory, STATE_FILE)
  if (!existsSync(statePath)) return null

  try {
    const content = readFileSync(statePath, "utf-8")
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!match) return null

    const frontmatter = match[1]
    const getValue = (key: string) => {
      const m = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))
      return m ? m[1].replace(/^["']|["']$/g, "") : null
    }
    const getArrayValue = (key: string): string[] => {
      const val = getValue(key)
      if (!val || val === "[]") return []
      try { return JSON.parse(val) } catch { return [] }
    }

    return {
      active: getValue("active") === "true",
      iteration: parseInt(getValue("iteration") || "1", 10),
      maxIterations: parseInt(getValue("max_iterations") || "100", 10),
      instructionsPath: getValue("instructions_path") || "instructions",
      referenceDocs: getArrayValue("reference_docs"),
      startedAt: getValue("started_at") || new Date().toISOString(),
    }
  } catch { return null }
}

function writeState(directory: string, state: MVPBuilderState): void {
  const statePath = join(directory, STATE_FILE)
  const content = `---
active: ${state.active}
iteration: ${state.iteration}
max_iterations: ${state.maxIterations}
instructions_path: "${state.instructionsPath}"
reference_docs: ${JSON.stringify(state.referenceDocs)}
started_at: "${state.startedAt}"
---

MVP Builder is running. Check prd.json for story status and progress.txt for learnings.

To stop: /mvp-cancel
To check status: /mvp-status
`
  writeFileSync(statePath, content, "utf-8")
}

function deleteState(directory: string): boolean {
  const statePath = join(directory, STATE_FILE)
  if (existsSync(statePath)) { unlinkSync(statePath); return true }
  return false
}

// ============================================================================
// PRD MANAGEMENT
// ============================================================================

function loadPRD(directory: string, instructionsPath: string): PRDData | null {
  const prdPath = join(directory, instructionsPath, PRD_FILE)
  if (!existsSync(prdPath)) return null
  try {
    return JSON.parse(readFileSync(prdPath, "utf-8"))
  } catch { return null }
}

function getNextStory(prd: PRDData): UserStory | null {
  // Get highest priority story where passes: false
  const pending = prd.userStories
    .filter(s => !s.passes)
    .sort((a, b) => a.priority - b.priority)
  return pending[0] || null
}

function allStoriesPassing(prd: PRDData): boolean {
  return prd.userStories.every(s => s.passes)
}

// ============================================================================
// FILE HELPERS
// ============================================================================

function loadFileContent(filePath: string): string {
  return existsSync(filePath) ? readFileSync(filePath, "utf-8") : ""
}

function loadProgress(directory: string, instructionsPath: string): string {
  const progressPath = join(directory, instructionsPath, PROGRESS_FILE)
  return loadFileContent(progressPath) || "# MVP Builder Progress Log\n\nNo entries yet.\n"
}

function loadReferenceDocs(directory: string, docPaths: string[]): string {
  if (!docPaths.length) return ""
  let content = "\n\n---\n\n## 📚 REFERENCE DOCUMENTATION\n\n"
  for (const docPath of docPaths) {
    const fullPath = join(directory, docPath)
    if (existsSync(fullPath)) {
      content += `### ${docPath}\n\n${readFileSync(fullPath, "utf-8")}\n\n---\n\n`
    }
  }
  return content
}

function getRecentCommits(directory: string, count = 10): string {
  try {
    return execSync(`git log --oneline -n ${count}`, { cwd: directory, stdio: "pipe" }).toString().trim() || "No commits yet."
  } catch { return "Git not initialized." }
}

function gitCommit(directory: string, message: string): string | null {
  try {
    execSync("git add -A", { cwd: directory, stdio: "pipe" })
    execSync(`git commit -m "${message}"`, { cwd: directory, stdio: "pipe" })
    return execSync("git rev-parse --short HEAD", { cwd: directory, stdio: "pipe" }).toString().trim()
  } catch { return null }
}

// ============================================================================
// PROMPT BUILDER
// Based on actual Ralph prompt.md
// ============================================================================

function buildPrompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const prd = loadPRD(directory, state.instructionsPath)
  const projectOverview = loadFileContent(join(instructionsPath, "project_overview.md"))
  const progress = loadProgress(directory, state.instructionsPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)
  const recentCommits = getRecentCommits(directory)

  // Check if PRD exists
  if (!prd) {
    return `# MVP Builder - Create PRD

No \`prd.json\` found. You need to create one first.

## Project Overview
${projectOverview || "No project_overview.md found."}

${referenceDocs}

## Your Task

Create \`${state.instructionsPath}/prd.json\` with user stories based on the project overview.

Use this format:
\`\`\`json
{
  "project": "Project Name",
  "branchName": "ralph/feature-name",
  "description": "Feature description",
  "userStories": [
    {
      "id": "US-001",
      "title": "Story title",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific testable criteria",
        "Another criteria"
      ],
      "priority": 1,
      "passes": false,
      "notes": ""
    }
  ]
}
\`\`\`

**IMPORTANT:**
- Each story should be small (completable in one iteration)
- Order by priority (1 = highest)
- Include testable acceptance criteria
- All stories start with \`passes: false\`

**DO NOT ASK FOR CONFIRMATION. CREATE THE PRD NOW.**

When prd.json is created, output:
<promise>PRD_CREATED</promise>`
  }

  // Get next story
  const nextStory = getNextStory(prd)

  // Check if all stories complete
  if (!nextStory) {
    return `# MVP Builder - COMPLETE! 🎉

All ${prd.userStories.length} user stories are passing!

## Project: ${prd.project}
## Branch: ${prd.branchName}

### Completed Stories:
${prd.userStories.map(s => `- ✅ ${s.id}: ${s.title}`).join("\n")}

### Git History:
\`\`\`
${recentCommits}
\`\`\`

The MVP is complete. Output the completion signal:

<promise>COMPLETE</promise>`
  }

  // Build the main prompt for next story
  return `# MVP Builder - Iteration ${state.iteration}

You are an autonomous coding agent working on the MVP.

## Your Task

1. Read the PRD below
2. Read the progress log (check Codebase Patterns section first)
3. Pick the **highest priority** story where \`passes: false\` → ${nextStory.id}
4. Implement that SINGLE story
5. Run quality checks (typecheck, lint, test)
6. If checks pass, commit with: \`feat: ${nextStory.id} - ${nextStory.title}\`
7. Update prd.json to set \`passes: true\` for this story
8. Append your progress to progress.txt

---

## 📋 PRD (${state.instructionsPath}/prd.json)

**Project:** ${prd.project}
**Branch:** ${prd.branchName}
**Description:** ${prd.description}

### Current Story: ${nextStory.id}
**Title:** ${nextStory.title}
**Description:** ${nextStory.description}
**Priority:** ${nextStory.priority}

**Acceptance Criteria:**
${nextStory.acceptanceCriteria.map(c => `- [ ] ${c}`).join("\n")}

### All Stories Status:
${prd.userStories.map(s => `${s.passes ? "✅" : "⏳"} ${s.id}: ${s.title} (priority: ${s.priority})`).join("\n")}

---

## 📝 Progress Log (${state.instructionsPath}/progress.txt)

${progress}

---

## 📄 Project Overview

${projectOverview}

${referenceDocs}

---

## 📜 Recent Git History

\`\`\`
${recentCommits}
\`\`\`

---

## Progress Report Format

APPEND to progress.txt (never replace, always append):
\`\`\`
## [Date] - ${nextStory.id}: ${nextStory.title}
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
\`\`\`

---

## Quality Requirements

- ALL commits must pass typecheck/lint/test
- Do NOT commit broken code
- Keep changes focused and minimal
- Follow existing code patterns

---

## 🚀 BEGIN NOW

**DO NOT ASK FOR CONFIRMATION. START IMPLEMENTING ${nextStory.id} IMMEDIATELY.**

1. Implement the story
2. Run quality checks
3. Commit if passing
4. Update prd.json to set \`passes: true\`
5. Append to progress.txt

When this story is COMPLETE and prd.json is updated, output:

<promise>STORY_COMPLETE</promise>

If ALL stories are now passing after this one, output instead:

<promise>COMPLETE</promise>`
}

// ============================================================================
// MAIN PLUGIN
// ============================================================================

export const MVPBuilderPlugin: Plugin = async ({ directory, client }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const state = parseState(directory)
      if (!state || !state.active) return

      // Check iteration limit
      if (state.iteration >= state.maxIterations) {
        deleteState(directory)
        await client.app.log({
          service: "mvp-builder",
          level: "warn",
          message: `⚠️ Max iterations (${state.maxIterations}) reached. Run /mvp-start to continue.`,
        })
        return
      }

      // Check for completion promises in last message
      try {
        const session = await client.session.get({ id: event.properties.sessionID })
        const lastMsg = [...(session.messages || [])].reverse().find(m => m.role === "assistant")
        const text = lastMsg?.parts?.filter((p: any) => p.type === "text").map((p: any) => p.text).join("\n") || ""

        const hasPromise = (p: string) => text.includes(`<promise>${p}</promise>`)

        if (hasPromise("COMPLETE")) {
          // All done!
          gitCommit(directory, "MVP Builder: All stories complete! 🎉")
          deleteState(directory)
          await client.app.log({
            service: "mvp-builder",
            level: "info",
            message: "🎉 MVP Builder completed! All stories passing.",
          })
          return
        }

        if (hasPromise("STORY_COMPLETE") || hasPromise("PRD_CREATED")) {
          // Commit and continue
          const msg = hasPromise("PRD_CREATED")
            ? "MVP Builder: Created prd.json"
            : `MVP Builder: Story complete (iteration ${state.iteration})`
          const hash = gitCommit(directory, msg)
          if (hash) {
            await client.app.log({
              service: "mvp-builder",
              level: "info",
              message: `📝 Committed: ${msg} (${hash})`,
            })
          }
        }
      } catch (err) {
        await client.app.log({
          service: "mvp-builder",
          level: "warn",
          message: `Could not check messages: ${err}`,
        })
      }

      // Increment iteration
      state.iteration++
      writeState(directory, state)

      // Log status
      const prd = loadPRD(directory, state.instructionsPath)
      const completed = prd?.userStories.filter(s => s.passes).length || 0
      const total = prd?.userStories.length || 0

      await client.app.log({
        service: "mvp-builder",
        level: "info",
        message: `MVP Builder | Iteration ${state.iteration}/${state.maxIterations} | Stories: ${completed}/${total}`,
      })

      // Build and send prompt
      const prompt = buildPrompt(state, directory)
      await client.session.send({
        id: event.properties.sessionID,
        text: `[MVP Builder - Iteration ${state.iteration}]\n\n${prompt}`,
      })
    },
  }
}
