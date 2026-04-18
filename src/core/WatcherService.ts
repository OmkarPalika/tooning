import * as chokidar from 'chokidar';
import { IndexStore } from '../indexer/IndexStore';
import { Logger } from '../utils/Logger';
import { relative } from 'path';

export class WatcherService {
    private watcher: chokidar.FSWatcher | null = null;
    private indexStore: IndexStore;
    private rootPath: string;

    constructor(indexStore: IndexStore, rootPath: string) {
        this.indexStore = indexStore;
        this.rootPath = rootPath;
    }

    public start() {
        if (this.watcher) return;

        Logger.log(`Starting Chokidar watcher on ${this.rootPath}`);

        this.watcher = chokidar.watch(this.rootPath, {
            ignored: [
                '**/node_modules/**',
                '**/.git/**',
                '**/dist/**',
                '**/out/**',
                '**/tooning_index.json'
            ],
            persistent: true,
            ignoreInitial: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 100
            }
        });

        this.watcher
            .on('add', path => this.handleUpdate(path))
            .on('change', path => this.handleUpdate(path))
            .on('unlink', path => this.handleDelete(path))
            .on('error', error => Logger.error(`Watcher error: ${error}`));
    }

    public stop() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }

    private async handleUpdate(absPath: string) {
        // We only care about files
        await this.indexStore.updateFileEntry(absPath);
    }

    private async handleDelete(absPath: string) {
        const relPath = relative(this.rootPath, absPath).replace(/\\/g, '/');
        await this.indexStore.removeFileEntry(relPath);
    }
}
