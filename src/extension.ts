import * as vscode from 'vscode';
import { Logger } from './utils/Logger';
import { IndexStore } from './indexer/IndexStore';
import { IndexScheduler } from './indexer/IndexScheduler';
import { HistoryStore } from './history/HistoryStore';
import { SidebarProvider } from './ui/SidebarProvider';
import { WatcherService } from './core/WatcherService';
import { SymbolExtractor } from './indexer/SymbolExtractor';
import { VsCodeSymbolProvider } from './core/symbols/VsCodeSymbolProvider';
import { VsCodeFileSystem } from './core/fs/VsCodeFileSystem';
import { VsCodeIndexStorage } from './core/storage/VsCodeIndexStorage';
import { VsCodeConfiguration } from './ai/VsCodeConfiguration';

export async function activate(context: vscode.ExtensionContext) {
    Logger.initialize(context);
    
    // 1. Register high-fidelity VS Code symbol provider
    SymbolExtractor.setProvider(new VsCodeSymbolProvider());
    
    Logger.log('Tooning extension activating...');

    const fs = new VsCodeFileSystem();
    const config = new VsCodeConfiguration();
    const storage = new VsCodeIndexStorage(context);
    const indexStore = new IndexStore(storage, fs);
    await indexStore.initialize();

    const historyStore = new HistoryStore(context);
    await historyStore.initialize();

    const getScanOptions = () => {
        return {
            excludeGlobs: config.getExcludes(),
            maxFileSizeKB: 500,
            rootPath: vscode.workspace.workspaceFolders?.[0].uri.fsPath || '.'
        };
    };

    // 2. Watcher Service (Real-time indexing)
    const indexMode = config.get<string>('indexMode', 'realtime');
    let watcher: WatcherService | null = null;
    
    if (indexMode === 'realtime' && vscode.workspace.workspaceFolders?.[0]) {
        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        watcher = new WatcherService(indexStore, rootPath, getScanOptions());
        watcher.start();
        Logger.log('Real-time indexing watcher active.');
    }

    // 3. Scheduler Service
    const scheduler = new IndexScheduler(indexStore);
    scheduler.start();

    // Trigger initial indexing on load
    vscode.window.withProgress({ title: 'Tooning: Initial Indexing...', location: vscode.ProgressLocation.Window }, async () => {
        await scheduler.trigger();
    });

    // 4. UI components
    const sidebarProvider = new SidebarProvider(context.extensionUri, indexStore, historyStore);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    // 5. Commands
    const reindexCommand = vscode.commands.registerCommand('tooning.reindex', async () => {
        Logger.log('Command invoked: tooning.reindex');
        vscode.window.showInformationMessage('Tooning: Reindexing workspace...');
        await indexStore.updateFullWorkspace(getScanOptions());
        vscode.window.showInformationMessage('Tooning: Reindexing complete.');
    });

    const clearHistorySubscription = vscode.commands.registerCommand('tooning.clearHistory', () => {
        historyStore.clear();
        sidebarProvider.refreshHistory();
        vscode.window.showInformationMessage('Tooning history cleared.');
    });

    const analyzeSelectionSubscription = vscode.commands.registerCommand('tooning.analyzeSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        if (selection.isEmpty) return;

        const text = editor.document.getText(selection);
        const fileName = vscode.workspace.asRelativePath(editor.document.uri, false);
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;

        await vscode.commands.executeCommand('tooning.chatView.focus');

        setTimeout(() => {
            const prompt = `Analyze this snippet (lines ${startLine}-${endLine}) in @${fileName}.\n\n\`\`\`\n${text}\n\`\`\``;
            sidebarProvider.handleUserPrompt(prompt);
        }, 300);
    });

    const openSettingsCommand = vscode.commands.registerCommand('tooning.openSettings', () => {
        Logger.log('Command invoked: tooning.openSettings');
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:omkar.tooning');
    });

    context.subscriptions.push(
        reindexCommand,
        clearHistorySubscription,
        analyzeSelectionSubscription,
        openSettingsCommand
    );

    if (watcher) {
        context.subscriptions.push({ dispose: () => watcher?.stop() });
    }

    Logger.log('Tooning extension activated successfully.');
}

export function deactivate() {
    Logger.log('Tooning extension deactivated.');
}
