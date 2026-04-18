export interface IFileSystem {
    /**
     * Reads the entire content of a file as a string.
     */
    readFile(uri: string): Promise<string>;

    /**
     * Reads a file as a binary buffer (required for PDF/Excel).
     */
    readBinary(uri: string): Promise<Uint8Array>;

    /**
     * Finds files in a workspace based on a glob pattern.
     */
    findFiles(pattern: string): Promise<string[]>;

    /**
     * Gets file information like size.
     */
    stat(uri: string): Promise<{ size: number, mtime: number }>;

    /**
     * Joins path segments using the environment's separator.
     */
    join(...segments: string[]): string;
}
