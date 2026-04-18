/**
 * TOON (Token Oriented Object Notation) Type Definitions
 */

export interface ToonQuery {
    q: {
        raw: string; // The natural language phrase
        ctx: string[]; // List of file paths to emphasize
        focus?: 'fn' | 'cls' | 'file' | 'all';
    };
    idx: any[]; // The encoded index blocks
}

export interface ToonResponse {
    r: {
        ans: ToonEntityRef[];
        why: string;
        chg?: ToonChangeBlock[];
        risk: 'low' | 'med' | 'high';
    };
}

export interface ToonEntityRef {
    n: string; // Name (e.g., function name)
    f: string; // file path
    ln?: string; // line range
}

export interface ToonChangeBlock {
    f: string;
    ln: string;
    op: 'add' | 'del' | 'mod';
    snip: string;
}
