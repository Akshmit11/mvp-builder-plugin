import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs"
import { join, basename } from "path"
import { execSync } from "child_process"

/**
 * MVP Builder Plugin for OpenCode
 *
 * Automates the complete MVP development workflow using the MVP Prompt Framework.
 * Based on the Ralph Wiggum technique - continuous self-referential AI loops
 * for iterative development.
 *
 * Features:
 * - Reads project_overview.md and generates prompt sequence
 * - Executes prompts sequentially with automatic progression
 * - Includes reference documentation as context for each prompt
 * - Commits changes after each successful prompt
 * - Runs QA and generates documentation at the end
 */

interface MVPBuilderState {
  active: boolean
  phase: "init" | "generating_plan" | "generating_prompts" | "executing" | "qa_integration" | "qa_completeness" | "documentation" | "complete"
  currentPromptIndex: number
  totalPrompts: number
  promptSequence: PromptInfo[]
  completionPromise: string
  startedAt: string
  lastCommit: string | null
  projectOverviewPath: string
  referenceDocs: string[]
  maxIterations: number
  currentIteration: number
}

interface PromptInfo {
  filename: string
  title: string
  status: "pending" | "in_progress" | "completed" | "skipped"
}

const STATE_FILE = "mvp-builder.local.md"

// ============================================================================
// BUNDLED META-PROMPTS
// ============================================================================

const META_PROMPT_1A = `You are an expert technical architect and prompt engineer. I have a project overview document that describes an MVP I want to build.

Your task is to:
1. Read and deeply understand the project overview including: ICP, MVP features, tech stack, business model, user flow, and design guide
2. Break down the entire MVP build into a logical sequence of implementation steps
3. Create a detailed execution plan that groups related work into numbered prompts

For the execution plan:
- Each prompt should represent 2-4 hours of focused development work
- Group related functionality together (e.g., all auth setup in one prompt, all database schemas in another)
- Follow this general sequence: Setup → Data Layer → Core Features → UI/UX → Integration → Polish
- Consider dependencies (e.g., database schema before API routes, auth before protected features)
- Include prompts for: initial setup verification, database schemas, mock data, core MVP features (broken into 2-4 prompts), frontend components, backend APIs, payments/monetization, testing, and deployment prep

Output a markdown document with:
- Total number of prompts needed (typically 8-15 for an MVP)
- Brief description of what each prompt will accomplish
- Estimated time per prompt
- Dependencies between prompts
- Success criteria for each prompt

Use this exact format:
\`\`\`
# Prompt Sequence Plan for [Project Name]

## Total Prompts: X
## Estimated Total Time: XX-XX hours

### Prompt 01: [Title]
**Time:** X-X hours
**Dependencies:** None/Prompt XX
**Accomplishes:** [Description]
**Success Criteria:** [Measurable outcomes]

### Prompt 02: [Title]
...
\`\`\`

Be specific to the project but create a reusable structure.`

const META_PROMPT_1B = `You are an expert full-stack developer and prompt engineer. Based on the prompt_sequence_plan.md just created and the project_overview.md, generate detailed execution prompts for each step in the sequence.

For each prompt file (prompt_01.md through prompt_XX.md), create a comprehensive, self-contained instruction that includes:

**Required Structure for Each Prompt:**

1. **Context Block**
   - Brief reminder of the overall project goal
   - What was accomplished in previous prompts (if applicable)
   - Specific focus of this prompt

2. **Objective Statement**
   - Clear, specific goal for this prompt
   - Expected deliverables

3. **Technical Specifications**
   - Exact tech stack components to use (from project overview)
   - File locations and naming conventions
   - Code organization standards

4. **Detailed Requirements**
   - Step-by-step implementation checklist
   - Specific features/functions to build
   - Edge cases to handle
   - Error handling requirements

5. **Code Standards**
   - TypeScript typing requirements
   - Naming conventions
   - Comment standards
   - Code organization (separate concerns, reusable components)

6. **Testing & Validation**
   - How to verify the implementation works
   - Manual testing steps
   - Expected behavior

7. **Success Criteria**
   - Specific, measurable outcomes
   - What should work after this prompt is complete

8. **Next Steps Preview**
   - Brief mention of what the next prompt will build on

**Special Instructions:**
- Make each prompt completely self-contained (developer should be able to execute with just that prompt + codebase)
- Include specific examples where helpful
- Reference the project overview specifics (ICP, user flow, design guide)
- For UI prompts: include exact design specifications from design guide
- For backend prompts: include security, validation, and error handling details
- For feature prompts: map to exact MVP features from project overview

Generate all prompt files now as separate markdown documents. Each prompt should be 300-600 words and immediately actionable.

IMPORTANT: After generating each prompt file, output the filename and a one-line summary in this format:
GENERATED: prompt_XX.md - [One line summary]

When ALL prompts are generated, output exactly:
<promise>PROMPTS_GENERATED</promise>`

