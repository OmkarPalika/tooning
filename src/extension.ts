import * as vscode from 'vscode';
import { Logger } from './utils/Logger';
import { IndexStore } from './indexer/IndexStore';
import { IndexScheduler } from './indexer/IndexScheduler';
import { HistoryStore } from './history/HistoryStore';
import { SidebarProvider } from './ui/SidebarProvider';
import { WatcherService } from './core/WatcherService';

export async function activate(context: vscode.ExtensionContext) {
    Logger.initialize(context);
    Logger.log('Tooning extension activating...');

    const indexStore = new IndexStore(context);
    await indexStore.initialize();

    const historyStore = new HistoryStore(context);
    await historyStore.initialize();

    // 2. Watcher Service (V6 Incremental)
    const config = vscode.workspace.getConfiguration('tooning');
    const indexMode = config.get<string>('indexMode', 'realtime');
    let watcher: WatcherService | null = null;
    
    if (indexMode === 'realtime' && vscode.workspace.workspaceFolders?.[0]) {
        const rootPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
        watcher = new WatcherService(indexStore, rootPath);
        watcher.start();
        Logger.log('Real-time indexing watcher active.');
    }

    const scheduler = new IndexScheduler(indexStore);
    scheduler.start();

    // Trigger initial indexing
    vscode.window.withProgress({ title: 'Tooning: Initial Indexing...', location: vscode.ProgressLocation.Window }, async () => {
        await scheduler.trigger();
    });

    const sidebarProvider = new SidebarProvider(context.extensionUri, indexStore, historyStore);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarProvider.viewType, sidebarProvider)
    );

    const reindexCommand = vscode.commands.registerCommand('tooning.reindex', async () => {
        Logger.log('Command invoked: tooning.reindex');
        vscode.window.showInformationMessage('Tooning: Reindexing workspace...');
        await indexStore.updateFullWorkspace();
        vscode.window.showInformationMessage('Tooning: Reindexing complete.');
    });

    let clearHistorySubscription = vscode.commands.registerCommand('tooning.clearHistory', () => {
        historyStore.clear();
        sidebarProvider.refreshHistory();
        vscode.window.showInformationMessage('Tooning history cleared.');
    });

    let analyzeSelectionSubscription = vscode.commands.registerCommand('tooning.analyzeSelection', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;

        const selection = editor.selection;
        if (selection.isEmpty) return;

        const text = editor.document.getText(selection);
        const fileName = vscode.workspace.asRelativePath(editor.document.uri, false);
        const startLine = selection.start.line + 1;
        const endLine = selection.end.line + 1;

        // Force open the sidebar view
        await vscode.commands.executeCommand('tooning.chatView.focus');

        // Give it a tiny delay to ensure the webview is ready if it wasn't open
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
    Logger.log('Tooning extension activated successfully.');
}

export function deactivate() {
    Logger.log('Tooning extension deactivated.');
}
