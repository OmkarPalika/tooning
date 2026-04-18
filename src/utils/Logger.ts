import * as vscode from 'vscode';

export class Logger {
    private static channel: vscode.OutputChannel;

    public static initialize(context: vscode.ExtensionContext) {
        if (!this.channel) {
            this.channel = vscode.window.createOutputChannel('Tooning');
            context.subscriptions.push(this.channel);
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
            if (err) {
                this.channel.appendLine(err.toString());
                if (err.stack) {
                    this.channel.appendLine(err.stack);
                }
            }
            this.channel.show(true);
        } else {
            console.error(`[Tooning err] ${message}`, err);
        }
    }
}
