const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/connection');
const { authenticate, authorize } = require('../middleware/auth');
const { createAuditLog, getClientIp } = require('../utils/audit');

const router = express.Router();

// GET /api/users — list all users (Admin only, or officers list for assignment)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { role, is_active, search } = req.query;
    let sql = 'SELECT id, full_name, email, username, phone, role, is_active, last_login_at, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      params.push(role);
      sql += ` AND role = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      sql += ` AND is_active = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length} OR username ILIKE $${params.length})`;
    }

    sql += ' ORDER BY full_name';
    const result = await query(sql, params);
    res.json({ users: result.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, username, phone, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/users — create user (Admin only)
router.post('/', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { full_name, email, username, password, phone, role } = req.body;

    if (!full_name || !email || !username || !password) {
      return res.status(400).json({ error: 'full_name, email, username, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const validRoles = ['ADMIN', 'OFFICER', 'CLERK', 'AUDITOR'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await query(
      `INSERT INTO users (full_name, email, username, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, full_name, email, username, phone, role, is_active, created_at`,
      [full_name, email.toLowerCase(), username.toLowerCase(), passwordHash, phone || null, role || 'CLERK']
    );

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'users',
      entityId: result.rows[0].id,
      action: 'CREATE',
      after: { full_name, email, username, role: role || 'CLERK' },
      ipAddress: getClientIp(req)
    });

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id — update user (Admin only)
router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { full_name, email, phone, role, is_active } = req.body;
    const userId = req.params.id;

    // Get current state for audit
    const currentResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const before = currentResult.rows[0];

    const updates = [];
    const params = [];

    if (full_name !== undefined) { params.push(full_name); updates.push(`full_name = $${params.length}`); }
    if (email !== undefined) { params.push(email.toLowerCase()); updates.push(`email = $${params.length}`); }
    if (phone !== undefined) { params.push(phone); updates.push(`phone = $${params.length}`); }
    if (role !== undefined) { params.push(role); updates.push(`role = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); updates.push(`is_active = $${params.length}`); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    params.push(userId);
    updates.push(`updated_at = NOW()`);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${params.length}
       RETURNING id, full_name, email, username, phone, role, is_active, updated_at`,
      params
    );

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'users',
      entityId: userId,
      action: 'UPDATE',
      before: { full_name: before.full_name, email: before.email, role: before.role, is_active: before.is_active },
      after: result.rows[0],
      ipAddress: getClientIp(req)
    });

    res.json({ user: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/reset-password — admin reset user password
router.post('/:id/reset-password', authenticate, authorize('ADMIN'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2',
      [hash, req.params.id]
    );

    await createAuditLog({
      actorId: req.user.id,
      entityType: 'users',
      entityId: req.params.id,
      action: 'UPDATE',
      after: { field: 'password_reset_by_admin' },
      ipAddress: getClientIp(req)
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
