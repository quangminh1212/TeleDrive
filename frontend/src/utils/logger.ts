/**
 * Frontend Logger Utility
 * Logs to console and optionally sends to backend for file logging
 */

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
  private logBuffer: LogEntry[] = [];
  private flushInterval: number = 5000; // Flush every 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Start flush timer
    this.startFlushTimer();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString().replace('T', ' ').substring(0, 23);
  }

  private formatMessage(level: string, component: string, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    let formatted = `[${timestamp}] [${level}] [${component}] ${message}`;
    if (data !== undefined) {
      formatted += ` | Data: ${JSON.stringify(data)}`;
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

    // Add to buffer for backend logging
    if (this.logToBackend) {
      this.logBuffer.push({
        timestamp,
        level,
        component,
        message,
        data
      });

      // If buffer is too large, flush immediately
      if (this.logBuffer.length >= 50) {
        this.flush();
      }
    }
  }

  private async flush() {
    if (this.logBuffer.length === 0) return;

    const logsToSend = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch('/api/logs/frontend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // Don't log this error to avoid infinite loop
      console.error('Failed to send logs to backend:', error);
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

  public destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.destroy();
  });
}
