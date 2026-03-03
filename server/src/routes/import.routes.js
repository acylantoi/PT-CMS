const express = require('express');
const { query, pool } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, getClientIp } = require('../utils/audit');

const router = express.Router();

// POST /api/import/csv — bulk import historical records
router.post('/csv', authenticate, authorize('ADMIN', 'OFFICER'), async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { records } = req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'records array is required.' });
    }

    await client.query('BEGIN');

    const results = { imported: 0, skipped: 0, errors: [] };

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const rowNum = i + 1;

      // Validate required fields
      if (!r.file_number || !r.deceased_full_name) {
        results.errors.push({ row: rowNum, error: 'Missing file_number or deceased_full_name' });
        results.skipped++;
        continue;
      }

      // Check for duplicate file_number
      const existing = await client.query('SELECT id FROM estate_files WHERE file_number = $1', [r.file_number.trim()]);
      if (existing.rows.length > 0) {
        results.errors.push({ row: rowNum, error: `Duplicate file_number: ${r.file_number}` });
        results.skipped++;
        continue;
      }

      // Validate administration_type
      const adminType = (r.administration_type || 'COURT').toUpperCase();
      if (!['COURT', 'SUMMARY'].includes(adminType)) {
        results.errors.push({ row: rowNum, error: `Invalid administration_type: ${r.administration_type}` });
        results.skipped++;
        continue;
      }

      // Look up officer by name
      let officerId = null;
      if (r.officer_name) {
        const officerResult = await client.query(
          "SELECT id FROM users WHERE full_name ILIKE $1 AND role IN ('OFFICER','ADMIN') LIMIT 1",
          [`%${r.officer_name.trim()}%`]
        );
        if (officerResult.rows.length > 0) {
          officerId = officerResult.rows[0].id;
        }
      }

      // Insert estate file
      const estateResult = await client.query(`
        INSERT INTO estate_files (
          file_number, deceased_full_name, administration_type, grant_reference, grant_date,
          county, assigned_officer_id, current_status, is_imported, created_by, intake_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10)
        RETURNING id
      `, [
        r.file_number.trim(),
        r.deceased_full_name.trim(),
        adminType,
        r.grant_reference || null,
        r.grant_date || null,
        r.county || null,
        officerId,
        r.completion_date ? 'COMPLETED' : 'INTAKE',
        req.user.id,
        r.intake_date || new Date().toISOString().split('T')[0]
      ]);

      const estateId = estateResult.rows[0].id;

      // If parcel_number provided, create asset
      if (r.parcel_number) {
        const assetResult = await client.query(`
          INSERT INTO assets (estate_file_id, asset_type, parcel_number, registry_office, county, asset_status)
          VALUES ($1, 'LAND_PARCEL', $2, $3, $4, $5)
          RETURNING id
        `, [
          estateId,
          r.parcel_number.trim(),
          r.registry_office || null,
          r.county || null,
          r.completion_date ? 'COMPLETED' : 'PENDING'
        ]);

        // If transferee provided, create transfer
        if (r.transferee_name) {
          await client.query(`
            INSERT INTO transfers (asset_id, transfer_type, transferee_name, transferee_id_no, completion_date, transfer_status, created_by)
            VALUES ($1, 'TRANSMISSION', $2, $3, $4, $5, $6)
          `, [
            assetResult.rows[0].id,
            r.transferee_name.trim(),
            r.transferee_id_no || null,
            r.completion_date || null,
            r.completion_date ? 'COMPLETED' : 'DRAFT',
            req.user.id
          ]);
        }
      }

      results.imported++;
    }

    await client.query('COMMIT');

    // Audit the import
    await createAuditLog({
      actorId: req.user.id,
      entityType: 'import',
      entityId: null,
      action: 'CREATE',
      after: { total: records.length, imported: results.imported, skipped: results.skipped },
      ipAddress: getClientIp(req)
    });

    res.json({
      message: `Import complete. ${results.imported} imported, ${results.skipped} skipped.`,
      ...results
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/import/template — return CSV template headers
router.get('/template', authenticate, (req, res) => {
  const headers = [
    'file_number', 'deceased_full_name', 'administration_type', 'grant_reference',
    'grant_date', 'county', 'intake_date', 'parcel_number', 'registry_office',
    'transferee_name', 'transferee_id_no', 'completion_date', 'officer_name'
  ];
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="pt_cms_import_template.csv"');
  res.send(headers.join(',') + '\n');
});

module.exports = router;
