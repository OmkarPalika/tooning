#!/usr/bin/env node
import { Command } from 'commander';
import { NodeFileSystem } from '../core/fs/NodeFileSystem';
import { FileScanner } from '../indexer/FileScanner';
import { ToonEncoder } from '../toon/ToonEncoder';
import { resolve } from 'path';
import { IndexStore } from '../indexer/IndexStore';
import { WatcherService } from '../core/WatcherService';
import { JsonFileIndexStorage } from '../core/storage/JsonFileIndexStorage';
import { NodeConfiguration } from '../ai/NodeConfiguration';
import { ProviderFactory } from '../ai/ProviderFactory';
import * as readline from 'readline/promises';

async function main() {
    const program = new Command();
    const config = new NodeConfiguration();

    program
        .name('toon')
        .description('Universal AI Context Engine for Codebases')
        .version('10.0.9');

    // --- ENCODE COMMAND (Default Logic) ---
    program
        .command('encode')
        .description('Generate TOON context for a specific query')
        .argument('[path]', 'path to scan', '.')
        .option('-q, --query <text>', 'User query for semantic reranking')
        .option('-m, --max-tokens <number>', 'Maximum TOON tokens')
        .option('-x, --exclude <patterns>', 'Comma separated exclusion patterns')
        .action(async (path, options) => {
            const root = resolve(path);
            const fs = new NodeFileSystem();
            const maxTokens = options.maxTokens ? parseInt(options.maxTokens, 10) : config.getMaxTokens();
            const excludeGlobs = options.exclude ? options.exclude.split(',') : config.getExcludes();
            const query = options.query || "";

            try {
                console.error(`🚀 Tooning ${root}...`);
                const { entries } = await FileScanner.scanWorkspace(fs, { excludeGlobs, maxFileSizeKB: 500, rootPath: root });
                const toon = await ToonEncoder.encodeQuery(query, maxTokens, entries, [], fs, root);
                process.stdout.write(toon);
                console.error(`\n✅ TOON generated successfully (${entries.length} items).`);
            } catch (err) {
                console.error(`❌ Error: ${err}`);
                process.exit(1);
            }
        });

    // --- CONFIG COMMAND ---
    const configCmd = program.command('config').description('Manage Tooning configuration and API keys');

    configCmd
        .command('set')
        .description('Set a configuration value')
        .argument('<key>', 'config key (apiKey, provider, model, customBaseUrl)')
        .argument('<value>', 'value to set')
        .action(async (key, value) => {
            await config.set(key, value);
            console.log(`✅ Set ${key} to ${value}`);
        });

    configCmd
        .command('get')
        .description('Get a configuration value')
        .argument('<key>', 'config key')
        .action((key) => {
            console.log(`${key}: ${config.get(key, 'Not Set')}`);
        });

    configCmd
        .command('list')
        .description('List all configurations')
        .action(() => {
            const keys = ['provider', 'model', 'apiKey', 'customBaseUrl', 'maxTokens'];
            keys.forEach(k => console.log(`${k.padEnd(15)}: ${config.get(k, '[unset]')}`));
        });

    // --- CHAT COMMAND (Interactive REPL) ---
    program
        .command('chat')
        .description('Start an interactive context-aware chat session')
        .argument('[path]', 'project path', '.')
        .action(async (path) => {
            const root = resolve(path);
            const fs = new NodeFileSystem();
            const storage = new JsonFileIndexStorage(resolve(root, '.tooning'));
            const store = new IndexStore(storage, fs);
            
            console.error(`🏥 Initializing Context Engine...`);
            await store.initialize();
            
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            console.log('\n💬 Tooning CLI Chat (Type "exit" to quit)');
            console.log('------------------------------------------');

            // eslint-disable-next-line no-constant-condition
            while (true) {
                const query = await rl.question('\n👤 You: ');
                if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') break;

                console.log('\n🤖 Tooning index for context...');
                try {
                    const { entries } = await FileScanner.scanWorkspace(fs, { 
                        excludeGlobs: config.getExcludes(), 
                        maxFileSizeKB: 500, 
                        rootPath: root 
                    });

                    const toonContext = await ToonEncoder.encodeQuery(query, config.getMaxTokens(), entries, [], fs, root);
                    const provider = ProviderFactory.createProvider(config);

                    process.stdout.write('🤖 Assistant: ');
                    await provider.sendStream(query, toonContext, (chunk) => {
                        process.stdout.write(chunk);
                    });
                    process.stdout.write('\n');
                } catch (e) {
                    console.error(`\n❌ Chat Error: ${e}`);
                }
            }
            rl.close();
        });

    // --- WATCH COMMAND ---
    program
        .command('watch')
        .description('Start the incremental indexing watcher')
        .argument('[path]', 'path to watch', '.')
        .action(async (path) => {
            const root = resolve(path);
            const fs = new NodeFileSystem();
            const storage = new JsonFileIndexStorage(resolve(root, '.tooning'));
            const store = new IndexStore(storage, fs);
            await store.initialize();
            
            console.error(`🔍 Watching ${root} for changes...`);
            const watcher = new WatcherService(store, root, { 
                maxFileSizeKB: 500, 
                rootPath: root, 
                excludeGlobs: config.getExcludes() 
            });
            watcher.start();
            await new Promise(() => {});
        });

    program.parse(process.argv);
}

main();
