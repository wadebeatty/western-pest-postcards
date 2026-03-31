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

app.post('/send-alerts', (req, res) => {
  const { message, team, secret } = req.body;

  if (secret !== SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!message || !team) {
    return res.status(400).json({ error: 'Missing message or team' });
  }

  const results = [];
  const escaped = message.replace(/"/g, '\\"').replace(/\n/g, ' ');

  for (const member of team) {
    try {
      execSync(`imsg send --to "${member.phone}" --text "${escaped}" --service imessage`, { timeout: 10000 });
      console.log(`✅ Alert sent to ${member.name} (${member.phone})`);
      results.push({ name: member.name, status: 'sent' });
    } catch (err) {
      console.warn(`❌ Failed to send to ${member.name}: ${err.message}`);
      results.push({ name: member.name, status: 'failed', error: err.message });
    }
  }

  res.json({ success: true, results });
});

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'mac-alert-server' }));

app.listen(PORT, () => {
  console.log(`Mac Alert Server running on port ${PORT}`);
});
