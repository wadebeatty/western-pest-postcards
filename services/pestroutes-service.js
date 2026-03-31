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
    const firstName = lead.first_name || lead.full_name?.split(' ')[0] || lead.firstName || '';
    const lastName  = lead.last_name  || lead.full_name?.split(' ').slice(1).join(' ') || lead.lastName || '';
    const phone     = lead.phone_number || lead.phone || '';
    const zip       = lead.zip_code || lead.zip || '';

    const payload = {
      authenticationKey: this.authKey,
      authenticationToken: this.authToken,
      officeID: this.officeID,
      fname: firstName,
      lname: lastName,
      email: lead.email || '',
      phone1: phone,
      address: lead.street_address || lead.address || '',
      city: lead.city || '',
      state: lead.state || 'UT',
      zip: zip,
      sourceID: 9,       // Facebook
      status: 0,
      smsReminders: 1,
      emailReminders: 1,
    };

    logger.info('Creating PestRoutes customer from lead', { name: `${firstName} ${lastName}`, source: lead._formName });

    const response = await axios.post(`${this.baseUrl}/customer/create`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.data.success) {
      throw new Error(`PestRoutes customer/create error: ${JSON.stringify(response.data)}`);
    }

    const customerID = response.data.result;
    logger.info('PestRoutes customer created', { customerID });

    // Create a task assigned to Austin (employeeID 8) so the lead shows up in PestRoutes tasks
    try {
      const name    = `${firstName} ${lastName}`.trim();
      const adLabel = lead._formName ? ` | Ad: ${lead._formName}` : '';
      const taskText = `🚨 NEW FACEBOOK LEAD - CALL NOW! ${name} | ${phone || 'no phone'} | Zip: ${zip}${adLabel}`;

      const today = new Date();
      const dueDate = today.toISOString().split('T')[0];

      const taskResponse = await axios.post(`${this.baseUrl}/task/create`, {
        authenticationKey: this.authKey,
        authenticationToken: this.authToken,
        customerID: customerID,
        assignedTo: 180, // Kayla Irvine
        dueDate: dueDate,
        type: 0,
        category: 1,
        task: taskText
      }, { headers: { 'Content-Type': 'application/json' } });

      if (taskResponse.data.success) {
        logger.info('PestRoutes task created', { taskID: taskResponse.data.result, customerID });
      } else {
        logger.warn('PestRoutes task creation failed (non-fatal)', taskResponse.data);
      }
    } catch (taskErr) {
      logger.warn('Task creation error (non-fatal):', taskErr.message);
    }

    // Add "New Customer Lead" flag (genericFlagID 257)
    try {
      await axios.post(`${this.baseUrl}/genericFlagAssignment/create`, {
        authenticationKey: this.authKey,
        authenticationToken: this.authToken,
        genericFlagID: 257,
        entityID: customerID,
        type: 'CUST'
      }, { headers: { 'Content-Type': 'application/json' } });
      logger.info('New Customer Lead flag added', { customerID });
    } catch (flagErr) {
      logger.warn('Flag creation error (non-fatal):', flagErr.message);
    }

    // Add Red Note so it shows visually on the customer card
    try {
      const today = new Date().toISOString().split('T')[0];
      const noteName = `${firstName} ${lastName}`.trim();
      const notePhone = phone || 'no phone';
      const adLabel = lead._formName ? ` | Ad: ${lead._formName}` : '';
      await axios.post(`${this.baseUrl}/note/create`, {
        authenticationKey: this.authKey,
        authenticationToken: this.authToken,
        customerID: customerID,
        typeID: 8,
        contactType: 'Red Notes',
        date: today,
        notes: `NEW FACEBOOK LEAD - CALL NOW! ${noteName} | ${notePhone} | Zip: ${zip}${adLabel}`,
        showCustomer: 0,
        showTech: 0
      }, { headers: { 'Content-Type': 'application/json' } });
      logger.info('Red Note added', { customerID });
    } catch (noteErr) {
      logger.warn('Red Note error (non-fatal):', noteErr.message);
    }

    return { success: true, customerID };
  }
}

module.exports = new PestRoutesService();
