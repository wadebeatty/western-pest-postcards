const axios = require('axios');
const logger = require('../utils/logger');

class LeadSyncService {
  constructor() {
    this.pageAccessToken = process.env.META_PAGE_TOKEN || 'EAA0fbd4GgOYBRIGSstS7NleS7lfrwZCDZCB0tQTiICtKIIpgYXNSANS7dZCczCsfeEQM0oa4VjSmWaySFl6TZAcCoLe2atwhcbGpqZCDOhQULvTvmzwgltBmySFRbwt3Dss8UF2osd03Gkmm43Sh4sXqzNCHGXeC1lN8UZAdV4r4ZArxXZAZCEZCrZCoVzMRNsPUZA0guFlHdlaKbUyMZCFKhDeXPVx61e8OnM4xVBDxIZAZBTV';
    this.formId = '1233959305559072';
    this.lastChecked = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    this.processedLeads = new Set();
  }

  async fetchNewLeads() {
    const url = `https://graph.facebook.com/v19.0/${this.formId}/leads`;
    const params = {
      access_token: this.pageAccessToken,
      fields: 'id,created_time,field_data',
      filtering: JSON.stringify([{
        field: 'time_created',
        operator: 'GREATER_THAN',
        value: Math.floor(new Date(this.lastChecked).getTime() / 1000)
      }]),
      limit: 50
    };

    const response = await axios.get(url, { params });
    return response.data.data || [];
  }

  parseLeadFields(fieldData) {
    const lead = {};
    for (const f of fieldData) {
      lead[f.name] = f.values[0];
    }
    return lead;
  }

  async syncLeads(pestRoutesService) {
    try {
      const leads = await this.fetchNewLeads();
      logger.info(`Lead sync: found ${leads.length} new leads`);

      for (const lead of leads) {
        if (this.processedLeads.has(lead.id)) continue;

        const fields = this.parseLeadFields(lead.field_data || []);
        logger.info('Processing lead', { leadId: lead.id, name: `${fields.first_name} ${fields.last_name}` });

        const result = await pestRoutesService.createCustomerFromLead(fields);
        this.processedLeads.add(lead.id);
        logger.info('Lead → PestRoutes', { leadId: lead.id, customerID: result.customerID });

        // Fire alert to team
        try {
          const alertService = require('./alert-service');
          await alertService.sendLeadAlert(fields, result.customerID);
        } catch (alertErr) {
          logger.warn('Alert failed (non-fatal):', alertErr.message);
        }
      }

      this.lastChecked = new Date().toISOString();
      return leads.length;

    } catch (error) {
      logger.error('Lead sync error:', error.message);
      return 0;
    }
  }

  startPolling(pestRoutesService, intervalMs = 5 * 60 * 1000) {
    logger.info('Lead sync polling started — checking every 5 minutes');
    this.syncLeads(pestRoutesService); // Run immediately
    return setInterval(() => this.syncLeads(pestRoutesService), intervalMs);
  }
}

module.exports = new LeadSyncService();
