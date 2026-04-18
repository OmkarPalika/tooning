export interface SymbolEntry {
    type: 'function' | 'class' | 'variable' | 'import';
    name: string;
    lineRange?: string; // e.g. "10-25"
}

export interface ISymbolProvider {
    /**
     * Extracts symbols from a file's content.
     */
    extractSymbols(fsPath: string, languageId: string, content: string): Promise<SymbolEntry[]>;
}
