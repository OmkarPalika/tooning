import chalk from 'chalk';
import { NodeConfiguration } from '../ai/NodeConfiguration';
import { VibeUI } from '../ui/VibeUI';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Form } = require('enquirer');

/**
 * Industrial-grade Settings Manager for V13.2 Stability Consolidation.
 * Uses a non-destructive interactive Form UI.
 */
export class SettingsManager {
    private config: NodeConfiguration;

    constructor(config: NodeConfiguration) {
        this.config = config;
    }

    /**
     * Launch the interactive Elite Settings Form with Global Stream Protection.
     */
    public async launch() {
        VibeUI.system('Opening Elite Configuration Dashboard...');

        const prompt = new Form({
            name: 'user',
            message: ' Configure Tooning Industrial Settings: ',
            choices: [
                { name: 'provider', message: 'AI Provider', initial: this.config.getProvider() },
                { name: 'model', message: 'LLM Model', initial: this.config.getModel() },
                { name: 'apiKey', message: 'API Key', initial: this.config.getApiKey() },
                { name: 'customBaseUrl', message: 'API Mirror URL', initial: this.config.getCustomBaseUrl() },
                { name: 'maxTokens', message: 'Token Ceiling', initial: String(this.config.getMaxTokens()) }
            ],
            styles: {
                primary: chalk.cyan,
                submitted: chalk.green
            },
            // Share the global streams
            stdin: process.stdin,
            stdout: process.stdout
        });

        // Industrial Lifecycle Hardening:
        // Strictly prevent the sub-menu from disposing of the global readline interface.
        prompt.close = () => {
            prompt.emit('close');
        };

        try {
            const results = await prompt.run();
            
            for (const [key, value] of Object.entries(results)) {
                await this.config.set(key, value);
            }

            VibeUI.system(chalk.green('Industrial settings synchronized successfully.'));
        } catch {
            VibeUI.system(chalk.dim('Settings update aborted.'));
        }
    }
}
