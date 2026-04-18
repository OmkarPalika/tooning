import { ISymbolProvider, SymbolEntry } from '../core/symbols/ISymbolProvider';
import { DefaultSymbolProvider } from '../core/symbols/DefaultSymbolProvider';

export { SymbolEntry };

export interface FileEntry {
    path: string;
    language: string;
    size: number;
    lastModified: number;
    symbols: SymbolEntry[];
}

export class SymbolExtractor {
    private static provider: ISymbolProvider = new DefaultSymbolProvider();

    /**
     * Set a custom symbol provider (e.g., for VS Code environment).
     */
    public static setProvider(provider: ISymbolProvider) {
        this.provider = provider;
    }

    public static async extractSymbols(fsPath: string, languageId: string, content: string): Promise<SymbolEntry[]> {
        try {
            return await this.provider.extractSymbols(fsPath, languageId, content);
        } catch {
            // Fallback to default if custom provider fails
            if (!(this.provider instanceof DefaultSymbolProvider)) {
                return new DefaultSymbolProvider().extractSymbols(fsPath, languageId, content);
            }
            return [];
        }
    }
}