const META_PROMPT_2 = `You are an expert full-stack developer. Execute the instructions in the current prompt file.

**Execution Instructions:**

1. **Read & Plan**
   - Carefully read the entire prompt
   - Review any referenced files and previous code
   - Create a mental implementation plan

2. **Implement Systematically**
   - Follow the prompt's requirements exactly
   - Write clean, production-ready code
   - Add helpful comments for complex logic
   - Use TypeScript strictly (no 'any' types)

3. **Verify as You Go**
   - Test each component/function as you build it
   - Check against success criteria in the prompt
   - Fix any errors before moving to next section

4. **Provide Summary**
   After implementation, give:
   - ✅ Completed tasks checklist
   - 📁 Files created/modified with brief descriptions
   - 🧪 Testing steps to verify
   - ⚠️ Any assumptions made or edge cases to revisit
   - 🔄 What the next prompt will build on

**Code Quality Standards:**
- Follow framework conventions (Next.js App Router, Convex best practices, etc.)
- Implement proper auth patterns
- Mobile-responsive by default
- Accessibility (WCAG AA minimum)
- Error boundaries and user-friendly error messages

**When Stuck:**
- If requirements are unclear, make reasonable assumptions and document them
- If a dependency is missing, note it and provide a workaround
- If tech stack choice is ambiguous, choose the simpler option

When the prompt is FULLY COMPLETE and all success criteria are met, output exactly:
<promise>PROMPT_COMPLETE</promise>`

const META_PROMPT_3A = `You are a senior QA engineer and technical architect. Review the entire codebase for integration issues.

**Review Areas:**

1. **Data Flow Integrity**
   - Do database schemas match API expectations?
   - Are mutations/queries properly connected to frontend?
   - Is state management consistent across components?

2. **Authentication & Authorization**
   - Are all routes that need protection properly protected?
   - Are user permissions checked in backend mutations?
   - Do we handle unauthenticated states gracefully?

3. **User Experience Flow**
   - Does the implemented flow match the project overview user flow?
   - Are there any broken links or dead ends?
   - Is loading/error state handling consistent?

4. **Code Consistency**
   - Naming conventions uniform across files?
   - Component structure consistent?
   - Similar patterns for similar problems?

5. **Performance & Scalability**
   - Any N+1 query issues?
   - Are we paginating large data sets?
   - Unnecessary re-renders or API calls?

**Deliverable:**
Create "integration_issues.md" listing:
- 🔴 Critical issues (blocks functionality)
- 🟡 Important issues (degrades UX)
- 🟢 Nice-to-haves (improvements)

For each issue, provide:
- Description
- Location (file/component)
- Suggested fix
- Estimated effort (quick/medium/significant)

After creating the file and fixing all 🔴 CRITICAL issues, output exactly:
<promise>INTEGRATION_CHECK_COMPLETE</promise>`

const META_PROMPT_3B = `You are a product manager conducting an MVP readiness review. Compare the implemented codebase against the MVP features listed in the project overview.

**Audit Process:**

1. **Feature Checklist**
   - List each MVP feature from project overview
   - Mark status: ✅ Complete | 🟡 Partial | ❌ Missing
   - Note quality: 🌟 Excellent | ✔️ Good | ⚠️ Needs work

2. **User Flow Validation**
   - Walk through each step of the documented user flow
   - Identify any gaps or friction points
   - Check if onboarding matches the plan

3. **ICP Alignment**
   - Does the product serve the stated ICP effectively?
   - Are pain points from project overview addressed?
   - Is complexity appropriate for target users?

4. **Business Model Implementation**
   - Are pricing tiers implemented correctly?
   - Is payment integration functional?
   - Are usage limits/gates in place?

**Deliverable:**
Create "mvp_readiness_report.md" with:
- Overall readiness score (0-100%)
- Feature completion matrix
- Must-fix items before launch
- Nice-to-have improvements
- Launch blocker vs post-launch items

After creating the report and fixing any launch blockers, output exactly:
<promise>MVP_READY</promise>`

