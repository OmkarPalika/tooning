export class Logger {
    private static channel: any; // Type as any to avoid vscode dependency

    public static initialize(context: any) {
        if (!this.channel) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const vscode = require('vscode');
                this.channel = vscode.window.createOutputChannel('Tooning');
                context.subscriptions.push(this.channel);
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
