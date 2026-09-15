# ⚡ AI Skills & Workflows: UptimeVault

This document specifies standard, reusable workflows (skills) that AI agents can execute within the UptimeVault project.

---

## 🛠️ Reusable AI Skills & Commands

### 1. `@Update Memory` (Mandatory Post-Session Protocol)
* **Goal**: Synchronize project memory with recent code modifications, architecture refactors, dependency updates, and feature changes.
* **When to Run**: At the conclusion of any feature implementation, bug fix, dependency update, or development session.
* **Execution Steps**:
  1. **Analyze Working Tree & Git Log**:
     - Run `git status` to see all modified, added, or deleted files.
     - Run `git diff --staged` and `git diff` (or `git log -n 5 --oneline`) to inspect exact changes made during the session.
  2. **Review & Update `.agent/AGENT.md`**:
     - Check if the **Tech Stack & Dependencies** changed (e.g., version bumps in `package.json`).
     - Check if the **Folder Structure** was modified (new directories or renamed files).
     - Update **Section 4: Current Development State**:
       - Mark completed items with ✅.
       - Add any new ongoing tasks or known issues to 🔄.
       - Update the current version or active branch if changed.
  3. **Review & Update `.agent/SKILL.md`**:
     - If new build scripts, test commands, or common maintenance workflows were introduced, add them as new skills or update existing skill definitions.
  4. **Log Changes in Task / Walkthrough**:
     - Ensure all modified files and tested flows are accurately recorded.

---

### 2. `@Run Diagnostics`
* **Goal**: Validate codebase integrity, Electron main process startup, and package configuration.
* **Execution Steps**:
  1. Verify `package.json` syntax and dependencies:
     ```bash
     npm ls --depth=0
     ```
  2. Check for syntax errors in JavaScript files:
     ```bash
     node --check main.js preload.js
     ```
  3. Validate database asset availability:
     - Ensure `sql/sql-wasm.wasm` and `sql/sql-wasm.js` exist.
     - Ensure required icon and media assets are in `assets/`.

---

### 3. `@Start Dev Mode`
* **Goal**: Launch the Electron desktop application locally for interactive verification.
* **Execution Steps**:
  1. Run the local development startup script:
     ```bash
     npm start
     ```
  2. Verify that the window initializes without crashing, IPC handlers register properly, and the database initializes.

---

### 4. `@Build Desktop App`
* **Goal**: Package and generate production distributables for target operating systems.
* **Execution Steps**:
  1. Ensure all assets and dependencies are clean and installed.
  2. Execute the Electron Builder pipeline:
     ```bash
     npm run build
     ```
  3. Inspect the `dist/` directory to confirm generation of installers (e.g., `.dmg`, `.exe`, or `.AppImage`).

---

### 5. `@Audit Offline & Standalone Capability`
* **Goal**: Ensure the app functions completely without external network dependencies beyond the ping target.
* **Execution Steps**:
  1. Inspect `index.html` for third-party remote CDN dependencies (e.g., Tailwind CDN, Phosphor Icons CDN, external script URLs).
  2. Verify that `IndexedDB` fallback and local `sql-wasm.js` paths load correctly if running disconnected from the internet.
  3. Report any CDN links that should be localized for full offline compliance.

---

### 6. `@Inspect Database State`
* **Goal**: Safely inspect or troubleshoot the SQLite schema and persistent database files.
* **Execution Steps**:
  1. Verify schema definition in `main.js` (`network_log`) and `index.html` (`network_logs`).
  2. Check IPC handler implementations (`load-logs`, `insert-log`, `clear-logs`, `export-log-csv`).
  3. Validate backup directory structure (`userData/network_backups/`).
