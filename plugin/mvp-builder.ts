import type { Plugin } from "@opencode-ai/plugin"
import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "fs"
import { join, dirname } from "path"
import { execSync } from "child_process"

/**
 * MVP Builder Plugin for OpenCode
 *
 * Automates the complete MVP development workflow using the MVP Prompt Framework.
 * Based on the Ralph Wiggum technique - continuous self-referential AI loops.
 *
 * Key Features:
 * - Reads project_overview.md and generates prompt sequence
 * - Stores ALL generated files in the instructions folder
 * - Uses exact meta-prompts from MVP Prompt Framework
 * - Executes prompts sequentially with automatic progression
 * - Includes reference documentation as context
 * - Commits changes after each successful prompt
 * - Runs QA and generates documentation at the end
 */

interface MVPBuilderState {
  active: boolean
  phase: "generating_plan" | "generating_prompts" | "executing" | "qa_integration" | "qa_completeness" | "documentation" | "complete"
  currentPromptIndex: number
  totalPrompts: number
  promptSequence: PromptInfo[]
  startedAt: string
  lastCommit: string | null
  instructionsPath: string  // Folder where project_overview.md lives and where we store all generated files
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
// EXACT META-PROMPTS FROM MVP PROMPT FRAMEWORK
// These are copied exactly from mvp_prompt_framework.md
// ============================================================================

const META_PROMPT_1A = `You are an expert technical architect and prompt engineer. I have a project overview document at @project_overview.md that describes an MVP I want to build.

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

Output a markdown document named "prompt_sequence_plan.md" with:
- Total number of prompts needed (typically 8-15 for an MVP)
- Brief description of what each prompt will accomplish
- Estimated time per prompt
- Dependencies between prompts
- Success criteria for each prompt

Example structure:
\`\`\`
# Prompt Sequence Plan for [Project Name]

## Total Prompts: 12
## Estimated Total Time: 24-30 hours

### Prompt 01: Initial Setup Verification & Configuration
**Time:** 1-2 hours
**Dependencies:** None
**Accomplishes:** Verify Next.js + Convex + Clerk setup, configure environment variables, establish project structure
**Success Criteria:** Dev server runs, auth works, Convex syncs

### Prompt 02: Database Schema Design
**Time:** 2-3 hours
**Dependencies:** Prompt 01
**Accomplishes:** Design and implement all Convex schemas for [list core entities]
**Success Criteria:** Schemas deployed, can create/read records in Convex dashboard
...
\`\`\`

Be specific to the project but create a reusable structure.`

const META_PROMPT_1B = `You are an expert full-stack developer and prompt engineer. Based on the @prompt_sequence_plan.md you just created and the @project_overview.md, generate detailed execution prompts for each step in the sequence.

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
- Include specific examples where helpful (e.g., "Create a schema like this: [example]")
- Reference the project overview specifics (ICP, user flow, design guide)
- For UI prompts: include exact design specifications from design guide
- For backend prompts: include security, validation, and error handling details
- For feature prompts: map to exact MVP features from project overview

**Naming Convention:**
- prompt_01.md: Initial Setup Verification
- prompt_02.md: Database Schema Design
- prompt_03.md: Mock Data & Seed Scripts
- prompt_04.md: [Feature Category] - Core Feature Set 1
- prompt_05.md: [Feature Category] - Core Feature Set 2
- ... (continue based on plan)
- prompt_XX.md: Final deployment prep

Generate all prompt files now as separate markdown documents. Each prompt should be 300-600 words and immediately actionable by a developer AI agent.`

const META_PROMPT_2 = `You are an expert full-stack developer specializing in Next.js, Convex, and Clerk. Execute the instructions in the current prompt.

**Execution Instructions:**

1. **Read & Plan**
   - Carefully read the entire prompt
   - Review any referenced files (@project_overview.md, previous code)
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
   After implementation, give me:
   - ✅ Completed tasks checklist
   - 📁 Files created/modified with brief descriptions
   - 🧪 Testing steps I should run to verify
   - ⚠️ Any assumptions made or edge cases to revisit
   - 🔄 What the next prompt will build on

**Code Quality Standards:**
- Follow Next.js 14+ App Router conventions
- Use Convex best practices (mutations/queries/actions)
- Implement proper Clerk auth patterns
- Mobile-responsive by default
- Accessibility (WCAG AA minimum)
- Error boundaries and user-friendly error messages

**When Stuck:**
- If requirements are unclear, make reasonable assumptions based on project overview and document them
- If a dependency is missing, note it and provide a workaround
- If tech stack choice is ambiguous, choose the simpler option

Begin implementation now. Show me the code and changes you're making.`

const META_PROMPT_3A = `You are a senior QA engineer and technical architect. I've completed all implementation prompts. Review the entire codebase for integration issues.

**Review Areas:**

1. **Data Flow Integrity**
   - Do database schemas match API expectations?
   - Are Convex mutations/queries properly connected to frontend?
   - Is state management consistent across components?

2. **Authentication & Authorization**
   - Is Clerk properly protecting all routes that need it?
   - Are user permissions checked in backend mutations?
   - Do we handle unauthenticated states gracefully?

3. **User Experience Flow**
   - Does the implemented flow match @project_overview.md user flow?
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

After listing all issues, fix ALL 🔴 CRITICAL issues before proceeding.`

const META_PROMPT_3B = `You are a product manager conducting an MVP readiness review. Compare our implemented codebase against the MVP features listed in @project_overview.md.

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

After creating the report, fix any launch blockers before proceeding.`

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
   - Vercel deployment steps
   - Convex deployment process
   - Clerk production setup
   - Environment variables for production
   - Domain configuration
   - Monitoring & logging setup

3. **API_DOCUMENTATION.md**
   - All Convex queries/mutations/actions
   - Input parameters & types
   - Return values & types
   - Example usage
   - Error responses

4. **USER_GUIDE.md** (End-user focused)
   - Getting started tutorial
   - Feature walkthroughs with screenshots
   - Common workflows
   - FAQ
   - Troubleshooting

5. **FUTURE_ENHANCEMENTS.md**
   - Features cut from MVP (from project overview)
   - Technical debt items
   - Scalability improvements needed
   - User-requested features (placeholder)

**Style Guidelines:**
- Use clear, concise language
- Include code examples where relevant
- Add mermaid diagrams for complex flows
- Assume intelligent but unfamiliar readers
- Link between documents for cross-references`

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
    const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
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
      phase: (getValue("phase") as MVPBuilderState["phase"]) || "generating_plan",
      currentPromptIndex: parseInt(getValue("current_prompt_index") || "0", 10),
      totalPrompts: parseInt(getValue("total_prompts") || "0", 10),
      promptSequence,
      startedAt: getValue("started_at") || new Date().toISOString(),
      lastCommit: getValue("last_commit"),
      instructionsPath: getValue("instructions_path") || "instructions",
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
started_at: "${state.startedAt}"
last_commit: ${state.lastCommit ? `"${state.lastCommit}"` : "null"}
instructions_path: "${state.instructionsPath}"
reference_docs: ${JSON.stringify(state.referenceDocs)}
max_iterations: ${state.maxIterations}
current_iteration: ${state.currentIteration}
---

## Prompt Sequence
${promptList || "No prompts generated yet."}

## Phase Progress
- ${["generating_plan"].includes(state.phase) ? "[/]" : "[x]"} Phase 1A: Generate Sequence Plan
- ${state.phase === "generating_prompts" ? "[/]" : state.phase === "generating_plan" ? "[ ]" : "[x]"} Phase 1B: Generate Execution Prompts
- ${state.phase === "executing" ? `[/] Phase 2: Execute Prompts (${state.currentPromptIndex + 1}/${state.totalPrompts})` : ["generating_plan", "generating_prompts"].includes(state.phase) ? "[ ] Phase 2: Execute Prompts" : `[x] Phase 2: Execute Prompts (${state.totalPrompts}/${state.totalPrompts})`}
- ${state.phase === "qa_integration" ? "[/]" : ["generating_plan", "generating_prompts", "executing"].includes(state.phase) ? "[ ]" : "[x]"} Phase 3A: QA Integration Check
- ${state.phase === "qa_completeness" ? "[/]" : ["generating_plan", "generating_prompts", "executing", "qa_integration"].includes(state.phase) ? "[ ]" : "[x]"} Phase 3B: Feature Completeness
- ${state.phase === "documentation" ? "[/]" : state.phase === "complete" ? "[x]" : "[ ]"} Phase 4: Documentation
- ${state.phase === "complete" ? "[x]" : "[ ]"} ✅ COMPLETE
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

function getRecentCommits(directory: string, count: number = 10): string {
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
// FILE HELPERS
// ============================================================================

function loadFileContent(filePath: string): string {
  if (existsSync(filePath)) {
    return readFileSync(filePath, "utf-8")
  }
  return ""
}

function loadReferenceDocs(directory: string, docPaths: string[]): string {
  if (docPaths.length === 0) return ""

  let content = "\n\n---\n\n## 📚 REFERENCE DOCUMENTATION\n\n"
  content += "Use the following documentation as reference for implementations:\n\n"

  for (const docPath of docPaths) {
    const fullPath = join(directory, docPath)
    if (existsSync(fullPath)) {
      const docContent = readFileSync(fullPath, "utf-8")
      content += `### 📄 ${docPath}\n\n${docContent}\n\n---\n\n`
    }
  }

  return content
}

