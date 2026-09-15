# 🧠 Project Memory: UptimeVault

## 1. Core Purpose & Overview
**UptimeVault** is an offline-first network uptime and connectivity monitoring system designed to track, log, and generate undeniable proof of ISP connection drops.

### Key Capabilities:
- **Dual-Mode Operation**:
  - **Desktop Application (Electron)**: Direct local disk persistence (`network_log.db`), automated hourly backups, exit-time persistence, and native file dialog CSV export.
  - **Web Application (Browser)**: In-browser execution using WebAssembly SQLite (`sql.js`) backed by browser `IndexedDB` for client-side persistence without external servers.
- **Unbiased Connectivity Verification**: Actively checks connectivity against impartial external targets (default: `https://www.google.com/favicon.ico`) with fast (1-second) polling and timeout guards.
- **Evidence Generation**: Records state transitions (`Up` / `Down`) with precise ISO timestamps and provides CSV export capabilities for ISP dispute claims.

---

## 2. Tech Stack & Dependencies

### Core Frameworks & Runtime
- **Runtime**: Node.js (v26+ compatible, LTS recommended)
- **Desktop Wrapper**: Electron (`^34.0.0`, verified `34.5.8`)
- **App Builder / Packager**: `electron-builder` (`^25.1.8`) (targets Windows NSIS, macOS DMG, Linux AppImage)

### Database & Storage
- **In-Memory Engine**: `sql.js` (`^1.13.0`, verified `1.14.2`) — SQLite compiled to WebAssembly (WASM)
- **Desktop Storage**: Node `fs` writing SQLite binary buffers to `userData/network_log.db` and hourly backups to `userData/network_backups/`
- **Web Storage**: `IndexedDB` key-value store (`networkMonitorDB` / `sqliteData`) storing serialized `sql.js` binary buffers

### Frontend & UI
- **Markup**: Semantic HTML5 (`index.html`)
- **Styling**: Tailwind CSS (CDN) + Custom CSS keyframe animations (pulsing status indicators)
- **Icons**: Phosphor Icons (`@phosphor-icons/web`)
- **Audio Assets**: Local alert audio files (`assets/alert.mp3`)

### Utilities & Libraries
- **Date Handling**: `date-fns` (`^4.1.0`, verified `4.4.0`)
- **Logging**: `electron-log` (`^5.4.4`)
- **Auto-Updates**: `electron-updater` (`^6.8.9`)

---

## 3. Project Architecture & Structure

```
uptimevault/
├── .agent/                         # AI memory, workflows, and session guides
│   ├── AGENT.md                    # Project memory & architecture reference
│   ├── SKILL.md                    # Reusable AI workflows & skills
│   └── USAGE.md                    # Agent onboarding & invocation guide
├── assets/                         # Visual & sound assets
│   ├── UptimeVault-by-Woliul-Hasan.png  # Preview / screenshot
│   ├── alert.mp3                   # Alert notification sound
│   └── network.png                 # App icon asset (PNG)
├── sql/                            # Standalone SQLite WebAssembly binaries
│   ├── sql-wasm.js                 # JS loader for SQL.js WASM
│   └── sql-wasm.wasm               # Compiled SQLite WebAssembly binary
├── index.html                      # Unified frontend UI & browser runtime logic
├── main.js                         # Electron main process (lifecycle, backups, IPC)
├── preload.js                      # Secure context isolation bridge (`window.api`)
├── network.ico                     # Windows application icon
├── package.json                    # Project configuration, scripts, build config
├── README.md                       # User-facing documentation & quickstart
└── task.md                         # Active workspace task scratchpad
```

### Process Architecture:
1. **Main Process (`main.js`)**:
   - Manages Electron app lifecycle and window creation (`BrowserWindow`).
   - Loads and initializes `sql.js` database in memory, loading from `userData/network_log.db` on startup.
   - Enforces periodic hourly backups (`autoHourlyBackup`) and safe write on quit (`before-quit`).
   - IPC Handlers: `load-logs`, `insert-log`, `clear-logs`, `export-log-csv`.
2. **Preload Bridge (`preload.js`)**:
   - Enforces `contextIsolation: true`, `nodeIntegration: false`.
   - Exposes safe `window.api` methods to the renderer.
3. **Renderer Process (`index.html`)**:
   - Manages UI state, status indicators, and activity log tables.
   - In desktop mode, delegates database operations via `window.api`.
   - In web/standalone mode, executes standalone `sql.js` + `IndexedDB` routines directly in the browser thread.

---

## 4. Current Development State

- **Current Branch**: `fix/desktop-ui-and-csv-export`
- **Release Version**: `1.0.6`
- **Working / Verified Features**:
  - ✅ 1-second auto-monitoring ping cycle with timeout abort controllers.
  - ✅ State transition logging (avoiding duplicate pings; logs on status change).
  - ✅ Complete SQLite database schema (`network_log` / `network_logs` with `id`, `timestamp`, `status`).
  - ✅ Local persistence in both Electron (`userData`) and browser (`IndexedDB`).
  - ✅ CSV export with formatted timestamps and native dialog fallback.
  - ✅ Responsive dashboard UI with pulsing dot status indicators.
  - ✅ **Modernized Runtime & Dependencies**:
    - Electron upgraded from `^22.0.0` (deprecated) to stable `^34.0.0` (`34.5.8`).
    - `electron-builder` upgraded to `^25.1.8`, `electron-updater` to `^6.8.9`, `electron-log` to `^5.4.4`.
    - Synchronized `sql/sql-wasm.wasm` and `sql/sql-wasm.js` with `sql.js@1.14.2` resolving the `TypeError: y is not a function` Emscripten mismatch.
    - Hardened `main.js`: enhanced WASM local path loading, window destruction check (`!mainWindow.isDestroyed()`), and safe dialog parenting.
    - Updated `package.json` `build.files` to include `preload.js` for ASAR builds.
    - Added root `.gitignore` to prevent tracking `node_modules/`, `.DS_Store`, and local database files.
  - ✅ **Desktop UI & CSV Export Fixes (Issue #9)**:
    - Conditionally hides redundant "Download Desktop App" header banner when running inside the Electron desktop shell (`window.api`).
    - Formats CSV export filenames using local system time (`network_log_YYYY-MM-DD_HH-mm-ss.csv`) across both `main.js` and `index.html`.
    - Uses local system timestamps for archival auto-backup filenames (`network_log_backup_YYYY-MM-DD_HH-mm-ss.db`).
- **In-Progress / Upcoming Initiatives**:
  - 🔄 Integrating sound alerts (`alert.mp3`) on connectivity drops/restorations.
  - 🔄 Migration of CDN-based Tailwind / Phosphor dependencies to local bundled assets for 100% offline self-containment.
  - 🔄 Native auto-update wiring with `electron-updater` and GitHub releases.

---

## 5. Development Guidelines & Conventions
- **Cross-Platform Compatibility**: Keep path operations handled via Node `path.join()` or Web standards. Ensure file writes respect Electron `userData` sandbox.
- **Offline-First Principle**: Do not introduce hard runtime dependencies on external CDNs or remote APIs without offline fallbacks.
- **Dual Runtime Support**: When updating `index.html`, verify that both desktop (`window.api` present) and web standalone mode continue to function gracefully.
- **Database Safety**: Never execute destructive table drops or mass deletions without explicit user intent and proper disk synchronization via `performBackup()`.
