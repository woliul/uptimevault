// Modules to control application life and create native browser window
const fs = require('fs');
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const initSqlJs = require('sql.js');

// --- Database Configuration ---
// Path for the main persistent database file
const dbPath = path.join(app.getPath('userData'), 'network_log.db');
// Path for the archival backup directory
const backupDir = path.join(app.getPath('userData'), 'network_backups');
let db; // Global reference to the in-memory SQL.js database
let lastLogId = 0; // Global counter to track the last inserted ID

// Auto-backup interval: 1 hour (3600 seconds * 1000 ms)
const HOURLY_BACKUP_INTERVAL_MS = 3600000;

// --- Core Database Functions ---

/**
 * Exports the current in-memory database state to the specified file path.
 * This is used for persistence (saving to dbPath) and manual/auto backups.
 * @param {string} filePath - The full path to save the backup file.
 */
function performBackup(filePath) {
    if (!db) {
        throw new Error('Database not initialized. Cannot perform backup.');
    }

    try {
        // Export the current in-memory database content
        const data = db.export();

        // Write the exported data to the file path
        fs.writeFileSync(filePath, Buffer.from(data));
        console.log(`[Persistence] Database saved/backed up to: ${filePath}`);

    } catch (error) {
        // If the error is simply "no such file or directory" during initial save, it's fine.
        if (error.code !== 'ENOENT') {
            throw new Error(`Backup/Export failed: ${error.message}`);
        }
    }
}


/**
 * Initializes the SQL.js database, loads existing data from disk,
 * and ensures the log table exists.
 */