const META_PROMPT_4 = `You are a technical writer creating end-to-end documentation for this MVP. Generate comprehensive documentation for both developers and users.

**Create These Documents:**

1. **README.md** (Developer-focused)
   - Project overview & value proposition
   - Tech stack with versions
   - Setup instructions (environment variables, installation, database setup)
   - Development workflow (running locally, testing, deploying)
   - Project structure explanation
   - Key architectural decisions
   - Troubleshooting common issues

2. **DEPLOYMENT.md**
   - Deployment steps for your platform
   - Environment variables for production
   - Domain configuration
   - Monitoring & logging setup

3. **API_DOCUMENTATION.md**
   - All API endpoints/mutations/queries
   - Input parameters & types
   - Return values & types
   - Example usage
   - Error responses

4. **USER_GUIDE.md** (End-user focused)
   - Getting started tutorial
   - Feature walkthroughs
   - Common workflows
   - FAQ
   - Troubleshooting

5. **FUTURE_ENHANCEMENTS.md**
   - Features cut from MVP
   - Technical debt items
   - Scalability improvements needed

**Style Guidelines:**
- Use clear, concise language
- Include code examples where relevant
- Add mermaid diagrams for complex flows
- Assume intelligent but unfamiliar readers
- Link between documents for cross-references

After creating all documentation files, output exactly:
<promise>DOCUMENTATION_COMPLETE</promise>`

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

function parseState(directory: string): MVPBuilderState | null {
  const statePath = join(directory, STATE_FILE)

  if (!existsSync(statePath)) {
    return null
  }

  try {
    const content = readFileSync(statePath, "utf-8")
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
    if (!frontmatterMatch) {
      return null
    }

    const [, frontmatter, body] = frontmatterMatch

    const getValue = (key: string): string | null => {
      const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, "m"))
      if (!match) return null
      return match[1].replace(/^["'](.*?)["']$/, "$1")
    }

    const getArrayValue = (key: string): string[] => {
      const value = getValue(key)
      if (!value || value === "[]") return []
      try {
        return JSON.parse(value)
      } catch {
        return value.split(",").map(s => s.trim()).filter(Boolean)
      }
    }

    // Parse prompt sequence from body
    const promptSequence: PromptInfo[] = []
    const promptLines = body.match(/- \[([ x\/])\] (prompt_\d+\.md) - (.+)/g) || []
    for (const line of promptLines) {
      const match = line.match(/- \[([ x\/])\] (prompt_\d+\.md) - (.+)/)
      if (match) {
        const [, statusChar, filename, title] = match
        let status: PromptInfo["status"] = "pending"
        if (statusChar === "x") status = "completed"
        else if (statusChar === "/") status = "in_progress"
        promptSequence.push({ filename, title, status })
      }
    }

    return {
      active: getValue("active") === "true",
      phase: (getValue("phase") as MVPBuilderState["phase"]) || "init",
      currentPromptIndex: parseInt(getValue("current_prompt_index") || "0", 10),
      totalPrompts: parseInt(getValue("total_prompts") || "0", 10),
      promptSequence,
      completionPromise: getValue("completion_promise") || "MVP_COMPLETE",
      startedAt: getValue("started_at") || new Date().toISOString(),
      lastCommit: getValue("last_commit"),
      projectOverviewPath: getValue("project_overview_path") || "instructions/project_overview.md",
      referenceDocs: getArrayValue("reference_docs"),
      maxIterations: parseInt(getValue("max_iterations") || "100", 10),
      currentIteration: parseInt(getValue("current_iteration") || "1", 10),
    }
  } catch {
    return null
  }
}

