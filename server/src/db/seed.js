require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('./connection');

const seed = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create default admin user
    const adminPasswordHash = await bcrypt.hash('Admin@2026', 12);
    const officerPasswordHash = await bcrypt.hash('Officer@2026', 12);
    const clerkPasswordHash = await bcrypt.hash('Clerk@2026', 12);
    const auditorPasswordHash = await bcrypt.hash('Auditor@2026', 12);

    // Admin
    await client.query(`
      INSERT INTO users (full_name, email, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['System Administrator', 'admin@ptcms.go.ke', 'admin', adminPasswordHash, 'ADMIN', true]);

    // Conveyancing Officer
    await client.query(`
      INSERT INTO users (full_name, email, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['Mercy Wanjiku', 'mercy@ptcms.go.ke', 'mercy', officerPasswordHash, 'OFFICER', true]);

    // Second Officer
    await client.query(`
      INSERT INTO users (full_name, email, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['James Ochieng', 'james@ptcms.go.ke', 'james', officerPasswordHash, 'OFFICER', true]);

    // Clerk
    await client.query(`
      INSERT INTO users (full_name, email, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['Anne Njeri', 'anne@ptcms.go.ke', 'anne', clerkPasswordHash, 'CLERK', true]);

    // Auditor
    await client.query(`
      INSERT INTO users (full_name, email, username, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (username) DO NOTHING
    `, ['Peter Kamau', 'peter@ptcms.go.ke', 'peter', auditorPasswordHash, 'AUDITOR', true]);

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully.');
    console.log('');
    console.log('Default users:');
    console.log('  admin    / Admin@2026   (ADMIN)');
    console.log('  mercy    / Officer@2026 (OFFICER)');
    console.log('  james    / Officer@2026 (OFFICER)');
    console.log('  anne     / Clerk@2026   (CLERK)');
    console.log('  peter    / Auditor@2026 (AUDITOR)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
