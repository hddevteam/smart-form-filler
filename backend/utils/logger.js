// utils/logger.js
/**
 * Logger utility with file output capability
 * Provides console and file logging with easy toggle
 */

const fs = require("fs");
const path = require("path");

class Logger {
    constructor() {
        // Configuration from environment variables
        this.enableFileLogging = process.env.ENABLE_FILE_LOGGING === "true";
        this.logDirectory = process.env.LOG_DIRECTORY || "logs";
        this.logFileName = process.env.LOG_FILE_NAME || "application.log";
        this.maxLogSize = parseInt(process.env.MAX_LOG_SIZE) || 10 * 1024 * 1024; // 10MB default
        this.keepBackups = parseInt(process.env.LOG_BACKUPS) || 5;
        
        // Create logs directory if it doesn't exist
        if (this.enableFileLogging) {
            this.ensureLogDirectory();
            this.logFilePath = path.join(this.logDirectory, this.logFileName);
            this.setupFileLogging();
        }

        // Store original console methods
        this.originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug
        };

        // Override console methods if file logging is enabled
        if (this.enableFileLogging) {
            this.overrideConsole();
        }

        console.log(`🔧 Logger initialized - File logging: ${this.enableFileLogging ? "ENABLED" : "DISABLED"}`);
        if (this.enableFileLogging) {
            console.log(`📁 Log file: ${this.logFilePath}`);
        }

