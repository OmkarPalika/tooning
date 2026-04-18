import * as vscode from 'vscode';
import { IIndexStorage } from './IIndexStorage';

export class VsCodeIndexStorage implements IIndexStorage {
    private storageUri: vscode.Uri;

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = context.globalStorageUri;
    }

    private getUri(key: string): vscode.Uri {
        return vscode.Uri.joinPath(this.storageUri, `${key}.json`);
    }

    public async set(key: string, value: unknown): Promise<void> {
        const uri = this.getUri(key);
        const data = Buffer.from(JSON.stringify(value, null, 2));
        await vscode.workspace.fs.writeFile(uri, data);
    }

    public async get<T>(key: string): Promise<T | undefined> {
        const uri = this.getUri(key);
        try {
            const data = await vscode.workspace.fs.readFile(uri);
            return JSON.parse(data.toString()) as T;
        } catch {
            return undefined;
        }
    }

    public async delete(key: string): Promise<void> {
        const uri = this.getUri(key);
        try {
            await vscode.workspace.fs.delete(uri);
        } catch {
            // Ignore if not exists
        }
    }

    public async clear(): Promise<void> {
        try {
            await vscode.workspace.fs.delete(this.storageUri, { recursive: true });
            await vscode.workspace.fs.createDirectory(this.storageUri);
        } catch {
            // Ignore
        }
    }
}
