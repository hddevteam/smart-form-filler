/* eslint-disable no-console */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private scope: string | undefined;

  constructor(scope?: string) {
    this.scope = scope;
  }

  static forScope(scope: string): Logger {
    return new Logger(scope);
  }

  private prefix(): string {
    return this.scope ? `[${this.scope}]` : '';
  }

  debug(...args: unknown[]): void {
    console.debug(this.prefix(), ...args);
  }

  info(...args: unknown[]): void {
    console.info(this.prefix(), ...args);
  }

  warn(...args: unknown[]): void {
    console.warn(this.prefix(), ...args);
  }

  error(...args: unknown[]): void {
    console.error(this.prefix(), ...args);
  }
}

export const logger = new Logger('SmartFormFiller');
