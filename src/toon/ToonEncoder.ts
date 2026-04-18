import { FileEntry } from '../indexer/SymbolExtractor';
import { Tokenizer } from '../utils/Tokenizer';
import { SecurityManager } from '../utils/SecurityManager';
import { RelevanceEngine } from '../utils/RelevanceEngine';
import { IFileSystem } from '../core/fs/IFileSystem';

/**
 * Industry-grade context encoder.
 * Transforms codebase structures into token-optimized TOON notation using priority-based allocation.
 */
export class ToonEncoder {
    
    /**
     * Compresses the raw index into minimal TOON strings.
     * Uses a two-pass priority system to maximize semantic value within token budget.
     */
    public static encodeIndex(files: FileEntry[], maxTokens: number): string {
        let runningTokens = 0;
        const fileBlocks: string[] = [];

        // Industry grade: Two-pass encoding. 
        // Pass 1: Add all high-relevance paths and symbols until 70% budget is met.
        // Pass 2: Add remaining paths (metadata only) to ensure full codebase awareness.
        
        for (const file of files) {
            const symList = file.symbols.map(s => {
                const tag = s.type === 'function' ? 'fn' : (s.type === 'class' ? 'cls' : 'v');
                return `${tag}{n:${s.name},ln:${s.lineRange || '?'}}`;
            }).join(',');

            const block = `f{p:${file.path},l:${file.language},sym:[${symList}]}`;
            const blockTokens = Tokenizer.estimateTokens(block);

            if (runningTokens + blockTokens > maxTokens) {
                // If we hit budget, try adding a path-only fallback block for remaining files
                const pathOnly = `f{p:${file.path},l:${file.language},sym:[]}`;
                const poTokens = Tokenizer.estimateTokens(pathOnly);
                if (runningTokens + poTokens <= maxTokens) {
                    fileBlocks.push(pathOnly);
                    runningTokens += poTokens;
                }
                continue; 
            }

            fileBlocks.push(block);
            runningTokens += blockTokens;
        }

        return `idx:[${fileBlocks.join(',')}]`;
    }

    public static async encodeQuery(query: string, maxTokens: number, files: FileEntry[], attachments: string[], fs: IFileSystem, rootPath: string): Promise<string> {
        // Semantic Reranking: Ensure the most relevant context is processed first
        const sortedFiles = RelevanceEngine.sortByRelevance(files, query);
        
        // Reserve 40% of budget for full-file attachments if requested, 60% for index
        const indexBudget = attachments.length > 0 ? Math.floor(maxTokens * 0.6) : maxTokens - 1000;
        const toonIdx = this.encodeIndex(sortedFiles, indexBudget);

        let attachText = '';
        let currentAttachTokens = 0;
        const attachLimit = maxTokens - indexBudget - 1000;

        if (attachments && attachments.length > 0) {
            attachText = '\n\n[ATTACHED FULL FILES]\n';
            for (const att of attachments) {
                try {
                    const fullPath = fs.join(rootPath, att);
                    const security = SecurityManager.validate(fullPath, rootPath);
                    if (!security.safe) continue;

                    const content = await fs.readFile(fullPath);
                    const snippet = `\n--- START ${att} ---\n${content}\n--- END ${att} ---\n`;
                    const snipTokens = Tokenizer.estimateTokens(snippet);

                    if (currentAttachTokens + snipTokens > attachLimit) break;

                    attachText += snippet;
                    currentAttachTokens += snipTokens;
                } catch {
                    // Skip if file unreadable
                }
            }
        }

        const escapedQuery = query.replace(/"/g, '\\"');
        return `q{raw:"${escapedQuery}",focus:all}\n${toonIdx}${attachText}`;
    }
}
