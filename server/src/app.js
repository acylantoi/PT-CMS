const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { pool } = require('./db/connection');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const estateFileRoutes = require('./routes/estateFile.routes');
const beneficiaryRoutes = require('./routes/beneficiary.routes');
const assetRoutes = require('./routes/asset.routes');
const transferRoutes = require('./routes/transfer.routes');
const documentRoutes = require('./routes/document.routes');
const workflowRoutes = require('./routes/workflow.routes');
const reportRoutes = require('./routes/report.routes');
const auditRoutes = require('./routes/audit.routes');
const importRoutes = require('./routes/import.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const { errorHandler } = require('./middleware/errorHandler');
const testModeMiddleware = require('./middleware/testMode');

const app = express();

// Trust proxy (Vercel / reverse proxies)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// ── TEST MODE — intercept all /api/* requests with mock data ──
app.use(testModeMiddleware);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging (skip in serverless to reduce noise)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}

// Static uploads (local dev only — production should use external storage)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', '..', 'client', 'build')));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/estate-files', estateFileRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflow-events', workflowRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/import', importRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Nested resource routes — mount at /api so full route paths resolve correctly
// e.g. POST /api/estate-files/:id/beneficiaries, POST /api/assets/:id/transfers
app.use('/api', beneficiaryRoutes);
app.use('/api', assetRoutes);
app.use('/api', transferRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Serve React app for all non-API routes in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'client', 'build', 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

module.exports = app;
