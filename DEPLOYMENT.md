# Deployment Guide for Weston

## Quick Start (5 minutes)

### 1. Clone the repository
```bash
git clone <repository-url>
cd automated-postcard-system
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Start the server
```bash
npm start
```

## Production Deployment

### Option A: Render.com (Recommended - Free tier available)
1. **Create account** at [render.com](https://render.com)
2. **New Web Service** → Connect your Git repository
3. **Configure:**
   - **Name:** `western-pest-postcards`
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment Variables:** Copy from `.env.example`
4. **Deploy**

### Option B: Railway.app
1. **Create account** at [railway.app](https://railway.app)
2. **New Project** → Deploy from GitHub
3. **Add Variables:** Copy from `.env.example`
4. **Deploy**

### Option C: Heroku
```bash
heroku create western-pest-postcards
heroku config:set GOOGLE_API_KEY=your_key
heroku config:set PRINTGENIE_API_KEY=your_key
git push heroku main
```

## Configuration

### Required API Keys
1. **Google Cloud API Key**
   - Enable: Street View Static API
   - Cost: ~$5 per 1000 requests
   - Get at: [Google Cloud Console](https://console.cloud.google.com)

2. **PRINTgenie API Key**
   - Contact PRINTgenie support
   - Or use Zapier integration as fallback

### Optional: Zapier Integration
If PRINTgenie API is unavailable:
1. Create Zap: Webhook → PRINTgenie
2. Get webhook URL from Zapier
3. Set `ZAPIER_WEBHOOK_URL` in `.env`

## Integration with Paste Routes

### Step 1: Get your webhook URL
After deployment, your webhook URL will be:
```
https://your-app.onrender.com/webhook/customer-created
```

### Step 2: Configure Paste Routes
1. Go to Paste Routes settings
2. Find "Webhooks" or "Automations"
3. Add new webhook:
   - **URL:** Your webhook URL
   - **Trigger:** "New Customer Created"
   - **Method:** POST
   - **Content Type:** JSON

### Step 3: Test the integration
```bash
# Run test
npm run test:customer

# Or manually test with curl
curl -X POST https://your-app.onrender.com/webhook/customer-created \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "firstName": "Test",
      "lastName": "Customer",
      "address": "123 Test St",
      "city": "St. George",
      "state": "UT",
      "zip": "84770"
    }
  }'
```

## Monitoring

### Health Check
```
GET https://your-app.onrender.com/health
```

### Admin Dashboard
```
GET https://your-app.onrender.com/admin/status
```

### Logs
- Render/Railway: Built-in log viewer
- Heroku: `heroku logs --tail`
- Local: `logs/` directory

## Cost Management

### Google API Costs
- Street View Static API: $5 per 1000 requests
- Set budget alerts in Google Cloud Console
- Consider caching frequently used addresses

### PRINTgenie Costs
- Postcards: $0.50-$1.00 each
- Monitor monthly spending
- Set maximum monthly budget in code

### Hosting Costs
- Render: Free tier (750 hours/month)
- Railway: $5/month starter plan
- Heroku: $7/month hobby plan

## Troubleshooting

### Common Issues

1. **"Street View not available"**
   - Some addresses don't have Street View
   - System uses fallback image

2. **PRINTgenie API errors**
   - Check API key validity
   - Use Zapier fallback method
   - Contact PRINTgenie support

3. **Webhook not firing**
   - Check Paste Routes webhook configuration
   - Verify server is running
   - Check logs for errors

### Debug Mode
```bash
# Set debug logging
LOG_LEVEL=debug npm start

# Check specific service
npm run test:streetview
npm run test:printgenie
```

## Maintenance Schedule

### Daily
- Check error logs
- Monitor API usage

### Weekly
- Review sent postcards
- Check costs vs budget
- Backup logs

### Monthly
- Update postcard designs
- Review conversion metrics
- Rotate API keys (security)

## Handoff Checklist

- [ ] Server deployed and running
- [ ] API keys configured
- [ ] Webhook URL obtained
- [ ] Paste Routes integration tested
- [ ] Test postcard sent and received
- [ ] Monitoring set up
- [ ] Budget alerts configured
- [ ] Documentation provided to Weston

## Support Contacts

- **Technical Issues:** Max (this agent)
- **PRINTgenie Support:** help@printgenie.io
- **Google Cloud Support:** Google Cloud Console
- **Paste Routes Support:** Paste Routes support team

## Emergency Procedures

### If costs spike:
1. Disable webhook in Paste Routes
2. Set all API keys to invalid
3. Contact Max for investigation

### If service is down:
1. Check hosting provider status
2. Restart server
3. Check error logs
4. Contact support if needed

---

**System ready for handoff to Weston!** 🚀