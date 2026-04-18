import * as vscode from 'vscode';
import ignore from 'ignore';

export interface SecurityStatus {
    safe: boolean;
    reason?: string;
}

export class SecurityManager {
    
    /**
     * Validates if a file path is safe to read based on security settings.
     */
    public static validate(fsPath: string): SecurityStatus {
        // Standard defaults for CLI
        let allowSensitive = false;
        let allowOutside = true; // CLI usually allows what the user points to
        let sensitivePatterns = [
            "**/*.env*",
            "**/*.pem",
            "**/*.key",
            "**/id_rsa*",
            "**/shadow",
            "**/passwd"
        ];

        // Override with VS Code settings if available
        if (typeof vscode !== 'undefined' && vscode.workspace && vscode.workspace.getConfiguration) {
            const config = vscode.workspace.getConfiguration('tooning.security');
            allowSensitive = config.get<boolean>('allowSensitiveFiles', false);
            allowOutside = config.get<boolean>('allowOutsideWorkspace', false);
            sensitivePatterns = config.get<string[]>('sensitivePatterns', sensitivePatterns);

            // 1. Check workspace boundary (VS Code only)
            if (!allowOutside) {
                const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(fsPath));
                if (!folder) {
                    return { 
                        safe: false, 
                        reason: `File access blocked: ${fsPath} is outside the current workspace. (Blocked by tooning.security.allowOutsideWorkspace)`
                    };
                }
            }
        }

        // 2. Check sensitive patterns
        if (!allowSensitive) {
            const ig = ignore().add(sensitivePatterns);
            // Simple path normalization
            const cleanPath = fsPath.replace(/\\/g, '/');
            
            if (ig.ignores(cleanPath)) {
                return { 
                    safe: false, 
                    reason: `File access blocked: ${cleanPath} matches a sensitive pattern. (Blocked by tooning.security.allowSensitiveFiles)`
                };
            }
        }

        return { safe: true };
    }
}
