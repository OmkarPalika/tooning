import { IConfiguration } from './IConfiguration';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

export class NodeConfiguration implements IConfiguration {
    private configPath: string;
    private data: Record<string, any> = {};

    constructor() {
        const dir = path.join(homedir(), '.tooning');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        this.configPath = path.join(dir, 'config.json');
        this.load();
    }

    private load() {
        if (fs.existsSync(this.configPath)) {
            try {
                const content = fs.readFileSync(this.configPath, 'utf8');
                this.data = JSON.parse(content);
            } catch (e) {
                console.error('Failed to load CLI config:', e);
                this.data = {};
            }
        }
    }

    private save() {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch (e) {
            console.error('Failed to save CLI config:', e);
        }
    }

    get<T>(key: string, defaultValue: T): T {
        return this.data[key] !== undefined ? this.data[key] : defaultValue;
    }

    async set<T>(key: string, value: T): Promise<void> {
        this.data[key] = value;
        this.save();
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
