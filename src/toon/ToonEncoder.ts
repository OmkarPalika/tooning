import { FileEntry } from '../indexer/SymbolExtractor';
import { Tokenizer } from '../utils/Tokenizer';
import { SecurityManager } from '../utils/SecurityManager';
import { RelevanceEngine } from '../utils/RelevanceEngine';
import { IFileSystem } from '../core/fs/IFileSystem';
import { Logger } from '../utils/Logger';

export class ToonEncoder {
    
    /**
     * Compresses the raw index into minimal TOON strings.
     * f{p:path,l:ext,sym:[fn{n},cls{n}]}
     */
    public static encodeIndex(files: FileEntry[], maxTokens: number): string {
        let toonStr = 'idx:[';
        let runningTokens = 0;

        // Naive for now: just map everything until we hit the budget.
        // In a real scenario, we'd sort by mtime or query relevance.
        
        const fileBlocks: string[] = [];

        for (const file of files) {
            const symList = file.symbols.map(s => {
                let tag = '';
                if (s.type === 'function') tag = 'fn';
                else if (s.type === 'class') tag = 'cls';
                else if (s.type === 'variable') tag = 'v';
                else tag = 'i'; // import
                
                return `${tag}{n:${s.name},ln:${s.lineRange || '?'}}`;
            }).join(',');

            const block = `f{p:${file.path},l:${file.language},sym:[${symList}]}`;
            const blockTokens = Tokenizer.estimateTokens(block);

            if (runningTokens + blockTokens > maxTokens) {
                break; // Stop adding files to avoid context limits
            }

            fileBlocks.push(block);
            runningTokens += blockTokens;
        }

        toonStr += fileBlocks.join(',') + ']';
        return toonStr;
    }

    public static async encodeQuery(query: string, maxTokens: number, files: FileEntry[], attachments: string[], fs: IFileSystem, rootPath: string): Promise<string> {
        // V4 UPGRADE: Semantic Reranking
        // Sort files by query relevance so the 'best' context occupies the token budget first.
        const sortedFiles = RelevanceEngine.sortByRelevance(files, query);
        
        const toonIdx = this.encodeIndex(sortedFiles, maxTokens - 3000); // Save a large buffer for full file attachments and query

        let attachText = '';
        if (attachments && attachments.length > 0) {
            attachText = '\n\n[ATTACHED FULL FILES]\n';
            for (const att of attachments) {
                try {
                    // find matching file entry to get absolute path
                    const fileEntry = files.find(f => f.path === att);
                    if (fileEntry) {
                        const fullPath = fs.join(rootPath, att);
                        
                        // SECURITY GATE
                        const security = SecurityManager.validate(fullPath);
                        if (!security.safe) {
                            Logger.log(security.reason || `Blocked: ${att}`);
                            continue;
                        }

                        try {
                            const content = await fs.readFile(fullPath);
                            attachText += `\n--- START ${att} ---\n${content}\n--- END ${att} ---\n`;
                        } catch {
                            // Not found
                        }
                    }
                } catch {
                    // Fail silently for single attachment
                }
            }
        }

        // Escape quotes to prevent breaking the q{...} wrapper
        const escapedQuery = query.replace(/"/g, '\\"');
        return `q{raw:"${escapedQuery}",focus:all}\n${toonIdx}${attachText}`;
    }
}
