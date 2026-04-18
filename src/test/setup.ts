import { vi } from 'vitest';

const vscode = {
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
    })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
    })),
    asRelativePath: vi.fn(p => p),
  },
  EventEmitter: class {
    fire = vi.fn();
    event = vi.fn();
  },
  ProgressLocation: {
    Window: 1,
    Notification: 15,
  },
  Uri: {
    file: vi.fn(p => ({ fsPath: p, scheme: 'file' })),
    parse: vi.fn(p => ({ fsPath: p })),
  },
};

vi.mock('vscode', () => vscode);
