/**
 * Migration: Conveyancing-Stage Workflow Update
 * Adds all conveyancing-specific fields, ENUMs, and indexes.
 * Run with: node src/db/migrate-conveyancing.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { pool } = require('./connection');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── New ENUM: conveyancing_status (file-level) ───
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE conveyancing_status AS ENUM (
          'RECEIVED_AT_CONVEYANCING',
          'AWAITING_CERTIFIED_COPIES',
          'AWAITING_FEE_CONFIRMATION',
          'FORMS_IN_PROGRESS',
          'FORMS_READY',
          'DOCUMENTS_ISSUED',
          'AWAITING_RETURNED_TITLE_COPY',
          'PARTIALLY_CLOSED',
          'CLOSED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ─── New ENUM: fees_paid_status ───
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE fees_paid_status AS ENUM ('PAID', 'NOT_PAID', 'UNKNOWN', 'EXEMPT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ─── New ENUM: administration_route ───
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE administration_route AS ENUM ('COURT_GRANT', 'SUMMARY_CERT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ─── New ENUM: parcel_status ───
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE parcel_status AS ENUM (
          'PARCEL_CAPTURED',
          'TRANSFER_PREPARED',
          'SIGNED_SEALED',
          'DOCUMENTS_ISSUED',
          'AWAITING_PROOF',
          'CLOSED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ─── ALTER estate_files: add conveyancing columns ───
    const efCols = [
      { name: 'conveyancing_received_date', type: 'DATE' },
      { name: 'conveyancing_assigned_officer_id', type: 'UUID REFERENCES users(id)' },
      { name: 'administration_route', type: 'VARCHAR(50)' },  // COURT_GRANT | SUMMARY_CERT
      { name: 'certified_copy_grant_present', type: 'BOOLEAN DEFAULT false' },
      { name: 'certified_copy_summary_cert_present', type: 'BOOLEAN DEFAULT false' },
      { name: 'fees_paid_status', type: 'VARCHAR(20) DEFAULT \'UNKNOWN\'' },
      { name: 'payment_reference', type: 'TEXT' },
      { name: 'payment_date', type: 'DATE' },
      { name: 'lr39_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'lr39_prepared_date', type: 'DATE' },
      { name: 'lr39_prepared_by', type: 'UUID REFERENCES users(id)' },
      { name: 'lr39_signed_sealed', type: 'BOOLEAN DEFAULT false' },
      { name: 'lr39_signed_sealed_date', type: 'DATE' },
      { name: 'lr39_signed_sealed_by', type: 'UUID REFERENCES users(id)' },
      { name: 'lr42_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'lr42_prepared_date', type: 'DATE' },
      { name: 'lr42_prepared_by', type: 'UUID REFERENCES users(id)' },
      { name: 'lr42_signed_sealed', type: 'BOOLEAN DEFAULT false' },
      { name: 'lr42_signed_sealed_date', type: 'DATE' },
      { name: 'lr42_signed_sealed_by', type: 'UUID REFERENCES users(id)' },
      { name: 'conveyancing_status', type: 'VARCHAR(50) DEFAULT \'RECEIVED_AT_CONVEYANCING\'' },
    ];

    for (const col of efCols) {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE estate_files ADD COLUMN ${col.name} ${col.type};
        EXCEPTION WHEN duplicate_column THEN null;
        END $$;
      `);
    }

    // ─── ALTER assets: add conveyancing parcel-level columns ───
    const assetCols = [
      { name: 'transfer_rate_amount', type: 'NUMERIC(15,2)' },
      { name: 'transfer_rate_currency', type: 'VARCHAR(10) DEFAULT \'KES\'' },
      { name: 'transfer_rate_notes', type: 'TEXT' },
      { name: 'docs_issued_to_client', type: 'BOOLEAN DEFAULT false' },
      { name: 'issue_date', type: 'DATE' },
      { name: 'issued_by_user_id', type: 'UUID REFERENCES users(id)' },
      { name: 'issue_notes', type: 'TEXT' },
      { name: 'proof_of_registration_received', type: 'BOOLEAN DEFAULT false' },
      { name: 'proof_received_date', type: 'DATE' },
      { name: 'closure_override', type: 'BOOLEAN DEFAULT false' },
      { name: 'closure_override_reason', type: 'TEXT' },
      { name: 'parcel_status', type: 'VARCHAR(30) DEFAULT \'PARCEL_CAPTURED\'' },
    ];

    for (const col of assetCols) {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE assets ADD COLUMN ${col.name} ${col.type};
        EXCEPTION WHEN duplicate_column THEN null;
        END $$;
      `);
    }

    // ─── Indexes for new columns ───
    await client.query('CREATE INDEX IF NOT EXISTS idx_ef_conveyancing_status ON estate_files(conveyancing_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ef_conveyancing_date ON estate_files(conveyancing_received_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ef_fees_status ON estate_files(fees_paid_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_parcel_status ON assets(parcel_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_transferee_name ON transfers(transferee_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_transferee_id ON transfers(transferee_id_no);');

    await client.query('COMMIT');
    console.log('✅ Conveyancing migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Conveyancing migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
