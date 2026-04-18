# 🚀 Tooning: Marketplace Deployment Guide

This guide covers the manual steps required to publish the **Tooning** extension to the VS Code Marketplace.

## 1. Create a Publisher Account
1. Log in to the [Marketplace Management Portal](https://marketplace.visualstudio.com/manage).
2. Create a new **Publisher**.
3. **CRITICAL**: Ensure your Publisher ID is `OmkarPalika` (to match `package.json`).

## 2. Obtain an Azure DevOps PAT
The `vsce` tool uses a Personal Access Token (PAT) for authentication.
1. Log in to your Azure DevOps organization: [omkarpalika](https://dev.azure.com/omkarpalika/).
2. Go to **User settings** (top right) > **Personal access tokens**.
3. Create a **New Token**:
    - **Name**: `vsce-tooning`
    - **Organization**: `All accessible organizations`
    - **Scopes**: Select **Custom defined**
    - **Permissions**: Click "Show all scopes" at the bottom and find **Marketplace**. Select **Manage**.
4. **Copy the PAT instantly**—you won't see it again!

## 3. Package and Publish (Local Machine)
Run these commands in your project root:

```bash
# 1. Install the packaging tool globally (if not already present)
npm install -g @vscode/vsce

# 2. Login to your publisher account
vsce login OmkarPalika
# (Paste your PAT when prompted)

# 3. Package the extension to verify it (creates a .vsix file)
vsce package

# 4. Final Publish
vsce publish
```

---

## 💎 Pro-Tips for a Viral Launch
- **README Screenshots**: Ensure your `README.md` includes high-quality screenshots (or GIFs) of the chat in action.
- **Changelog**: Keep your `CHANGELOG.md` updated as you hit new version milestones.
- **Version Bumping**: Use `npm version patch` (or minor/major) before every publish.

> [!IMPORTANT]
> Tooning is now locally "Ready to Ship." Once you complete the steps above, the AI community will finally have access to the first ever industry-grade universal codebase indexer.
