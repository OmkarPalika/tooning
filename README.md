# 🗿 Tooning: AI Codebase Chat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Marketplace](https://img.shields.io/visual-studio-marketplace/v/omkar.tooning.svg?label=VS%20Code)](https://marketplace.visualstudio.com/items?itemName=omkar.tooning)
[![Build Status](https://img.shields.io/github/actions/workflow/status/omkar/tooning/ci.yml?branch=master)](https://github.com/omkar/tooning/actions)

**Tooning** is an industry-grade codebase analyzer and semantic reranking engine designed to bridge the gap between your local source code and Large Language Models (LLMs). It converts your complex project structure into high-density **TOON payloads**, optimized specifically for context-aware AI chat.

---

## 🔥 Key Features

- **🚀 Real-Time Incremental Indexing**: Powered by Chokidar. Tooning tracks changes as you type, ensuring the AI always has the freshest context without CPU-heavy rescans.
- **🧠 Semantic Reranking (BM25-lite)**: Not all files are equal. Tooning uses an integrated relevance engine to prioritize files that actually matter to your query.
- **📄 Multimodal Document Support**: Index PDFs and Excel sheets alongside your code. Perfect for RAG-style analysis of technical documentation or data assets.
- **🖥️ Universal Architecture**: Works as a premium VS Code extension OR a standalone CLI tool—compatible with Cursor, Claude Code, and any terminal.
- **📊 Efficiency Dashboard**: Real-time instrumentation showing token savings and compression metrics.

---

## 🛠️ Usage

### Within VS Code
1. Install from the [Marketplace](https://marketplace.visualstudio.com/items?itemName=omkar.tooning).
2. Open the **Tooning** panel in the Activity Bar.
3. Chat with your codebase. Use `@filename` or `/command` to target specific areas.

### Using the CLI (`toon`)
Tooning is fully weaponized for the terminal. Use it to feed context to tools like Claude Code or Aider:

```bash
# Generate a TOON payload for a specific query
toon ./src -q "How does the indexing core work?"

# Enable real-time watch mode
toon ./src --watch
```

---

## 🔋 Industry-Grade Foundation

Tooning isn't just a script; it's a modular engineering asset built with:
- **`IFileSystem` Abstraction**: Decoupled from IDE APIs for cross-environment portability.
- **Security-First Gates**: Native blocking of `.env`, `.pem`, and sensitive keys.
- **Symbol Extraction**: High-fidelity symbol extraction with VS Code LSP integration.

---

## 🤝 Contributing

We welcome contributions! Whether it's adding a new file parser or optimizing the re-ranking logic.
Please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for onboarding instructions.

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ for the AI-first engineering community.
</p>
