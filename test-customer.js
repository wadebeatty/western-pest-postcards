const axios = require('axios');
const logger = require('./utils/logger');

async function testCustomerWebhook() {
  const testCustomer = {
    firstName: 'John',
    lastName: 'Doe',
    address: '95 N 100 E',
    city: 'La Verkin',
    state: 'UT',
    zip: '84745',
    phone: '(435) 555-1234',
    email: 'john.doe@example.com'
  };

  const payload = {
    customer: testCustomer,
    trigger: 'new_customer',
    timestamp: new Date().toISOString()
  };

  try {
    logger.info('Testing customer webhook...');
    
    const response = await axios.post('http://localhost:3000/webhook/customer-created', payload);
    
    logger.info('Test successful!', response.data);
    
    return response.data;
    
  } catch (error) {
    logger.error('Test failed:', error.message);
    
    if (error.response) {
      logger.error('Response status:', error.response.status);
      logger.error('Response data:', error.response.data);
    }
    
    return { success: false, error: error.message };
  }
}

// Run test if called directly
if (require.main === module) {
  testCustomerWebhook().then(result => {
    console.log('Test completed:', result);
    process.exit(result.success ? 0 : 1);
  });
}

module.exports = testCustomerWebhook;