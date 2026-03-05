const express = require('express');
const ExcelJS = require('exceljs');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { createAuditLog, getClientIp } = require('../utils/audit');

const router = express.Router();

// GET /api/reports/transfers — all transfers report
router.get('/transfers', authenticate, async (req, res, next) => {
  try {
    const { from, to, officer_id, county, registry_office, status, format = 'json' } = req.query;

    let sql = `
      SELECT 
        t.id AS transfer_id,
        ef.file_number,
        ef.deceased_full_name,
        ef.administration_type,
        ef.county AS estate_county,
        u.full_name AS officer_name,
        a.parcel_number,
        a.registry_office,
        a.county AS asset_county,
        a.asset_type,
        a.asset_status,
        t.transferee_name,
        t.transferee_id_no,
        t.transfer_type,
        t.share_details,
        t.transfer_status,
        t.instrument_date,
        t.completion_date,
        t.created_at AS transfer_created
      FROM transfers t
      JOIN assets a ON t.asset_id = a.id
      JOIN estate_files ef ON a.estate_file_id = ef.id
      LEFT JOIN users u ON ef.assigned_officer_id = u.id
      WHERE a.is_deleted = false AND ef.is_deleted = false
    `;
    const params = [];

    if (from) {
      params.push(from);
      sql += ` AND t.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND t.created_at <= $${params.length}::date + interval '1 day'`;
    }
    if (officer_id) {
      params.push(officer_id);
      sql += ` AND ef.assigned_officer_id = $${params.length}`;
    }
    if (county) {
      params.push(county);
      sql += ` AND (ef.county = $${params.length} OR a.county = $${params.length})`;
    }
    if (registry_office) {
      params.push(registry_office);
      sql += ` AND a.registry_office = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND t.transfer_status = $${params.length}`;
    }

    sql += ' ORDER BY t.created_at DESC';

    const result = await query(sql, params);

    // Audit the export
    if (format === 'csv' || format === 'excel') {
      await createAuditLog({
        actorId: req.user.id,
        entityType: 'reports',
        entityId: null,
        action: 'EXPORT',
        after: { report: 'transfers', format, filters: req.query, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
    }

    if (format === 'csv') {
      return sendCsv(res, result.rows, 'transfers_report');
    }

    if (format === 'excel') {
      return sendExcel(res, result.rows, 'Transfers Report');
    }

    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/summary — administration type summary
router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const { from, to } = req.query;
    let sql = `
      SELECT 
        ef.administration_type,
        ef.current_status,
        COUNT(*) as count
      FROM estate_files ef
      WHERE ef.is_deleted = false
    `;
    const params = [];

    if (from) {
      params.push(from);
      sql += ` AND ef.intake_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND ef.intake_date <= $${params.length}`;
    }

    sql += ' GROUP BY ef.administration_type, ef.current_status ORDER BY ef.administration_type, ef.current_status';

    const result = await query(sql, params);
    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/by-officer — transfers grouped by officer
router.get('/by-officer', authenticate, async (req, res, next) => {
  try {
    const { from, to, format = 'json' } = req.query;
    let sql = `
      SELECT 
        u.full_name AS officer_name,
        COUNT(DISTINCT ef.id) AS estate_count,
        COUNT(DISTINCT a.id) AS asset_count,
        COUNT(t.id) AS transfer_count,
        COUNT(CASE WHEN t.transfer_status = 'COMPLETED' THEN 1 END) AS completed_transfers
      FROM users u
      LEFT JOIN estate_files ef ON ef.assigned_officer_id = u.id AND ef.is_deleted = false
      LEFT JOIN assets a ON a.estate_file_id = ef.id AND a.is_deleted = false
      LEFT JOIN transfers t ON t.asset_id = a.id
      WHERE u.role IN ('OFFICER', 'ADMIN')
    `;
    const params = [];

    if (from) {
      params.push(from);
      sql += ` AND (ef.intake_date >= $${params.length} OR ef.intake_date IS NULL)`;
    }
    if (to) {
      params.push(to);
      sql += ` AND (ef.intake_date <= $${params.length} OR ef.intake_date IS NULL)`;
    }

    sql += ' GROUP BY u.id, u.full_name ORDER BY u.full_name';

    const result = await query(sql, params);

    if (format === 'csv') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'by-officer', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendCsv(res, result.rows, 'officer_report');
    }
    if (format === 'excel') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'by-officer', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendExcel(res, result.rows, 'Officer Report');
    }

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/by-county — transfers grouped by county/registry
router.get('/by-county', authenticate, async (req, res, next) => {
  try {
    const { from, to, format = 'json' } = req.query;
    let sql = `
      SELECT 
        COALESCE(a.county, ef.county) AS county,
        a.registry_office,
        COUNT(DISTINCT ef.id) AS estate_count,
        COUNT(DISTINCT a.id) AS asset_count,
        COUNT(t.id) AS transfer_count,
        COUNT(CASE WHEN t.transfer_status = 'COMPLETED' THEN 1 END) AS completed_transfers
      FROM assets a
      JOIN estate_files ef ON a.estate_file_id = ef.id
      LEFT JOIN transfers t ON t.asset_id = a.id
      WHERE a.is_deleted = false AND ef.is_deleted = false
    `;
    const params = [];

    if (from) {
      params.push(from);
      sql += ` AND ef.intake_date >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND ef.intake_date <= $${params.length}`;
    }

    sql += ' GROUP BY county, a.registry_office ORDER BY county, a.registry_office';

    const result = await query(sql, params);

    if (format === 'csv') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'by-county', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendCsv(res, result.rows, 'county_report');
    }
    if (format === 'excel') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'by-county', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendExcel(res, result.rows, 'County Report');
    }

    res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/asset-summary — all assets grouped by type
router.get('/asset-summary', authenticate, async (req, res, next) => {
  try {
    const { from, to, format = 'json' } = req.query;
    let sql = `
      SELECT 
        ef.file_number,
        ef.deceased_full_name,
        a.asset_type,
        COALESCE(a.parcel_number, a.vehicle_reg_number, a.company_name, a.ufaa_reference_number, a.asset_description, a.asset_type::text) AS identifier,
        COALESCE(a.parcel_status, a.generic_status, a.asset_status::text) AS status,
        a.estimated_value,
        a.transferee_name,
        u.full_name AS officer_name,
        a.created_at
      FROM assets a
      JOIN estate_files ef ON a.estate_file_id = ef.id
      LEFT JOIN users u ON ef.assigned_officer_id = u.id
      WHERE a.is_deleted = false AND ef.is_deleted = false
    `;
    const params = [];

    if (from) {
      params.push(from);
      sql += ` AND a.created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      sql += ` AND a.created_at <= $${params.length}::date + interval '1 day'`;
    }

    sql += ' ORDER BY a.asset_type, a.created_at DESC';

    const result = await query(sql, params);

    if (format === 'csv') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'asset-summary', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendCsv(res, result.rows, 'asset_summary_report');
    }
    if (format === 'excel') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'asset-summary', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendExcel(res, result.rows, 'Asset Summary Report');
    }

    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/parcel-transferee — parcel to transferee mapping
router.get('/parcel-transferee', authenticate, async (req, res, next) => {
  try {
    const { search, format = 'json' } = req.query;
    let sql = `
      SELECT 
        a.parcel_number,
        a.registry_office,
        a.county,
        ef.file_number,
        ef.deceased_full_name,
        t.transferee_name,
        t.transferee_id_no,
        t.share_details,
        t.transfer_status,
        t.completion_date
      FROM transfers t
      JOIN assets a ON t.asset_id = a.id
      JOIN estate_files ef ON a.estate_file_id = ef.id
      WHERE a.is_deleted = false AND ef.is_deleted = false
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (a.parcel_number ILIKE $${params.length} OR t.transferee_name ILIKE $${params.length})`;
    }

    sql += ' ORDER BY a.parcel_number, t.transferee_name';
    const result = await query(sql, params);

    if (format === 'csv') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'parcel-transferee', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendCsv(res, result.rows, 'parcel_transferee_report');
    }
    if (format === 'excel') {
      await createAuditLog({
        actorId: req.user.id, entityType: 'reports', entityId: null,
        action: 'EXPORT', after: { report: 'parcel-transferee', format, row_count: result.rows.length },
        ipAddress: getClientIp(req)
      });
      return sendExcel(res, result.rows, 'Parcel Transferee Report');
    }

    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    next(err);
  }
});

// ─── Helper: Send CSV ───
function sendCsv(res, data, filename) {
  if (data.length === 0) {
    return res.status(200).send('No data');
  }

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
      return `"${val.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}_${new Date().toISOString().split('T')[0]}.csv"`);
  res.send(csvRows.join('\n'));
}

// ─── Helper: Send Excel ───
async function sendExcel(res, data, sheetName) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    sheet.addRow(headers);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const row of data) {
      sheet.addRow(headers.map(h => row[h]));
    }

    // Auto width
    sheet.columns.forEach(col => {
      let maxLen = 10;
      col.eachCell({ includeEmpty: true }, cell => {
        const len = cell.value ? String(cell.value).length : 0;
        maxLen = Math.max(maxLen, len);
      });
      col.width = Math.min(maxLen + 2, 40);
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${sheetName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
}

module.exports = router;
