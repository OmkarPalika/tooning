import ignore from 'ignore';

export interface SecurityStatus {
    safe: boolean;
    reason?: string;
}

export class SecurityManager {
    
    /**
     * Validates if a file path is safe to read based on security settings.
     */
    public static validate(fsPath: string, rootPath?: string): SecurityStatus {
        // Standard defaults for CLI
        let allowSensitive = false;
        let allowOutside = true;
        let sensitivePatterns = [
            "**/*.env*",
            "**/*.pem",
            "**/*.key",
            "**/id_rsa*",
            "**/shadow",
            "**/passwd"
        ];

        // Override with VS Code settings if available
        try {
            const vscode = require('vscode') as any;
            if (vscode && vscode.workspace && vscode.workspace.getConfiguration) {
                const config = vscode.workspace.getConfiguration('tooning.security');
                allowSensitive = config.get('allowSensitiveFiles', false);
                allowOutside = config.get('allowOutsideWorkspace', false);
                sensitivePatterns = config.get('sensitivePatterns', sensitivePatterns);

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
        } catch {
            // Probably CLI environment
        }

        // 2. Check sensitive patterns
        if (!allowSensitive) {
            const ig = ignore().add(sensitivePatterns);
            
            // ENSURE RELATIVE PATH FOR IGNORE LIBRARY
            let checkPath = fsPath;
            if (rootPath) {
                // If we have a root, make it relative to avoid RangeError in 'ignore'
                const path = require('path');
                checkPath = path.relative(rootPath, fsPath).replace(/\\/g, '/');
            } else {
                // Fallback: just strip leading slash/drive if absolute
                checkPath = fsPath.replace(/^[a-zA-Z]:/, '').replace(/\\/g, '/').replace(/^\//, '');
            }
            
            if (ig.ignores(checkPath)) {
                return { 
                    safe: false, 
                    reason: `File access blocked: ${checkPath} matches a sensitive pattern. (Blocked by tooning.security.allowSensitiveFiles)`
                };
            }
        }

        return { safe: true };
    }
}
