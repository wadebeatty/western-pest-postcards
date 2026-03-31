/**
 * Local Lead Poller — runs on Mac mini
 * Polls Meta every 20 seconds, pushes leads to PestRoutes, fires iMessage alerts.
 * Start: node local-poller.js
 * Auto-start: managed via launchd plist
 */

require('dotenv').config();
const leadSyncService = require('./services/lead-sync-service');
const pestRoutesService = require('./services/pestroutes-service');
const logger = require('./utils/logger');

logger.info('🚀 Western Pest Lead Poller starting...');
logger.info('Polling Meta every 5 minutes for new leads');
logger.info('Alerts will fire via iMessage to team');

// Poll every 5 minutes — Meta rate limits lead API at high frequency
leadSyncService.startPolling(pestRoutesService, 5 * 60 * 1000);