function discoverPromptFiles(instructionsPath: string): PromptInfo[] {
  if (!existsSync(instructionsPath)) return []

  const files = readdirSync(instructionsPath)
  const promptFiles = files
    .filter(f => /^prompt_\d+\.md$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)?.[0] || "0")
      const numB = parseInt(b.match(/\d+/)?.[0] || "0")
      return numA - numB
    })

  return promptFiles.map(filename => {
    // Try to extract title from file
    const filePath = join(instructionsPath, filename)
    const content = loadFileContent(filePath)
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1].slice(0, 50) : "Prompt"
    
    return {
      filename,
      title,
      status: "pending" as const,
    }
  })
}

// ============================================================================
// PHASE PROMPT BUILDERS
// These build the EXACT prompts following step_by_step_guide.md
// ============================================================================

function buildPhase1APrompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const projectOverview = loadFileContent(projectOverviewPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)
  const recentCommits = getRecentCommits(directory)

  return `# MVP Builder - STEP 1: Generate the Prompt Sequence Plan

## 📋 Your Task
Read the project overview and create a detailed prompt sequence plan.

---

## 📄 PROJECT OVERVIEW (@project_overview.md)

${projectOverview || "ERROR: project_overview.md not found at " + projectOverviewPath}

${referenceDocs}

---

## 📜 RECENT GIT HISTORY
\`\`\`
${recentCommits}
\`\`\`

---

## 🎯 INSTRUCTIONS (Meta-Prompt 1A)

${META_PROMPT_1A}

---

## ⚠️ IMPORTANT

1. Save the plan as \`${state.instructionsPath}/prompt_sequence_plan.md\`
2. The starter kit already has Next.js 16 + Convex + Clerk with Google sign-in configured
3. Skip initial setup prompts if auth is already working
4. Focus on the MVP features from the project overview

## ✅ COMPLETION

When you have created and saved \`${state.instructionsPath}/prompt_sequence_plan.md\`, output exactly:

<promise>SEQUENCE_PLAN_COMPLETE</promise>`
}

