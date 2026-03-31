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
logger.info('Polling Meta every 20 seconds for new leads');
logger.info('Alerts will fire via iMessage to team');

leadSyncService.startPolling(pestRoutesService, 20 * 1000);
