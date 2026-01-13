type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

const styles = {
  info: 'color: #3b82f6; font-weight: bold;',
  warn: 'color: #f59e0b; font-weight: bold;',
  error: 'color: #ef4444; font-weight: bold;',
  debug: 'color: #6b7280; font-weight: bold;',
  success: 'color: #10b981; font-weight: bold;',
};

const icons = {
  info: 'ℹ️',
  warn: '⚠️',
  error: '🚨',
  debug: '🐞',
  success: '✅',
};

class Logger {
  private isDev = import.meta.env.DEV;

  private print(level: LogLevel, message: string, ...args: any[]) {
    if (!this.isDev && level === 'debug') return;

    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `%c [${timestamp}] ${icons[level]} [${level.toUpperCase()}]:`,
      styles[level],
      message,
      ...args
    );
  }

  info(message: string, ...args: any[]) {
    this.print('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.print('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.print('error', message, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.print('debug', message, ...args);
  }

  success(message: string, ...args: any[]) {
    this.print('success', message, ...args);
  }
}

export const logger = new Logger();
