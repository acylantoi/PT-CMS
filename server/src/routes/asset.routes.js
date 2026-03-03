const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, createWorkflowEvent, getClientIp } = require('../utils/audit');
const { ASSET_STATUS_TRANSITIONS, isValidTransition } = require('../utils/statusTransitions');

const router = express.Router();

// POST /api/estate-files/:estateFileId/assets — add asset
router.post('/estate-files/:estateFileId/assets', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const { estateFileId } = req.params;
    const {
      asset_type, parcel_number, registry_office, county,
      land_size, title_type, encumbrance_flag, encumbrance_notes
    } = req.body;

    // Verify estate file
    const estate = await query('SELECT id, file_number FROM estate_files WHERE id = $1 AND is_deleted = false', [estateFileId]);
    if (estate.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    // Validate: parcel_number required if LAND_PARCEL
    const type = asset_type || 'LAND_PARCEL';
    if (type === 'LAND_PARCEL' && !parcel_number) {
      return res.status(400).json({ error: 'parcel_number is required for LAND_PARCEL asset type.' });
    }

    const result = await query(`
      INSERT INTO assets (estate_file_id, asset_type, parcel_number, registry_office, county, land_size, title_type, encumbrance_flag, encumbrance_notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [estateFileId, type, parcel_number || null, registry_office || null, county || null,
        land_size || null, title_type || null, encumbrance_flag || false, encumbrance_notes || null]);

    const asset = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'assets',
      entityId: asset.id,
      action: 'CREATE',
      after: asset,
      ipAddress: getClientIp(req)
    });

    await createWorkflowEvent({
      estateFileId,
      assetId: asset.id,
      eventType: 'NOTE',
      description: `Asset ${parcel_number || type} added to estate file ${estate.rows[0].file_number}`,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
});

// GET /api/estate-files/:estateFileId/assets — list assets for estate
router.get('/estate-files/:estateFileId/assets', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM assets WHERE estate_file_id = $1 AND is_deleted = false ORDER BY created_at',
      [req.params.estateFileId]
    );
    res.json({ assets: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/assets/:id — asset detail with transfers
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const assetResult = await query(`
      SELECT a.*, ef.file_number, ef.deceased_full_name
      FROM assets a
      JOIN estate_files ef ON a.estate_file_id = ef.id
      WHERE a.id = $1 AND a.is_deleted = false
    `, [req.params.id]);

    if (assetResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    const transfers = await query(
      'SELECT * FROM transfers WHERE asset_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    const events = await query(`
      SELECT we.*, u.full_name AS performed_by_name
      FROM workflow_events we
      LEFT JOIN users u ON we.performed_by = u.id
      WHERE we.asset_id = $1
      ORDER BY we.performed_at DESC
    `, [req.params.id]);

    res.json({
      asset: assetResult.rows[0],
      transfers: transfers.rows,
      workflow_events: events.rows
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/assets/:id — update asset
router.patch('/:id', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const currentResult = await query('SELECT * FROM assets WHERE id = $1 AND is_deleted = false', [req.params.id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const before = currentResult.rows[0];

    // Validate status transition
    if (req.body.asset_status && req.body.asset_status !== before.asset_status) {
      if (!isValidTransition(ASSET_STATUS_TRANSITIONS, before.asset_status, req.body.asset_status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${before.asset_status} to ${req.body.asset_status}.`,
          allowed: ASSET_STATUS_TRANSITIONS[before.asset_status]
        });
      }
    }

    const allowedFields = [
      'asset_type', 'parcel_number', 'registry_office', 'county',
      'land_size', 'title_type', 'encumbrance_flag', 'encumbrance_notes', 'asset_status'
    ];

    const updates = [];
    const params = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        params.push(req.body[field]);
        updates.push(`${field} = $${params.length}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);

    const result = await query(
      `UPDATE assets SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    const after = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'assets',
      entityId: req.params.id,
      action: 'UPDATE',
      before,
      after,
      ipAddress: getClientIp(req)
    });

    if (req.body.asset_status && req.body.asset_status !== before.asset_status) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.asset_status,
        toStatus: req.body.asset_status,
        description: `Asset ${before.parcel_number || before.asset_type} status changed from ${before.asset_status} to ${req.body.asset_status}`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    res.json({ asset: after });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/assets/:id — soft delete
router.delete('/:id', authenticate, authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE assets SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING *",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'assets',
      entityId: req.params.id,
      action: 'DELETE',
      before: result.rows[0],
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Asset deleted.', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
