import * as vscode from 'vscode';
import { join } from 'path';
import { readFileSync } from 'fs';
import { Logger } from '../utils/Logger';
import { IndexStore } from '../indexer/IndexStore';
import { HistoryStore } from '../history/HistoryStore';
import { ToonEncoder } from '../toon/ToonEncoder';
import { ToonDecoder } from '../toon/ToonDecoder';
import { VsCodeConfiguration } from '../ai/VsCodeConfiguration';
import { VsCodeFileSystem } from '../core/fs/VsCodeFileSystem';
import { ProviderFactory } from '../ai/ProviderFactory';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'tooning.chatView';
    private _view?: vscode.WebviewView;
    private config: VsCodeConfiguration;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly indexStore: IndexStore,
        private readonly historyStore: HistoryStore
    ) { 
        this.config = new VsCodeConfiguration();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        __token: vscode.CancellationToken,
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'prompt':
                    await this.handleUserPrompt(data.value);
                    break;
                case 'ready':
                    this.refreshHistory();
                    break;
                case 'copyToClipboard':
                    await vscode.env.clipboard.writeText(data.value);
                    vscode.window.showInformationMessage('TOON Payload copied to clipboard! Ready to paste to Cursor/Antigravity.');
                    break;
            }
        });

        this.indexStore.onDidStartIndexing(() => {
            if (this._view) {
                this._view.webview.postMessage({ type: 'indexState', state: 'indexing', msg: 'Indexing started...' });
            }
        });

        this.indexStore.onDidUpdateProgress(e => {
            if (this._view) {
                const s = Math.round(e.estMs / 1000);
                this._view.webview.postMessage({ 
                    type: 'indexState', 
                    state: 'indexing', 
                    msg: `Scanning codebase... ${e.current}/${e.total} files (Est. ${s}s)` 
                });
            }
        });

        this.indexStore.onDidFinishIndexing(e => {
            if (this._view) {
                const paths = this.indexStore.getFiles().map(f => f.path);
                this._view.webview.postMessage({ type: 'indexState', state: 'done' });
                this._view.webview.postMessage({ type: 'fileList', files: paths });
                this._view.webview.postMessage({ 
                    type: 'dashboardUpdate', 
                    rawTokens: e.rawTokens, 
                    toonTokens: e.toonTokens 
                });
            }
        });
    }

    public async handleUserPrompt(prompt: string) {
        if (!this._view) return;

        this.historyStore.addMessage({ role: 'user', content: prompt });
        this._view.webview.postMessage({ type: 'addMessage', role: 'user', content: prompt });
        this._view.webview.postMessage({ type: 'addMessage', role: 'assistant', content: 'Analyzing your workspace...' });

        try {
            const maxTokens = this.config.getMaxTokens();
            const showRaw = this.config.get<boolean>('showRawToon', true);

            // Extract @attachments
            const matchAttachments = prompt.match(/@([\w/.-]+(?:\\\.[\w]+)*)/g);
            const attachments = matchAttachments ? matchAttachments.map(s => s.substring(1)) : [];

            const indexFiles = this.indexStore.getFiles();
            
            // CONTEXT OPTIMIZATION: If the query is just a simple word/phrase (like "hi"),
            // don't waste 10k+ tokens on the codebase index.
            const isTrivial = prompt.trim().toLowerCase().length < 5 && !attachments.length;
            
            const fs = new VsCodeFileSystem();
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || folders.length === 0) return;
            const rootPath = folders[0].uri.fsPath;

            const toonQuery = isTrivial 
                ? `q{raw:"${prompt}",focus:none}` 
                : await ToonEncoder.encodeQuery(prompt, maxTokens, indexFiles, attachments, fs, rootPath);
            
            let systemPrompt = `You are an industry-grade codebase analyzer. You MUST respond ONLY in strictly valid JSON containing TOON notation.
Schema: {"r": {"ans": [{"n":"name", "f":"path", "ln":"lines"}], "why": "reason", "risk": "low|med|high", "chg": []}}
Rules:
1. ans[] lists ONLY relevant entities from the provided idx.
2. why is concise.
3. If no entities match, leave ans empty.`;

            if (prompt.startsWith('/audit')) {
                systemPrompt = `You are an elite Security and Architectural Auditor. Your output MUST be strictly valid JSON containing TOON notation.
Schema: {"r": {"ans": [{"n":"vuln_or_pattern", "f":"path", "ln":"lines"}], "why": "detailed audit summary", "risk": "high", "chg": []}}
Rules:
1. Identify circular dependencies, security flaws, or major anti-patterns in the TOON index.
2. Set risk to high for critical logic flaws.
3. Keep ans[] tightly focused on the problematic methods/classes.`;
            } else if (prompt.startsWith('/docs')) {
                systemPrompt = `You are an elite Technical Writer. Your output MUST be strictly valid JSON containing TOON notation.
Schema: {"r": {"ans": [{"n":"architecture_entity", "f":"path", "ln":"lines"}], "why": "markdown formatted documentation for the requested scopes", "risk": "low", "chg": []}}
Rules:
1. Provide deep technical understanding in the "why" field summarizing the flow of the attachments or index.
2. Maintain strict JSON conformity.`;
            } else if (prompt.startsWith('/refactor')) {
                systemPrompt = `You are an elite Refactoring Engine. Your output MUST be strictly valid JSON containing TOON notation.
Schema: {"r": {"ans": [], "why": "refactor intent", "risk": "med", "chg": [{"op":"replace|add", "f":"path", "ln":"line_num", "snip":"code"}]}}
Rules:
1. Output exact code changes in the 'chg' array. 
2. 'snip' must contain the precise drop-in code.
3. Maintain strict JSON conformity.`;
            }

            const provider = ProviderFactory.createProvider(this.config);
            
            // Streaming extraction
            let rawBuffer = "";
            let isFirstChunk = true;

            const finalResponseContent = await provider.sendStream(toonQuery, systemPrompt, (chunk: string) => {
                rawBuffer += chunk;
                if (isFirstChunk) {
                    // Replace "Analyzing..." with actual first text
                    this._view?.webview.postMessage({ type: 'updateLastMessage', content: rawBuffer, mode: 'stream' });
                    isFirstChunk = false;
                } else {
                    // Update partial stream
                    this._view?.webview.postMessage({ type: 'updateLastMessage', content: rawBuffer, mode: 'stream' });
                }
            });

            // Stream finished -> Render final Markdown gracefully
            const decoded = ToonDecoder.decode(finalResponseContent);
            let finalMarkdown = '';
            
            if (decoded) {
                finalMarkdown = ToonDecoder.renderMarkdown(decoded, showRaw ? finalResponseContent : 'Hidden by settings');
            } else {
                // CASUAL CHAT: Just show the raw response as markdown
                finalMarkdown = finalResponseContent;
            }

            this.historyStore.addMessage({ role: 'assistant', content: finalMarkdown });
            this._view.webview.postMessage({ type: 'updateLastMessage', content: finalMarkdown, mode: 'final' });

        } catch (e: unknown) {
            Logger.error("Error generating stream answer", e);
            const errorMsg = `**Error:** ${e instanceof Error ? e.message : String(e)}`;
            this.historyStore.addMessage({ role: 'assistant', content: errorMsg });
            this._view.webview.postMessage({ type: 'updateLastMessage', content: errorMsg, mode: 'final' });
        }
    }

    public refreshHistory() {
        if (this._view) {
            this._view.webview.postMessage({ type: 'loadHistory', messages: this.historyStore.getMessages() });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        const htmlPath = join(this._extensionUri.fsPath, 'src', 'ui', 'webview', 'index.html');
        let html = readFileSync(htmlPath, 'utf8');

        // Toolkit injection
        const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode', 'webview-ui-toolkit', 'dist', 'toolkit.min.js'));

        const cssPath = join(this._extensionUri.fsPath, 'src', 'ui', 'webview', 'style.css');
        const jsPath = join(this._extensionUri.fsPath, 'src', 'ui', 'webview', 'chat.js');
        
        const css = readFileSync(cssPath, 'utf8');
        const js = readFileSync(jsPath, 'utf8');

        html = html.replace('<!-- INJECT_CSS -->', `<style>${css}</style>`);
        html = html.replace('<!-- INJECT_JS -->', `<script type="module" src="${toolkitUri}"></script>\n<script>${js}</script>`);

        return html;
    }
}
