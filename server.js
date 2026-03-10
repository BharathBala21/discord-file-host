import cors from 'cors';
import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import multer from 'multer';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });

// Discord bot setup
const client = new Client({ 
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const UPLOAD_CHANNEL_ID = process.env.UPLOAD_CHANNEL_ID;

client.once('ready', () => {
  console.log('✅ Discord bot logged in');
});

client.login(DISCORD_TOKEN);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Home page
app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    
    // Send file to Discord
    await channel.send({
      files: [{
        attachment: req.file.path,
        name: req.file.originalname
      }]
    });

    // Delete temp file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      message: `✅ ${req.file.originalname} uploaded!` 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// List all files endpoint
app.get('/files', async (req, res) => {
  try {
    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    const files = [];

    // Fetch all messages (paginated)
    let lastMessageId = null;
    let hasMore = true;

    while (hasMore) {
      const options = { limit: 100 };
      if (lastMessageId) options.before = lastMessageId;

      const messages = await channel.messages.fetch(options);
      
      if (messages.size === 0) {
        hasMore = false;
        break;
      }

      messages.forEach(msg => {
        if (msg.attachments.size > 0) {
          msg.attachments.forEach(att => {
            files.push({
              name: att.name,
              url: att.url,
              size: att.size,
              messageId: msg.id
            });
          });
        }
      });

      lastMessageId = messages.last().id;
    }

    // Reverse to show newest first
    files.reverse();

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete file endpoint
app.delete('/files/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    
    const message = await channel.messages.fetch(messageId);
    await message.delete();

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to bypass CORS
app.get('/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type');
    const buffer = await response.arrayBuffer();

    if (contentType) res.setHeader('Content-Type', contentType);
    res.set('Access-Control-Allow-Origin', '*'); // Ensure CORS is handled
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Error fetching resource' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});