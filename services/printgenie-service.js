const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class PRINTgenieService {
  constructor() {
    this.apiKey = process.env.PRINTGENIE_API_KEY;
    this.baseUrl = 'https://app.printgenie.io/api'; // PRINTgenie API
    this.templateId = process.env.PRINTGENIE_TEMPLATE_ID;
    
    if (!this.apiKey) {
      logger.warn('PRINTGENIE_API_KEY not set in environment variables');
    }
  }

  /**
   * Send postcard to PRINTgenie
   * @param {Object} options - Send options
   * @returns {Promise<Object>} - PRINTgenie response
   */
  async sendPostcard(options) {
    const { customer, postcardData, templateId } = options;
    
    logger.info('Sending postcard to PRINTgenie', {
      customer: `${customer.firstName} ${customer.lastName}`,
      templateId: templateId || this.templateId
    });
    
    try {
      // Method 1: Use PRINTgenie API if available
      if (this.apiKey && this.baseUrl) {
        return await this.sendViaApi(customer, postcardData, templateId);
      }
      
      // Method 2: Use Zapier webhook as fallback
      logger.info('Using Zapier fallback method');
      return await this.sendViaZapier(customer, postcardData);
      
    } catch (error) {
      logger.error('Error sending to PRINTgenie:', error.message);
      throw new Error(`Failed to send postcard: ${error.message}`);
    }
  }

  /**
   * Send via PRINTgenie API
   */
  async sendViaApi(customer, postcardData, templateId) {
    const formData = new FormData();
    
    // Add customer data
    formData.append('first_name', customer.firstName);
    formData.append('last_name', customer.lastName);
    formData.append('address', customer.address);
    formData.append('city', customer.city);
    formData.append('state', customer.state);
    formData.append('zip', customer.zip);
    formData.append('phone', customer.phone || '');
    formData.append('email', customer.email || '');
    
    // Add template ID
    formData.append('template_id', templateId || this.templateId);
    
    // Add custom image if we have one
    if (postcardData.imageBuffer) {
      formData.append('custom_image', postcardData.imageBuffer, {
        filename: `postcard_${customer.firstName}_${customer.lastName}.png`,
        contentType: 'image/png'
      });
    }
    
    // Add metadata
    formData.append('metadata', JSON.stringify({
      source: 'western-pest-automation',
      customer_id: customer.id,
      generated_at: postcardData.generatedAt,
      campaign: 'welcome-new-customer'
    }));
    
    const config = {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        ...formData.getHeaders()
      }
    };
    
    const response = await axios.post(`${this.baseUrl}/send-postcard`, formData, config);
    
    logger.info('PRINTgenie API response:', response.data);
    
    return {
      success: true,
      postcardId: response.data.id || `pc_${Date.now()}`,
      estimatedDelivery: this.calculateDeliveryDate(),
      printgenieResponse: response.data
    };
  }

  /**
   * Send via Zapier webhook (fallback method)
   */
  async sendViaZapier(customer, postcardData) {
    // This would connect to a Zapier webhook that's already set up
    // to send to PRINTgenie
    
    const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
    
    if (!zapierWebhookUrl) {
      throw new Error('ZAPIER_WEBHOOK_URL not configured');
    }
    
    const payload = {
      trigger: 'new_postcard',
      customer: {
        first_name: customer.firstName,
        last_name: customer.lastName,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zip: customer.zip,
        phone: customer.phone,
        email: customer.email
      },
      postcard: {
        template: 'western-pest-welcome',
        image_url: await this.uploadImageToCDN(postcardData.imageBuffer, customer),
        metadata: {
          generated_at: postcardData.generatedAt,
          dimensions: postcardData.dimensions
        }
      }
    };
    
    const response = await axios.post(zapierWebhookUrl, payload);
    
    return {
      success: true,
      postcardId: response.data.postcard_id || `pc_zap_${Date.now()}`,
      estimatedDelivery: this.calculateDeliveryDate(),
      method: 'zapier'
    };
  }

  /**
   * Upload image to CDN for Zapier to access
   */
  async uploadImageToCDN(imageBuffer, customer) {
    // In production, you'd upload to S3, Cloudinary, etc.
    // For now, we'll save locally and return a file URL
    
    const uploadsDir = path.join(__dirname, '../uploads');
    await fs.mkdir(uploadsDir, { recursive: true });
    
    const filename = `postcard_${Date.now()}_${customer.firstName}_${customer.lastName}.png`;
    const filePath = path.join(uploadsDir, filename);
    
    await fs.writeFile(filePath, imageBuffer);
    
    logger.debug('Image saved for Zapier access:', { filePath });
    
    // Return file path (in production, this would be a public URL)
    return filePath;
  }

  /**
   * Calculate estimated delivery date
   */
  calculateDeliveryDate() {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 7); // 7 days for printing + mailing
    
    // Format as YYYY-MM-DD
    return deliveryDate.toISOString().split('T')[0];
  }

  /**
   * Check PRINTgenie account status
   */
  async checkAccountStatus() {
    try {
      if (!this.apiKey) {
        return { connected: false, reason: 'No API key configured' };
      }
      
      const response = await axios.get(`${this.baseUrl}/account`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      return {
        connected: true,
        account: response.data,
        credits: response.data.credits || 'unknown'
      };
      
    } catch (error) {
      logger.error('Error checking PRINTgenie account:', error.message);
      return { connected: false, reason: error.message };
    }
  }

  /**
   * Get available templates
   */
  async getTemplates() {
    try {
      const response = await axios.get(`${this.baseUrl}/templates`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });
      
      return response.data;
      
    } catch (error) {
      logger.error('Error fetching templates:', error.message);
      
      // Return mock data for development
      return [
        { id: 'template_1', name: 'Welcome Postcard', size: '11x6' },
        { id: 'template_2', name: 'Spring Promotion', size: '11x6' },
        { id: 'template_3', name: 'Scorpion Alert', size: '11x6' }
      ];
    }
  }

  /**
   * Test connection to PRINTgenie
   */
  async testConnection() {
    const accountStatus = await this.checkAccountStatus();
    const templates = await this.getTemplates();
    
    return {
      account: accountStatus,
      templates: templates.length,
      apiKeyConfigured: !!this.apiKey,
      baseUrlConfigured: !!this.baseUrl
    };
  }
}

module.exports = new PRINTgenieService();