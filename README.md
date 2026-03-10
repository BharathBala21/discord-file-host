# Vault — Discord File Host 📦

A lightweight, high-performance file hosting solution that uses Discord as its backend storage. Features a clean, modern UI with dark mode, file previews (images & code), and syntax highlighting.

## 🚀 Features

- **Free Hosting**: Uses Discord attachments for storage (Max 25MB per file).
- **Beautiful UI**: Dark, minimal, and responsive design.
- **File Library**: Search, view, and manage your hosted files.
- **Live Preview**: Preview images and code directly in the browser.
- **Syntax Highlighting**: PrismJS integration for professional code viewing.
- **Copy to Clipboard**: Quickly copy code content from previews.
- **Optimized**: In-memory caching for lightning-fast performance.

## 🛠️ Setup Instructions

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Discord Bot Token and a Channel ID.

### 2. Discord Bot Setup
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application and add a **Bot**.
3. Enable **Message Content Intent** under the Bot settings.
4. Invite the bot to your server with `Send Messages` and `Attach Files` permissions.
5. Create a dedicated channel and copy its **Channel ID**.

### 3. Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/BharathBala21/discord-file-host.git
   cd discord-file-host
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Environment Variables:
   - Rename `.env.example` to `.env`.
   - Fill in your `DISCORD_TOKEN` and `UPLOAD_CHANNEL_ID`.

### 4. Running the App
```bash
# Start the server
node server.js
```
The app will be available at `http://localhost:3000`.

## 🔒 Safety
Note: This project is intended for personal use. Ensure your Discord bot and token are kept private. The `.env` file is ignored by git to protect your credentials.

## 📝 License
ISC