function buildPhase1BPrompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const sequencePlanPath = join(instructionsPath, "prompt_sequence_plan.md")
  
  const projectOverview = loadFileContent(projectOverviewPath)
  const sequencePlan = loadFileContent(sequencePlanPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)

  return `# MVP Builder - STEP 2: Generate All Individual Execution Prompts

## 📋 Your Task
Using the prompt sequence plan and project overview, generate all individual execution prompts.

---

## 📄 PROJECT OVERVIEW (@project_overview.md)

${projectOverview}

---

## 📋 PROMPT SEQUENCE PLAN (@prompt_sequence_plan.md)

${sequencePlan || "ERROR: prompt_sequence_plan.md not found!"}

${referenceDocs}

---

## 🎯 INSTRUCTIONS (Meta-Prompt 1B)

${META_PROMPT_1B}

---

## ⚠️ IMPORTANT

1. Save ALL prompt files in \`${state.instructionsPath}/\` folder:
   - \`${state.instructionsPath}/prompt_01.md\`
   - \`${state.instructionsPath}/prompt_02.md\`
   - ... and so on
2. Each prompt should be self-contained and immediately actionable
3. The starter kit already has Next.js 16 + Convex + Clerk configured

## ✅ COMPLETION

After generating ALL prompt files listed in the sequence plan, output exactly:

<promise>PROMPTS_GENERATED</promise>`
}

