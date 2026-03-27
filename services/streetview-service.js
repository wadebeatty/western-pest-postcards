const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

class StreetViewService {
  constructor() {
    this.apiKey = process.env.GOOGLE_API_KEY;
    if (!this.apiKey) {
      logger.warn('GOOGLE_API_KEY not set in environment variables');
    }
  }

  /**
   * Get Street View image for an address
   * @param {string} address - Street address
   * @param {string} city - City
   * @param {string} state - State (2-letter code)
   * @param {string} zip - ZIP code
   * @returns {Promise<Buffer|null>} - Image buffer or null if not available
   */
  async getStreetViewImage(address, city, state, zip) {
    try {
      const fullAddress = `${address}, ${city}, ${state} ${zip}`;
      logger.debug('Fetching Street View for:', { address: fullAddress });
      
      // First check if Street View is available
      const metadata = await this.checkStreetViewAvailability(fullAddress);
      
      if (!metadata.available) {
        logger.info('Street View not available for address:', { address: fullAddress });
        return null;
      }
      
      // Get the image
      const imageUrl = this.buildStreetViewUrl(fullAddress, {
        size: '1200x800',
        heading: metadata.bestHeading || 0,
        pitch: 10,
        fov: 90
      });
      
      logger.debug('Fetching image from URL:', { url: imageUrl });
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      
      // Save to cache for debugging
      await this.cacheImage(response.data, fullAddress);
      
      logger.info('Street View image fetched successfully', { 
        address: fullAddress,
        size: response.data.length 
      });
      
      return response.data;
      
    } catch (error) {
      logger.error('Error fetching Street View image:', error.message);
      return null;
    }
  }

  /**
   * Check if Street View is available for an address
   * @param {string} address - Full address
   * @returns {Promise<Object>} - Metadata including availability
   */
  async checkStreetViewAvailability(address) {
    try {
      const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${encodeURIComponent(address)}&key=${this.apiKey}`;
      
      const response = await axios.get(metadataUrl);
      const data = response.data;
      
      logger.debug('Street View metadata:', data);
      
      return {
        available: data.status === 'OK',
        panoramaId: data.pano_id,
        date: data.date,
        location: data.location,
        copyright: data.copyright,
        bestHeading: this.calculateBestHeading(data.location)
      };
      
    } catch (error) {
      logger.error('Error checking Street View availability:', error.message);
      return { available: false };
    }
  }

  /**
   * Calculate best heading to face the house
   * @param {Object} location - Lat/lng coordinates
   * @returns {number} - Heading in degrees (0-360)
   */
  calculateBestHeading(location) {
    // Simple heuristic: face north (0°) for consistency
    // In production, you might use Google's Roads API to get road direction
    return 0;
  }

  /**
   * Build Street View URL
   * @param {string} address - Full address
   * @param {Object} options - Image options
   * @returns {string} - Complete URL
   */
  buildStreetViewUrl(address, options = {}) {
    const params = new URLSearchParams({
      location: address,
      size: options.size || '600x400',
      key: this.apiKey,
      source: 'outdoor'
    });
    
    if (options.heading !== undefined) params.append('heading', options.heading);
    if (options.pitch !== undefined) params.append('pitch', options.pitch);
    if (options.fov !== undefined) params.append('fov', options.fov);
    
    return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
  }

  /**
   * Cache image for debugging
   * @param {Buffer} imageBuffer - Image data
   * @param {string} address - Address for filename
   */
  async cacheImage(imageBuffer, address) {
    try {
      const cacheDir = path.join(__dirname, '../cache/streetview');
      await fs.mkdir(cacheDir, { recursive: true });
      
      // Create safe filename from address
      const safeFilename = address
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()
        .substring(0, 50) + '.jpg';
      
      const filePath = path.join(cacheDir, safeFilename);
      await fs.writeFile(filePath, imageBuffer);
      
      logger.debug('Image cached:', { filePath });
      
    } catch (error) {
      logger.warn('Failed to cache image:', error.message);
    }
  }

  /**
   * Get default image when Street View is not available
   * @returns {Promise<Buffer>} - Default image buffer
   */
  async getDefaultImage() {
    try {
      // Use a generic Western Pest image
      const defaultImagePath = path.join(__dirname, '../assets/default-house.jpg');
      return await fs.readFile(defaultImagePath);
    } catch (error) {
      // Fallback to creating a simple colored image
      logger.warn('Using fallback default image');
      return this.createFallbackImage();
    }
  }

  /**
   * Create a simple fallback image
   * @returns {Buffer} - Generated image
   */
  createFallbackImage() {
    // This would use canvas to create a simple placeholder
    // For now, return null and let postcard service handle it
    return null;
  }
}

module.exports = new StreetViewService();