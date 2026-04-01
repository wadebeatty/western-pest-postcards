const https = require('https');
const logger = require('../utils/logger');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM        = process.env.TWILIO_FROM || '+14359007582';

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
      const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString();
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
    try {
      const escaped = message.replace(/"/g, '\\"');
      execSync(`imsg send --to "${phone}" --text "${escaped}" --service imessage`, { timeout: 10000 });
      return true;
    } catch (err) {
      logger.warn(`iMessage to ${phone} failed: ${err.message}`);
      return false;
    }
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
      submittedAt = `\nSubmitted: ${d.toLocaleString('en-US', { timeZone: 'America/Denver', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })} MDT`;
    }

    const alertText = `NEW FB LEAD\n${name}\nPhone: ${phone}\nAddress: ${address}${adSource}${submittedAt}\nPestRoutes #${pestRoutesCustomerID}\nCALL NOW`;

    logger.info('Sending lead alerts via Twilio SMS', { lead: name });

    for (const member of TEAM) {
      const ok = await this.sendSMS(member.phone, alertText);
      logger.info(`SMS to ${member.name} (${member.phone}): ${ok ? 'sent ✅' : 'failed ❌'}`);
    }

    // Always send iMessage directly to Wade as backup
    const imsgOk = this.sendImessage('+14356321400', alertText);
    logger.info(`iMessage backup to Wade: ${imsgOk ? 'sent ✅' : 'failed ❌'}`);
  }
}

module.exports = new AlertService();
