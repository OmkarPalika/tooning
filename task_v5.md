# Tooning V5: Universal Expansion & Multimodal Support Task List

## Phase 1: Environment & Dependencies
- [ ] Install `pdf-parse`, `xlsx`, `commander`, and `@types`
- [ ] Set up project structure for `dist/bin` and `dist/core`

## Phase 2: Core Abstraction
- [ ] Implement `src/core/fs/IFileSystem.ts`
- [ ] Implement `src/core/fs/NodeFileSystem.ts`
- [ ] Implement `src/core/fs/VsCodeFileSystem.ts`
- [ ] Refactor `FileScanner.ts` to use `IFileSystem`

## Phase 3: Multimodal Support
- [ ] Implement `src/core/parsers/DocParser.ts`
- [ ] Integrate PDF/Excel parsing into the indexing loop

## Phase 4: CLI Entry Point
- [ ] Implement `src/bin/toon.ts` (CLI harness)
- [ ] Update `package.json` with binary entry point

## Phase 5: Verification
- [ ] Compile all builds (Extension + CLI)
- [ ] Manual test: Verify PDF indexing in Extension
- [ ] Manual test: Run `toon` CLI in terminal
