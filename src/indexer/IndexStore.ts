import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { FileEntry } from './SymbolExtractor';
import { FileScanner } from './FileScanner';
import { join } from 'path';
import { Tokenizer } from '../utils/Tokenizer';
import { ToonEncoder } from '../toon/ToonEncoder';
import { VsCodeFileSystem } from '../core/fs/VsCodeFileSystem';

export class IndexStore {
    private storageUri: vscode.Uri;
    private memoryIndex: Map<string, FileEntry> = new Map();
    private lastIndexedTime: number = 0;
    private writeLock: boolean = false;
    private writeQueue: boolean = false;

    // Events for UI integration
    private _onDidStartIndexing = new vscode.EventEmitter<void>();
    public readonly onDidStartIndexing = this._onDidStartIndexing.event;

    private _onDidFinishIndexing = new vscode.EventEmitter<{ rawTokens: number, toonTokens: number }>();
    public readonly onDidFinishIndexing = this._onDidFinishIndexing.event;

    private _onDidUpdateProgress = new vscode.EventEmitter<{ current: number, total: number, estMs: number }>();
    public readonly onDidUpdateProgress = this._onDidUpdateProgress.event;

    constructor(context: vscode.ExtensionContext) {
        this.storageUri = vscode.Uri.file(join(context.globalStorageUri.fsPath, 'tooning_index.json'));
    }

    public async initialize() {
        try {
            await vscode.workspace.fs.createDirectory(vscode.Uri.file(join(this.storageUri.fsPath, '..')));
            
            try {
                const u8 = await vscode.workspace.fs.readFile(this.storageUri);
                const data = JSON.parse(Buffer.from(u8).toString('utf8'));
                if (data && data.files) {
                    this.lastIndexedTime = data.lastIndexed || 0;
                    for (const [key, val] of Object.entries(data.files)) {
                        this.memoryIndex.set(key, val as FileEntry);
                    }
                    Logger.log(`Loaded ${this.memoryIndex.size} entries from local cache.`);
                }
            } catch {
                Logger.log('No prior index found. Starting fresh.');
            }
        } catch (e) {
            Logger.error('Failed to initialize IndexStore', e);
        }
    }

    public async updateFullWorkspace() {
        const config = vscode.workspace.getConfiguration('tooning');
        const excludes = config.get<string[]>('excludeGlobs', ['**/node_modules/**', '**/.git/**']);
        const maxSize = config.get<number>('maxFileSizeKB', 500);

        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            return;
        }

        try {
            this._onDidStartIndexing.fire();
            const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const fs = new VsCodeFileSystem();

            const { entries: freshFiles, totalRawTokens } = await FileScanner.scanWorkspace(
                fs,
                { excludeGlobs: excludes, maxFileSizeKB: maxSize, rootPath: rootPath },
                (current, total, timeMs) => {
                    let estMs = 0;
                    if (current > 0 && timeMs > 0) {
                        const msPerItem = timeMs / current;
                        const remainingItems = total - current;
                        estMs = msPerItem * remainingItems;
                    }
                    this._onDidUpdateProgress.fire({ current, total, estMs });
                }
            );
            
            this.memoryIndex.clear();
            freshFiles.forEach(f => this.memoryIndex.set(f.path, f));
            this.lastIndexedTime = Date.now();
            
            this.schedulePersist();
            
            // Calculate TOON tokens for efficiency report
            const toonStr = ToonEncoder.encodeIndex(freshFiles, config.get<number>('maxContextTokens', 16000));
            const toonTokens = Tokenizer.estimateTokens(toonStr);

            this._onDidFinishIndexing.fire({ rawTokens: totalRawTokens, toonTokens: toonTokens });
        } catch (e) {
            Logger.error('Failed to update workspace index', e);
            this._onDidFinishIndexing.fire({ rawTokens: 0, toonTokens: 0 });
        }
    }

    private schedulePersist() {
        if (this.writeLock) {
            this.writeQueue = true;
            return;
        }

        this.writeLock = true;
        
        setTimeout(async () => {
            try {
                const fileObj: Record<string, FileEntry> = {};
                for (const [k, v] of this.memoryIndex.entries()) {
                    fileObj[k] = v;
                }

                const data = {
                    version: "1.0",
                    lastIndexed: this.lastIndexedTime,
                    files: fileObj
                };

                const u8 = Buffer.from(JSON.stringify(data), 'utf8');
                await vscode.workspace.fs.writeFile(this.storageUri, u8);
                Logger.log('Index persisted to disk safely (non-blocking async).');
            } catch (e) {
                Logger.error('Async disk persist failed', e);
            } finally {
                this.writeLock = false;
                if (this.writeQueue) {
                    this.writeQueue = false;
                    this.schedulePersist();
                }
            }
        }, 1000); // 1-second debounce delay
    }

    public getIndex(): FileEntry[] {
        return Array.from(this.memoryIndex.values());
    }

    /**
     * Incrementally updates the index for a single file.
     */
    public async updateFileEntry(filePath: string) {
        const config = vscode.workspace.getConfiguration('tooning');
        const rootPath = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
        if (!rootPath) return;

        const fs = new VsCodeFileSystem();
        const entry = await FileScanner.scanSingleFile(fs, filePath, {
            maxFileSizeKB: config.get<number>('maxFileSizeKB', 500),
            rootPath: rootPath
        });

        if (entry) {
            this.memoryIndex.set(entry.path, entry);
            this.lastIndexedTime = Date.now();
            this.schedulePersist();
            
            // Notify UI (simulated totalRawTokens update)
            const allFiles = this.getIndex();
            const totalRawTokens = allFiles.reduce((acc, f) => acc + Tokenizer.estimateTokens(f.symbols.map(s => s.name).join(' ')), 0);
            const toonStr = ToonEncoder.encodeIndex(allFiles, config.get<number>('maxContextTokens', 16000));
            const toonTokens = Tokenizer.estimateTokens(toonStr);
            
            this._onDidFinishIndexing.fire({ rawTokens: totalRawTokens, toonTokens: toonTokens });
            Logger.log(`Incrementally updated: ${entry.path}`);
        }
    }

    /**
     * Removes a single file from the index.
     */
    public async removeFileEntry(relativePath: string) {
        if (this.memoryIndex.has(relativePath)) {
            this.memoryIndex.delete(relativePath);
            this.lastIndexedTime = Date.now();
            this.schedulePersist();
            
            const config = vscode.workspace.getConfiguration('tooning');
            const allFiles = this.getIndex();
            const totalRawTokens = allFiles.reduce((acc, f) => acc + Tokenizer.estimateTokens(f.symbols.map(s => s.name).join(' ')), 0);
            const toonStr = ToonEncoder.encodeIndex(allFiles, config.get<number>('maxContextTokens', 16000));
            const toonTokens = Tokenizer.estimateTokens(toonStr);

            this._onDidFinishIndexing.fire({ rawTokens: totalRawTokens, toonTokens: toonTokens });
            Logger.log(`Incrementally removed: ${relativePath}`);
        }
    }
}
