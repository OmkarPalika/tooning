export interface AIProvider {
    name: string;
    send(prompt: string, systemPrompt: string): Promise<string>;
    sendStream(prompt: string, systemPrompt: string, onChunk: (text: string) => void): Promise<string>;
}
