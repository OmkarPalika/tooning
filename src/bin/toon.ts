#!/usr/bin/env node
import { Command } from 'commander';
import { NodeFileSystem } from '../core/fs/NodeFileSystem';
import { FileScanner } from '../indexer/FileScanner';
import { ToonEncoder } from '../toon/ToonEncoder';
import { resolve } from 'path';
import { IndexStore } from '../indexer/IndexStore';
import { WatcherService } from '../core/WatcherService';

async function main() {
    const program = new Command();

    program
        .name('toon')
        .description('Convert your codebase to TOON notation for AI agents')
        .version('0.1.0')
        .argument('[path]', 'path to scan', '.')
        .option('-q, --query <text>', 'User query for semantic reranking')
        .option('-m, --max-tokens <number>', 'Maximum TOON tokens', '16000')
        .option('-x, --exclude <patterns>', 'Comma separated exclusion patterns')
        .option('-w, --watch', 'Enable real-time file watching (Incremental Indexing)')
        .action(async (path, options) => {
            const root = resolve(path);
            const fs = new NodeFileSystem();
            const maxTokens = parseInt(options.maxTokens, 10);
            const excludeGlobs = options.exclude ? options.exclude.split(',') : ['**/node_modules/**', '**/.git/**'];
            const query = options.query || "";

            try {
                // Console.error for logs so stdout stays clean for piping
                console.error(`🚀 Tooning ${root}...`);
                
                const { entries } = await FileScanner.scanWorkspace(
                    fs,
                    { excludeGlobs, maxFileSizeKB: 500, rootPath: root }
                );

                if (entries.length === 0) {
                    console.error('❌ No indexable files found.');
                    process.exit(1);
                }

                const toon = await ToonEncoder.encodeQuery(query, maxTokens, entries, [], fs, root);
                
                // Print the final TOON to stdout for piping
                process.stdout.write(toon);
                console.error(`\n✅ TOON generated successfully (${entries.length} items).`);

                if (options.watch) {
                    // Create a dummy/mock VS Code env if needed, or refactor IndexStore to be truly independent
                    // For now, simple console-based watch
                    console.error('🔍 Watch mode active. Press Ctrl+C to stop.');
                    const store = new IndexStore({ globalStorageUri: { fsPath: '.' } } as never);
                    await store.initialize();
                    const watcher = new WatcherService(store, root);
                    watcher.start();
                    
                    // Keep process alive
                    await new Promise(() => {}); 
                }
                
            } catch (err) {
                console.error(`❌ Error: ${err}`);
                process.exit(1);
            }
        });

    program.parse(process.argv);
}

main();
