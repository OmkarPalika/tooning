import { Logger } from '../utils/Logger';
import { FileEntry } from './SymbolExtractor';
import { FileScanner } from './FileScanner';
import { Tokenizer } from '../utils/Tokenizer';
import { ToonEncoder } from '../toon/ToonEncoder';
import { IFileSystem } from '../core/fs/IFileSystem';
import { IIndexStorage } from '../core/storage/IIndexStorage';
import { EventEmitter } from '../utils/EventEmitter';

export class IndexStore {
    private storage: IIndexStorage;
    private fs: IFileSystem;
    private memoryIndex: Map<string, FileEntry> = new Map();
    private lastIndexedTime: number = 0;
    private writeLock: boolean = false;
    private writeQueue: boolean = false;

    // Portable Events for integration
    private _onDidStartIndexing = new EventEmitter<void>();
    public readonly onDidStartIndexing = this._onDidStartIndexing.event;

    private _onDidFinishIndexing = new EventEmitter<{ rawTokens: number, toonTokens: number }>();
    public readonly onDidFinishIndexing = this._onDidFinishIndexing.event;

    private _onDidUpdateProgress = new EventEmitter<{ current: number, total: number, estMs: number }>();
    public readonly onDidUpdateProgress = this._onDidUpdateProgress.event;

    constructor(storage: IIndexStorage, fs: IFileSystem) {
        this.storage = storage;
        this.fs = fs;
    }

    public async initialize() {
        try {
            const data = await this.storage.get<any>('index');
            if (data && data.entries) {
                this.memoryIndex = new Map(Object.entries(data.entries));
                this.lastIndexedTime = data.timestamp || 0;
                Logger.log(`IndexStore: Loaded ${this.memoryIndex.size} entries from persistent storage.`);
            }
        } catch (e) {
            Logger.error('IndexStore: Failed to initialize', e);
        }
    }

    private async save() {
        if (this.writeLock) {
            this.writeQueue = true;
            return;
        }

        this.writeLock = true;
        try {
            const data = {
                timestamp: Date.now(),
                entries: Object.fromEntries(this.memoryIndex)
            };
            await this.storage.set('index', data);
        } catch (e) {
            Logger.error('IndexStore: Failed to save index', e);
        } finally {
            this.writeLock = false;
            if (this.writeQueue) {
                this.writeQueue = false;
                await this.save();
            }
        }
    }

    public getFiles(): FileEntry[] {
        return Array.from(this.memoryIndex.values());
    }

    public async updateFile(path: string, language: string, content: string) {
        const { SymbolExtractor } = await import('./SymbolExtractor');
        const symbols = await SymbolExtractor.extractSymbols(path, language, content);
        const stats = await this.fs.stat(path);
        
        this.memoryIndex.set(path, {
            path,
            language,
            size: stats.size,
            lastModified: stats.mtime,
            symbols
        });
        
        await this.save();
    }

    public async removeFile(path: string) {
        if (this.memoryIndex.has(path)) {
            this.memoryIndex.delete(path);
            await this.save();
        }
    }

    public async scanAndStoreFile(absPath: string, options: { maxFileSizeKB: number, rootPath: string }) {
        const entry = await FileScanner.scanSingleFile(this.fs, absPath, options);
        if (entry) {
            this.memoryIndex.set(entry.path, entry);
            await this.save();
        }
    }

    public async updateFullWorkspace(options: { excludeGlobs: string[], maxFileSizeKB: number, rootPath: string }) {
        this._onDidStartIndexing.fire();
        
        try {
            const { entries, totalRawTokens } = await FileScanner.scanWorkspace(this.fs, options, (current, total, timeMs) => {
                let estMs = 0;
                if (current > 0 && timeMs > 0) {
                    const msPerItem = timeMs / current;
                    const remainingItems = total - current;
                    estMs = msPerItem * remainingItems;
                }
                this._onDidUpdateProgress.fire({ current, total, estMs });
            });
            
            this.memoryIndex.clear();
            for (const entry of entries) {
                this.memoryIndex.set(entry.path, entry);
            }
            
            this.lastIndexedTime = Date.now();
            await this.save();

            // Calculate TOON tokens for final report
            const toonStr = ToonEncoder.encodeIndex(entries, 1000000);
            const toonTokens = Tokenizer.estimateTokens(toonStr);

            this._onDidFinishIndexing.fire({ rawTokens: totalRawTokens, toonTokens });
            Logger.log(`IndexStore: Full update complete. Indexed ${entries.length} files.`);
            
        } catch (e) {
            Logger.error('IndexStore: Full update failed', e);
            this._onDidFinishIndexing.fire({ rawTokens: 0, toonTokens: 0 });
        }
    }
}
