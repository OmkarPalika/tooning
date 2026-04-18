import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

export interface FileEntry {
    path: string;
    language: string;
    size: number;
    lastModified: number;
    symbols: SymbolEntry[];
}

export interface SymbolEntry {
    type: 'function' | 'class' | 'variable' | 'import';
    name: string;
    lineRange?: string; // e.g. "10-25"
}

export class SymbolExtractor {
    
    public static async extractSymbols(fsPath: string, languageId: string, content: string): Promise<SymbolEntry[]> {
        const symbols: SymbolEntry[] = [];
        
        try {
            // Check if we are in VS Code environment with command support
            if (typeof vscode !== 'undefined' && vscode.commands) {
                // Priority 1: Try VS Code native symbol provider
                const docSymbols: vscode.DocumentSymbol[] | undefined = await vscode.commands.executeCommand(
                    'vscode.executeDocumentSymbolProvider',
                    vscode.Uri.file(fsPath)
                );

                if (docSymbols && docSymbols.length > 0) {
                    this.parseDocSymbols(docSymbols, symbols);
                    return symbols;
                }
            }
            
            // Priority 2: Fallback to regex for unsupported languages or in CLI mode
            return this.extractSymbolsRegex(content, languageId);

        } catch (err) {
            // Fail silently or log to non-vscode logger
            return this.extractSymbolsRegex(content, languageId);
        }
    }

    private static parseDocSymbols(docSymbols: vscode.DocumentSymbol[], output: SymbolEntry[]) {
        for (const sym of docSymbols) {
            let type: SymbolEntry['type'] | null = null;
            if (sym.kind === vscode.SymbolKind.Function || sym.kind === vscode.SymbolKind.Method) {
                type = 'function';
            } else if (sym.kind === vscode.SymbolKind.Class || sym.kind === vscode.SymbolKind.Interface) {
                type = 'class';
            } else if (sym.kind === vscode.SymbolKind.Variable || sym.kind === vscode.SymbolKind.Constant) {
                type = 'variable';
            }

            if (type) {
                output.push({
                    type,
                    name: sym.name,
                    lineRange: `${sym.range.start.line + 1}-${sym.range.end.line + 1}`
                });
            }

            // Recursive
            if (sym.children && sym.children.length > 0) {
                this.parseDocSymbols(sym.children, output);
            }
        }
    }

    private static extractSymbolsRegex(content: string, languageId: string): SymbolEntry[] {
        const symbols: SymbolEntry[] = [];
        const lines = content.split('\n');

        // Really basic heuristic extraction for when language server isn't available
        // Mostly tuned for JS/TS/Python as a fallback
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Function/Method (def auth_guard(req, res):, function init(), const myFunc = () => {})
            if (line.match(/^(export\s+)?(async\s+)?function\s+(\w+)/) || 
                line.match(/^(export\s+)?(?:const|let)\s+(\w+)\s*=\s*(async\s*)?(?:function|\([^)]*\)\s*=>)/) ||
                line.match(/^def\s+(\w+)\s*\(/)) {
                
                const match = line.match(/function\s+(\w+)/) || line.match(/(?:const|let)\s+(\w+)\s*=/) || line.match(/^def\s+(\w+)/);
                if (match && match[1]) {
                    symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                }
            }

            // Class (class User extends Model)
            if (line.match(/^(export\s+)?class\s+(\w+)/)) {
                const match = line.match(/class\s+(\w+)/);
                if (match && match[1]) {
                    symbols.push({ type: 'class', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                }
            }
        }

        return symbols;
    }
}
