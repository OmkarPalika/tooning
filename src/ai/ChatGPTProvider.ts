import { AIProvider } from './AIProvider';

export class ChatGPTProvider implements AIProvider {
    name = 'OpenAI Compatible';
    
    constructor(
        private apiKey: string,
        private model: string,
        private baseUrl: string
    ) {}

    private getHeaders() {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }
        return headers;
    }

    private getBody(prompt: string, systemPrompt: string, stream: boolean) {
        return {
            model: this.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            stream: stream,
            response_format: { type: "json_object" }
        };
    }

    async send(prompt: string, systemPrompt: string): Promise<string> {
        const url = this.baseUrl || 'https://api.openai.com/v1/chat/completions';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(this.getBody(prompt, systemPrompt, false))
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { choices: { message: { content: string } }[] };
        return data.choices[0].message.content;
    }

    async sendStream(prompt: string, systemPrompt: string, onChunk: (text: string) => void): Promise<string> {
        const url = this.baseUrl || 'https://api.openai.com/v1/chat/completions';
        
        const response = await fetch(url, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(this.getBody(prompt, systemPrompt, true))
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        if (!response.body) {
            throw new Error("No response body returned from stream.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullContent = '';
        let done = false;

        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;

            if (value) {
                const chunkStr = decoder.decode(value, { stream: true });
                const lines = chunkStr.split('\n');

                for (const line of lines) {
                    if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;
                    
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.choices && data.choices.length > 0) {
                                const delta = data.choices[0].delta;
                                if (delta && delta.content) {
                                    fullContent += delta.content;
                                    onChunk(delta.content);
                                }
                            }
                        } catch {
                            // Incomplete chunk, or bad JSON, safely ignore and continue
                        }
                    }
                }
            }
        }

        return fullContent;
    }
}
