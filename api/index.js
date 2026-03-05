// Vercel Serverless Function — wraps the Express app
// This file is the entry point for ALL /api/* routes on Vercel

// Load .env for local dev; on Vercel, env vars are set in the dashboard
try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
} catch (e) {
  // dotenv may not find file on Vercel — that's fine
}

const app = require('../server/src/app');

module.exports = app;
