import { ToonResponse } from './ToonSpec';
import { Logger } from '../utils/Logger';
import { VibeUI } from '../ui/VibeUI';
import chalk from 'chalk';

export class ToonDecoder {
    
    /**
     * Normalizes pure TOON (unquoted keys) to JSON (quoted keys) for parsing.
     * V18: High-density protocol normalization.
     */
    private static normalizeToonToJson(toon: string): string {
        // 1. Remove trailing commas in arrays/objects
        let normalized = toon.replace(/,\s*([\]}])/g, '$1');
        
        // 2. Wrap unquoted keys in double quotes
        // Looks for words followed by a colon that aren't already quoted
        normalized = normalized.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        
        return normalized;
    }

    /**
     * Parses the AI's plain-text TOON response into a ToonResponse object.
     * V18: Full TOON Protocol Support (Unquoted Keys).
     */
    public static decode(aiRawOutput: string): ToonResponse | null {
        try {
            let cleaned = aiRawOutput.trim();

            // Strip markdown block fences
            cleaned = cleaned.replace(/```json/gi, '').replace(/```toon/gi, '').replace(/```/gi, '').trim();

            let rawData: Record<string, unknown> | null = null;
            const rStart = cleaned.indexOf('r{');
            const lastBrace = cleaned.lastIndexOf('}');

            // --- PASS 0: High-Resilience "Everything is why" Recovery (V18.1) ---
            // If it starts with r{ but fails structure, it's likely a conversational blob
            
            // --- PASS 1: TOON-Augmented JSON Attempt ---
            try {
                let parseTarget = cleaned;
                if (rStart !== -1) {
                    parseTarget = cleaned.substring(rStart + 1, lastBrace + 1);
                } else {
                    const firstBrace = cleaned.indexOf('{');
                    if (firstBrace !== -1 && lastBrace !== -1) {
                        parseTarget = cleaned.substring(firstBrace, lastBrace + 1);
                    }
                }

                const jsonCompatible = this.normalizeToonToJson(parseTarget);
                rawData = JSON.parse(jsonCompatible) as Record<string, unknown>;
            } catch {
                // Ignore failure, we'll try Pass 2 (Regex extraction)
            }

            // --- PASS 2: Multi-Notation Regex Fallback ---
            if (!rawData) {
                const whyMatch = cleaned.match(/(?:"why"|why):\s*"((?:[^"\\]|\\.)*)"/);
                const why = whyMatch ? whyMatch[1] : '';

                if (why) {
                    rawData = {
                        why: why,
                        risk: (cleaned.match(/(?:"risk"|risk):\s*"([^"]+)"/) || [null, 'low'])[1],
                        ans: [],
                        chg: []
                    };

                    const chgMatches = cleaned.match(/(?:"f"|f):\s*"([^"]+)",\s*(?:"ln"|ln):\s*"([^"]+)",\s*(?:"op"|op):\s*"([^"]+)",\s*(?:"snip"|snip):\s*"((?:[^"\\]|\\.)*)"/g);
                    if (chgMatches) {
                        rawData.chg = chgMatches.map(m => {
                            const f = m.match(/(?:"f"|f):\s*"([^"]+)"/)?.[1] || '';
                            const ln = m.match(/(?:"ln"|ln):\s*"([^"]+)"/)?.[1] || '';
                            const op = m.match(/(?:"op"|op):\s*"([^"]+)"/)?.[1] || '';
                            const snip = m.match(/(?:"snip"|snip):\s*"((?:[^"\\]|\\.)*)"/)?.[1] || '';
                            return { f, ln, op, snip };
                        });
                    }
                }
                
                // --- PASS 3: Last Resort conversational blob recovery ---
                if (!why && rStart !== -1) {
                    const content = cleaned.substring(rStart + 2, lastBrace).trim();
                    if (content.length > 0 && !content.includes(':')) {
                         rawData = { why: content, risk: 'low', ans: [], chg: [] };
                    }
                }
            }

            if (!rawData) return null;

            // Normalization to structure { r: { ... } }
            let normalized: ToonResponse;
            if (rawData.r && typeof rawData.r === 'object') {
                normalized = rawData as unknown as ToonResponse;
            } else {
                normalized = { r: rawData } as unknown as ToonResponse;
            }

            // Fallback for missing fields
            if (!normalized.r.why && typeof rawData.why === 'string') normalized.r.why = rawData.why;
            if (!normalized.r.risk) normalized.r.risk = 'low';
            if (!normalized.r.ans) normalized.r.ans = [];
            if (!normalized.r.chg) normalized.r.chg = [];

            if (typeof normalized.r.why !== 'string') return null;

            return normalized;

        } catch (e: unknown) {
            const err = e as Error;
            Logger.error(`Failed to decode TOON: ${err.message}`);
            return null;
        }
    }

    private static isCasual(res: ToonResponse): boolean {
        const hasRelatedCode = res.r.ans && res.r.ans.length > 0;
        const hasProposedChanges = res.r.chg && res.r.chg.length > 0;
        return !hasRelatedCode && !hasProposedChanges;
    }

    public static renderMarkdown(res: ToonResponse, rootPath: string, rawPayload: string): string {
        try {
            const casual = this.isCasual(res);
            let md = '';

            if (casual) {
                md = res.r.why;
            } else {
                md = `### 🛡️ TOONING ANALYSIS 🛡️\n\n`;
                md += `**Conclusion:** ${res.r.why}\n\n`;
                md += `**Risk Level:** ${res.r.risk.toUpperCase()}\n\n`;

                if (res.r.ans && res.r.ans.length > 0) {
                    md += `#### 🔍 Related Symbols\n`;
                    for (const ans of res.r.ans) {
                        const fullPath = `file:///${rootPath.replace(/\\/g, '/')}/${ans.f}`;
                        md += `- \`${ans.n}\` → [${ans.f}](${fullPath}) ${ans.ln ? `(${ans.ln})` : ''}\n`;
                    }
                }

                if (res.r.chg && res.r.chg.length > 0) {
                    md += `\n#### 🛠️ Proposed Changes\n`;
                    for (const chg of res.r.chg) {
                        md += `**${chg.op.toUpperCase()}** in \`${chg.f}\` ${chg.ln ? `(Lines ${chg.ln})` : ''}:\n\`\`\`ts\n${chg.snip}\n\`\`\`\n`;
                    }
                }
            }

            const rawOutput = VibeUI.formatRawToon(rawPayload);
            return `\n${md}\n\n${rawOutput}`;

        } catch (err: unknown) {
            const e = err as Error;
            return `\n\n${chalk.red('⚡ Rendering Error:')} ${e.message}\n`;
        }
    }
}
