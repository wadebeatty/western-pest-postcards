const { execSync } = require('child_process');
const logger = require('../utils/logger');

const TEAM = [
  { name: 'Wade',      phone: '+14356321400', service: 'imessage' },
  { name: 'Austin',   phone: '+14358175245', service: 'imessage' },
  { name: 'Chris',    phone: '+14356190274', service: 'imessage' },
  { name: 'Leesa',    phone: '+14358173626', service: 'imessage' },
  { name: 'Dawn',     phone: '+18012442471', service: 'imessage' },
  { name: 'Katherine',phone: '+14358176331', service: 'sms'      },  // Android
  { name: 'Katherine (backup)', phone: '+14352162425', service: 'imessage' }
];

class AlertService {
  sendMessage(phone, message, service) {
    try {
      const escaped = message.replace(/"/g, '\\"').replace(/\n/g, ' ');
      execSync(`imsg send --to "${phone}" --text "${escaped}" --service ${service}`, { timeout: 10000 });
      return true;
    } catch (err) {
      logger.warn(`Message to ${phone} (${service}) failed: ${err.message}`);
      return false;
    }
  }

  async sendLeadAlert(lead, pestRoutesCustomerID) {
    const firstName = lead.first_name || lead.full_name?.split(' ')[0] || '';
    const lastName  = lead.last_name  || lead.full_name?.split(' ').slice(1).join(' ') || '';
    const name      = `${firstName} ${lastName}`.trim() || 'Unknown';
    const phone     = lead.phone_number || lead.phone || 'N/A';
    const address   = [lead.street_address, lead.city, lead.state].filter(Boolean).join(', ') || `Zip: ${lead.zip_code || 'N/A'}`;
    const adSource  = lead._formName ? `\n📣 ${lead._formName}` : '';

    const alertText = `🚨 NEW FB LEAD\n${name}\n📞 ${phone}\n📍 ${address}${adSource}\nPestRoutes #${pestRoutesCustomerID}\nCALL NOW`;

    logger.info('Sending lead alerts to team', { lead: name });

    for (const member of TEAM) {
      const ok = this.sendMessage(member.phone, alertText, member.service);
      logger.info(`Alert to ${member.name} (${member.service}): ${ok ? 'sent ✅' : 'failed ❌'}`);
    }
  }
}

module.exports = new AlertService();
