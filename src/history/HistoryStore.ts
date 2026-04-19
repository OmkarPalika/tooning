import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

/**
 * Platform-agnostic history persistence supporting both CLI command history
 * and VSCode structured message history.
 */
export class HistoryStore {
    private historyPath?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private context?: any; // vscode.ExtensionContext
    
    // CLI Command History
    private entries: string[] = [];
    
    // VSCode Message History
    private messages: { role: string, content: string }[] = [];
    
    private maxEntries: number = 1000;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(context?: any) {
        this.context = context;
        if (!context) {
            const dir = path.join(homedir(), '.tooning');
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            this.historyPath = path.join(dir, 'shell_history.txt');
        }
    }

    /**
     * Initialize the store based on the detected platform.
     */
    public async initialize() {
        if (this.context) {
            this.messages = this.context.globalState.get('history_messages', []);
        } else if (this.historyPath) {
            this.loadCliHistory();
        }
    }

    private loadCliHistory() {
        if (this.historyPath && fs.existsSync(this.historyPath)) {
            try {
                const content = fs.readFileSync(this.historyPath, 'utf8');
                this.entries = content.split('\n').filter(line => line.trim() !== '');
            } catch (e) {
                console.error('HistoryStore: Failed to load CLI history', e);
            }
        }
    }

    /**
     * Save history to persistent storage.
     */
    public save() {
        if (this.context) {
            this.context.globalState.update('history_messages', this.messages);
        } else if (this.historyPath) {
            try {
                const data = this.entries.join('\n');
                fs.writeFileSync(this.historyPath, data, 'utf8');
            } catch (e) {
                console.error('HistoryStore: Failed to save CLI history', e);
            }
        }
    }

    /**
     * Clear all history entries for current platform.
     */
    public clear() {
        this.entries = [];
        this.messages = [];
        this.save();
    }

    // --- CLI METHODS ---

    /**
     * Add a new entry to the command history (CLI).
     */
    public add(entry: string) {
        if (!entry || entry.trim() === '') return;
        const idx = this.entries.indexOf(entry);
        if (idx !== -1) this.entries.splice(idx, 1);
        this.entries.push(entry);
        if (this.entries.length > this.maxEntries) this.entries = this.entries.slice(-this.maxEntries);
        this.save();
    }

    public getEntries(): string[] {
        return [...this.entries];
    }

    // --- VSCODE METHODS ---

    /**
     * Add a new message to the structured history (VSCode).
     */
    public addMessage(message: { role: string, content: string }) {
        this.messages.push(message);
        if (this.messages.length > this.maxEntries) this.messages.shift();
        this.save();
    }

    public getMessages(): { role: string, content: string }[] {
        return [...this.messages];
    }
}
