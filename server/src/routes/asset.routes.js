const express = require('express');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, createWorkflowEvent, getClientIp } = require('../utils/audit');
const {
  PARCEL_STATUS_TRANSITIONS,
  ASSET_STATUS_TRANSITIONS,
  GENERIC_ASSET_STATUS_TRANSITIONS,
  isValidTransition,
  checkParcelClosureGate,
  checkGenericAssetCompletionGate
} = require('../utils/statusTransitions');

const router = express.Router();

// POST /api/estate-files/:estateFileId/assets — add asset
router.post('/estate-files/:estateFileId/assets', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const { estateFileId } = req.params;
    const b = req.body;

    // Verify estate file
    const estate = await query('SELECT id, file_number FROM estate_files WHERE id = $1 AND is_deleted = false', [estateFileId]);
    if (estate.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    const VALID_TYPES = ['LAND_PARCEL', 'LAND_COMPANY', 'SHARES_CDSC', 'SHARES_CERTIFICATE', 'MOTOR_VEHICLE', 'UFAA_CLAIM', 'DISCHARGE_OF_CHARGE', 'OTHER'];
    const type = b.asset_type || 'LAND_PARCEL';
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Invalid asset_type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }

    // Validate required fields per type
    if (type === 'LAND_PARCEL' && !b.parcel_number) {
      return res.status(400).json({ error: 'parcel_number is required for LAND_PARCEL.' });
    }
    if (type === 'MOTOR_VEHICLE' && !b.vehicle_reg_number) {
      return res.status(400).json({ error: 'vehicle_reg_number is required for MOTOR_VEHICLE.' });
    }

    // Build a dynamic insert — all possible columns
    const assetFields = {
      estate_file_id: estateFileId,
      asset_type: type,
      // Common
      asset_description: b.asset_description || null,
      estimated_value: b.estimated_value || null,
      transferee_name: b.transferee_name || null,
      notes: b.notes || null,
      // Land Parcel
      parcel_number: b.parcel_number || null,
      registry_office: b.registry_office || null,
      county: b.county || null,
      land_size: b.land_size || null,
      title_type: b.title_type || null,
      encumbrance_flag: b.encumbrance_flag || false,
      encumbrance_notes: b.encumbrance_notes || null,
      // Land Company
      company_name: b.company_name || null,
      company_reg_number: b.company_reg_number || null,
      share_certificate_number: b.share_certificate_number || null,
      plot_allocation: b.plot_allocation || null,
      number_of_shares: b.number_of_shares || null,
      // Shares (CDSC & Certificate)
      cdsc_account_number: b.cdsc_account_number || null,
      // Motor Vehicle
      vehicle_reg_number: b.vehicle_reg_number || null,
      chassis_number: b.chassis_number || null,
      vehicle_make_model: b.vehicle_make_model || null,
      // UFAA
      ufaa_reference_number: b.ufaa_reference_number || null,
      financial_institution: b.financial_institution || null,
      amount_claimed: b.amount_claimed || null,
      // Discharge of Charge
      lending_institution: b.lending_institution || null,
      loan_reference_number: b.loan_reference_number || null,
      property_parcel_number: b.property_parcel_number || null,
    };

    // Set initial status based on asset type
    if (type === 'LAND_PARCEL' || type === 'LAND_COMPANY') {
      assetFields.parcel_status = 'PARCEL_CAPTURED';
    } else {
      assetFields.generic_status = 'NOT_STARTED';
    }

    const cols = Object.keys(assetFields);
    const vals = Object.values(assetFields);
    const placeholders = cols.map((_, i) => `$${i + 1}`);

    const result = await query(
      `INSERT INTO assets (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      vals
    );

    const asset = result.rows[0];
    const label = b.parcel_number || b.vehicle_reg_number || b.company_name || b.ufaa_reference_number || type;

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
      description: `Asset added: ${label} (${type.replace(/_/g, ' ')}) to file ${estate.rows[0].file_number}`,
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

// PATCH /api/assets/:id — update asset (conveyancing parcel workflow)
router.patch('/:id', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), async (req, res, next) => {
  try {
    const currentResult = await query('SELECT * FROM assets WHERE id = $1 AND is_deleted = false', [req.params.id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Asset not found.' });
    }
    const before = currentResult.rows[0];

    // Validate parcel status transition (LAND_PARCEL / LAND_COMPANY)
    if (req.body.parcel_status && req.body.parcel_status !== before.parcel_status) {
      if (!isValidTransition(PARCEL_STATUS_TRANSITIONS, before.parcel_status, req.body.parcel_status)) {
        return res.status(400).json({
          error: `Invalid parcel status transition from ${before.parcel_status} to ${req.body.parcel_status}.`,
          allowed: PARCEL_STATUS_TRANSITIONS[before.parcel_status]
        });
      }

      // Closure gate: must have proof or admin override
      if (req.body.parcel_status === 'CLOSED') {
        const checkData = { ...before, ...req.body };
        const closureErrors = checkParcelClosureGate(checkData);
        if (closureErrors.length > 0 && req.user.role !== 'ADMIN') {
          return res.status(400).json({
            error: 'Parcel closure gate failed.',
            blockers: closureErrors
          });
        }
      }
    }

    // Validate generic_status transition (non-land asset types)
    if (req.body.generic_status && req.body.generic_status !== before.generic_status) {
      if (!isValidTransition(GENERIC_ASSET_STATUS_TRANSITIONS, before.generic_status, req.body.generic_status)) {
        return res.status(400).json({
          error: `Invalid generic status transition from ${before.generic_status} to ${req.body.generic_status}.`,
          allowed: GENERIC_ASSET_STATUS_TRANSITIONS[before.generic_status]
        });
      }

      // Completion gate for non-land assets
      if (req.body.generic_status === 'COMPLETED') {
        const checkData = { ...before, ...req.body };
        const completionErrors = checkGenericAssetCompletionGate(checkData);
        if (completionErrors.length > 0 && req.user.role !== 'ADMIN') {
          return res.status(400).json({
            error: 'Asset completion gate failed.',
            blockers: completionErrors
          });
        }
      }
    }

    // Legacy asset_status validation
    if (req.body.asset_status && req.body.asset_status !== before.asset_status) {
      if (!isValidTransition(ASSET_STATUS_TRANSITIONS, before.asset_status, req.body.asset_status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${before.asset_status} to ${req.body.asset_status}.`,
          allowed: ASSET_STATUS_TRANSITIONS[before.asset_status]
        });
      }
    }

    const allowedFields = [
      'asset_type', 'asset_description', 'estimated_value', 'transferee_name', 'notes',
      // Land Parcel fields
      'parcel_number', 'registry_office', 'county',
      'land_size', 'title_type', 'encumbrance_flag', 'encumbrance_notes',
      'asset_status', 'parcel_status',
      'transfer_rate_amount', 'transfer_rate_currency', 'transfer_rate_notes',
      'docs_issued_to_client', 'issue_date', 'issued_by_user_id', 'issue_notes',
      'proof_of_registration_received', 'proof_received_date',
      'closure_override', 'closure_override_reason',
      // Land Company fields
      'company_name', 'company_reg_number', 'share_certificate_number',
      'plot_allocation', 'number_of_shares',
      'proof_share_transfer_received',
      // Shares fields (CDSC / Certificate)
      'cdsc_account_number',
      'cds7_prepared', 'cds7_prepared_date',
      'cds2_prepared', 'cds2_prepared_date',
      'sale_transfer_prepared', 'sale_transfer_prepared_date',
      'discharge_indemnity_prepared', 'discharge_indemnity_prepared_date',
      'shares_completion_date',
      // Motor Vehicle fields
      'vehicle_reg_number', 'chassis_number', 'vehicle_make_model',
      'form_c_prepared', 'form_c_prepared_date',
      'signed_sealed', 'signed_sealed_date',
      'logbook_transfer_confirmed', 'logbook_transfer_date',
      // UFAA fields
      'ufaa_reference_number', 'financial_institution', 'amount_claimed',
      'form_4b_prepared', 'form_4b_prepared_date',
      'form_5_prepared', 'form_5_prepared_date',
      'claimant_account_details_captured',
      'proof_funds_received_by_pt', 'payment_date_to_pt',
      'transmission_to_beneficiary_status',
      // Discharge of Charge fields
      'lending_institution', 'loan_reference_number', 'property_parcel_number',
      'discharge_document_prepared', 'discharge_document_prepared_date',
      'discharge_registered', 'discharge_date',
      // Generic status for non-land assets
      'generic_status'
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

    // Workflow event for parcel status change
    if (req.body.parcel_status && req.body.parcel_status !== before.parcel_status) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.parcel_status,
        toStatus: req.body.parcel_status,
        description: `Parcel ${before.parcel_number || before.asset_type}: ${before.parcel_status} → ${req.body.parcel_status}`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    // Workflow event for issuance
    if (req.body.docs_issued_to_client && !before.docs_issued_to_client) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'NOTE',
        description: `Documents issued for parcel ${before.parcel_number}. ${req.body.issue_notes || ''}`.trim(),
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    // Workflow event for proof received
    if (req.body.proof_of_registration_received && !before.proof_of_registration_received) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'NOTE',
        description: `Proof of registration received for parcel ${before.parcel_number}.`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    // Workflow event for legacy asset_status change
    if (req.body.asset_status && req.body.asset_status !== before.asset_status) {
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.asset_status,
        toStatus: req.body.asset_status,
        description: `Asset ${before.parcel_number || before.vehicle_reg_number || before.company_name || before.asset_type} status changed from ${before.asset_status} to ${req.body.asset_status}`,
        performedBy: req.user.id,
        ipAddress: getClientIp(req)
      });
    }

    // Workflow event for generic_status change (non-land assets)
    if (req.body.generic_status && req.body.generic_status !== before.generic_status) {
      const label = before.vehicle_reg_number || before.company_name || before.ufaa_reference_number || before.asset_description || before.asset_type;
      await createWorkflowEvent({
        estateFileId: before.estate_file_id,
        assetId: req.params.id,
        eventType: 'STATUS_CHANGE',
        fromStatus: before.generic_status,
        toStatus: req.body.generic_status,
        description: `${before.asset_type.replace(/_/g, ' ')} "${label}": ${before.generic_status} → ${req.body.generic_status}`,
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
