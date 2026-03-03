// Vercel Serverless Function — wraps the Express app
// This file is the entry point for ALL /api/* routes on Vercel

require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
const app = require('../server/src/app');

module.exports = app;
