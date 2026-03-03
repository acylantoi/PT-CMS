const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, createWorkflowEvent, getClientIp } = require('../utils/audit');
const { TRANSFER_STATUS_TRANSITIONS, isValidTransition } = require('../utils/statusTransitions');

const router = express.Router();

// POST /api/assets/:assetId/transfers — create transfer
router.post('/assets/:assetId/transfers', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const {
      transfer_type, transferee_name, transferee_id_no, beneficiary_id,
      share_details, consideration, instrument_date, completion_date, remarks
    } = req.body;

    // Verify asset exists
    const asset = await query(`
      SELECT a.*, ef.file_number FROM assets a
      JOIN estate_files ef ON a.estate_file_id = ef.id
      WHERE a.id = $1 AND a.is_deleted = false
    `, [assetId]);

    if (asset.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    if (!transferee_name) {
      return res.status(400).json({ error: 'transferee_name is required.' });
    }

    const result = await query(`
      INSERT INTO transfers (
        asset_id, transfer_type, transferee_name, transferee_id_no, beneficiary_id,
        share_details, consideration, instrument_date, completion_date, remarks, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `, [
      assetId, transfer_type || 'TRANSMISSION', transferee_name.trim(),
      transferee_id_no || null, beneficiary_id || null,
      share_details || null, consideration || null,
      instrument_date || null, completion_date || null,
      remarks || null, req.user.id
    ]);

    const transfer = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'transfers',
      entityId: transfer.id,
      action: 'CREATE',
      after: transfer,
      ipAddress: getClientIp(req)
    });

    await createWorkflowEvent({
      estateFileId: asset.rows[0].estate_file_id,
      assetId,
      transferId: transfer.id,
      eventType: 'NOTE',
      description: `Transfer created for ${transferee_name} on ${asset.rows[0].parcel_number || 'asset'} (${share_details || 'whole'})`,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ transfer });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:assetId/transfers — list transfers for asset
router.get('/assets/:assetId/transfers', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM transfers WHERE asset_id = $1 ORDER BY created_at',
      [req.params.assetId]
    );
    res.json({ transfers: result.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/transfers/:id — update transfer
router.patch('/:id', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const currentResult = await query(`
      SELECT t.*, a.estate_file_id, a.parcel_number
      FROM transfers t
      JOIN assets a ON t.asset_id = a.id
      WHERE t.id = $1
    `, [req.params.id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transfer not found.' });
    }
    const before = currentResult.rows[0];

    // Validate status transition
    if (req.body.transfer_status && req.body.transfer_status !== before.transfer_status) {
      if (!isValidTransition(TRANSFER_STATUS_TRANSITIONS, before.transfer_status, req.body.transfer_status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${before.transfer_status} to ${req.body.transfer_status}.`,
          allowed: TRANSFER_STATUS_TRANSITIONS[before.transfer_status]
        });
      }

      // Cannot complete without completion_date
      if (req.body.transfer_status === 'COMPLETED' && !req.body.completion_date && !before.completion_date) {
        return res.status(400).json({ error: 'completion_date is required to mark transfer as COMPLETED.' });
      }
    }

    const allowedFields = [
      'transfer_type', 'transferee_name', 'transferee_id_no', 'beneficiary_id',
      'share_details', 'consideration', 'instrument_date', 'completion_date',
      'transfer_status', 'remarks'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field] === '' ? null : req.body[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await query(
      `UPDATE transfers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    const after = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'transfers',
      entityId: req.params.id,
      action: 'UPDATE',
      before,
      after,
      ipAddress: getClientIp(req)
    });

    if (req.body.transfer_status && req.body.transfer_status !== before.transfer_status) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: before.asset_id,
        transferId: req.params.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.transfer_status,
        toStatus: req.body.transfer_status,
        description: `Transfer for ${before.transferee_name} on ${before.parcel_number || 'asset'}: ${before.transfer_status} → ${req.body.transfer_status}`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    res.json({ transfer: after });
  } catch (err) {
    next(err);
  }
});

// Global search for transfers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { search, status, from_date, to_date, page = 1, limit = 25 } = req.query;
    let sql = `
      SELECT t.*, a.parcel_number, a.estate_file_id, ef.file_number, ef.deceased_full_name
      FROM transfers t
      JOIN assets a ON t.asset_id = a.id
      JOIN estate_files ef ON a.estate_file_id = ef.id
      WHERE a.is_deleted = false AND ef.is_deleted = false
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (t.transferee_name ILIKE $${params.length} OR a.parcel_number ILIKE $${params.length} OR ef.file_number ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      sql += ` AND t.transfer_status = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      sql += ` AND t.created_at >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      sql += ` AND t.created_at <= $${params.length}::date + interval '1 day'`;
    }

    const countResult = await query(`SELECT COUNT(*) FROM (${sql}) q`, params);
    const total = parseInt(countResult.rows[0].count);

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    sql += ` ORDER BY t.created_at DESC LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      transfers: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), total_pages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
