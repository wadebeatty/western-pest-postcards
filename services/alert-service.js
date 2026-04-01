const { execSync } = require('child_process');
const logger = require('../utils/logger');

// New Lead Chat group iMessage chat ID
const NEW_LEAD_CHAT_ID = 'f1e38812f1324ccfb22f4a14677a639b';

class AlertService {
  sendToGroup(message) {
    try {
      const escaped = message.replace(/"/g, '\\"');
      execSync(`imsg send --chat-id "${NEW_LEAD_CHAT_ID}" --text "${escaped}"`, { timeout: 10000 });
      return true;
    } catch (err) {
      logger.warn(`Group message failed: ${err.message}`);
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

    logger.info('Sending lead alert to New Lead Chat', { lead: name });
    const ok = this.sendToGroup(alertText);
    logger.info(`Group alert: ${ok ? 'sent ✅' : 'failed ❌'}`);
  }
}

module.exports = new AlertService();
