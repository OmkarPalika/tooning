#!/usr/bin/env node
import { Command } from 'commander';
import { resolve } from 'path';
import { NodeFileSystem } from '../core/fs/NodeFileSystem';
import { JsonFileIndexStorage } from '../core/storage/JsonFileIndexStorage';
import { IndexStore } from '../indexer/IndexStore';
import { FileScanner } from '../indexer/FileScanner';
import { ToonEncoder } from '../toon/ToonEncoder';
import { ToonDecoder } from '../toon/ToonDecoder';
import { ProviderFactory } from '../ai/ProviderFactory';
import { NodeConfiguration } from '../ai/NodeConfiguration';
import { HistoryStore } from '../history/HistoryStore';
import { SettingsManager } from '../config/SettingsManager';
import { VibeUI } from '../ui/VibeUI';
import { VibePrompt } from '../ui/VibePrompt';
import { Logger } from '../utils/Logger';
import chalk from 'chalk';
import ora from 'ora';

const TOON_SYSTEM_PROMPT = `
You are the TOON (Token Oriented Object Notation) AI Engine.
Your goal is to analyze the provided codebase context and respond strictly using the TOON Protocol.

TOON PROTOCOL RULES (STRICT ENFORCEMENT):
1. ALWAYS respond with a TOON object (high-density, unquoted keys). 
2. Grammar MUST start with r{ and end with }. 
3. Keys MUST be UNQUOTED (e.g., why: instead of "why":). 
4. DO NOT include any plain text or markdown outside of the keys.
5. NO formatting markdown (like backticks or bold) inside the r{} block itself unless it's inside a string value.

TOON SCHEMA:
r{
  why: "Brief industrial conclusion of your findings.",
  risk: "low" | "med" | "high",
  ans: [
    { n: "SymbolName", f: "relative/path", ln: "start-end" }
  ],
  chg: [
    { f: "path", ln: "lines", op: "add"|"del"|"mod", snip: "code snippet" }
  ]
}

6. For casual queries, ALWAYS use the why: field even if the response is simple. No excuses.
`;

