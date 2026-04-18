import * as fs from 'fs/promises';
import { IFileSystem } from './IFileSystem';
import { join, resolve, relative } from 'path';
import fg from 'fast-glob';

export class NodeFileSystem implements IFileSystem {
    public async readFile(uri: string): Promise<string> {
        return await fs.readFile(uri, 'utf-8');
    }

    public async readBinary(uri: string): Promise<Uint8Array> {
        const buf = await fs.readFile(uri);
        return new Uint8Array(buf);
    }

    /**
     * Finds files in a workspace using fast-glob for high performance and accuracy.
     */
    public async findFiles(pattern: string): Promise<string[]> {
        // pattern: '**/*' or similar
        // root: project root
        const root = resolve('.');
        
        // Industry-grade: Use fast-glob for efficient, reliable file discovery
        const entries = await fg(pattern, {
            cwd: root,
            absolute: true,
            ignore: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/out/**',
                '**/.tooning/**',
                '**/tooning_index.json'
            ],
            followSymbolicLinks: false,
            onlyFiles: true,
            suppressErrors: true
        });

        return entries;
    }

    public async stat(uri: string): Promise<{ size: number, mtime: number }> {
        const s = await fs.stat(uri);
        return { size: s.size, mtime: s.mtimeMs };
    }

    public join(...segments: string[]): string {
        return join(...segments);
    }

    public relative(from: string, to: string): string {
        return relative(resolve(from), resolve(to)).replace(/\\/g, '/');
    }
}
