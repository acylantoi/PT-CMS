const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, createWorkflowEvent, getClientIp } = require('../utils/audit');
const {
  CONVEYANCING_STATUS_TRANSITIONS,
  ESTATE_STATUS_TRANSITIONS,
  isValidTransition,
  checkConveyancingGate,
  checkMemoGate,
  checkSigningGate,
  checkFileClosureGate
} = require('../utils/statusTransitions');

const router = express.Router();

// GET /api/estate-files — list with search, filter, pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const {
      search, status, county, administration_type, officer_id,
      registry_office, from_date, to_date,
      page = 1, limit = 25, sort_by = 'updated_at', sort_order = 'DESC'
    } = req.query;

    let sql = `
      SELECT ef.*, u.full_name AS officer_name,
        (SELECT COUNT(*) FROM assets a WHERE a.estate_file_id = ef.id AND a.is_deleted = false) AS asset_count,
        (SELECT COUNT(*) FROM beneficiaries b WHERE b.estate_file_id = ef.id) AS beneficiary_count
      FROM estate_files ef
      LEFT JOIN users u ON ef.assigned_officer_id = u.id
      WHERE ef.is_deleted = false
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (ef.file_number ILIKE $${params.length} OR ef.deceased_full_name ILIKE $${params.length} OR ef.deceased_id_no ILIKE $${params.length})`;
    }
    if (status) {
      params.push(status);
      sql += ` AND ef.current_status = $${params.length}`;
    }
    if (county) {
      params.push(county);
      sql += ` AND ef.county = $${params.length}`;
    }
    if (administration_type) {
      params.push(administration_type);
      sql += ` AND ef.administration_type = $${params.length}`;
    }
    if (officer_id) {
      params.push(officer_id);
      sql += ` AND ef.assigned_officer_id = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      sql += ` AND ef.intake_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      sql += ` AND ef.intake_date <= $${params.length}`;
    }

    // Count
    const countResult = await query(
      `SELECT COUNT(*) FROM (${sql}) AS count_query`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Sort and paginate
    const validSorts = ['file_number', 'deceased_full_name', 'intake_date', 'updated_at', 'current_status', 'county'];
    const sortCol = validSorts.includes(sort_by) ? `ef.${sort_by}` : 'ef.updated_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit));
    sql += ` ORDER BY ${sortCol} ${sortDir} LIMIT $${params.length}`;
    params.push(offset);
    sql += ` OFFSET $${params.length}`;

    const result = await query(sql, params);

    res.json({
      estate_files: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/estate-files/:id — detail
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(`
      SELECT ef.*, u.full_name AS officer_name, cu.full_name AS created_by_name
      FROM estate_files ef
      LEFT JOIN users u ON ef.assigned_officer_id = u.id
      LEFT JOIN users cu ON ef.created_by = cu.id
      WHERE ef.id = $1 AND ef.is_deleted = false
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    // Get beneficiaries
    const beneficiaries = await query(
      'SELECT * FROM beneficiaries WHERE estate_file_id = $1 ORDER BY full_name',
      [req.params.id]
    );

    // Get assets
    const assets = await query(
      'SELECT * FROM assets WHERE estate_file_id = $1 AND is_deleted = false ORDER BY created_at',
      [req.params.id]
    );

    // Get documents
    const documents = await query(`
      SELECT d.*, u.full_name AS uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE d.estate_file_id = $1
      ORDER BY d.uploaded_at DESC
    `, [req.params.id]);

    // Get workflow events
    const events = await query(`
      SELECT we.*, u.full_name AS performed_by_name
      FROM workflow_events we
      LEFT JOIN users u ON we.performed_by = u.id
      WHERE we.estate_file_id = $1
      ORDER BY we.performed_at DESC
      LIMIT 50
    `, [req.params.id]);

    res.json({
      estate_file: result.rows[0],
      beneficiaries: beneficiaries.rows,
      assets: assets.rows,
      documents: documents.rows,
      workflow_events: events.rows
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/estate-files — create (conveyancing intake)
router.post('/', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const {
      file_number, deceased_full_name, deceased_id_no, date_of_death,
      county, sub_county, intake_date, administration_type,
      grant_reference, grant_date, confirmed_grant_date,
      estate_value_estimate, assigned_officer_id, notes,
      // Conveyancing fields
      conveyancing_received_date, administration_route,
      conveyancing_assigned_officer_id
    } = req.body;

    // Validation
    if (!file_number || !deceased_full_name || !administration_type) {
      return res.status(400).json({ error: 'file_number, deceased_full_name, and administration_type are required.' });
    }

    if (!['COURT', 'SUMMARY'].includes(administration_type)) {
      return res.status(400).json({ error: 'administration_type must be COURT or SUMMARY.' });
    }

    // Auto-set administration_route from administration_type if not provided
    const route = administration_route || (administration_type === 'COURT' ? 'COURT_GRANT' : 'SUMMARY_CERT');
    const receivedDate = conveyancing_received_date || new Date().toISOString().split('T')[0];

    const result = await query(`
      INSERT INTO estate_files (
        file_number, deceased_full_name, deceased_id_no, date_of_death,
        county, sub_county, intake_date, administration_type,
        grant_reference, grant_date, confirmed_grant_date,
        estate_value_estimate, assigned_officer_id, notes, created_by,
        conveyancing_received_date, administration_route,
        conveyancing_assigned_officer_id, conveyancing_status,
        current_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'RECEIVED_AT_CONVEYANCING','IN_CONVEYANCING')
      RETURNING *
    `, [
      file_number.trim(), deceased_full_name.trim(), deceased_id_no || null,
      date_of_death || null, county || null, sub_county || null,
      intake_date || new Date().toISOString().split('T')[0], administration_type,
      grant_reference || null, grant_date || null, confirmed_grant_date || null,
      estate_value_estimate || null, assigned_officer_id || null,
      notes || null, req.user.id,
      receivedDate, route,
      conveyancing_assigned_officer_id || assigned_officer_id || null
    ]);

    const estateFile = result.rows[0];

    // Audit
    await createAuditLog({
      actorId: req.user.id,
      entityType: 'estate_files',
      entityId: estateFile.id,
      action: 'CREATE',
      after: estateFile,
      ipAddress: getClientIp(req)
    });

    // Workflow event
    await createWorkflowEvent({
      estateFileId: estateFile.id,
      eventType: 'STATUS_CHANGE',
      toStatus: 'RECEIVED_AT_CONVEYANCING',
      description: `File received at Conveyancing Section for ${deceased_full_name}`,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ estate_file: estateFile });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/estate-files/:id — update (conveyancing workflow)
router.patch('/:id', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const estateId = req.params.id;

    // Get current state
    const currentResult = await query('SELECT * FROM estate_files WHERE id = $1 AND is_deleted = false', [estateId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }
    const before = currentResult.rows[0];

    // Clerk restrictions
    if (req.user.role === 'CLERK') {
      const restrictedFields = ['conveyancing_status', 'current_status', 'assigned_officer_id'];
      const attempted = Object.keys(req.body).filter(k => restrictedFields.includes(k));
      if (attempted.length > 0) {
        return res.status(403).json({ error: `Clerks cannot update: ${attempted.join(', ')}` });
      }
    }

    // Validate conveyancing status transition
    if (req.body.conveyancing_status && req.body.conveyancing_status !== before.conveyancing_status) {
      const newStatus = req.body.conveyancing_status;
      const currentStatus = before.conveyancing_status || 'RECEIVED_AT_CONVEYANCING';

      if (!isValidTransition(CONVEYANCING_STATUS_TRANSITIONS, currentStatus, newStatus)) {
        return res.status(400).json({
          error: `Invalid conveyancing status transition from ${currentStatus} to ${newStatus}.`,
          allowed: CONVEYANCING_STATUS_TRANSITIONS[currentStatus] || []
        });
      }

      // Gate check: cannot move to FORMS_IN_PROGRESS without passing checklist
      if (newStatus === 'FORMS_IN_PROGRESS') {
        // Merge pending body changes with current record for gate check
        const checkData = { ...before, ...req.body };
        const gateErrors = checkConveyancingGate(checkData);
        if (gateErrors.length > 0) {
          return res.status(400).json({
            error: 'Conveyancing gate check failed.',
            blockers: gateErrors
          });
        }
      }

      // Gate check: cannot move to MEMO_TO_HEAD unless both forms are prepared
      if (newStatus === 'MEMO_TO_HEAD') {
        const checkData = { ...before, ...req.body };
        const memoErrors = checkMemoGate(checkData);
        if (memoErrors.length > 0) {
          return res.status(400).json({
            error: 'Memo gate check failed.',
            blockers: memoErrors
          });
        }
      }

      // Gate check: cannot move from MEMO_TO_HEAD to DOCUMENTS_ISSUED unless signed & sealed
      if (newStatus === 'DOCUMENTS_ISSUED' && currentStatus === 'MEMO_TO_HEAD') {
        const checkData = { ...before, ...req.body };
        const signingErrors = checkSigningGate(checkData);
        if (signingErrors.length > 0) {
          return res.status(400).json({
            error: 'Signing gate check failed.',
            blockers: signingErrors
          });
        }
      }

      // Closure gate: cannot close file unless all parcels are closed
      if (newStatus === 'CLOSED') {
        const parcels = await query(
          "SELECT * FROM assets WHERE estate_file_id = $1 AND is_deleted = false",
          [estateId]
        );
        const closureErrors = checkFileClosureGate(parcels.rows);
        if (closureErrors.length > 0 && req.user.role !== 'ADMIN') {
          return res.status(400).json({
            error: 'File closure gate failed.',
            blockers: closureErrors
          });
        }
      }
    }

    // Legacy current_status validation (backward compat)
    if (req.body.current_status && req.body.current_status !== before.current_status) {
      if (!isValidTransition(ESTATE_STATUS_TRANSITIONS, before.current_status, req.body.current_status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${before.current_status} to ${req.body.current_status}.`,
          allowed: ESTATE_STATUS_TRANSITIONS[before.current_status]
        });
      }
    }

    const allowedFields = [
      'deceased_full_name', 'deceased_id_no', 'date_of_death', 'county', 'sub_county',
      'administration_type', 'grant_reference', 'grant_date', 'confirmed_grant_date',
      'estate_value_estimate', 'assigned_officer_id', 'current_status', 'notes',
      // Conveyancing fields
      'conveyancing_status', 'conveyancing_received_date', 'administration_route',
      'conveyancing_assigned_officer_id',
      'certified_copy_grant_present', 'certified_copy_summary_cert_present',
      'fees_paid_status', 'payment_reference', 'payment_date',
      'lr39_prepared', 'lr39_prepared_date', 'lr39_prepared_by',
      'lr39_signed_sealed', 'lr39_signed_sealed_date', 'lr39_signed_sealed_by',
      'lr42_prepared', 'lr42_prepared_date', 'lr42_prepared_by',
      'lr42_signed_sealed', 'lr42_signed_sealed_date', 'lr42_signed_sealed_by',
      // Memo to Head of Section fields
      'memo_to_head_date', 'memo_to_head_reference', 'memo_to_head_by', 'memo_to_head_notes'
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
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    updates.push('updated_at = NOW()');
    params.push(estateId);

    const result = await query(
      `UPDATE estate_files SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );

    const after = result.rows[0];

    // Audit
    await createAuditLog({
      actorId: req.user.id,
      entityType: 'estate_files',
      entityId: estateId,
      action: 'UPDATE',
      before,
      after,
      ipAddress: getClientIp(req)
    });

    // Workflow event for conveyancing status change
    if (req.body.conveyancing_status && req.body.conveyancing_status !== before.conveyancing_status) {
      await createWorkflowEvent({
        estateFileId: estateId,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.conveyancing_status,
        toStatus: req.body.conveyancing_status,
        description: `Conveyancing status: ${before.conveyancing_status} → ${req.body.conveyancing_status}`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    // Workflow event for checklist changes
    const checklistFields = [
      'certified_copy_grant_present', 'certified_copy_summary_cert_present',
      'fees_paid_status', 'lr39_prepared', 'lr42_prepared',
      'lr39_signed_sealed', 'lr42_signed_sealed',
      'memo_to_head_reference'
    ];
    for (const field of checklistFields) {
      if (req.body[field] !== undefined && req.body[field] !== before[field]) {
        await createWorkflowEvent({
          estateFileId: estateId,
          eventType: 'NOTE',
          description: `Checklist: ${field.replace(/_/g, ' ')} updated to ${req.body[field]}`,
          performedBy: req.user.id,
          ipAddress: getClientIp(req)
        });
      }
    }

    res.json({ estate_file: after });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/estate-files/:id — soft delete (Admin/Officer)
router.delete('/:id', authenticate, authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  try {
    const result = await query(
      "UPDATE estate_files SET is_deleted = true, updated_at = NOW() WHERE id = $1 AND is_deleted = false RETURNING id, file_number",
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'estate_files',
      entityId: req.params.id,
      action: 'DELETE',
      before: result.rows[0],
      ipAddress: getClientIp(req)
    });

    await createWorkflowEvent({
      estateFileId: req.params.id,
      eventType: 'OTHER',
      description: `Estate file ${result.rows[0].file_number} soft-deleted`,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Estate file deleted.', id: req.params.id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
