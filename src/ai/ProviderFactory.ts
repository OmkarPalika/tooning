import { AIProvider } from './AIProvider';
import { ChatGPTProvider } from './ChatGPTProvider';
import { IConfiguration } from './IConfiguration';

export class ProviderFactory {
    public static createProvider(config: IConfiguration): AIProvider {
        const providerName = config.getProvider();
        const apiKey = config.getApiKey();
        const model = config.getModel();
        const baseUrl = config.getCustomBaseUrl();

        if (providerName === 'mistral') {
            return new ChatGPTProvider(apiKey, model, 'https://api.mistral.ai/v1/chat/completions');
        } else if (providerName === 'ollama') {
            return new ChatGPTProvider('', model, baseUrl);
        } else {
            // openai, openrouter, custom, etc.
            return new ChatGPTProvider(apiKey, model, baseUrl);
        }
    }
}
