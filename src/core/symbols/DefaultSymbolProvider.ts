import { ISymbolProvider, SymbolEntry } from './ISymbolProvider';

export class DefaultSymbolProvider implements ISymbolProvider {
    /**
     * Extracts symbols using basic regex patterns (fallback for non-IDE environments).
     */
    public async extractSymbols(_fsPath: string, _languageId: string, content: string): Promise<SymbolEntry[]> {
        const symbols: SymbolEntry[] = [];
        const lines = content.split('\n');

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
