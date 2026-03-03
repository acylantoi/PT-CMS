const { query } = require('../db/connection');

/**
 * Creates an audit log entry.
 */
const createAuditLog = async ({ actorId, entityType, entityId, action, before, after, ipAddress }) => {
  try {
    await query(
      `INSERT INTO audit_log (actor_id, entity_type, entity_id, action, before_data, after_data, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        actorId,
        entityType,
        entityId,
        action,
        before ? JSON.stringify(before) : null,
        after ? JSON.stringify(after) : null,
        ipAddress || null
      ]
    );
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
    // Don't throw — audit failure shouldn't break the operation
  }
};

/**
 * Creates a workflow event.
 */
const createWorkflowEvent = async ({
  estateFileId, assetId, transferId, eventType,
  fromStatus, toStatus, description, performedBy, ipAddress
}) => {
  try {
    const result = await query(
      `INSERT INTO workflow_events 
        (estate_file_id, asset_id, transfer_id, event_type, from_status, to_status, description, performed_by, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [estateFileId, assetId || null, transferId || null, eventType,
       fromStatus || null, toStatus || null, description, performedBy, ipAddress || null]
    );
    return result.rows[0];
  } catch (err) {
    console.error('Failed to create workflow event:', err.message);
  }
};

/**
 * Get client IP from request.
 */
const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
};

module.exports = { createAuditLog, createWorkflowEvent, getClientIp };