async function initializeDatabase() {
    // Manually load the WASM binary using a reliable path
    let sql;
    try {
        // Locate the sql-wasm.wasm file. Prioritize local sql/ directory, then node_modules
        const localWasmPath = path.join(__dirname, 'sql', 'sql-wasm.wasm');
        const nodeModulesWasmPath = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
        const wasmPath = fs.existsSync(localWasmPath) ? localWasmPath : nodeModulesWasmPath;

        let wasmBinary;
        if (fs.existsSync(wasmPath)) {
            wasmBinary = fs.readFileSync(wasmPath);
            sql = await initSqlJs({ wasmBinary: wasmBinary });
        } else {
            // Fallback for different packaging structures or development
            sql = await initSqlJs();
        }

    } catch (e) {
        console.error('Failed to initialize sql.js:', e.message);
        throw e;
    }

    // 1. Ensure the backup directory exists
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log(`Created backup directory: ${backupDir}`);
    }

    // 2. Load the database file content from disk, or create a new one
    try {
        const filebuffer = fs.readFileSync(dbPath);
        db = new sql.Database(filebuffer);
        console.log(`Loaded persistent database from: ${dbPath}`);
    } catch (error) {
        // If file doesn't exist, create a new in-memory DB
        db = new sql.Database();
        console.log('Created new in-memory SQL.js database.');
    }

    // 3. Create the log table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS network_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT,
            status TEXT
        );
    `);
    console.log('Network logs table ensured.');

    // 4. Initialize the lastLogId from the last known ID value
    try {
        const result = db.exec("SELECT MAX(id) AS max_id FROM network_log");
        if (result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] !== null) {
            lastLogId = result[0].values[0][0];
        } else {
            lastLogId = 0;
        }
    } catch (e) {
        console.error('Failed to get MAX(id), resetting counter to 0:', e);
        lastLogId = 0;
    }
}


/**
 * Handles the periodic, silent backup routine.
 * 1. Saves the current state to the main persistent file (`network_log.db`).
 * 2. Creates a timestamped archival backup in the `network_backups` folder.
 */
async function autoHourlyBackup() {
    if (!db) return; // Exit if DB not ready

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

    // 1. Save to the main file (Persistence)
    performBackup(dbPath);

    // 2. Create timestamped backup file (Archival)
    const backupFileName = `network_log_backup_${dateStr}.db`;
    const backupFilePath = path.join(backupDir, backupFileName);

    try {
        performBackup(backupFilePath);
        console.log(`[Auto Backup] Archival backup created successfully: ${backupFileName}`);

        // Optional: Notify the renderer process of successful backup
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('backup-status', `Last Auto Backup: ${now.toLocaleTimeString()}`);
        }

    } catch (error) {
        console.error('Auto Backup failed:', error.message);
    }
}


// --- Electron Setup ---

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1000,
        height: 650,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
        title: 'Network Monitor (Electron Persistent)'
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); // Uncomment for debugging
}

app.whenReady().then(async () => {
    try {
        await initializeDatabase();
        createWindow();

        // Schedule the auto backup routine
        setInterval(autoHourlyBackup, HOURLY_BACKUP_INTERVAL_MS);
        console.log(`Hourly auto-backup scheduled to run every ${HOURLY_BACKUP_INTERVAL_MS / 3600000} hour(s).`);

    } catch (error) {
        console.error("Critical error during app initialization:", error);
        app.quit();
    }

    app.on('activate', function() {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Auto-backup on application quit
app.on('before-quit', async (event) => {
    // Ensure we don't accidentally quit before saving the latest data
    if (!db) return;

    // Perform a final save to the main database file
    try {
        performBackup(dbPath);
        console.log('Final save to persistent file complete before quit.');
    } catch (error) {
        console.error('Final persistence save failed:', error);
    }
});


// --- IPC Handlers (Renderer to Main) ---

ipcMain.handle('load-logs', () => {
    if (!db) return [];
    try {
        const res = db.exec("SELECT id, timestamp, status FROM network_log ORDER BY id DESC;");
        if (res.length === 0) return [];

        const columnNames = res[0].columns;
        const logs = res[0].values.map(row => {
            const log = {};
            columnNames.forEach((col, index) => {
                log[col] = row[index];
            });
            return log;
        });
        return logs;
    } catch (error) {
        console.error("Error reading logs from SQL database:", error);
        return [];
    }
});

ipcMain.handle('insert-log', async (event, logEntry) => {
    if (!db) return { success: false, error: 'Database not ready.' };

    try {
        const { status, timestamp } = logEntry;

        db.run(
            "INSERT INTO network_log (timestamp, status) VALUES (?, ?)",
            [timestamp, status]
        );

        // Get the new max ID for tracking
        const result = db.exec("SELECT MAX(id) AS max_id FROM network_log");
        if (result.length > 0 && result[0].values.length > 0) {
            lastLogId = result[0].values[0][0];
        }

        // We do NOT call performBackup here, as it would hit the disk on every 1-second check.
        // Persistence relies on the hourly backup and the final save-on-quit.

        return { success: true };
    } catch (error) {
        console.error('SQL.js insert failed:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('clear-logs', () => {
    if (!db) return { success: false, error: 'Database not ready.' };
    try {
        db.run('DELETE FROM network_log;');
        lastLogId = 0;
        // Also save the empty state to the persistent file immediately
        performBackup(dbPath);
        console.log('SQL log cleared and persistent file updated.');
        return { success: true };
    } catch (error) {
        console.error("Error clearing SQL database:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-log-csv', async () => {
    if (!db) return { success: false, message: 'Database not ready.' };

    // 1. Get all logs for CSV generation
    const res = db.exec("SELECT id, timestamp, status FROM network_log ORDER BY id ASC;");
    if (res.length === 0) return { success: false, message: 'No logs to export.' };

    const logs = res[0].values;
    const headers = ['ID', 'Timestamp_ISO', 'Status'];
    const csvRows = logs.map(log => {
        return `${log[0]},"${log[1]}",${log[2]}`;
    });

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    const defaultPath = path.join(app.getPath('downloads'), `network_log_${dateStr}.csv`);

    // 2. Show the native save dialog
    const parentWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    const { canceled, filePath } = await dialog.showSaveDialog(parentWindow, {
        title: 'Export Network Log CSV',
        defaultPath: defaultPath,
        buttonLabel: 'Save CSV',
        filters: [{ name: 'CSV File', extensions: ['csv'] }]
    });

    if (canceled || !filePath) {
        return { success: false, message: 'Export canceled by user.' };
    }

    // 3. Write the CSV content to the chosen file path
    try {
        fs.writeFileSync(filePath, csvContent);
        return { success: true, message: `CSV exported successfully to: ${filePath}` };
    } catch (error) {
        return { success: false, message: `CSV Export failed: ${error.message}` };
    }
});

app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit();
});
