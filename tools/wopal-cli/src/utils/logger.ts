import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

export class Logger {
  private debugMode: boolean;
  private logDir: string;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
    this.logDir = join(process.cwd(), 'logs');
  }

  private writeLog(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;

    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }

    appendFileSync(join(this.logDir, 'wopal-cli.log'), logLine);
  }

  debug(message: string): void {
    if (!this.debugMode) return;
    this.writeLog('DEBUG', message);
    console.log(`[DEBUG] ${message}`);
  }

  info(message: string): void {
    this.writeLog('INFO', message);
    console.log(message);
  }

  warn(message: string): void {
    this.writeLog('WARN', message);
    console.warn(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.writeLog('ERROR', message);
    console.error(`[ERROR] ${message}`);
  }

  log(message: string): void {
    this.info(message);
  }
}
