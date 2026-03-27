const { createCanvas, loadImage, registerFont } = require('canvas');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class PostcardService {
  constructor() {
    this.templates = {
      'welcome-new-customer': this.generateWelcomePostcard.bind(this),
      'spring-promotion': this.generateSpringPromotionPostcard.bind(this),
      'scorpion-season': this.generateScorpionSeasonPostcard.bind(this)
    };
  }

  /**
   * Generate a postcard
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Postcard data including image buffer
   */
  async generatePostcard(options) {
    const { customer, streetviewImage, template = 'welcome-new-customer' } = options;
    
    logger.info('Generating postcard', { 
      template,
      customer: `${customer.firstName} ${customer.lastName}`
    });
    
    // Get the template generator
    const templateGenerator = this.templates[template];
    if (!templateGenerator) {
      throw new Error(`Template not found: ${template}`);
    }
    
    // Generate the postcard
    const postcardData = await templateGenerator(customer, streetviewImage);
    
    // Cache the generated postcard
    await this.cachePostcard(postcardData, customer);
    
    logger.info('Postcard generated successfully', {
      customer: `${customer.firstName} ${customer.lastName}`,
      size: postcardData.imageBuffer.length
    });
    
    return postcardData;
  }

  /**
   * Generate welcome postcard for new customers
   */
  async generateWelcomePostcard(customer, streetviewImage) {
    const width = 11 * 300;  // 11 inches at 300 DPI
    const height = 6 * 300;   // 6 inches at 300 DPI
    
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Colors
    const colors = {
      primary: '#1E3A8A',
      secondary: '#3B82F6',
      accent: '#EF4444',
      light: '#F8FAFC',
      dark: '#1F2937',
      white: '#FFFFFF'
    };
    
    // Draw front side (left 50%)
    await this.drawFrontSide(ctx, 0, 0, width/2, height, customer, streetviewImage, colors);
    
    // Draw back side (right 50%)
    await this.drawBackSide(ctx, width/2, 0, width/2, height, customer, colors);
    
    // Add divider line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width/2, 0);
    ctx.lineTo(width/2, height);
    ctx.stroke();
    
    // Convert to buffer
    const imageBuffer = canvas.toBuffer('image/png');
    
    return {
      imageBuffer,
      dimensions: { width, height },
      dpi: 300,
      format: 'png',
      customer,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Draw front side of postcard
   */
  async drawFrontSide(ctx, x, y, width, height, customer, streetviewImage, colors) {
    // Background
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, colors.light);
    gradient.addColorStop(1, '#E5E7EB');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
    
    // Image area (top 70%)
    const imageHeight = height * 0.7;
    
    if (streetviewImage) {
      // Load and draw Street View image
      try {
        const image = await loadImage(streetviewImage);
        ctx.drawImage(image, x + 20, y + 20, width - 40, imageHeight - 40);
      } catch (error) {
        logger.warn('Failed to load Street View image, using placeholder', error.message);
        this.drawImagePlaceholder(ctx, x, y, width, imageHeight, 'Your Home');
      }
    } else {
      this.drawImagePlaceholder(ctx, x, y, width, imageHeight, 'Welcome to the Neighborhood!');
    }
    
    // Text area (bottom 30%)
    const textAreaY = y + imageHeight;
    const textAreaHeight = height - imageHeight;
    
    // Background for text area
    ctx.fillStyle = colors.primary;
    ctx.fillRect(x, textAreaY, width, textAreaHeight);
    
    // Text
    ctx.fillStyle = colors.white;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Welcome ${customer.firstName}!`, x + width/2, textAreaY + 50);
    
    ctx.font = '24px Arial';
    ctx.fillText('Western Pest Control is here to protect', x + width/2, textAreaY + 90);
    ctx.fillText('your home from pests year-round.', x + width/2, textAreaY + 120);
    
    // Phone number
    ctx.font = 'bold 28px Arial';
    ctx.fillText('(435) 632-1400', x + width/2, textAreaY + 170);
    
    // Border
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 10;
    ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);
  }

  /**
   * Draw back side of postcard
   */
  async drawBackSide(ctx, x, y, width, height, customer, colors) {
    // Background
    ctx.fillStyle = colors.white;
    ctx.fillRect(x, y, width, height);
    
    // Header
    ctx.fillStyle = colors.primary;
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('WESTERN PEST CONTROL', x + width/2, y + 60);
    
    ctx.fillStyle = colors.secondary;
    ctx.font = 'italic 24px Arial';
    ctx.fillText('"Your Home is a Sanctuary."', x + width/2, y + 100);
    ctx.fillText('We Keep it That Way.', x + width/2, y + 130);
    
    // Personalized message
    ctx.fillStyle = colors.dark;
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    
    const message = [
      `Dear ${customer.firstName},`,
      '',
      'Thank you for choosing Western Pest Control!',
      'We\'re excited to help protect your home at:',
      '',
      `${customer.address}`,
      `${customer.city}, ${customer.state} ${customer.zip}`,
      '',
      'Our local team has been serving Southern Utah',
      'for over 20 years. We offer:',
      '',
      '• 100% Pest-Free Warranty',
      '• Pet & Family Friendly Treatments',
      '• Free Re-Sprays Guaranteed',
      '• 5-Hour Response Time',
      '',
      'Call us anytime: (435) 632-1400',
      'Or visit: wpest.com'
    ];
    
    message.forEach((line, i) => {
      ctx.fillText(line, x + 40, y + 180 + (i * 28));
    });
    
    // QR code placeholder
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(x + width - 180, y + height - 180, 150, 150);
    ctx.fillStyle = colors.dark;
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('[QR CODE]', x + width - 105, y + height - 100);
    ctx.fillText('wpest.com/welcome', x + width - 105, y + height - 70);
    
    // Border
    ctx.strokeStyle = colors.secondary;
    ctx.lineWidth = 10;
    ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);
  }

  /**
   * Draw image placeholder
   */
  drawImagePlaceholder(ctx, x, y, width, height, text) {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(x + 20, y + 20, width - 40, height - 40);
    
    ctx.fillStyle = '#6B7280';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width/2, y + height/2);
  }

  /**
   * Generate spring promotion postcard
   */
  async generateSpringPromotionPostcard(customer, streetviewImage) {
    // Similar structure, different design
    return this.generateWelcomePostcard(customer, streetviewImage);
  }

  /**
   * Generate scorpion season postcard
   */
  async generateScorpionSeasonPostcard(customer, streetviewImage) {
    // Similar structure, scorpion-themed design
    return this.generateWelcomePostcard(customer, streetviewImage);
  }

  /**
   * Cache generated postcard
   */
  async cachePostcard(postcardData, customer) {
    try {
      const cacheDir = path.join(__dirname, '../cache/postcards');
      await fs.mkdir(cacheDir, { recursive: true });
      
      const filename = `postcard_${Date.now()}_${customer.firstName}_${customer.lastName}.png`;
      const filePath = path.join(cacheDir, filename);
      
      await fs.writeFile(filePath, postcardData.imageBuffer);
      
      logger.debug('Postcard cached:', { filePath });
      
    } catch (error) {
      logger.warn('Failed to cache postcard:', error.message);
    }
  }
}

module.exports = new PostcardService();