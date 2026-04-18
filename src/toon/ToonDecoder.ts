import { ToonResponse } from './ToonSpec';
import { Logger } from '../utils/Logger';

export class ToonDecoder {
    
    /**
     * Parses the AI's plain-text TOON response into a ToonResponse object.
     * Handles imperfect JSON or slightly malformed brackets.
     */
    public static decode(aiRawOutput: string): ToonResponse | null {
        try {
            let cleaned = aiRawOutput.trim();

            // Strip markdown block fences if present anywhere in the string
            cleaned = cleaned.replace(/```json/gi, '').replace(/```/gi, '').trim();

            // The AI might output conversational prefix. Let's extract between first { and last }
            const firstBrace = cleaned.indexOf('{');
            const lastBrace = cleaned.lastIndexOf('}');
            
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
                try {
                    return JSON.parse(jsonStr) as ToonResponse;
                } catch (jsonErr) {
                    // JSON parsing failed, likely malformed
                    Logger.log(`Failed to parse extracted JSON block: \n${jsonStr}`);
                }
            }

            // Fallback for strict `r{...}` custom toon output
            const rStart = cleaned.indexOf('r{');
            if (rStart !== -1) {
                const rCleaned = cleaned.substring(rStart);
                const asJson = rCleaned.replace(/^r\{/, '{"r":{').replace(/}$/, '}}');
                try {
                    return JSON.parse(asJson);
                } catch (e) {
                    // Fallthrough to throw
                }
            }

            // If no TOON-specific markers are found, return null to indicate a conversational response.
            return null;

        } catch (e) {
            Logger.error("Failed to decode TOON", e);
            return null;
        }
    }

    public static renderMarkdown(res: ToonResponse, rawText: string): string {
        let md = `> **Tooning Analysis**\n\n`;
        
        md += `**Conclusion:** ${res.r.why}\n\n`;
        md += `**Risk Level:** ${res.r.risk}\n\n`;

        if (res.r.ans && res.r.ans.length > 0) {
            md += `### Related Code\n`;
            for (const ans of res.r.ans) {
                md += `- \`${ans.n}\` → [${ans.f}](vscode://file/${vscode_workspace_path}/${ans.f}) (Lines: ${ans.ln})\n`;
            }
        }

        if (res.r.chg && res.r.chg.length > 0) {
            md += `\n### Proposed Changes\n`;
            for (const chg of res.r.chg) {
                md += `**${chg.op.toUpperCase()}** in \`${chg.f}\` (Lines ${chg.ln}):\n\`\`\`\n${chg.snip}\n\`\`\`\n`;
            }
        }

        // Properly escape for HTML attributes: remove quotes completely for the attribute but keep them for the payload
        // Actually, we'll bake it into a standard HTML button which is safer for shadowDOM bubbling
        const safePayload = encodeURIComponent(rawText);

        md += `\n---\n<button class="copy-toon-btn" data-toon="${safePayload}">📋 Copy Raw TOON for Agent</button>\n`;
        md += `\n<details><summary>View Raw</summary>\n\n\`\`\`json\n${rawText}\n\`\`\`\n\n</details>\n`;

        return md;
    }
}
// Placeholder for rendering logic, since we need to inject the actual VS Code workspace path
const vscode_workspace_path = '${WORKSPACE}';  
