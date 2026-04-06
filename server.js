import cors from 'cors';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import https from 'https';
import multer from 'multer';
import { URL } from 'url';

dotenv.config();

const app = express();
const upload = multer({ dest: 'uploads/' });
const SECTIONS_FILE = './sections.json';

// Ensure sections file exists
if (!fs.existsSync(SECTIONS_FILE)) {
  fs.writeFileSync(SECTIONS_FILE, JSON.stringify(['General']));
}

function getSections() {
  try {
    return JSON.parse(fs.readFileSync(SECTIONS_FILE));
  } catch {
    return ['General'];
  }
}

function saveSections(sections) {
  fs.writeFileSync(SECTIONS_FILE, JSON.stringify(sections, null, 2));
}

// Discord bot setup
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const UPLOAD_CHANNEL_ID = process.env.UPLOAD_CHANNEL_ID;

client.once('ready', () => {
  console.log('✅ Discord bot logged in');
  refreshCache(); // Initialize cache on login
});

client.login(DISCORD_TOKEN);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// In-Memory Cache for Files
let fileCache = [];
let lastCacheUpdate = 0;
const CACHE_TTL = 30 * 1000; // 30 seconds

async function refreshCache() {
  try {
    if (!client.isReady()) {
      console.log('⏳ Bot not ready, skipping cache refresh');
      return;
    }

    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    if (!channel) {
      console.error('❌ Upload channel not found');
      return;
    }

    const files = [];
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
          // Try to extract section from embed fields
          const embed = msg.embeds[0];
          const sectionField = embed?.fields?.find(f => f.name.includes('Section'));
          const section = sectionField ? sectionField.value : 'General';

          msg.attachments.forEach(att => {
            files.push({
              name: att.name,
              url: att.url,
              size: att.size,
              messageId: msg.id,
              section: section
            });
          });
        }
      });
      lastMessageId = messages.last().id;
    }

    fileCache = files.reverse();
    lastCacheUpdate = Date.now();
    console.log(`📦 Cache refreshed: ${fileCache.length} files`);
  } catch (error) {
    console.error('❌ Cache refresh failed:', error);
  }
}

// Home page
app.get('/', (req, res) => {
  res.sendFile('public/index.html', { root: '.' });
});

// Sections management endpoints
app.get('/sections', (req, res) => {
  res.json(getSections());
});

app.post('/sections', (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'Invalid section name' });
  
  const sections = getSections();
  if (sections.includes(name)) return res.status(400).json({ error: 'Section already exists' });
  
  sections.push(name);
  saveSections(sections);
  res.json({ success: true, sections });
});

app.delete('/sections/:name', (req, res) => {
  const { name } = req.params;
  if (name === 'General') return res.status(400).json({ error: 'Cannot delete General section' });
  
  let sections = getSections();
  sections = sections.filter(s => s !== name);
  saveSections(sections);
  res.json({ success: true, sections });
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const section = req.body.section || 'General';
    const channel = await client.channels.fetch(UPLOAD_CHANNEL_ID);
    
    // Create a rich embed
    const embed = new EmbedBuilder()
      .setTitle('📄 New File Uploaded')
      .setDescription(`**${req.file.originalname}** has been hosted successfully in **${section}**.`)
      .addFields(
        { name: '📂 Filename', value: req.file.originalname, inline: true },
        { name: '📏 Size', value: formatBytes(req.file.size), inline: true },
        { name: '🏷️ Section', value: section, inline: true }
      )
      .setColor(section === 'General' ? '#3b82f6' : '#f59e0b')
      .setTimestamp();

    // Send file and embed to Discord
    await channel.send({
      files: [{
        attachment: req.file.path,
        name: req.file.originalname
      }],
      embeds: [embed]
    });

    // Delete temp file
    fs.unlinkSync(req.file.path);

    // Refresh cache in background
    refreshCache();

    res.json({ 
      success: true, 
      message: `✅ ${req.file.originalname} uploaded to ${section}!` 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// List all files endpoint
app.get('/files', async (req, res) => {
  try {
    // If cache is empty or too old, refresh it
    if (fileCache.length === 0 || (Date.now() - lastCacheUpdate > CACHE_TTL)) {
      await refreshCache();
    }
    res.json({ files: fileCache });
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

    // Remove from cache locally for instant update
    fileCache = fileCache.filter(f => f.messageId !== messageId);

    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Proxy endpoint to bypass CORS
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('No URL provided');

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).send(`Discord error: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType) res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error('❌ Proxy error:', error);
    res.status(500).send(error.message);
  }
});

// Helper function for formatting bytes (copied from frontend logic)
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Self-ping logic for Render (Keep Alive)
  const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
  if (EXTERNAL_URL) {
    console.log(`📡 Keep-Alive enabled for: ${EXTERNAL_URL}`);
    setInterval(async () => {
      try {
        await fetch(EXTERNAL_URL);
        console.log('💓 Keep-alive ping sent');
      } catch (err) {
        console.error('❌ Keep-alive ping failed:', err.message);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }
});