function buildPhase2Prompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const currentPrompt = state.promptSequence[state.currentPromptIndex]
  
  if (!currentPrompt) {
    return "ERROR: No more prompts to execute."
  }

  const promptPath = join(instructionsPath, currentPrompt.filename)
  const promptContent = loadFileContent(promptPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const projectOverview = loadFileContent(projectOverviewPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)
  const recentCommits = getRecentCommits(directory)

  return `# MVP Builder - STEP 3: Execute Prompt ${state.currentPromptIndex + 1} of ${state.totalPrompts}

## 📋 Current Prompt: ${currentPrompt.filename}

---

## 📄 PROMPT INSTRUCTIONS

${promptContent || `ERROR: ${currentPrompt.filename} not found at ${promptPath}`}

---

## 📄 PROJECT OVERVIEW (for reference)

${projectOverview}

${referenceDocs}

---

## 📜 RECENT GIT HISTORY (see what's been done)
\`\`\`
${recentCommits}
\`\`\`

---

## 🎯 EXECUTION INSTRUCTIONS (Meta-Prompt 2)

${META_PROMPT_2}

---

## ⚠️ IMPORTANT

1. Follow the prompt instructions exactly
2. Test your implementation before marking complete
3. After completion, changes will be committed automatically
4. Progress: ${state.currentPromptIndex + 1}/${state.totalPrompts} prompts

## ✅ COMPLETION

When ALL success criteria in the prompt are met and implementation is tested, output exactly:

<promise>PROMPT_COMPLETE</promise>`
}

function buildPhase3APrompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const projectOverview = loadFileContent(projectOverviewPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)
  const recentCommits = getRecentCommits(directory, 20)

  return `# MVP Builder - STEP 4A: Quality Assurance - Integration Check

## 📋 Your Task
Review the entire codebase for integration issues after completing all prompts.

---

## 📄 PROJECT OVERVIEW (@project_overview.md)

${projectOverview}

${referenceDocs}

---

## 📜 GIT HISTORY (all completed work)
\`\`\`
${recentCommits}
\`\`\`

---

## 🎯 INSTRUCTIONS (Meta-Prompt 3A)

${META_PROMPT_3A}

---

## ⚠️ IMPORTANT

1. Save the issues list as \`${state.instructionsPath}/integration_issues.md\`
2. Fix ALL 🔴 CRITICAL issues before proceeding
3. Document any fixes made

## ✅ COMPLETION

After creating integration_issues.md and fixing all critical issues, output exactly:

<promise>INTEGRATION_CHECK_COMPLETE</promise>`
}

function buildPhase3BPrompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const projectOverview = loadFileContent(projectOverviewPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)

  return `# MVP Builder - STEP 4B: Quality Assurance - Feature Completeness Audit

## 📋 Your Task
Compare implemented features against the MVP requirements.

---

## 📄 PROJECT OVERVIEW (@project_overview.md)

${projectOverview}

${referenceDocs}

---

## 🎯 INSTRUCTIONS (Meta-Prompt 3B)

${META_PROMPT_3B}

---

## ⚠️ IMPORTANT

1. Save the report as \`${state.instructionsPath}/mvp_readiness_report.md\`
2. Fix any launch blockers before proceeding
3. Document the overall readiness score

## ✅ COMPLETION

After creating mvp_readiness_report.md and fixing launch blockers, output exactly:

<promise>MVP_READY</promise>`
}

