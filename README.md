# Discord File Host 📦

A lightweight, high-performance file hosting solution that uses Discord as its backend storage. 


##  Setup Instructions

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

