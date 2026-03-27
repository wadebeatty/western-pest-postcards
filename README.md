# Automated Postcard System for Western Pest Control

## Overview
Automated system that triggers when new customers are created, fetches a Street View image of their home, generates a personalized postcard, and sends it via PRINTgenie.

## System Components

### 1. Webhook Receiver (`webhook-server.js`)
- Listens for new customer events from Paste Routes/CRM
- Validates and processes customer data
- Triggers postcard generation

### 2. Street View Fetcher (`streetview-service.js`)
- Uses Google Street View API
- Fetches image of customer's address
- Handles errors (no Street View available, etc.)

### 3. Postcard Generator (`postcard-generator.js`)
- Creates personalized postcard with:
  - Customer's home image
  - Personalized greeting
  - Western Pest branding
  - Call to action

### 4. PRINTgenie Sender (`printgenie-service.js`)
- Sends postcard via PRINTgenie API
- Tracks delivery status
- Handles retries on failure

## Setup Instructions

### Prerequisites
1. **Google Cloud API Key** (for Street View)
2. **PRINTgenie API Key** (for sending postcards)
3. **Node.js** environment
4. **Webhook URL** from your CRM/Paste Routes

### Installation
```bash
cd automated-postcard-system
npm install
```

### Configuration
Copy `.env.example` to `.env` and fill in:
```env
GOOGLE_API_KEY=your_google_api_key
PRINTGENIE_API_KEY=your_printgenie_api_key
WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

### Running
```bash
# Start the server
npm start

# Or run in development mode
npm run dev
```

## API Endpoints

### POST `/webhook/customer-created`
Receives new customer data from CRM/Paste Routes.

**Request body:**
```json
{
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "address": "123 Main St",
    "city": "St. George",
    "state": "UT",
    "zip": "84770",
    "phone": "(435) 555-1234",
    "email": "john@example.com"
  },
  "trigger": "new_customer",
  "timestamp": "2026-03-26T21:07:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Postcard queued for generation",
  "postcardId": "pc_123456",
  "estimatedDelivery": "2026-04-02"
}
```

## Integration with Paste Routes

### Option 1: Direct Webhook
1. In Paste Routes, set up a webhook to point to your server
2. Configure trigger: "When new customer is created"
3. Map customer fields to webhook payload

### Option 2: Zapier Middleman
1. Paste Routes → Zapier (new customer)
2. Zapier → Your webhook server
3. Your server → PRINTgenie

## Testing
```bash
# Test with sample customer
npm run test:customer

# Test Street View service
npm run test:streetview

# Test PRINTgenie integration
npm run test:printgenie
```

## Monitoring & Logging
- All requests logged to `logs/` directory
- Error tracking with Sentry (optional)
- Daily summary emails of postcards sent

## Cost Estimates
- **Google Street View API:** ~$5 per 1000 images
- **PRINTgenie:** ~$0.50-$1.00 per postcard (printing + mailing)
- **Server hosting:** $5-10/month (Render/Railway)

## Maintenance
- Weekly: Check API usage and costs
- Monthly: Update postcard design templates
- Quarterly: Review conversion metrics

## Handoff to Weston
1. Deploy to hosting service (Render/Railway recommended)
2. Set up monitoring alerts
3. Provide admin dashboard URL
4. Train on troubleshooting common issues

## Support
- Documentation in `/docs/`
- Example requests in `/examples/`
- Contact: Max (this agent) for setup assistance
