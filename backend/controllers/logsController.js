// controllers/logsController.js
/**
 * Logs Controller - Manage application logs and file logging
 */

const logger = require("../utils/logger");

/**
 * Get log statistics and configuration
 */
exports.getLogStats = (req, res) => {
    try {
        const stats = logger.getLogStats();
        const status = logger.getLoggingStatus();
        
        res.json({
            success: true,
            config: {
                fileLoggingEnabled: status.fileLoggingEnabled,
                logDirectory: status.logDirectory,
                logFileName: status.logFileName,
                logFilePath: status.logFilePath,
                maxLogSize: status.maxLogSize,
                keepBackups: status.keepBackups
            },
            stats: stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error getting log stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get log statistics",
            message: error.message
        });
    }
};

/**
 * Get recent log entries
 */
exports.getRecentLogs = (req, res) => {
    try {
        const lines = parseInt(req.query.lines) || 100;
        const logs = logger.getRecentLogs(lines);

        if (logs.error) {
            return res.status(404).json({
                success: false,
                error: logs.error,
                message: "Log file not available or file logging is disabled"
            });
        }

        res.json({
            success: true,
            logs: logs,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error getting recent logs:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get recent logs",
            message: error.message
        });
    }
};

/**
 * Test logging endpoint - generates sample log entries
 */
exports.testLogging = (req, res) => {
    try {
        console.log("🔧 Test log entry - INFO level");
        console.warn("⚠️ Test log entry - WARNING level");
        console.error("❌ Test log entry - ERROR level");
        console.info("📝 Test log entry - INFO level with data:", { 
            test: true, 
            timestamp: new Date().toISOString(),
            requestId: req.headers["x-request-id"] || "test-req-" + Date.now()
        });

        res.json({
            success: true,
            message: "Test log entries generated",
            entriesAdded: 4,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error in test logging:", error);
        res.status(500).json({
            success: false,
            error: "Failed to generate test logs",
            message: error.message
        });
    }
};

/**
 * Toggle file logging (hot toggle - no restart required)
 */
exports.toggleFileLogging = (req, res) => {
    try {
        const result = logger.toggleFileLogging();
        
        res.json({
            success: true,
            message: "File logging toggled successfully",
            previousState: result.previousState,
            currentState: result.currentState,
            logFilePath: result.logFilePath,
            note: "Hot toggle applied - no restart required",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error toggling file logging:", error);
        res.status(500).json({
            success: false,
            error: "Failed to toggle file logging",
            message: error.message
        });
    }
};

/**
 * Get logging configuration help
 */
exports.getLoggingHelp = (req, res) => {
    const help = {
        environmentVariables: {
            ENABLE_FILE_LOGGING: {
                description: "Enable or disable file logging",
                type: "boolean (true/false)",
                default: "false",
                example: "ENABLE_FILE_LOGGING=true"
            },
            LOG_DIRECTORY: {
                description: "Directory to store log files",
                type: "string",
                default: "logs",
                example: "LOG_DIRECTORY=logs"
            },
            LOG_FILE_NAME: {
                description: "Name of the log file",
                type: "string", 
                default: "application.log",
                example: "LOG_FILE_NAME=chatgpt-demo.log"
            },
            MAX_LOG_SIZE: {
                description: "Maximum log file size in bytes before rotation",
                type: "number",
                default: "10485760 (10MB)",
                example: "MAX_LOG_SIZE=20971520"
            },
            LOG_BACKUPS: {
                description: "Number of backup log files to keep",
                type: "number",
                default: "5",
                example: "LOG_BACKUPS=10"
            }
        },
        usage: {
            enableFileLogging: "Add ENABLE_FILE_LOGGING=true to your .env file (startup) OR use POST /api/logs/toggle (hot toggle)",
            hotToggle: "Use POST /api/logs/toggle to enable/disable file logging without restart",
            customizeSettings: "Set any of the environment variables above",
            restart: "Restart only needed for environment variable changes, not for hot toggle",
            viewLogs: "Use GET /api/logs/recent to view recent log entries",
            logStats: "Use GET /api/logs/stats to view log file statistics"
        },
        endpoints: {
            "GET /api/logs/stats": "Get log statistics and configuration",
            "GET /api/logs/recent?lines=100": "Get recent log entries",
            "POST /api/logs/test": "Generate test log entries", 
            "POST /api/logs/toggle": "Toggle file logging (hot toggle - no restart required)",
            "GET /api/logs/help": "Show this help information"
        }
    };

    res.json({
        success: true,
        help: help,
        currentConfig: {
            fileLoggingEnabled: logger.getLoggingStatus().fileLoggingEnabled,
            logDirectory: logger.getLoggingStatus().logDirectory,
            logFileName: logger.getLoggingStatus().logFileName
        },
        timestamp: new Date().toISOString()
    });
};