import { describe, it, expect } from 'vitest';
import { FileScanner } from './FileScanner';

describe('FileScanner', () => {
    describe('inferLanguage', () => {
        it('should correctly infer JavaScript files', () => {
            expect(FileScanner.inferLanguage('test.js')).toBe('javascript');
            expect(FileScanner.inferLanguage('App.jsx')).toBe('javascript');
        });

        it('should correctly infer TypeScript files', () => {
            expect(FileScanner.inferLanguage('index.ts')).toBe('typescript');
            expect(FileScanner.inferLanguage('Component.tsx')).toBe('typescript');
        });

        it('should correctly infer Python files', () => {
            expect(FileScanner.inferLanguage('main.py')).toBe('python');
        });

        it('should correctly infer specialized formats', () => {
            expect(FileScanner.inferLanguage('schema.yml')).toBe('yaml');
            expect(FileScanner.inferLanguage('README.md')).toBe('markdown');
            expect(FileScanner.inferLanguage('package.json')).toBe('json');
        });

        it('should return null for unknown extensions', () => {
            expect(FileScanner.inferLanguage('something.unknown')).toBeNull();
            expect(FileScanner.inferLanguage('noextension')).toBeNull();
        });
    });
});
