type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

type LogEntry = {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
};

class DebugLogger {
  // Only enable in development by default
  private enabled = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];

  private log(level: LogLevel, message: string, data?: any) {
    if (!this.enabled) return;

    const timestamp = new Date();
    this.logs.push({ timestamp, level, message, data });

    const emoji: Record<LogLevel, string> = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
    };

    const style: Record<LogLevel, string> = {
      info: 'color: #3b82f6',
      success: 'color: #10b981',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
      debug: 'color: #8b5cf6',
    };

    // Use console.log with CSS styling in browsers; harmless in Node
    // eslint-disable-next-line no-console
    console.log(
      `%c${emoji[level]} [${timestamp.toISOString()}] ${message}`,
      style[level],
      data ?? ''
    );
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  success(message: string, data?: any) {
    this.log('success', message, data);
  }

  warning(message: string, data?: any) {
    this.log('warning', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  debug(message: string, data?: any) {
    this.log('debug', message, data);
  }

  getLogs() {
    return this.logs;
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new DebugLogger();

