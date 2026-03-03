// Server entry point — for local development and standalone hosting
// For Vercel serverless, see /api/index.js which imports app.js directly

require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PT-CMS Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

