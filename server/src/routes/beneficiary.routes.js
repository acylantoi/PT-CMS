const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, getClientIp } = require('../utils/audit');

const router = express.Router();

// POST /api/estate-files/:estateFileId/beneficiaries — add beneficiary
router.post('/estate-files/:estateFileId/beneficiaries', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const { estateFileId } = req.params;
    const { full_name, id_no, relationship_to_deceased, phone, address, is_transferee } = req.body;

    if (!full_name) {
      return res.status(400).json({ error: 'full_name is required.' });
    }

    // Verify estate file exists
    const estate = await query('SELECT id FROM estate_files WHERE id = $1 AND is_deleted = false', [estateFileId]);
    if (estate.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    const result = await query(`
      INSERT INTO beneficiaries (estate_file_id, full_name, id_no, relationship_to_deceased, phone, address, is_transferee)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [estateFileId, full_name.trim(), id_no || null, relationship_to_deceased || null, phone || null, address || null, is_transferee !== false]);

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'beneficiaries',
      entityId: result.rows[0].id,
      action: 'CREATE',
      after: result.rows[0],
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ beneficiary: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// GET /api/estate-files/:estateFileId/beneficiaries — list beneficiaries
router.get('/estate-files/:estateFileId/beneficiaries', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM beneficiaries WHERE estate_file_id = $1 ORDER BY full_name',
      [req.params.estateFileId]
    );
    res.json({ beneficiaries: result.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/beneficiaries/:id — update beneficiary
router.patch('/:id', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const currentResult = await query('SELECT * FROM beneficiaries WHERE id = $1', [req.params.id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }
    const before = currentResult.rows[0];

    const allowedFields = ['full_name', 'id_no', 'relationship_to_deceased', 'phone', 'address', 'is_transferee'];
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
      `UPDATE beneficiaries SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'beneficiaries',
      entityId: req.params.id,
      action: 'UPDATE',
      before,
      after: result.rows[0],
      ipAddress: getClientIp(req)
    });

    res.json({ beneficiary: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/beneficiaries/:id
router.delete('/:id', authenticate, authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const result = await query('DELETE FROM beneficiaries WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beneficiary not found.' });
    }

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'beneficiaries',
      entityId: req.params.id,
      action: 'DELETE',
      before: result.rows[0],
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Beneficiary deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
