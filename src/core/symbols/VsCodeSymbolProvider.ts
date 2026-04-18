import * as vscode from 'vscode';
import { ISymbolProvider, SymbolEntry } from './ISymbolProvider';

export class VsCodeSymbolProvider implements ISymbolProvider {
    public async extractSymbols(fsPath: string, _languageId: string, _content: string): Promise<SymbolEntry[]> {
        const symbols: SymbolEntry[] = [];
        
        try {
            // Priority 1: Try VS Code native symbol provider via command
            const docSymbols: vscode.DocumentSymbol[] | undefined = await vscode.commands.executeCommand(
                'vscode.executeDocumentSymbolProvider',
                vscode.Uri.file(fsPath)
            );

            if (docSymbols && docSymbols.length > 0) {
                this.parseDocSymbols(docSymbols, symbols);
                return symbols;
            }
        } catch (e) {
            // Log or ignore
        }
        
        return symbols;
    }

    private parseDocSymbols(docSymbols: vscode.DocumentSymbol[], output: SymbolEntry[]) {
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
}
