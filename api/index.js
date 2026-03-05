// Vercel Serverless Function — wraps the Express app
// This file is the entry point for ALL /api/* routes on Vercel

let app;
let loadError = null;

try {
  // Load .env for local dev; on Vercel, env vars are set in the dashboard
  try {
    require('dotenv').config({ path: require('path').join(__dirname, '..', 'server', '.env') });
  } catch (e) {
    // dotenv may not find file on Vercel — that's fine
  }

  app = require('../server/src/app');
} catch (err) {
  loadError = err;
}

module.exports = (req, res) => {
  if (loadError) {
    res.status(500).json({
      error: 'Server failed to load',
      message: loadError.message,
      stack: loadError.stack,
      env_check: {
        NODE_ENV: process.env.NODE_ENV || 'NOT SET',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET',
        DB_HOST: process.env.DB_HOST ? 'SET' : 'NOT SET',
        JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'NOT SET',
        TEST_MODE: process.env.TEST_MODE || 'NOT SET'
      }
    });
    return;
  }
  return app(req, res);
};
