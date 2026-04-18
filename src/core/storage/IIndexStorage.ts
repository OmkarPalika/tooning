export interface IIndexStorage {
    /**
     * Store a key-value pair.
     */
    set(key: string, value: unknown): Promise<void>;

    /**
     * Retrieve a value by key.
     */
    get<T>(key: string): Promise<T | undefined>;

    /**
     * Delete a key.
     */
    delete(key: string): Promise<void>;
    
    /**
     * Clear all storage.
     */
    clear(): Promise<void>;
}