function writeState(directory: string, state: MVPBuilderState): void {
  const statePath = join(directory, STATE_FILE)

  const promptList = state.promptSequence
    .map(p => {
      const statusChar = p.status === "completed" ? "x" : p.status === "in_progress" ? "/" : " "
      return `- [${statusChar}] ${p.filename} - ${p.title}`
    })
    .join("\n")

  const content = `---
active: ${state.active}
phase: "${state.phase}"
current_prompt_index: ${state.currentPromptIndex}
total_prompts: ${state.totalPrompts}
completion_promise: "${state.completionPromise}"
started_at: "${state.startedAt}"
last_commit: ${state.lastCommit ? `"${state.lastCommit}"` : "null"}
project_overview_path: "${state.projectOverviewPath}"
reference_docs: ${JSON.stringify(state.referenceDocs)}
max_iterations: ${state.maxIterations}
current_iteration: ${state.currentIteration}
---

## Prompt Sequence
${promptList || "No prompts generated yet."}

## Phase Progress
- ${state.phase === "init" ? "[/]" : "[x]"} Initialize
- ${state.phase === "generating_plan" ? "[/]" : state.phase === "init" ? "[ ]" : "[x]"} Generate Sequence Plan
- ${state.phase === "generating_prompts" ? "[/]" : ["init", "generating_plan"].includes(state.phase) ? "[ ]" : "[x]"} Generate Execution Prompts
- ${state.phase === "executing" ? "[/]" : ["init", "generating_plan", "generating_prompts"].includes(state.phase) ? "[ ]" : "[x]"} Execute Prompts (${state.currentPromptIndex}/${state.totalPrompts})
- ${state.phase === "qa_integration" ? "[/]" : ["init", "generating_plan", "generating_prompts", "executing"].includes(state.phase) ? "[ ]" : "[x]"} QA: Integration Check
- ${state.phase === "qa_completeness" ? "[/]" : ["init", "generating_plan", "generating_prompts", "executing", "qa_integration"].includes(state.phase) ? "[ ]" : "[x]"} QA: Feature Completeness
- ${state.phase === "documentation" ? "[/]" : state.phase === "complete" ? "[x]" : "[ ]"} Documentation
- ${state.phase === "complete" ? "[x]" : "[ ]"} Complete
`

  writeFileSync(statePath, content, "utf-8")
}

function deleteState(directory: string): boolean {
  const statePath = join(directory, STATE_FILE)
  if (existsSync(statePath)) {
    unlinkSync(statePath)
    return true
  }
  return false
}

// ============================================================================
// GIT HELPERS
// ============================================================================

function gitCommit(directory: string, message: string): string | null {
  try {
    execSync("git add -A", { cwd: directory, stdio: "pipe" })
    execSync(`git commit -m "${message}"`, { cwd: directory, stdio: "pipe" })
    const hash = execSync("git rev-parse --short HEAD", { cwd: directory, stdio: "pipe" })
      .toString()
      .trim()
    return hash
  } catch {
    return null
  }
}

