import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { IndexStore } from './IndexStore';

export class IndexScheduler {
    private store: IndexStore;
    private timer: NodeJS.Timeout | null = null;
    private isIndexing = false;

    constructor(store: IndexStore) {
        this.store = store;
    }

    public start() {
        this.applyConfig();
        
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('tooning.indexMode') || e.affectsConfiguration('tooning.indexInterval')) {
                this.applyConfig();
            }
        });

        vscode.workspace.onDidSaveTextDocument(async () => {
            const mode = vscode.workspace.getConfiguration('tooning').get<string>('indexMode', 'onSave');
            if (mode === 'onSave') {
                await this.trigger();
            }
        });
    }

    private applyConfig() {
        const config = vscode.workspace.getConfiguration('tooning');
        const mode = config.get<string>('indexMode', 'onSave');
        
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        if (mode === 'interval') {
            const minutes = config.get<number>('indexInterval', 15);
            Logger.log(`Setting up interval indexing every ${minutes} minutes.`);
            this.timer = setInterval(() => {
                this.trigger();
            }, minutes * 60 * 1000);
        }
    }

    public async trigger() {
        if (this.isIndexing) return;
        
        this.isIndexing = true;
        try {
            const config = vscode.workspace.getConfiguration('tooning');
            await this.store.updateFullWorkspace({
                excludeGlobs: config.get<string[]>('excludeGlobs', ['**/node_modules/**', '**/.git/**']),
                maxFileSizeKB: config.get<number>('maxFileSizeKB', 500),
                rootPath: vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.'
            });
        } catch (e) {
            Logger.error('Scheduled index trigger failed', e);
        } finally {
            this.isIndexing = false;
        }
    }
}
