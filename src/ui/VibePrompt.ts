import chalk from 'chalk';

// Structural interfaces for Enquirer's internal types
interface Choice {
    name: string;
    message?: string;
    description?: string; 
    role?: string;
}

interface EnquirerState {
    submitted: boolean;
    valid: boolean;
    choices: Choice[];
    _choices: Choice[];
    index: number;
    cursor: number;
}

interface EnquirerOptions extends Record<string, unknown> {
    result?: (value: string) => string;
    suggest?: (input: string, choices: Choice[]) => Choice[] | Promise<Choice[]>;
    prefix?: string;
    message?: string;
    name?: string;
    history?: string[];
    stdin?: NodeJS.ReadStream;
    stdout?: NodeJS.WriteStream;
}

interface EnquirerAutocomplete {
    new (options: EnquirerOptions): {
        run(): Promise<string>;
        input: string;
        options: EnquirerOptions;
        state: EnquirerState;
        suggest: (input: string, choices: Choice[]) => Choice[] | Promise<Choice[]>;
        render(): Promise<void>;
        submit(): Promise<void>;
        cursor: number;
        renderChoices(): Promise<string>;
        index: number;
        delete(): Promise<void>;
        close(): Promise<void>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        emit(event: string, ...args: any[]): boolean;
    };
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AutoComplete } = require('enquirer');

/**
 * Advanced VibePrompt V13.3 (Precision Return Edition)
 * Features:
 * 1. Absolute Submission Bypass: Enter always dispatches free-text.
 * 2. Industrial Stream Sharing
 * 3. Precision Cursor Bounding
 */
export class VibePrompt extends (AutoComplete as unknown as EnquirerAutocomplete) {
    constructor(options: EnquirerOptions = {}) {
        const originalSuggest = options.suggest;
        
        options.suggest = (input: string, choices: Choice[]) => {
            if (originalSuggest) return originalSuggest(input, choices);

            const sanitized = (input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            if (sanitized.startsWith('/')) {
                const term = sanitized.slice(1).toLowerCase();
                return choices.filter(c => c.name.startsWith('/') && c.name.slice(1).toLowerCase().includes(term));
            }
            
            if (sanitized.includes('@')) {
                const parts = sanitized.split('@');
                const term = parts[parts.length - 1].toLowerCase();
                return choices.filter(c => c.name.startsWith('@') && c.name.slice(1).toLowerCase().includes(term));
            }

            return [];
        };

        const prefixText = ' 👤 You ';
        options.prefix = chalk.bgCyan.black(prefixText) + chalk.cyan(' ❯❯');
        options.message = '';

        super(options);
        
        // Ensure result always returns raw input for Chat consistency
        this.options.result = (val: string) => val || this.input;
    }

    /**
     * Absolute Submission Bypass (V13.3):
     * Completely override the submission logic to ensure free-text is never trapped.
     */
    async submit(): Promise<void> {
        const choice = this.state.choices[this.state.index];
        
        // 1. Handle @ file appending: Keep the prompt alive but update input
        if (choice && choice.name.startsWith('@')) {
            const parts = this.input.split('@');
            parts.pop(); 
            this.input = (parts.join('@') + choice.name + ' ').trimStart();
            this.state.cursor = this.input.length;
            this.state.index = 0;
            return this.render();
        }

        // 2. Handle / command selection: Populate input before submitting
        if (choice && choice.name.startsWith('/')) {
            this.input = choice.name;
        }

        // 3. Absolute Dispatch: Force the prompt to resolve with current input
        this.state.submitted = true;
        this.state.valid = true;
        
        return new Promise<void>((resolve) => {
            setImmediate(async () => {
                await this.render();
                await this.close();
                this.emit('submit', this.input);
                resolve();
            });
        });
    }

    /**
     * Precision Cursor Bounding
     */
    left() {
        if (this.state.cursor > 0) {
            this.state.cursor--;
            return this.render();
        }
    }

    delete() {
        if (this.state.cursor <= 0) return this.render();
        return super.delete();
    }

    beginning() {
        this.state.cursor = 0;
        return this.render();
    }

    /**
     * Elite Choice Rendering
     */
    async renderChoices(): Promise<string> {
        if (this.state.choices.length === 0) return '';
        
        const choices = this.state.choices.map((choice: Choice, i: number) => {
            const isSelected = i === this.state.index;
            const pointer = isSelected ? chalk.cyan('❯ ') : '  ';
            
            let name = choice.name;
            let badge = '';
            
            if (name.startsWith('/')) {
                badge = chalk.bgBlue.black(' CMD ');
                name = chalk.blue(name);
            } else if (name.startsWith('@')) {
                badge = chalk.bgGreen.black(' FILE ');
                name = chalk.green(name);
            }
            
            const line = `${pointer}${badge} ${name} ${chalk.dim(choice.message || '')}`;
            return isSelected ? chalk.bgWhite.black(line) : line;
        });

        return '\n' + choices.join('\n');
    }

    pointer(_choice: Choice, _i: number) {
        return chalk.cyan('❯');
    }

    format() {
        if (!this.state.submitted) {
            return this.input;
        }
        return chalk.cyan(this.input);
    }
    
    async render() {
        this.state.choices = (this.input.startsWith('/') || this.input.includes('@')) 
            ? await this.suggest(this.input, this.state._choices) 
            : [];
            
        return super.render();
    }
}
