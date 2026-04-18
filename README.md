# 🗿 Tooning: AI Codebase Chat

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-11.0.0-blue.png)](https://marketplace.visualstudio.com/manage/publishers/OmkarPalika/extensions/tooning/hub)
[![Build Status](https://img.shields.io/github/actions/workflow/status/OmkarPalika/tooning/ci.yml?branch=master&logo=github&label=Build&format=png)](https://github.com/OmkarPalika/tooning/actions)

**Tooning** is an industry-grade codebase analyzer and semantic context engine. It bridges the gap between your local source code and Large Language Models (LLMs) by converting complex project hierarchies into high-density **TOON payloads**.

---

## 🔥 Key Features

- **🚀 Concurrent Industrial Scanner**: High-performance multi-threaded scanning using `fast-glob` and `p-limit` for instant indexing of massive monorepos.
- **🧠 Universal Context Engine**: Environment-agnostic core logic that runs identically in VS Code or any standalone terminal.
- **💬 Interactive CLI REPL**: Start a context-aware conversation with your codebase directly from your shell with `toon chat`.
- **📄 Multimodal Native**: Full support for PDFs and Excel sheets; documentation is indexed and prioritized alongside source code.
- **🛡️ Security Gates**: Automatic blocking of sensitive files (.env, .pem, .key) via industry-standard patterns.

---

## 🛠️ Usage

### Using the CLI (`toon`)
Tooning is a standalone powerhouse for terminal enthusiasts:

```bash
# Initialize your configuration (Mistral, OpenAI, Anthropic, Ollama)
toon config set provider mistral
toon config set apiKey YOUR_KEY

# Start an interactive, context-aware chat
toon chat

# Generate a one-off TOON payload for external tools (Cursor/Claude)
toon encode . -q "How is concurrency handled?"
```

### Within VS Code
1. Install from the [Marketplace](https://marketplace.visualstudio.com/manage/publishers/OmkarPalika/extensions/tooning/hub).
2. Use the **Tooning** panel in the Activity Bar for a rich, integrated chat experience.

---

## 🏛️ Industry-Grade Foundation

Built for production reliability:
- **`IConfiguration` Abstraction**: Shared settings lifecycle across extension and CLI.
- **High-Fidelity Symbols**: Fallback structural extraction for 10+ professional languages (Go, Rust, Python, C++, etc.).
- **Token Efficiency**: Two-pass priority encoding to maximize semantic value within context windows.

---

## ⚖️ License

Distributed under the **MIT License**. See [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with ❤️ for the AI-first engineering community.
</p>
