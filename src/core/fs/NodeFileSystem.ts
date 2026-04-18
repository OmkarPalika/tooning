import * as fs from 'fs/promises';
import { IFileSystem } from './IFileSystem';
import { join, resolve } from 'path';

export class NodeFileSystem implements IFileSystem {
    public async readFile(uri: string): Promise<string> {
        return await fs.readFile(uri, 'utf-8');
    }

    public async readBinary(uri: string): Promise<Uint8Array> {
        const buf = await fs.readFile(uri);
        return new Uint8Array(buf);
    }

    public async findFiles(pattern: string): Promise<string[]> {
        // Implementation for CLI: basic recursive scan
        // In a real CLI, we might use 'glob' or 'fast-glob'
        // For 'tooning', we manually walk the directory
        const root = resolve('.');
        const results: string[] = [];
        await this.walk(root, results);
        
        // Simple filter based on pattern (very basic)
        // A better version would use minimatch
        return results.filter(f => f.includes(pattern.replace(/\*\*\/\*/g, '')));
    }

    private async walk(dir: string, results: string[]) {
        const list = await fs.readdir(dir, { withFileTypes: true });
        for (const item of list) {
            const res = join(dir, item.name);
            if (item.name.startsWith('.') || item.name === 'node_modules' || item.name === 'dist') continue;
            if (item.isDirectory()) {
                await this.walk(res, results);
            } else {
                results.push(res);
            }
        }
    }

    public async stat(uri: string): Promise<{ size: number, mtime: number }> {
        const s = await fs.stat(uri);
        return { size: s.size, mtime: s.mtimeMs };
    }

    public join(...segments: string[]): string {
        return join(...segments);
    }
}
