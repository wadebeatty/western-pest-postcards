const twilio = require('twilio');
const logger = require('../utils/logger');

const SMS_TEAM = [
  { name: 'Wade',      phone: '+14356321400' },
  { name: 'Austin',   phone: '+14358175245' },
  { name: 'Chris',    phone: '+14356190274' },
  { name: 'Leesa',    phone: '+14358173626' },
  { name: 'Dawn',     phone: '+18012442471' },
  { name: 'Katherine',phone: '+14352162425' }
];

class AlertService {
  constructor() {
    // Supports both API Key (SK...) and main Auth Token auth
    const sid   = process.env.TWILIO_SID   || process.env.TWILIO_SID || '';
    const token = process.env.TWILIO_TOKEN;
    const apiKey   = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;

    if (apiKey && apiSecret) {
      this.client = twilio(apiKey, apiSecret, { accountSid: sid });
    } else {
      this.client = twilio(sid, token);
    }
    this.from = process.env.TWILIO_FROM || '+18773698146';
  }

  async sendLeadAlert(lead, pestRoutesCustomerID) {
    const name    = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    const phone   = lead.phone_number || lead.phone || 'N/A';
    const address = [lead.street_address, lead.city, lead.state].filter(Boolean).join(', ');

    const smsText = `🚨 NEW FB LEAD\n${name}\n📞 ${phone}\n📍 ${address}\nPestRoutes #${pestRoutesCustomerID}\nCALL NOW`;

    const smsPromises = SMS_TEAM.map(member =>
      this.client.messages.create({
        body: smsText,
        from: this.from,
        to: member.phone
      }).then(() => logger.info(`SMS sent to ${member.name}`))
        .catch(err => logger.warn(`SMS to ${member.name} failed: ${err.message}`))
    );

    await Promise.all(smsPromises);
    logger.info('Lead alerts sent', { lead: name, recipients: SMS_TEAM.length });
  }
}

module.exports = new AlertService();
