import { IIndexStorage } from './IIndexStorage';
import * as fs from 'fs/promises';
import { join, dirname } from 'path';

export class JsonFileIndexStorage implements IIndexStorage {
    private storageDir: string;

    constructor(storageDir: string) {
        this.storageDir = storageDir;
    }

    private getPath(key: string): string {
        return join(this.storageDir, `${key}.json`);
    }

    public async set(key: string, value: any): Promise<void> {
        const filePath = this.getPath(key);
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
    }

    public async get<T>(key: string): Promise<T | undefined> {
        const filePath = this.getPath(key);
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return JSON.parse(data) as T;
        } catch {
            return undefined;
        }
    }

    public async delete(key: string): Promise<void> {
        const filePath = this.getPath(key);
        try {
            await fs.unlink(filePath);
        } catch {
            // Ignore if not exists
        }
    }

    public async clear(): Promise<void> {
        try {
            await fs.rm(this.storageDir, { recursive: true, force: true });
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch {
            // Ignore
        }
    }
}
