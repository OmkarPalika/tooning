import { FileEntry } from '../indexer/SymbolExtractor';

export class RelevanceEngine {
    
    private static STOP_WORDS = new Set([
        'a', 'an', 'the', 'is', 'are', 'was', 'were', 'to', 'for', 'in', 'of', 'and', 'or', 
        'how', 'what', 'where', 'when', 'why', 'who', 'does', 'do', 'any', 'all', 'some',
        'my', 'code', 'file', 'project', 'repo', 'work', 'function', 'class', 'variable'
    ]);

    /**
     * Scores a FileEntry based on query relevance.
     * Scale of 0 to infinity (higher is better).
     */
    public static score(file: FileEntry, keywords: string[]): number {
        if (keywords.length === 0) return 0;
        
        let score = 0;
        const lowerPath = file.path.toLowerCase();
        
        for (const kw of keywords) {
            // 1. Filename match (Biggest boost)
            if (lowerPath.includes(kw)) {
                score += 5;
                // Extra boost for exact filename match (minus extension)
                const filename = lowerPath.split('/').pop() || "";
                if (filename.startsWith(kw)) score += 5;
            }

            // 2. Symbols match
            for (const sym of file.symbols) {
                const symLower = sym.name.toLowerCase();
                if (symLower.includes(kw)) {
                    // Type-based weighting
                    if (sym.type === 'class') score += 3;
                    else if (sym.type === 'function') score += 2;
                    else score += 1;

                    // Exact match bonus
                    if (symLower === kw) score += 2;
                }
            }
        }

        return score;
    }

    /**
     * Extract meaningful keywords from a natural language query.
     */
    public static extractKeywords(query: string): string[] {
        return query
            .toLowerCase()
            .split(/[^a-z0-9]/)
            .filter(word => word.length > 1 && !this.STOP_WORDS.has(word));
    }

    /**
     * Sorts files by query relevance.
     */
    public static sortByRelevance(files: FileEntry[], query: string): FileEntry[] {
        const keywords = this.extractKeywords(query);
        if (keywords.length === 0) return files;

        const scoredFiles = files.map(f => ({
            file: f,
            score: this.score(f, keywords)
        }));

        return scoredFiles
            .sort((a, b) => b.score - a.score)
            .map(x => x.file);
    }
}
