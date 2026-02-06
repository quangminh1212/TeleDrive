/**
 * Frontend Logger Utility
 * Real-time logging - sends logs immediately to backend for file storage
 */

// Backend API URL - must be absolute for Tauri WebView
const API_URL = 'http://127.0.0.1:5000';

interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  data?: any;
}

class Logger {
  private static instance: Logger;
  private logToBackend: boolean = true;
  private pendingLogs: LogEntry[] = [];
  private isSending: boolean = false;
  private retryQueue: LogEntry[] = [];

  private constructor() {
    // Setup periodic retry for failed logs
    setInterval(() => this.retryFailedLogs(), 10000);

    // Log initialization
    this.info('Logger', 'Frontend logger initialized - real-time mode');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  private formatMessage(level: string, component: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    let formatted = `[${timestamp}] [${level}] [${component}] ${message}`;
    if (data !== undefined) {
      try {
        formatted += ` | Data: ${JSON.stringify(data)}`;
      } catch {
        formatted += ` | Data: [unable to serialize]`;
      }
    }
    return formatted;
  }

  private log(level: string, component: string, message: string, data?: any) {
    const timestamp = this.getTimestamp();
    const formatted = this.formatMessage(level, component, message, data);

    // Log to console
    switch (level) {
      case 'ERROR':
        console.error(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'INFO':
        console.info(formatted);
        break;
      case 'DEBUG':
      default:
        console.log(formatted);
        break;
    }

    // Send to backend immediately (real-time)
    if (this.logToBackend) {
      const logEntry: LogEntry = {
        timestamp,
        level,
        component,
        message,
        data
      };
      this.sendLogImmediate(logEntry);
    }
  }

  private async sendLogImmediate(logEntry: LogEntry) {
    // Add to pending queue
    this.pendingLogs.push(logEntry);

    // Process queue if not already sending
    if (!this.isSending) {
      this.processQueue();
    }
  }

  private async processQueue() {
    if (this.pendingLogs.length === 0) {
      this.isSending = false;
      return;
    }

    this.isSending = true;

    // Get all pending logs
    const logsToSend = [...this.pendingLogs];
    this.pendingLogs = [];

    try {
      const response = await fetch(`${API_URL}/api/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });

      if (!response.ok) {
        // Add to retry queue
        this.retryQueue.push(...logsToSend);
      }
    } catch {
      // Network error - add to retry queue (silent, don't log to avoid loop)
      this.retryQueue.push(...logsToSend);
    }

    // Continue processing if more logs arrived
    if (this.pendingLogs.length > 0) {
      // Small delay to batch rapid logs
      setTimeout(() => this.processQueue(), 50);
    } else {
      this.isSending = false;
    }
  }

  private async retryFailedLogs() {
    if (this.retryQueue.length === 0) return;

    const logsToRetry = this.retryQueue.splice(0, 20); // Retry max 20 at a time

    try {
      await fetch(`${API_URL}/api/logs/frontend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToRetry }),
      });
    } catch {
      // If retry fails, discard old logs to prevent memory leak
      if (this.retryQueue.length > 100) {
        this.retryQueue = this.retryQueue.slice(-50);
      }
    }
  }

  public debug(component: string, message: string, data?: any) {
    this.log('DEBUG', component, message, data);
  }

  public info(component: string, message: string, data?: any) {
    this.log('INFO', component, message, data);
  }

  public warn(component: string, message: string, data?: any) {
    this.log('WARN', component, message, data);
  }

  public error(component: string, message: string, data?: any) {
    this.log('ERROR', component, message, data);
  }

  public setBackendLogging(enabled: boolean) {
    this.logToBackend = enabled;
  }

  public async flush() {
    // Force send all pending logs synchronously
    if (this.pendingLogs.length > 0) {
      const logsToSend = [...this.pendingLogs];
      this.pendingLogs = [];

      try {
        await fetch(`${API_URL}/api/logs/frontend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logs: logsToSend }),
        });
      } catch {
        // Silent fail on flush
      }
    }
  }

  public destroy() {
    this.info('Logger', 'Frontend logger shutting down');
    this.flush();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Cleanup on page unload - use sendBeacon for reliable delivery
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for guaranteed delivery on page unload
    if (navigator.sendBeacon) {
      const logEntry = {
        logs: [{
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 23),
          level: 'INFO',
          component: 'Logger',
          message: 'Frontend session ended'
        }]
      };
      navigator.sendBeacon(`${API_URL}/api/logs/frontend`, JSON.stringify(logEntry));
    }
  });

  // Also handle visibility change for tab switching
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      logger.flush();
    }
  });
}
