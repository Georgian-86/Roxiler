// Vercel serverless entry: the Express app handles every /api/* request.
// Migrations are applied ahead of deploys, not on cold start.
module.exports = require('../backend/src/app');
