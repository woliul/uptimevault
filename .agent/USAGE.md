# 📖 Agent Onboarding & Usage Guide

> **Notice to AI Agents**: This document is your operational manual for working on the **UptimeVault** codebase. Follow this step-by-step procedure at the start and conclusion of every session.

---

## 🚀 Session Ingestion Protocol (Start of Every Session)

When you begin a task in this repository, execute the following bootstrap steps before writing or modifying any code:

### Step 1: Read Project Memory
1. Read [`.agent/AGENT.md`](file:///Users/genetx/uptimevault/.agent/AGENT.md) to load:
   - The core mission and dual-mode architecture (Desktop vs Web Standalone).
   - The current tech stack versions (`Electron`, `sql.js`, `Tailwind`, etc.).
   - The folder structure and architectural boundaries.
   - The **Current Development State** (active branch, completed features, known issues).

### Step 2: Ingest Available Skills
1. Read [`.agent/SKILL.md`](file:///Users/genetx/uptimevault/.agent/SKILL.md) to inspect reusable commands and standard operational workflows.
2. Determine which skills match your current user objective (e.g., `@Run Diagnostics`, `@Start Dev Mode`, `@Build Desktop App`).

### Step 3: Inspect Current Workspace State
1. Check the active git branch and uncommitted changes:
   ```bash
   git status
   ```
2. Verify active dependencies:
   ```bash
   npm ls --depth=0
   ```

---

## ⚙️ Executing Skills from `SKILL.md`

When executing a task or command:
1. **Identify the Skill**: Match the user's intent to the corresponding skill in [`SKILL.md`](file:///Users/genetx/uptimevault/.agent/SKILL.md).
2. **Follow Skill Steps Sequentially**: Execute the bash commands or inspection routines defined in the skill definition.
3. **Handle Errors Safely**: If a skill command fails (e.g., build failure or missing WASM binary), inspect relevant log outputs, check `package.json` configurations, and resolve the root cause.

---

## 🏁 Session Conclusion Protocol (Mandatory `@Update Memory`)

Before completing your session or returning final confirmation to the user:

1. **Trigger `@Update Memory`**:
   - Run `git status` and `git diff` to review all files changed during the session.
2. **Update [`.agent/AGENT.md`](file:///Users/genetx/uptimevault/.agent/AGENT.md)**:
   - Update the **Current Development State** with any newly completed features, fixed bugs, or identified issues.
   - If dependencies, scripts, or folder structures were added or modified, update Sections 2 and 3 accordingly.
3. **Update [`.agent/SKILL.md`](file:///Users/genetx/uptimevault/.agent/SKILL.md)**:
   - Add new reusable skills if new development patterns, test scripts, or deployment routines were created.
4. **Summary**:
   - Present a concise summary of changes and reference updated documentation files to the user.
