interface OutputChannelLike {
    appendLine(value: string): void;
    show(preserveFocus?: boolean): void;
}

interface ContextLike {
    subscriptions: { push(item: unknown): void };
}

export type LogLevel = 'info' | 'warn' | 'error' | 'silent';

export class Logger {
    private static channel: OutputChannelLike | null = null;
    private static level: LogLevel = 'info';

    public static async initialize(context: ContextLike) {
        if (!this.channel) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const vscode = require('vscode');
                this.channel = vscode.window.createOutputChannel('Tooning');
                if (this.channel) {
                    context.subscriptions.push(this.channel);
                }
            } catch {
                // Probably CLI environment, channel remains null
            }
        }
    }

    public static setLevel(level: LogLevel) {
        this.level = level;
    }

    public static getLevel(): LogLevel {
        return this.level;
    }

    public static log(message: string) {
        if (this.level === 'silent' || this.level === 'warn' || this.level === 'error') return;

        if (this.channel) {
            const timestamp = new Date().toISOString();
            this.channel.appendLine(`[${timestamp}] ${message}`);
        } else {
            console.log(`[Tooning log] ${message}`);
        }
    }

    public static warn(message: string) {
        if (this.level === 'silent' || this.level === 'error') return;

        if (this.channel) {
            const timestamp = new Date().toISOString();
            this.channel.appendLine(`[${timestamp}] WARN: ${message}`);
        } else {
            console.warn(`[Tooning warn] ${message}`);
        }
    }

    public static error(message: string, err?: unknown) {
        if (this.level === 'silent') return;

        if (this.channel) {
            const timestamp = new Date().toISOString();
            this.channel.appendLine(`[${timestamp}] ERROR: ${message}`);
            if (err instanceof Error) {
                this.channel.appendLine(err.message);
                if (err.stack) {
                    this.channel.appendLine(err.stack);
                }
            } else if (err) {
                this.channel.appendLine(String(err));
            }
            this.channel.show(true);
        } else {
            console.error(`[Tooning err] ${message}`, err);
        }
    }
}
