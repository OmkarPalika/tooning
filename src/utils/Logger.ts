interface OutputChannelLike {
    appendLine(value: string): void;
    show(preserveFocus?: boolean): void;
}

interface ContextLike {
    subscriptions: { push(item: unknown): void };
}

export class Logger {
    private static channel: OutputChannelLike | null = null;

    public static async initialize(context: ContextLike) {
        if (!this.channel) {
            try {
                const vscode = await import('vscode');
                this.channel = vscode.window.createOutputChannel('Tooning');
                if (this.channel) {
                    context.subscriptions.push(this.channel);
                }
            } catch {
                // Probably CLI environment, channel remains null
            }
        }
    }

    public static log(message: string) {
        if (this.channel) {
            const timestamp = new Date().toISOString();
            this.channel.appendLine(`[${timestamp}] ${message}`);
        } else {
            console.log(`[Tooning log] ${message}`);
        }
    }

    public static error(message: string, err?: unknown) {
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