async function main() {
    const program = new Command();
    const config = new NodeConfiguration();
    const history = new HistoryStore();
    const settings = new SettingsManager(config);

    program
        .name('toon')
        .description('Industrial AI Codebase Context Engine')
        .version('18.1.0 (Industrial Polish Edition)');

    // --- CHAT COMMAND ---
    program
        .command('chat')
        .description('Enter the interactive industrial context shell')
        .argument('[path]', 'path to codebase', '.')
        .action(async (path) => {
            const root = resolve(path);
            const fs = new NodeFileSystem();
            const storage = new JsonFileIndexStorage(resolve(root, '.tooning'));
            const store = new IndexStore(storage, fs);

            const initSpinner = ora(VibeUI.PRIMARY('Initializing Context Engine...')).start();
            await store.initialize();
            await history.initialize();
            
            let isRunning = true;

            const { entries: allFiles } = await FileScanner.scanWorkspace(fs, { 
                excludeGlobs: config.getExcludes(), 
                maxFileSizeKB: 500, 
                rootPath: root 
            });
            
            const fileChoices = allFiles.map((f: { path: string }) => ({ 
                name: `@${f.path}` 
            }));

            const baseSuggestions = [
                { name: '/settings', message: 'Open interactive configuration dashboard' },
                { name: '/clear', message: 'Purge terminal screen buffer' },
                { name: '/help', message: 'Show command directory' },
                { name: '/exit', message: 'Terminate session' }
            ];

            const suggestions = [...baseSuggestions, ...fileChoices];

            initSpinner.succeed(VibeUI.SUCCESS('Engine Ready.'));
            VibeUI.printBanner();

            const handleSlashCommand = async (input: string) => {
                const parts = input.trim().split(/\s+/);
                const cmd = parts[0].toLowerCase();
                switch (cmd) {
                    case '/settings': await settings.launch(); break;
                    case '/help': VibeUI.printHelp(); break;
                    case '/clear': console.clear(); VibeUI.system('Workspace buffer cleared.'); break;
                    case '/exit': isRunning = false; VibeUI.system('Powering down...'); break;
                    default: VibeUI.system(`Unknown Command: ${cmd}. Consult /help.`);
                }
            };

            const renderStatusBar = () => {
                const modelName = config.getModel();
                const providerName = config.getProvider();
                const status = chalk.dim(`  [ELITE] Model: ${chalk.cyan(modelName)} | Provider: ${chalk.cyan(providerName)} | History: ${history.getEntries().length} entries`);
                console.log(`\n${status}\n`);
            };

            while (isRunning) {
                try {
                    renderStatusBar();
                    const prompt = new VibePrompt({
                        choices: suggestions,
                        history: history.getEntries(),
                        stdin: process.stdin,
                        stdout: process.stdout
                    });

                    prompt.close = async () => { prompt.emit('close'); };

                    const query = await prompt.run();
                    if (!query || query.trim() === '') continue;

                    VibeUI.clearLine();
                    console.log(`${VibeUI.getUserPrefix()} ${chalk.cyan(query)}`);

                    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
                        isRunning = false; 
                        VibeUI.system('Terminating...');
                        break;
                    }

                    if (query.startsWith('/')) { await handleSlashCommand(query); continue; }

                    history.add(query);

                    const originalLogLevel = Logger.getLevel();
                    Logger.setLevel('warn');

                    VibeUI.printThinkingStage('SCANNING WORKSPACE', 20);
                    const { entries } = await FileScanner.scanWorkspace(fs, { 
                        excludeGlobs: config.getExcludes(), 
                        maxFileSizeKB: 500, 
                        rootPath: root 
                    });
                    
                    VibeUI.printThinkingStage('ENCODING CONTEXT', 50);
                    const toonContext = await ToonEncoder.encodeQuery(query, config.getMaxTokens(), entries, [], fs, root);
                    
                    VibeUI.printThinkingStage('AWAITING PROVIDER', 80);
                    const provider = ProviderFactory.createProvider(config);

                    VibeUI.printThinkingStage('READY TO DISPATCH', 100);
                    VibeUI.clearThinking();
                    
                    Logger.setLevel(originalLogLevel);

                    process.stdout.write(chalk.bold.cyan(' 🤖 Assistant:\n'));
                    const stopTyping = VibeUI.showTyping();
                    let fullResponse = '';
                    let firstChunk = true;

                    await provider.sendStream(query, toonContext + '\n\n' + TOON_SYSTEM_PROMPT, (chunk: string) => {
                        if (firstChunk) { stopTyping(); firstChunk = false; }
                        fullResponse += chunk;
                        process.stdout.write(chunk);
                    });
                    
                    if (firstChunk) stopTyping();
                    process.stdout.write('\n');

                    const decoded = ToonDecoder.decode(fullResponse);
                    if (decoded) {
                        const linesToClear = (fullResponse.match(/\n/g) || []).length + 1;
                        for (let i = 0; i < linesToClear; i++) {
                            process.stdout.write('\x1b[1A\x1b[2K');
                        }
                        process.stdout.cursorTo(0);

                        const analysis = ToonDecoder.renderMarkdown(decoded, root, fullResponse);
                        console.log(VibeUI.formatAssistantResponse(analysis));
                    }

                } catch (err: unknown) {
                    const e = err as { code?: string; message?: string };
                    if (e && e.code === 'ERR_USE_AFTER_CLOSE') continue;
                    if (e && e.message && (e.message.includes('closed') || e.message.includes('readline'))) {
                        isRunning = false;
                    } else if (e) {
                        VibeUI.system(chalk.red(`\n⚡ Elite Recovery: Soft restart: ${e.message || String(e)}`));
                    }
                }
            }
            process.exit(0);
        });

    program.command('index').action(async () => { /* ... aborted ... */ });
    program.command('config').action(async () => { /* ... aborted ... */ });
    program.command('watch').action(async () => { /* ... abbreviated ... */ });

    program.parse(process.argv);
}

main();
