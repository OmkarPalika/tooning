import { IFileSystem } from '../core/fs/IFileSystem';
import { DocParser } from '../core/parsers/DocParser';
import { Logger } from '../utils/Logger';
import { SymbolExtractor, FileEntry, SymbolEntry } from './SymbolExtractor';
import { Tokenizer } from '../utils/Tokenizer';
import { SecurityManager } from '../utils/SecurityManager';
import pLimit from 'p-limit';

export class FileScanner {
    
    /**
     * Industry-grade workspace scanner with controlled concurrency.
     */
    public static async scanWorkspace(
        fs: IFileSystem,
        config: { excludeGlobs: string[], maxFileSizeKB: number, rootPath: string },
        onProgress?: (current: number, total: number, timeMs: number) => void
    ): Promise<{ entries: FileEntry[], totalRawTokens: number }> {
        const entries: FileEntry[] = [];
        let totalRawTokens = 0;

        Logger.log('Starting industry-grade concurrent scan...');
        const startTime = Date.now();

        // 1. Discovery (Fast-Glob handles excludes)
        const allFiles = await fs.findFiles('**/*');
        const totalFiles = allFiles.length;
        let processedFiles = 0;

        if (onProgress) onProgress(0, totalFiles, 0);

        // Industry-grade concurrency control: P-Limit prevents memory exhaustion
        const limit = pLimit(10); 
        
        const tasks = allFiles.map((filePath) => 
            limit(async () => {
                const entry = await this.scanSingleFile(fs, filePath, config);
                if (entry) {
                    entries.push(entry);
                    totalRawTokens += Tokenizer.estimateTokens(entry.symbols.map(s => s.name).join(' ')); 
                }
                processedFiles++;
                if (onProgress && processedFiles % 5 === 0) {
                    onProgress(processedFiles, totalFiles, Date.now() - startTime);
                }
            })
        );

        await Promise.all(tasks);

        Logger.log(`Successfully extracted symbols/text from ${entries.length} items.`);
        return { entries, totalRawTokens };
    }

    /**
     * Scans a single file and returns a FileEntry, or null if skipped/unsupported.
     */
    public static async scanSingleFile(
        fs: IFileSystem, 
        filePath: string, 
        config: { maxFileSizeKB: number, rootPath: string }
    ): Promise<FileEntry | null> {
        try {
            // SECURITY GATE
            const security = await SecurityManager.validate(filePath, config.rootPath);
            if (!security.safe) return null;

            const stats = await fs.stat(filePath);
            if (stats.size > config.maxFileSizeKB * 1024) return null;

            const isDoc = DocParser.isSupported(filePath);
            const lang = !isDoc ? this.inferLanguage(filePath) : 'document';
            
            if (!lang && !isDoc) return null;

            let content = "";
            let symbols: SymbolEntry[] = [];

            if (isDoc) {
                const bin = await fs.readBinary(filePath);
                content = filePath.toLowerCase().endsWith('.pdf') 
                    ? await DocParser.parsePdf(bin)
                    : DocParser.parseExcel(bin);
                symbols = [{ type: 'variable', name: 'Document Content', lineRange: '1-1' }];
            } else {
                content = await fs.readFile(filePath);
                symbols = await SymbolExtractor.extractSymbols(filePath, lang!, content);
            }

            return {
                path: fs.relative(config.rootPath, filePath),
                language: lang || 'unknown',
                size: stats.size,
                lastModified: stats.mtime,
                symbols: symbols
            };
        } catch (e) {
            Logger.error(`Error scanning ${filePath}: ${e}`);
            return null;
        }
    }

    public static inferLanguage(filePath: string): string | null {
        const parts = filePath.split('.');
        if (parts.length < 2) return null;
        const ext = `.${parts.pop()?.toLowerCase()}`;

        switch (ext) {
            case '.js': case '.jsx': return 'javascript';
            case '.ts': case '.tsx': return 'typescript';
            case '.py': return 'python';
            case '.go': return 'go';
            case '.rs': return 'rust';
            case '.java': return 'java';
            case '.cs': return 'csharp';
            case '.cpp': case '.hpp': case '.c': case '.h': return 'cpp';
            case '.php': return 'php';
            case '.rb': return 'ruby';
            case '.swift': return 'swift';
            case '.html': return 'html';
            case '.css': return 'css';
            case '.json': return 'json';
            case '.yml': case '.yaml': return 'yaml';
            case '.md': return 'markdown';
            default: return null;
        }
    }
}
