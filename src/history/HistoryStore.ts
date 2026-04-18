import * as vscode from 'vscode';
import { join } from 'path';
import { Logger } from '../utils/Logger';

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string; // The raw or markdown content
    timestamp: number;
}

export class HistoryStore {
    private storageUri: vscode.Uri;
    private messages: ChatMessage[] = [];

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = vscode.Uri.file(join(context.globalStorageUri.fsPath, 'tooning_history.json'));
    }

    public async initialize() {
        try {
            const u8 = await vscode.workspace.fs.readFile(this.storageUri);
            const data = JSON.parse(Buffer.from(u8).toString('utf8'));
            if (Array.isArray(data)) {
                this.messages = data;
            }
        } catch {
            this.messages = [];
        }
    }

    public addMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>) {
        const fullMsg: ChatMessage = {
            ...msg,
            id: Math.random().toString(36).substring(2, 9),
            timestamp: Date.now()
        };
        this.messages.push(fullMsg);
        this.persist();
        return fullMsg;
    }

    public getMessages(): ChatMessage[] {
        return this.messages;
    }

    public async clear() {
        this.messages = [];
        await this.persist();
    }

    private async persist() {
        try {
            const u8 = Buffer.from(JSON.stringify(this.messages, null, 2), 'utf8');
            await vscode.workspace.fs.writeFile(this.storageUri, u8);
        } catch (e) {
            Logger.error('Failed to save history', e);
        }
    }
}
