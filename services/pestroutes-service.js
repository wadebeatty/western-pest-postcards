const axios = require('axios');
const logger = require('../utils/logger');

class PestRoutesService {
  constructor() {
    this.baseUrl = 'https://western.pestroutes.com/api';
    this.authKey = process.env.PESTROUTES_KEY || 'r30l42q0uqm4d381ekose9qlsq8gsg6jenrlcqevtcm6duuoj05s2uc59ajnfvim';
    this.authToken = process.env.PESTROUTES_TOKEN || '0svtsh4pm3eq3q6sscl07qsaoghp1606a68abs8i8sjjv19t84o1usd3qf638smj';
    this.officeID = 1;
  }

  async createCustomerFromLead(lead) {
    const payload = {
      authenticationKey: this.authKey,
      authenticationToken: this.authToken,
      officeID: this.officeID,
      fname: lead.first_name || lead.firstName || '',
      lname: lead.last_name || lead.lastName || '',
      email: lead.email || '',
      phone1: lead.phone_number || lead.phone || '',
      address: lead.street_address || lead.address || '',
      city: lead.city || '',
      state: lead.state || 'UT',
      zip: lead.zip_code || lead.zip || '',
      sourceID: 9,       // Facebook — matches existing source in PestRoutes
      status: 2,         // Status 2 shows as new/pending lead in PestRoutes
      smsReminders: 1,
      emailReminders: 1,
    };

    logger.info('Creating PestRoutes customer from lead', { name: `${payload.fname} ${payload.lname}` });

    const response = await axios.post(`${this.baseUrl}/customer/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.data.success) {
      logger.info('PestRoutes customer created', { customerID: response.data.result });
      return { success: true, customerID: response.data.result };
    } else {
      throw new Error(`PestRoutes error: ${JSON.stringify(response.data)}`);
    }
  }
}

module.exports = new PestRoutesService();