function buildPhase4Prompt(state: MVPBuilderState, directory: string): string {
  const instructionsPath = join(directory, state.instructionsPath)
  const projectOverviewPath = join(instructionsPath, "project_overview.md")
  const projectOverview = loadFileContent(projectOverviewPath)
  const referenceDocs = loadReferenceDocs(directory, state.referenceDocs)

  return `# MVP Builder - STEP 5: Generate Documentation

## 📋 Your Task
Generate comprehensive documentation for the MVP.

---

## 📄 PROJECT OVERVIEW (@project_overview.md)

${projectOverview}

${referenceDocs}

---

## 🎯 INSTRUCTIONS (Meta-Prompt 4)

${META_PROMPT_4}

---

## ⚠️ IMPORTANT

1. Save documentation files in the project root:
   - README.md
   - DEPLOYMENT.md
   - API_DOCUMENTATION.md
   - USER_GUIDE.md
   - FUTURE_ENHANCEMENTS.md

## ✅ COMPLETION

After creating all documentation files, output exactly:

<promise>DOCUMENTATION_COMPLETE</promise>`
}

function buildCompletePrompt(state: MVPBuilderState): string {
  const elapsed = Date.now() - new Date(state.startedAt).getTime()
  const hours = Math.floor(elapsed / (1000 * 60 * 60))
  const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60))

  return `# 🎉 MVP Builder - COMPLETE!

## ✅ All Phases Completed Successfully!

| Phase | Status |
|-------|--------|
| Phase 1A: Generate Sequence Plan | ✅ Complete |
| Phase 1B: Generate Execution Prompts | ✅ Complete |
| Phase 2: Execute All Prompts (${state.totalPrompts}) | ✅ Complete |
| Phase 3A: Integration Check | ✅ Complete |
| Phase 3B: Feature Completeness | ✅ Complete |
| Phase 4: Documentation | ✅ Complete |

## 📊 Statistics

- **Total Prompts Executed:** ${state.totalPrompts}
- **Total Iterations:** ${state.currentIteration}
- **Total Time:** ${hours}h ${minutes}m
- **Last Commit:** ${state.lastCommit || "N/A"}

## 🚀 Next Steps

1. Review the generated documentation
2. Run the test suite: \`npm test\`
3. Deploy to staging: See DEPLOYMENT.md
4. Share with users for feedback

---

The MVP is ready for deployment!

<promise>MVP_COMPLETE</promise>`
}

// ============================================================================
// MAIN PLUGIN EXPORT
// ============================================================================

