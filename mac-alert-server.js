/**
 * Mac Mini Alert Server
 * Runs locally on the Mac mini on port 3001.
 * Render calls this to fire iMessage alerts when a new lead comes in.
 * Start with: node mac-alert-server.js
 * Or via launchd plist for auto-start.
 */

const express = require('express');
const { execSync } = require('child_process');
const app = express();
app.use(express.json());

const PORT = process.env.ALERT_PORT || 3001;
const SECRET = process.env.ALERT_SECRET || 'western-alert-2026';

// Group chat ID for "New Lead Chat"
const NEW_LEAD_CHAT_ID = 'f1e38812f1324ccfb22f4a14677a639b';

app.post('/send-alerts', (req, res) => {
  const { message, secret } = req.body;

  if (secret !== SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!message) {
    return res.status(400).json({ error: 'Missing message' });
  }

  const escaped = message.replace(/"/g, '\\"').replace(/\n/g, ' ');

  try {
    execSync(`imsg send --chat-id "${NEW_LEAD_CHAT_ID}" --text "${escaped}"`, { timeout: 10000 });
    console.log(`✅ Lead alert sent to New Lead Chat`);
    res.json({ success: true });
  } catch (err) {
    console.warn(`❌ Failed to send to New Lead Chat: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mac-alert-server' }));

app.listen(PORT, () => {
  console.log(`Mac Alert Server running on port ${PORT}`);
});
