import express from 'express';
import { Client, GatewayIntentBits, ChannelType } from 'discord.js';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import fs from 'fs';

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

// List files endpoint
app.get('/files', async (req, res) => {
  try {
    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    const files = [];

    const messages = await channel.messages.fetch({ limit: 100 });
    
    messages.forEach(msg => {
      if (msg.attachments.size > 0) {
        msg.attachments.forEach(att => {
          files.push({
            name: att.name,
            url: att.url,
            size: att.size
          });
        });
      }
    });

    res.json({ files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
