const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit — list audit logs (Admin/Auditor only)
router.get('/', authenticate, authorize('ADMIN', 'AUDITOR'), async (req, res, next) => {
  try {
    const { entity_type, actor_id, action, from, to, page = 1, limit = 50 } = req.query;

    let sql = `
      SELECT al.*, u.full_name AS actor_name, u.username AS actor_username
      FROM audit_log al
      LEFT JOIN users u ON al.actor_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (entity_type) {
      params.push(entity_type);
      sql += ` AND al.entity_type = $${params.length}`;
    }
    if (actor_id) {
      params.push(actor_id);
      sql += ` AND al.actor_id = $${params.length}`;
    }
    if (action) {
      params.push(action);
      sql += ` AND al.action = $${params.length}`;
    }
    if (from) {
      params.push(from);
      sql += ` AND al.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND al.created_at <= $${params.length}::date + interval '1 day'`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) q`, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      audit_logs: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
