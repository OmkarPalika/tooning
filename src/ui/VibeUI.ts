import chalk from 'chalk';
import boxen from 'boxen';
import { Marked, MarkedExtension } from 'marked';
import { markedTerminal } from 'marked-terminal';
import figlet from 'figlet';
import gradient from 'gradient-string';

// Configure marked with the Vibe-grade terminal renderer extension
const marked = new Marked().use(
    (markedTerminal as unknown as (opt: object) => MarkedExtension)({
        codespan: chalk.cyan,
        firstHeading: chalk.bold.cyan,
        strong: chalk.bold,
        em: chalk.italic,
        listitem: chalk.white,
        table: chalk.white,
        paragraph: chalk.white
    })
); 

/**
 * Industry-grade UI utility for Vibe-grade CLI interactions.
 * V18.1 'Final Industrial Polish' edition.
 */
export class VibeUI {
    public static readonly PRIMARY = chalk.cyan;
    public static readonly SECONDARY = chalk.gray;
    public static readonly SUCCESS = chalk.green;
    public static readonly ERROR = chalk.red;
    public static readonly ACCENT = chalk.bold.cyan;
    public static readonly GLOW_BLUE = '#00f2fe';
    public static readonly VIBE_GRADIENT = [this.GLOW_BLUE, '#4facfe', '#706fd3', '#f093fb'];

    /**
     * Centers a string within the terminal width.
     */
    private static centerText(text: string): string {
        const columns = process.stdout.columns || 80;
        const lines = text.split('\n');
        return lines.map(line => {
            // eslint-disable-next-line no-control-regex
            const stripped = line.replace(/[\u001b\u009b]\[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
            const pad = Math.max(0, Math.floor((columns - stripped.length) / 2));
            return ' '.repeat(pad) + line;
        }).join('\n');
    }

    /**
     * Applies the premium Vibe gradient to text.
     */
    private static applyGradient(text: string): string {
        return gradient(this.VIBE_GRADIENT)(text);
    }

    /**
     * Prints a stylized, high-fidelity startup banner with Figlet typography.
     */
    public static printBanner() {
        const logo = figlet.textSync('TOONING', { font: 'Slant' });
        const centeredLogo = this.centerText(this.applyGradient(logo));
        
        const subtitle = chalk.bold(this.centerText('Universal AI Codebase Context Engine'));
        const version = chalk.dim(this.centerText('v18.1.0 (Industrial Polish Edition)'));

        console.log(`\n${centeredLogo}\n${subtitle}\n${version}\n`);
    }

    /**
     * Standardized "You" prompt prefix for manual persistence recovery.
     */
    public static getUserPrefix(): string {
        return chalk.bgCyan.black(' 👤 You ') + chalk.cyan(' ❯❯');
    }

    /**
     * Formats an assistant response with markdown.
     */
    public static formatAssistantResponse(text: string): string {
        const rendered = marked.parse(text) as string;
        return rendered.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => `   ${line}`)
            .join('\n');
    }

    /**
     * Implements a high-fidelity oscillating "thinking" animation with persistence safety.
     */
    public static showTyping() {
        let dots = 0;
        const animation = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
        let frame = 0;
        
        const interval = setInterval(() => {
            dots = (dots + 1) % 4;
            const spinner = chalk.cyan(animation[frame]);
            frame = (frame + 1) % animation.length;
            
            this.clearLine();
            process.stdout.write(`   ${spinner}  ${chalk.dim('Assistant is thinking' + '.'.repeat(dots).padEnd(3))}`);
        }, 80);

        return () => {
            clearInterval(interval);
            this.clearLine();
        };
    }

    /**
     * Overwriteable thinking stage with vertical stability.
     */
    public static printThinkingStage(stage: string, percent: number) {
        const width = 30;
        const complete = Math.round(width * (percent / 100));
        const bar = chalk.cyan('█'.repeat(complete)) + chalk.gray('░'.repeat(width - complete));
        const label = chalk.dim(`[${stage.padEnd(20)}]`);
        
        this.clearLine();
        process.stdout.write(`  ${label} ${bar} ${chalk.cyan(percent + '%')}`);
    }

    /**
     * Purges industrial thinking markers. Accurate V17.1: Only clear current thinking line.
     */
    public static clearThinking() {
        this.clearLine();
    }

    /**
     * Prints a stylized system message with industrial logging aesthetics.
     */
    public static system(message: string) {
        const timestamp = chalk.dim(new Date().toLocaleTimeString());
        console.log(chalk.gray(`[${timestamp}] ⚡ ${message}`));
    }

    /**
     * Prints an elite Command Palette for settings or help.
     */
    public static printEliteMenu(title: string, content: string, color: string = '#706fd3') {
        const columns = process.stdout.columns || 80;
        const contentWidth = Math.min(90, columns - 10);
        const margin = Math.floor((columns - contentWidth) / 2);

        console.log(boxen(content, {
            padding: { top: 1, bottom: 1, left: 3, right: 3 },
            margin: { top: 1, bottom: 1, left: margin, right: margin },
            borderStyle: 'doubleSingle',
            borderColor: color,
            width: contentWidth,
            title: ` ${title} `,
            titleAlignment: 'center',
            float: 'center'
        }));
    }

    /**
     * Renders a premium raw diagnostic block for the Full TOON Protocol payload.
     * V18.1: Copy-Paste friendly "Code Snippet" aesthetic.
     */
    public static formatRawToon(payload: string): string {
        const columns = process.stdout.columns || 80;
        const width = Math.min(110, columns - 12);
        const margin = 3;

        return boxen(chalk.gray(payload.trim()), {
            padding: { top: 0, bottom: 0, left: 2, right: 2 },
            margin: { top: 0, bottom: 0, left: margin, right: margin },
            borderStyle: 'none',
            borderColor: '#333',
            backgroundColor: '#121212',
            width: width,
            title: chalk.dim(' INDUSTRIAL TOON PAYLOAD '),
            titleAlignment: 'left'
        });
    }

    /**
     * Prints an industrial-grade help menu.
     */
    public static printHelp() {
        const commands = [
            { cmd: '/settings', desc: 'Open Elite Configuration Dashboard' },
            { cmd: '/model <name>', desc: 'Quick switch LLM model' },
            { cmd: '/clear', desc: 'Clear terminal screen buffer' },
            { cmd: '/help', desc: 'Show this interactive directory' },
            { cmd: '/exit', desc: 'Terminate session' }
        ];

        let content = this.applyGradient(chalk.bold('ELITE COMMAND PALETTE\n\n'));
        commands.forEach(c => {
            content += `${chalk.cyan(c.cmd.padEnd(22))} ${chalk.gray('•')} ${chalk.white(c.desc)}\n`;
        });

        this.printEliteMenu('SYSTEM DIRECTORY', content, '#706fd3');
    }

    /**
     * Prints a stylized table of configuration values.
     */
    public static printConfigTable(config: Record<string, string>) {
        let content = this.applyGradient(chalk.bold('INDUSTRIAL STATE\n\n'));
        Object.entries(config).forEach(([k, v]) => {
            content += `${chalk.yellow(k.padEnd(15))} ${chalk.gray(':')} ${chalk.white(v || chalk.dim('[not set]'))}\n`;
        });

        this.printEliteMenu('SETTINGS PREVIEW', content, '#f093fb');
    }

    /**
     * Clear the current line in the terminal accurately.
     */
    public static clearLine() {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }
}
