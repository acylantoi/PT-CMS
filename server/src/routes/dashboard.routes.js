const express = require('express');
const { query } = require('../db/connection');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard — dashboard summary data
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Status counts
    const statusCounts = await query(`
      SELECT current_status, COUNT(*) as count
      FROM estate_files
      WHERE is_deleted = false
      GROUP BY current_status
    `);

    // Active files (non-completed)
    const activeFiles = await query(`
      SELECT COUNT(*) as count FROM estate_files 
      WHERE is_deleted = false AND current_status NOT IN ('COMPLETED')
    `);

    // Completed this month
    const completedThisMonth = await query(`
      SELECT COUNT(*) as count FROM estate_files 
      WHERE is_deleted = false AND current_status = 'COMPLETED'
      AND updated_at >= date_trunc('month', CURRENT_DATE)
    `);

    // Pending grants
    const pendingGrants = await query(`
      SELECT COUNT(*) as count FROM estate_files 
      WHERE is_deleted = false AND current_status = 'WAITING_GRANT'
    `);

    // In conveyancing
    const inConveyancing = await query(`
      SELECT COUNT(*) as count FROM estate_files 
      WHERE is_deleted = false AND current_status = 'IN_CONVEYANCING'
    `);

    // On hold
    const onHold = await query(`
      SELECT COUNT(*) as count FROM estate_files 
      WHERE is_deleted = false AND current_status = 'ON_HOLD'
    `);

    // Total transfers this month
    const transfersThisMonth = await query(`
      SELECT COUNT(*) as count FROM transfers 
      WHERE created_at >= date_trunc('month', CURRENT_DATE)
    `);

    // Administration type breakdown
    const adminBreakdown = await query(`
      SELECT administration_type, COUNT(*) as count
      FROM estate_files WHERE is_deleted = false
      GROUP BY administration_type
    `);

    // Recent workflow events (last 20)
    const recentEvents = await query(`
      SELECT we.*, u.full_name AS performed_by_name, ef.file_number
      FROM workflow_events we
      LEFT JOIN users u ON we.performed_by = u.id
      LEFT JOIN estate_files ef ON we.estate_file_id = ef.id
      ORDER BY we.performed_at DESC
      LIMIT 20
    `);

    // Officer workload
    const officerWorkload = await query(`
      SELECT u.full_name, u.id,
        COUNT(ef.id) AS active_cases
      FROM users u
      LEFT JOIN estate_files ef ON ef.assigned_officer_id = u.id 
        AND ef.is_deleted = false AND ef.current_status NOT IN ('COMPLETED')
      WHERE u.role IN ('OFFICER', 'ADMIN') AND u.is_active = true
      GROUP BY u.id, u.full_name
      ORDER BY active_cases DESC
    `);

    res.json({
      cards: {
        active_files: parseInt(activeFiles.rows[0].count),
        pending_grants: parseInt(pendingGrants.rows[0].count),
        in_conveyancing: parseInt(inConveyancing.rows[0].count),
        completed_this_month: parseInt(completedThisMonth.rows[0].count),
        on_hold: parseInt(onHold.rows[0].count),
        transfers_this_month: parseInt(transfersThisMonth.rows[0].count)
      },
      status_breakdown: statusCounts.rows,
      admin_type_breakdown: adminBreakdown.rows,
      recent_events: recentEvents.rows,
      officer_workload: officerWorkload.rows
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