        // Clear log on startup if enabled
        this.clearLogOnStartup();
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDirectory)) {
                fs.mkdirSync(this.logDirectory, { recursive: true });
                console.log(`📁 Created log directory: ${this.logDirectory}`);
            }
        } catch (error) {
            console.error(`❌ Failed to create log directory: ${error.message}`);
            this.enableFileLogging = false;
        }
    }

    setupFileLogging() {
        try {
            // Check if log file exists and its size
            if (fs.existsSync(this.logFilePath)) {
                const stats = fs.statSync(this.logFilePath);
                if (stats.size > this.maxLogSize) {
                    this.rotateLogFile();
                }
            }

            // Create log file if it doesn't exist
            if (!fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, `Log started at ${new Date().toISOString()}\n`);
            }
        } catch (error) {
            console.error(`❌ Failed to setup log file: ${error.message}`);
            this.enableFileLogging = false;
        }
    }

    rotateLogFile() {
        try {
            // Rotate existing backup files
            for (let i = this.keepBackups - 1; i >= 1; i--) {
                const oldFile = `${this.logFilePath}.${i}`;
                const newFile = `${this.logFilePath}.${i + 1}`;
                
                if (fs.existsSync(oldFile)) {
                    if (i === this.keepBackups - 1) {
                        fs.unlinkSync(oldFile); // Delete oldest backup
                    } else {
                        fs.renameSync(oldFile, newFile);
                    }
                }
            }

            // Move current log to .1
            if (fs.existsSync(this.logFilePath)) {
                fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
            }

            // Create new log file
            fs.writeFileSync(this.logFilePath, `Log rotated at ${new Date().toISOString()}\n`);
            console.log("🔄 Log file rotated");
        } catch (error) {
            console.error(`❌ Failed to rotate log file: ${error.message}`);
        }
    }

    writeToFile(level, args) {
        if (!this.enableFileLogging) return;

        try {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => 
                typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(" ");
            
            const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
            
            // Append to log file
            fs.appendFileSync(this.logFilePath, logEntry);

            // Check file size and rotate if necessary
            const stats = fs.statSync(this.logFilePath);
            if (stats.size > this.maxLogSize) {
                this.rotateLogFile();
            }
        } catch (error) {
            // Restore original console for error reporting
            this.originalConsole.error(`❌ Failed to write to log file: ${error.message}`);
        }
    }

    overrideConsole() {
        console.log = (...args) => {
            this.originalConsole.log(...args);
            this.writeToFile("log", args);
        };

        console.info = (...args) => {
            this.originalConsole.info(...args);
            this.writeToFile("info", args);
        };

        console.warn = (...args) => {
            this.originalConsole.warn(...args);
            this.writeToFile("warn", args);
        };

        console.error = (...args) => {
            this.originalConsole.error(...args);
            this.writeToFile("error", args);
        };

        console.debug = (...args) => {
            this.originalConsole.debug(...args);
            this.writeToFile("debug", args);
        };
    }

    // Method to manually log with custom level
    log(level, ...args) {
        const logMethod = this.originalConsole[level] || this.originalConsole.log;
        logMethod(...args);
        
        if (this.enableFileLogging) {
            this.writeToFile(level, args);
        }
    }

    // Hot toggle file logging without restart
    toggleFileLogging() {
        const wasEnabled = this.enableFileLogging;
        this.enableFileLogging = !this.enableFileLogging;
        
        if (this.enableFileLogging && !wasEnabled) {
            // Enable file logging
            this.ensureLogDirectory();
            this.logFilePath = path.join(this.logDirectory, this.logFileName);
            this.setupFileLogging();
            this.overrideConsole();
            console.log("🔧 File logging ENABLED (hot toggle)");
        } else if (!this.enableFileLogging && wasEnabled) {
            // Disable file logging
            this.restore();
            console.log("🔧 File logging DISABLED (hot toggle)");
        }
        
        return {
            success: true,
            previousState: wasEnabled,
            currentState: this.enableFileLogging,
            logFilePath: this.enableFileLogging ? this.logFilePath : null
        };
    }

    // Get current logging status
    getLoggingStatus() {
        return {
            fileLoggingEnabled: this.enableFileLogging,
            logDirectory: this.logDirectory,
            logFileName: this.logFileName,
            logFilePath: this.enableFileLogging ? this.logFilePath : null,
            maxLogSize: this.maxLogSize,
            keepBackups: this.keepBackups
        };
    }

    // Restore original console methods
    restore() {
        console.log = this.originalConsole.log;
        console.info = this.originalConsole.info;
        console.warn = this.originalConsole.warn;
        console.error = this.originalConsole.error;
        console.debug = this.originalConsole.debug;
    }

    // Get log file stats
    getLogStats() {
        if (!this.enableFileLogging || !fs.existsSync(this.logFilePath)) {
            return null;
        }

        try {
            const stats = fs.statSync(this.logFilePath);
            return {
                path: this.logFilePath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modified: stats.mtime,
                created: stats.birthtime
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    }

    // Read recent log entries
    getRecentLogs(lines = 100) {
        if (!this.enableFileLogging || !fs.existsSync(this.logFilePath)) {
            return { error: "Logging not enabled or log file not found" };
        }

        try {
            const content = fs.readFileSync(this.logFilePath, "utf8");
            const allLines = content.split("\n").filter(line => line.trim());
            const recentLines = allLines.slice(-lines);
            
            return {
                totalLines: allLines.length,
                recentLines: recentLines,
                showing: recentLines.length
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    /**
     * Clear the log file
     */
    clearLog() {
        if (!this.enableFileLogging) {
            console.log("🔧 File logging disabled, nothing to clear");
            return { success: false, message: "File logging disabled" };
        }

        try {
            if (fs.existsSync(this.logFilePath)) {
                fs.writeFileSync(this.logFilePath, `Log cleared at ${new Date().toISOString()}\n`);
                console.log("🧹 Application log cleared");
                return { success: true, message: "Log cleared successfully" };
            } else {
                return { success: false, message: "Log file not found" };
            }
        } catch (error) {
            console.error(`❌ Failed to clear log: ${error.message}`);
            return { success: false, message: error.message };
        }
    }

    /**
     * Clear log on startup (called during initialization)
     */
    clearLogOnStartup() {
        if (process.env.CLEAR_LOG_ON_STARTUP === "true") {
            this.clearLog();
        }
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;
