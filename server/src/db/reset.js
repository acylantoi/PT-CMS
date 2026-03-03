require('dotenv').config();
const { pool } = require('./connection');

const reset = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Dropping all tables...');
    await client.query(`
      DROP TABLE IF EXISTS audit_log CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS workflow_events CASCADE;
      DROP TABLE IF EXISTS transfers CASCADE;
      DROP TABLE IF EXISTS assets CASCADE;
      DROP TABLE IF EXISTS beneficiaries CASCADE;
      DROP TABLE IF EXISTS estate_files CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    console.log('Dropping all types...');
    await client.query(`
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS administration_type CASCADE;
      DROP TYPE IF EXISTS estate_status CASCADE;
      DROP TYPE IF EXISTS asset_type CASCADE;
      DROP TYPE IF EXISTS asset_status CASCADE;
      DROP TYPE IF EXISTS transfer_type CASCADE;
      DROP TYPE IF EXISTS transfer_status CASCADE;
      DROP TYPE IF EXISTS event_type CASCADE;
      DROP TYPE IF EXISTS doc_type CASCADE;
      DROP TYPE IF EXISTS audit_action CASCADE;
    `);

    await client.query('COMMIT');
    console.log('✅ Database reset complete. Run db:migrate and db:seed to recreate.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Reset failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
