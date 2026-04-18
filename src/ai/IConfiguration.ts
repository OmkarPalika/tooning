/**
 * Universal configuration interface for Tooning.
 * Abstracts settings management away from environment-specific APIs (VS Code vs Node).
 */
export interface IConfiguration {
    get<T>(key: string, defaultValue: T): T;
    set<T>(key: string, value: T): Promise<void>;
    
    // Explicitly typed common settings for convenience
    getProvider(): string;
    getApiKey(): string;
    getModel(): string;
    getCustomBaseUrl(): string;
    getMaxTokens(): number;
    getExcludes(): string[];
}
