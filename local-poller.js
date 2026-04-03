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
logger.info('Polling Meta every 2 minutes for new leads');
logger.info('Alerts will fire via iMessage + Connecteam to team');

// Poll every 2 minutes — fast enough to catch leads quickly, well within Meta API limits
leadSyncService.startPolling(pestRoutesService, 2 * 60 * 1000);
