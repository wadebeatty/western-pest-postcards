const https = require('https');
const axios = require('axios');
const logger = require('../utils/logger');

// Connecteam config
const CONNECTEAM_CLIENT_ID     = 'ct_aufqbuvrkbdilqea_4924330d2bfe5889210cac03b8e40fce';
const CONNECTEAM_CLIENT_SECRET = 'q_fJUhXjUyvQ_mKnudqqP1qLYPEqQJ_vQXH64yZ0vc8';
const CONNECTEAM_CONVERSATION  = 'a9a11b2d-6179-4488-99a2-f9d9b1d99eed'; // Office Numbers
const CONNECTEAM_PUBLISHER_ID  = 1269379; // Western Pest Control publisher

const TWILIO_ACCOUNT_SID      = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN       = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MESSAGING_SID    = process.env.TWILIO_MESSAGING_SID || 'MG6feb36316516bb7844168a68423d6ede';

// Team members to alert on new lead
const TEAM = [
  { name: 'Wade',      phone: '+14356321400' },
  { name: 'Austin',   phone: '+14358175245' },
  { name: 'Chris',    phone: '+14356190274' },
  { name: 'Leesa',    phone: '+14358173626' },
  { name: 'Dawn',     phone: '+18012442471' },
  { name: 'Kayla',    phone: '+14358176331' },
];

class AlertService {
  sendSMS(to, body) {
    return new Promise((resolve) => {
      const params = new URLSearchParams({ To: to, MessagingServiceSid: TWILIO_MESSAGING_SID, Body: body }).toString();
      const options = {
        hostname: 'api.twilio.com',
        path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Length': Buffer.byteLength(params),
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          resolve(json.status === 'queued' || json.status === 'sent');
        });
      });
      req.on('error', () => resolve(false));
      req.write(params);
      req.end();
    });
  }

  sendImessage(phone, message) {
    const { execSync } = require('child_process');
    const escaped = message.replace(/"/g, '\\"');
    // Try send, restart Messages if hung, retry once
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          execSync('pkill -x Messages; sleep 2; open -a Messages; sleep 3', { timeout: 8000 });
        }
        execSync(`imsg send --to "${phone}" --text "${escaped}" --service imessage`, { timeout: 10000 });
        return true;
      } catch (err) {
        logger.warn(`iMessage to ${phone} attempt ${attempt + 1} failed: ${err.message}`);
      }
    }
    return false;
  }

  sendGroupImessage(message) {
    const { execSync } = require('child_process');
    const escaped = message.replace(/"/g, '\\"');
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) {
          execSync('pkill -x Messages; sleep 2; open -a Messages; sleep 3', { timeout: 8000 });
        }
        execSync(`imsg send --chat-id 21 --text "${escaped}"`, { timeout: 10000 });
        return true;
      } catch (err) {
        logger.warn(`Group iMessage attempt ${attempt + 1} failed: ${err.message}`);
      }
    }
    return false;
  }

  async sendLeadAlert(lead, pestRoutesCustomerID) {
    const firstName = lead.first_name || lead.full_name?.split(' ')[0] || '';
    const lastName  = lead.last_name  || lead.full_name?.split(' ').slice(1).join(' ') || '';
    const name      = `${firstName} ${lastName}`.trim() || 'Unknown';
    const phone     = lead.phone_number || lead.phone || 'N/A';
    const address   = [lead.street_address, lead.city, lead.state].filter(Boolean).join(', ') || `Zip: ${lead.zip_code || 'N/A'}`;
    const adSource  = lead._formName ? `\nAd: ${lead._formName}` : '';
    let submittedAt = '';
    if (lead._submittedAt) {
      const d = new Date(lead._submittedAt);
      submittedAt = ` | Submitted: ${d.toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })} MDT`;
    }

    const alertText = `NEW LEAD: ${name} | ${phone} | ${address}${adSource}${submittedAt} | PestRoutes #${pestRoutesCustomerID} | CALL NOW`;

    logger.info('Sending lead alerts via Twilio SMS', { lead: name });

    for (const member of TEAM) {
      const ok = await this.sendSMS(member.phone, alertText);
      logger.info(`SMS to ${member.name} (${member.phone}): ${ok ? 'sent ✅' : 'failed ❌'}`);
    }

    // Send to New Lead Chat group
    const groupOk = this.sendGroupImessage(alertText);
    logger.info(`Group iMessage: ${groupOk ? 'sent ✅' : 'failed ❌'}`);

    // Send directly to Wade as backup
    const imsgOk = this.sendImessage('+14356321400', alertText);
    logger.info(`iMessage to Wade: ${imsgOk ? 'sent ✅' : 'failed ❌'}`);

    // Send to Connecteam Office Numbers chat
    try {
      await this.sendConnecteamMessage(alertText);
      logger.info('Connecteam Office Numbers: sent ✅');
    } catch (err) {
      logger.warn('Connecteam message failed:', err.message);
    }
  }

  async getConnecteamToken() {
    const params = new URLSearchParams({ grant_type: 'client_credentials' });
    const creds = Buffer.from(`${CONNECTEAM_CLIENT_ID}:${CONNECTEAM_CLIENT_SECRET}`).toString('base64');
    const res = await axios.post('https://api.connecteam.com/oauth/v1/token', params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${creds}`
      }
    });
    return res.data.access_token;
  }

  async sendConnecteamMessage(text) {
    const token = await this.getConnecteamToken();
    await axios.post(
      `https://api.connecteam.com/chat/v1/conversations/${CONNECTEAM_CONVERSATION}/message`,
      { text: text.slice(0, 500), senderId: CONNECTEAM_PUBLISHER_ID },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
  }
}

module.exports = new AlertService();
