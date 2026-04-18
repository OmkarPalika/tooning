import * as vscode from 'vscode';
import { AIProvider } from './AIProvider';
import { ChatGPTProvider } from './ChatGPTProvider';

export class ProviderFactory {
    public static createProvider(): AIProvider {
        const config = vscode.workspace.getConfiguration('tooning');
        const providerName = config.get<string>('provider', 'mistral');
        const apiKey = config.get<string>('apiKey', '');
        const model = config.get<string>('model', 'mistral-large-latest');
        const baseUrl = config.get<string>('customBaseUrl', 'http://localhost:11434/api/chat');

        // Note: For MVP, Mistral SDK is similar enough to OpenAI structure that many Mistral users 
        // use OpenAI compatible endpoints. But let's route everything via our fetch wrapper.
        
        if (providerName === 'mistral') {
            return new ChatGPTProvider(apiKey, model, 'https://api.mistral.ai/v1/chat/completions');
        } else if (providerName === 'anthropic') {
            // Anthropic has different msg structure. For now fallback to error or stub
            throw new Error("Anthropic direct provider not fully implemented yet. Use OpenRouter instead.");
        } else if (providerName === 'ollama') {
            return new ChatGPTProvider('', model, baseUrl);
        } else {
            // openai, openrouter, custom
            return new ChatGPTProvider(apiKey, model, baseUrl);
        }
    }
}