function getRecentCommits(directory: string, count: number = 5): string {
  try {
    const log = execSync(`git log --oneline -n ${count}`, { cwd: directory, stdio: "pipe" })
      .toString()
      .trim()
    return log || "No commits yet."
  } catch {
    return "Git not initialized or no commits."
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function checkCompletionPromise(text: string, promise: string): boolean {
  const promiseMatch = text.match(/<promise>([\s\S]*?)<\/promise>/)
  if (!promiseMatch) return false
  return promiseMatch[1].trim() === promise
}

function loadReferenceDocs(directory: string, docPaths: string[]): string {
  if (docPaths.length === 0) return ""

  let content = "\n\n## Reference Documentation\n\n"
  content += "The following documentation is provided as context for this task:\n\n"

  for (const docPath of docPaths) {
    const fullPath = join(directory, docPath)
    if (existsSync(fullPath)) {
      const docContent = readFileSync(fullPath, "utf-8")
      const docName = basename(docPath)
      content += `### ${docName}\n\n${docContent}\n\n---\n\n`
    }
  }

  return content
}

function discoverPromptFiles(directory: string): PromptInfo[] {
  const instructionsDir = join(directory, "instructions")
  if (!existsSync(instructionsDir)) return []

  const files = readdirSync(instructionsDir)
  const promptFiles = files
    .filter(f => /^prompt_\d+\.md$/.test(f))
    .sort()

  return promptFiles.map(filename => ({
    filename,
    title: "Pending",
    status: "pending" as const,
  }))
}

function getCurrentPromptContent(directory: string, filename: string): string {
  const promptPath = join(directory, "instructions", filename)
  if (existsSync(promptPath)) {
    return readFileSync(promptPath, "utf-8")
  }
  return ""
}

// ============================================================================
// PHASE PROMPTS
// ============================================================================

function getPhasePrompt(state: MVPBuilderState, directory: string): string {
  const projectOverviewPath = join(directory, state.projectOverviewPath)
  const projectOverview = existsSync(projectOverviewPath)
    ? readFileSync(projectOverviewPath, "utf-8")
    : "Project overview not found."

  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)
  const recentCommits = getRecentCommits(directory)

  switch (state.phase) {
    case "init":
    case "generating_plan":
      return `# MVP Builder - Phase 1A: Generate Prompt Sequence Plan

## Project Overview
${projectOverview}

${referenceDocs}

## Recent Git History
\`\`\`
${recentCommits}
\`\`\`

## Instructions
${META_PROMPT_1A}

Save the plan as \`instructions/prompt_sequence_plan.md\`.

When complete, output: <promise>SEQUENCE_PLAN_COMPLETE</promise>`

    case "generating_prompts":
      const sequencePlanPath = join(directory, "instructions", "prompt_sequence_plan.md")
      const sequencePlan = existsSync(sequencePlanPath)
        ? readFileSync(sequencePlanPath, "utf-8")
        : "Sequence plan not found."

      return `# MVP Builder - Phase 1B: Generate Execution Prompts

## Project Overview
${projectOverview}

## Prompt Sequence Plan
${sequencePlan}

${referenceDocs}

## Instructions
${META_PROMPT_1B}

Save each prompt as \`instructions/prompt_XX.md\` (e.g., prompt_01.md, prompt_02.md, etc.).`

    case "executing":
      const currentPrompt = state.promptSequence[state.currentPromptIndex]
      if (!currentPrompt) {
        return "No more prompts to execute."
      }
      const promptContent = getCurrentPromptContent(directory, currentPrompt.filename)

      return `# MVP Builder - Phase 2: Execute Prompt ${state.currentPromptIndex + 1}/${state.totalPrompts}

## Current Prompt: ${currentPrompt.filename}
${promptContent}

${referenceDocs}

## Recent Git History
\`\`\`
${recentCommits}
\`\`\`

## Instructions
${META_PROMPT_2}

After completing this prompt successfully:
1. All code changes will be committed automatically
2. The next prompt will begin

When this prompt is FULLY COMPLETE, output: <promise>PROMPT_COMPLETE</promise>`

    case "qa_integration":
      return `# MVP Builder - Phase 3A: Integration Check

## Project Overview
${projectOverview}

${referenceDocs}

## Recent Git History
\`\`\`
${recentCommits}
\`\`\`

## Instructions
${META_PROMPT_3A}`

    case "qa_completeness":
      return `# MVP Builder - Phase 3B: Feature Completeness Audit

## Project Overview
${projectOverview}

${referenceDocs}

## Recent Git History
\`\`\`
${recentCommits}
\`\`\`

## Instructions
${META_PROMPT_3B}`

    case "documentation":
      return `# MVP Builder - Phase 4: Generate Documentation

## Project Overview
${projectOverview}

${referenceDocs}

## Recent Git History
\`\`\`
${recentCommits}
\`\`\`

## Instructions
${META_PROMPT_4}`

    case "complete":
      return `# MVP Builder - Complete! 🎉

All phases have been completed successfully:
✅ Prompt sequence generated
✅ All execution prompts completed
✅ QA integration check passed
✅ Feature completeness verified
✅ Documentation generated

The MVP is ready for deployment!

<promise>${state.completionPromise}</promise>`

    default:
      return "Unknown phase."
  }
}

// ============================================================================
// PLUGIN EXPORT
// ============================================================================

export const MVPBuilderPlugin: Plugin = async ({ directory, client }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const state = parseState(directory)
      if (!state || !state.active) return

      // Check iteration limit
      if (state.currentIteration >= state.maxIterations) {
        deleteState(directory)
        await client.app.log({
          service: "mvp-builder",
          level: "info",
          message: `MVP Builder stopped: max iterations (${state.maxIterations}) reached`,
        })
        return
      }

      // Get last message to check for completion promises
      try {
        const session = await client.session.get({ id: event.properties.sessionID })
        if (session.messages && session.messages.length > 0) {
          const lastAssistantMsg = [...session.messages]
            .reverse()
            .find((m) => m.role === "assistant")

          if (lastAssistantMsg) {
            const textContent = lastAssistantMsg.parts
              ?.filter((p: any) => p.type === "text")
              .map((p: any) => p.text)
              .join("\n") || ""

            // Check for phase-specific completion promises
            let shouldAdvance = false
            let commitMessage = ""

            switch (state.phase) {
              case "init":
              case "generating_plan":
                if (checkCompletionPromise(textContent, "SEQUENCE_PLAN_COMPLETE")) {
                  state.phase = "generating_prompts"
                  commitMessage = "MVP Builder: Prompt sequence plan generated"
                  shouldAdvance = true
                }
                break

              case "generating_prompts":
                if (checkCompletionPromise(textContent, "PROMPTS_GENERATED")) {
                  // Discover generated prompt files
                  state.promptSequence = discoverPromptFiles(directory)
                  state.totalPrompts = state.promptSequence.length
                  state.currentPromptIndex = 0
                  if (state.promptSequence.length > 0) {
                    state.promptSequence[0].status = "in_progress"
                  }
                  state.phase = "executing"
                  commitMessage = "MVP Builder: Execution prompts generated"
                  shouldAdvance = true
                }
                break

              case "executing":
                if (checkCompletionPromise(textContent, "PROMPT_COMPLETE")) {
                  // Mark current prompt as complete
                  if (state.promptSequence[state.currentPromptIndex]) {
                    state.promptSequence[state.currentPromptIndex].status = "completed"
                  }

                  commitMessage = `MVP Builder: Completed ${state.promptSequence[state.currentPromptIndex]?.filename || "prompt"}`

                  // Move to next prompt or next phase
                  if (state.currentPromptIndex + 1 < state.totalPrompts) {
                    state.currentPromptIndex++
                    state.promptSequence[state.currentPromptIndex].status = "in_progress"
                  } else {
                    state.phase = "qa_integration"
                  }
                  shouldAdvance = true
                }
                break

              case "qa_integration":
                if (checkCompletionPromise(textContent, "INTEGRATION_CHECK_COMPLETE")) {
                  state.phase = "qa_completeness"
                  commitMessage = "MVP Builder: Integration check complete"
                  shouldAdvance = true
                }
                break

              case "qa_completeness":
                if (checkCompletionPromise(textContent, "MVP_READY")) {
                  state.phase = "documentation"
                  commitMessage = "MVP Builder: MVP readiness verified"
                  shouldAdvance = true
                }
                break

              case "documentation":
                if (checkCompletionPromise(textContent, "DOCUMENTATION_COMPLETE")) {
                  state.phase = "complete"
                  commitMessage = "MVP Builder: Documentation complete"
                  shouldAdvance = true
                }
                break

              case "complete":
                if (checkCompletionPromise(textContent, state.completionPromise)) {
                  deleteState(directory)
                  await client.app.log({
                    service: "mvp-builder",
                    level: "info",
                    message: `MVP Builder completed successfully!`,
                  })
                  return
                }
                break
            }

            // Commit changes if advancing
            if (shouldAdvance && commitMessage) {
              const hash = gitCommit(directory, commitMessage)
              if (hash) {
                state.lastCommit = hash
              }
            }
          }
        }
      } catch (err) {
        await client.app.log({
          service: "mvp-builder",
          level: "warn",
          message: `Could not check session messages: ${err}`,
        })
      }

      // Increment iteration and update state
      state.currentIteration++
      writeState(directory, state)

      // Build status message
      let statusMsg = `MVP Builder | Phase: ${state.phase} | Iteration: ${state.currentIteration}`
      if (state.phase === "executing") {
        statusMsg += ` | Prompt: ${state.currentPromptIndex + 1}/${state.totalPrompts}`
      }

      await client.app.log({
        service: "mvp-builder",
        level: "info",
        message: statusMsg,
      })

      // Get the prompt for the current phase
      const prompt = getPhasePrompt(state, directory)

      // Send continuation
      await client.session.send({
        id: event.properties.sessionID,
        text: `[${statusMsg}]\n\n${prompt}`,
      })
    },
  }
}
