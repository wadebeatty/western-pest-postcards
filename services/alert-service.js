const { execSync } = require('child_process');
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
  sendSMS(phone, message) {
    try {
      // Use imsg via macOS Messages.app — works immediately, no registration needed
      const escaped = message.replace(/"/g, '\\"').replace(/\n/g, ' ');
      execSync(`imsg send --to "${phone}" --text "${escaped}" --service sms`, { timeout: 10000 });
      return true;
    } catch (err) {
      logger.warn(`imsg SMS to ${phone} failed: ${err.message}`);
      return false;
    }
  }

  async sendLeadAlert(lead, pestRoutesCustomerID) {
    const name    = `${lead.first_name || ''} ${lead.last_name || ''}`.trim();
    const phone   = lead.phone_number || lead.phone || 'N/A';
    const address = [lead.street_address, lead.city, lead.state].filter(Boolean).join(', ');

    const smsText = `🚨 NEW FB LEAD\n${name}\n📞 ${phone}\n📍 ${address}\nPestRoutes #${pestRoutesCustomerID}\nCALL NOW`;

    logger.info('Sending lead alerts to team', { lead: name });

    for (const member of SMS_TEAM) {
      const ok = this.sendSMS(member.phone, smsText);
      logger.info(`Alert to ${member.name}: ${ok ? 'sent' : 'failed'}`);
    }
  }
}

module.exports = new AlertService();
