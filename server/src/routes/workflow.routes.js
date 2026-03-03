const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createWorkflowEvent, getClientIp } = require('../utils/audit');

const router = express.Router();

// GET /api/workflow-events — list events (filterable)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { estate_file_id, asset_id, event_type, from_date, to_date, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT we.*, u.full_name AS performed_by_name
      FROM workflow_events we
      LEFT JOIN users u ON we.performed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estate_file_id) {
      params.push(estate_file_id);
      sql += ` AND we.estate_file_id = $${params.length}`;
    }
    if (asset_id) {
      params.push(asset_id);
      sql += ` AND we.asset_id = $${params.length}`;
    }
    if (event_type) {
      params.push(event_type);
      sql += ` AND we.event_type = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      sql += ` AND we.performed_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      sql += ` AND we.performed_at <= $${params.length}::date + interval '1 day'`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) q`, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    sql += ` ORDER BY we.performed_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      workflow_events: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/workflow-events — create manual workflow event (note)
router.post('/', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const { estate_file_id, asset_id, transfer_id, event_type, description } = req.body;

    if (!estate_file_id || !description) {
      return res.status(400).json({ error: 'estate_file_id and description are required.' });
    }

    const event = await createWorkflowEvent({
      estateFileId: estate_file_id,
      assetId: asset_id || null,
      transferId: transfer_id || null,
      eventType: event_type || 'NOTE',
      description,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ workflow_event: event });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
