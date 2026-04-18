import * as vscode from 'vscode';
import { IConfiguration } from './IConfiguration';

export class VsCodeConfiguration implements IConfiguration {
    get<T>(key: string, defaultValue: T): T {
        const config = vscode.workspace.getConfiguration('tooning');
        return config.get<T>(key, defaultValue);
    }

    async set<T>(key: string, value: T): Promise<void> {
        const config = vscode.workspace.getConfiguration('tooning');
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    getProvider(): string {
        return this.get<string>('provider', 'mistral');
    }

    getApiKey(): string {
        return this.get<string>('apiKey', '');
    }

    getModel(): string {
        return this.get<string>('model', 'mistral-large-latest');
    }

    getCustomBaseUrl(): string {
        return this.get<string>('customBaseUrl', 'http://localhost:11434/api/chat');
    }

    getMaxTokens(): number {
        return this.get<number>('maxTokens', 16000);
    }

    getExcludes(): string[] {
        return this.get<string[]>('excludes', ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/out/**']);
    }
}
