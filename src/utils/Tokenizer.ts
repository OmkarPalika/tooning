import { getEncoding } from 'js-tiktoken';

/**
 * Accurate BPE tokenizer using tiktoken (cl100k_base).
 * Used by OpenAI GPT-3.5/4 and closely matches Mistral token counts.
 */
export class Tokenizer {
    private static enc = getEncoding("cl100k_base");

    public static estimateTokens(text: string): number {
        if (!text) return 0;
        return this.enc.encode(text).length;
    }
}
