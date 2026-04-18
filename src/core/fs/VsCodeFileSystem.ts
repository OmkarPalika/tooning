import * as vscode from 'vscode';
import { IFileSystem } from './IFileSystem';
import { join } from 'path';

export class VsCodeFileSystem implements IFileSystem {
    public async readFile(uri: string): Promise<string> {
        const fileUri = vscode.Uri.file(uri);
        const content = await vscode.workspace.fs.readFile(fileUri);
        return new TextDecoder().decode(content);
    }

    public async readBinary(uri: string): Promise<Uint8Array> {
        return await vscode.workspace.fs.readFile(vscode.Uri.file(uri));
    }

    public async findFiles(pattern: string): Promise<string[]> {
        const uris = await vscode.workspace.findFiles(pattern);
        return uris.map(u => u.fsPath);
    }

    public async stat(uri: string): Promise<{ size: number, mtime: number }> {
        const s = await vscode.workspace.fs.stat(vscode.Uri.file(uri));
        return { size: s.size, mtime: s.mtime };
    }

    public join(...segments: string[]): string {
        return join(...segments);
    }
}
