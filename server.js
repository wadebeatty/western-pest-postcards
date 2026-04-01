const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Import services
const streetviewService = require('./services/streetview-service');
const postcardService = require('./services/postcard-service');
const printgenieService = require('./services/printgenie-service');
const logger = require('./utils/logger');

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'Western Pest Automated Postcards',
    version: '1.0.0'
  });
});

// Webhook endpoint for new customers
app.post('/webhook/customer-created', async (req, res) => {
  try {
    const { customer, trigger, timestamp } = req.body;
    
    // Validate request
    if (!customer || !customer.address) {
      return res.status(400).json({ 
        error: 'Invalid request: customer data required' 
      });
    }
    
    logger.info('New customer received', { 
      customer: `${customer.firstName} ${customer.lastName}`,
      address: customer.address,
      trigger 
    });
    
    // Step 1: Get Street View image
    logger.info('Fetching Street View image...');
    const streetviewImage = await streetviewService.getStreetViewImage(
      customer.address,
      customer.city,
      customer.state,
      customer.zip
    );
    
    if (!streetviewImage) {
      logger.warn('No Street View available, using default image');
      // Continue with default image
    }
    
    // Step 2: Generate postcard
    logger.info('Generating postcard...');
    const postcardData = await postcardService.generatePostcard({
      customer,
      streetviewImage,
      template: 'welcome-new-customer'
    });
    
    // Step 3: Send to PRINTgenie
    logger.info('Sending to PRINTgenie...');
    const printgenieResponse = await printgenieService.sendPostcard({
      customer,
      postcardData,
      templateId: process.env.PRINTGENIE_TEMPLATE_ID
    });
    
    // Success response
    res.json({
      success: true,
      message: 'Postcard created and queued for printing',
      postcardId: printgenieResponse.postcardId,
      estimatedDelivery: printgenieResponse.estimatedDelivery,
      customer: `${customer.firstName} ${customer.lastName}`,
      timestamp: new Date().toISOString()
    });
    
    logger.info('Postcard processed successfully', {
      postcardId: printgenieResponse.postcardId,
      customer: `${customer.firstName} ${customer.lastName}`
    });
    
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Meta Lead Ads webhook — Facebook sends lead data here
app.post('/webhook/meta-lead', async (req, res) => {
  try {
    const { entry } = req.body;

    if (!entry || !entry.length) {
      return res.status(400).json({ error: 'Invalid lead data' });
    }

    const pestRoutesService = require('./services/pestroutes-service');

    for (const item of entry) {
      for (const change of (item.changes || [])) {
        const leadData = change.value;
        if (!leadData || !leadData.field_data) continue;

        // Parse Facebook lead form fields
        const fields = {};
        for (const f of leadData.field_data) {
          fields[f.name] = f.values[0];
        }

        logger.info('Meta lead received', { leadID: leadData.leadgen_id, name: `${fields.first_name} ${fields.last_name}` });

        // Create in PestRoutes
        const result = await pestRoutesService.createCustomerFromLead(fields);

        logger.info('Lead pushed to PestRoutes', { customerID: result.customerID });
      }
    }

    res.json({ success: true });

  } catch (error) {
    logger.error('Meta lead webhook error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Meta webhook verification (required by Facebook)
app.get('/webhook/meta-lead', (req, res) => {
  const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'western-pest-2026';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('Meta webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Admin endpoints
app.get('/admin/status', (req, res) => {
  // Basic auth would be added here
  res.json({
    status: 'operational',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV
  });
});

// Start server
app.listen(port, () => {
  logger.info(`Automated Postcard Server running on port ${port}`);
  logger.info(`Health check: http://localhost:${port}/health`);
  logger.info(`Webhook endpoint: POST http://localhost:${port}/webhook/customer-created`);

  // Polling disabled — using Meta webhooks instead (webhook/meta-lead)
  // leadSyncService.startPolling(pestRoutesService, 20 * 1000);
  logger.info('Meta lead sync via webhook — polling disabled');
});