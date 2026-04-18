# Tooning: AI Codebase Chat

Tooning is a VS Code extension that converts your natural language queries into TOON (Token Oriented Object Notation) by automatically indexing your local codebase structure, dramatically reducing context tokens while keeping AI accuracy high.

## Features

- **Codebase Indexing**: Scans your workspace on save or interval to keep an up-to-date index of functions, classes, and variables.
- **Token Efficiency**: Converts index data into minimal TOON format, saving huge amounts of context window space.
- **Provider Agnostic**: Works with Mistral (default), OpenAI, Anthropic, OpenRouter, and Ollama (local).
- **Interactive UI**: A sleek sidebar webview allows you to chat directly with your codebase.

## Setup

1. Open VS Code Settings (`Ctrl+,`).
2. Search for `Tooning`.
3. Set your preferred AI Provider (`tooning.provider`).
4. Enter your API Key (`tooning.apiKey`) if not using a local provider like Ollama.
5. Hit the **"Tooning"** icon in the Activity Bar to start chatting!

### Local / Ollama Support

To use Ollama locally without an API key:
- Set `Tooning: Provider` to `ollama`.
- Ensure `Tooning: Custom Base Url` is pointing to your Ollama chat endpoint (e.g., `http://localhost:11434/api/chat`).
- Set `Tooning: Model` to your downloaded model name (e.g., `llama3`).

## Commands

- `Tooning: Re-index Workspace` - Forces a manual deep rescan of all non-ignored files.
- `Tooning: Clear Chat History` - Wipes your current conversation history.
