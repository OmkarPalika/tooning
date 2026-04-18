import { ISymbolProvider, SymbolEntry } from './ISymbolProvider';

/**
 * Industry-grade fallback symbol extractor.
 * Provides high-fidelity symbol extraction using advanced regex patterns for universal portability.
 */
export class DefaultSymbolProvider implements ISymbolProvider {
    /**
     * Extracts symbols using comprehensive regex patterns for widely used professional languages.
     */
    public async extractSymbols(_fsPath: string, languageId: string, content: string): Promise<SymbolEntry[]> {
        const symbols: SymbolEntry[] = [];
        const lines = content.split('\n');

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // --- 💡 JS / TS / C-Family ---
            // Class: class User, export class Hero
            if (line.match(/^(export\s+)?class\s+(\w+)/)) {
                const match = line.match(/class\s+(\w+)/);
                if (match) symbols.push({ type: 'class', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                continue;
            }

            // Function: function init, export async function scan
            if (line.match(/^(export\s+)?(async\s+)?function\s+(\w+)/)) {
                const match = line.match(/function\s+(\w+)/);
                if (match) symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                continue;
            }

            // --- 🐍 PYTHON ---
            // def my_func(..), class MyClass:
            if (languageId === 'python') {
                if (line.match(/^def\s+(\w+)\s*\(/)) {
                    const match = line.match(/^def\s+(\w+)/);
                    if (match) symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                } else if (line.match(/^class\s+(\w+)\s*:/)) {
                    const match = line.match(/^class\s+(\w+)/);
                    if (match) symbols.push({ type: 'class', name: match[1], lineRange: `${i + i}-${i + 1}` });
                }
                continue;
            }

            // --- 🐹 GO ---
            // func (r *Rect) Area(), func Main()
            if (languageId === 'go') {
                if (line.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/)) {
                    const match = line.match(/^func\s+(?:\([^)]+\)\s+)?(\w+)/);
                    if (match) symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                } else if (line.match(/^type\s+(\w+)\s+(?:struct|interface)/)) {
                    const match = line.match(/^type\s+(\w+)/);
                    if (match) symbols.push({ type: 'class', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                }
                continue;
            }

            // --- 🦀 RUST ---
            // fn main(), impl Calculator, trait Summary, struct User
            if (languageId === 'rust') {
                if (line.match(/^(pub\s+)?fn\s+(\w+)/)) {
                    const match = line.match(/fn\s+(\w+)/);
                    if (match) symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                } else if (line.match(/^(pub\s+)?(struct|enum|trait|impl)\s+(\w+)/)) {
                    const match = line.match(/(struct|enum|trait|impl)\s+(\w+)/);
                    if (match) symbols.push({ type: 'class', name: match[2], lineRange: `${i + 1}-${i + 1}` });
                }
                continue;
            }

            // --- 💎 RUBY / PHP ---
            // def my_method, class User, function myPhpFunc()
            if (languageId === 'ruby' || languageId === 'php') {
                if (line.match(/^(?:export\s+)?function\s+(\w+)/) || line.match(/^def\s+(\w+)/)) {
                    const match = line.match(/function\s+(\w+)/) || line.match(/^def\s+(\w+)/);
                    if (match) symbols.push({ type: 'function', name: match[1], lineRange: `${i + 1}-${i + 1}` });
                }
                continue;
            }
        }

        return symbols;
    }
}