export const MVPBuilderPlugin: Plugin = async ({ directory, client }) => {
  return {
    event: async ({ event }) => {
      if (event.type !== "session.idle") return

      const state = parseState(directory)
      if (!state || !state.active) return

      // Safety: Check iteration limit
      if (state.currentIteration >= state.maxIterations) {
        deleteState(directory)
        await client.app.log({
          service: "mvp-builder",
          level: "warn",
          message: `⚠️ MVP Builder stopped: max iterations (${state.maxIterations}) reached`,
        })
        return
      }

      // Get last assistant message to check for completion promises
      let shouldAdvance = false
      let commitMessage = ""
      let nextPhase = state.phase

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
            const hasPromise = (promise: string) => {
              const match = textContent.match(/<promise>([\s\S]*?)<\/promise>/)
              return match && match[1].trim() === promise
            }

            switch (state.phase) {
              case "generating_plan":
                if (hasPromise("SEQUENCE_PLAN_COMPLETE")) {
                  nextPhase = "generating_prompts"
                  commitMessage = "MVP Builder: Generated prompt sequence plan"
                  shouldAdvance = true
                }
                break

              case "generating_prompts":
                if (hasPromise("PROMPTS_GENERATED")) {
                  // Discover generated prompt files
                  const instructionsPath = join(directory, state.instructionsPath)
                  state.promptSequence = discoverPromptFiles(instructionsPath)
                  state.totalPrompts = state.promptSequence.length
                  
                  if (state.promptSequence.length > 0) {
                    state.currentPromptIndex = 0
                    state.promptSequence[0].status = "in_progress"
                    nextPhase = "executing"
                    commitMessage = `MVP Builder: Generated ${state.totalPrompts} execution prompts`
                    shouldAdvance = true
                  } else {
                    // No prompts found, log error but continue
                    await client.app.log({
                      service: "mvp-builder",
                      level: "error",
                      message: `No prompt files found in ${instructionsPath}. Looking for prompt_01.md, prompt_02.md, etc.`,
                    })
                  }
                }
                break

              case "executing":
                if (hasPromise("PROMPT_COMPLETE")) {
                  // Mark current prompt as complete
                  if (state.promptSequence[state.currentPromptIndex]) {
                    state.promptSequence[state.currentPromptIndex].status = "completed"
                    commitMessage = `MVP Builder: Completed ${state.promptSequence[state.currentPromptIndex].filename}`
                  }

                  // Move to next prompt or next phase
                  if (state.currentPromptIndex + 1 < state.totalPrompts) {
                    state.currentPromptIndex++
                    state.promptSequence[state.currentPromptIndex].status = "in_progress"
                    nextPhase = "executing" // Stay in executing phase
                  } else {
                    nextPhase = "qa_integration"
                    commitMessage = "MVP Builder: All execution prompts completed"
                  }
                  shouldAdvance = true
                }
                break

              case "qa_integration":
                if (hasPromise("INTEGRATION_CHECK_COMPLETE")) {
                  nextPhase = "qa_completeness"
                  commitMessage = "MVP Builder: Integration check complete"
                  shouldAdvance = true
                }
                break

              case "qa_completeness":
                if (hasPromise("MVP_READY")) {
                  nextPhase = "documentation"
                  commitMessage = "MVP Builder: MVP readiness verified"
                  shouldAdvance = true
                }
                break

              case "documentation":
                if (hasPromise("DOCUMENTATION_COMPLETE")) {
                  nextPhase = "complete"
                  commitMessage = "MVP Builder: Documentation complete"
                  shouldAdvance = true
                }
                break

              case "complete":
                if (hasPromise("MVP_COMPLETE")) {
                  // Final cleanup
                  const finalHash = gitCommit(directory, "MVP Builder: MVP COMPLETE 🎉")
                  deleteState(directory)
                  await client.app.log({
                    service: "mvp-builder",
                    level: "info",
                    message: `🎉 MVP Builder completed successfully! Final commit: ${finalHash}`,
                  })
                  return
                }
                break
            }
          }
        }
      } catch (err) {
        await client.app.log({
          service: "mvp-builder",
          level: "warn",
          message: `Could not check session: ${err}`,
        })
      }

      // Commit changes if advancing
      if (shouldAdvance && commitMessage) {
        const hash = gitCommit(directory, commitMessage)
        if (hash) {
          state.lastCommit = hash
          await client.app.log({
            service: "mvp-builder",
            level: "info",
            message: `📝 Committed: ${commitMessage} (${hash})`,
          })
        }
        state.phase = nextPhase
      }

      // Increment iteration
      state.currentIteration++
      writeState(directory, state)

      // Build status message
      let statusMsg = `MVP Builder | Iteration ${state.currentIteration}/${state.maxIterations} | Phase: ${state.phase}`
      if (state.phase === "executing") {
        statusMsg += ` | Prompt ${state.currentPromptIndex + 1}/${state.totalPrompts}`
      }

      await client.app.log({
        service: "mvp-builder",
        level: "info",
        message: statusMsg,
      })

      // Build the prompt for the current phase
      let prompt: string
      switch (state.phase) {
        case "generating_plan":
          prompt = buildPhase1APrompt(state, directory)
          break
        case "generating_prompts":
          prompt = buildPhase1BPrompt(state, directory)
          break
        case "executing":
          prompt = buildPhase2Prompt(state, directory)
          break
        case "qa_integration":
          prompt = buildPhase3APrompt(state, directory)
          break
        case "qa_completeness":
          prompt = buildPhase3BPrompt(state, directory)
          break
        case "documentation":
          prompt = buildPhase4Prompt(state, directory)
          break
        case "complete":
          prompt = buildCompletePrompt(state)
          break
        default:
          prompt = "Unknown phase. Please run /mvp-cancel and restart."
      }

      // Send the prompt to continue the session
      await client.session.send({
        id: event.properties.sessionID,
        text: `[${statusMsg}]\n\n${prompt}`,
      })
    },
  }
}
