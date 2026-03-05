const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, createWorkflowEvent, getClientIp } = require('../utils/audit');

const router = express.Router();

// Configure multer storage — use /tmp on Vercel (read-only filesystem)
const uploadDir = process.env.NODE_ENV === 'production'
  ? '/tmp/uploads'
  : (process.env.UPLOAD_DIR || './uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not create upload dir:', e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dateDir = new Date().toISOString().split('T')[0];
    const dir = path.join(uploadDir, dateDir);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.tif', '.tiff'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${ext} not allowed. Allowed: ${allowed.join(', ')}`));
    }
  }
});

// POST /api/documents/upload
router.post('/upload', authenticate, authorize('ADMIN', 'OFFICER', 'CLERK'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { estate_file_id, asset_id, transfer_id, doc_type } = req.body;

    if (!estate_file_id) {
      return res.status(400).json({ error: 'estate_file_id is required.' });
    }

    // Verify estate file exists
    const estate = await query('SELECT id, file_number FROM estate_files WHERE id = $1 AND is_deleted = false', [estate_file_id]);
    if (estate.rows.length === 0) {
      return res.status(404).json({ error: 'Estate file not found.' });
    }

    const storageKey = req.file.path.replace(uploadDir, '').replace(/^\//, '');

    const result = await query(`
      INSERT INTO documents (estate_file_id, asset_id, transfer_id, doc_type, file_name, storage_key, file_size, mime_type, uploaded_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      estate_file_id, asset_id || null, transfer_id || null,
      doc_type || 'OTHER', req.file.originalname, storageKey,
      req.file.size, req.file.mimetype, req.user.id
    ]);

    const doc = result.rows[0];

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'documents',
      entityId: doc.id,
      action: 'CREATE',
      after: { file_name: doc.file_name, doc_type: doc.doc_type },
      ipAddress: getClientIp(req)
    });

    await createWorkflowEvent({
      estateFileId: estate_file_id,
      assetId: asset_id || null,
      transferId: transfer_id || null,
      eventType: 'DOCUMENT_UPLOADED',
      description: `Document uploaded: ${req.file.originalname} (${doc_type || 'OTHER'})`,
      performedBy: req.user.id,
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ document: doc });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/download
router.get('/:id/download', authenticate, async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM documents WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const doc = result.rows[0];
    const filePath = path.join(uploadDir, doc.storage_key);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server.' });
    }

    res.download(filePath, doc.file_name);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents — list documents (optionally by estate_file_id)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { estate_file_id } = req.query;
    let sql = `
      SELECT d.*, u.full_name AS uploaded_by_name
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (estate_file_id) {
      params.push(estate_file_id);
      sql += ` AND d.estate_file_id = $${params.length}`;
    }

    sql += ' ORDER BY d.uploaded_at DESC';
    const result = await query(sql, params);
    res.json({ documents: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
