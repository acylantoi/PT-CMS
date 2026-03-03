require('dotenv').config();
const { pool } = require('./connection');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    // Create ENUM types
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'OFFICER', 'CLERK', 'AUDITOR');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE administration_type AS ENUM ('COURT', 'SUMMARY');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE estate_status AS ENUM (
          'INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 
          'PARTIALLY_COMPLETED', 'COMPLETED', 'ON_HOLD'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE asset_type AS ENUM ('LAND_PARCEL', 'HOUSE', 'MOTOR_VEHICLE', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE asset_status AS ENUM (
          'PENDING', 'IN_PROGRESS', 'SIGNED_SEALED', 
          'UPLOADED', 'COMPLETED', 'ON_HOLD'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transfer_type AS ENUM ('TRANSMISSION', 'TRANSFER');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE transfer_status AS ENUM (
          'DRAFT', 'READY_FOR_SIGN', 'SIGNED_SEALED', 
          'UPLOADED', 'RELEASED_TO_CLIENT', 'COMPLETED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE event_type AS ENUM (
          'NOTE', 'STATUS_CHANGE', 'DOCUMENT_UPLOADED', 
          'SIGNED', 'SEALED', 'DISPATCHED', 'RECEIVED_BACK', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE doc_type AS ENUM (
          'GRANT', 'CONFIRMED_GRANT', 'SUMMARY_CERT', 'ID_COPY', 
          'SEARCH', 'TRANSFER_FORM', 'CONSENT', 'ECITIZEN_UPLOAD', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ─── USERS TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        role user_role NOT NULL DEFAULT 'CLERK',
        is_active BOOLEAN NOT NULL DEFAULT true,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── ESTATE FILES TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS estate_files (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        file_number VARCHAR(100) UNIQUE NOT NULL,
        deceased_full_name VARCHAR(255) NOT NULL,
        deceased_id_no VARCHAR(50),
        date_of_death DATE,
        county VARCHAR(100),
        sub_county VARCHAR(100),
        intake_date DATE NOT NULL DEFAULT CURRENT_DATE,
        administration_type administration_type NOT NULL,
        grant_reference VARCHAR(255),
        grant_date DATE,
        confirmed_grant_date DATE,
        estate_value_estimate NUMERIC(15, 2),
        assigned_officer_id UUID REFERENCES users(id),
        current_status estate_status NOT NULL DEFAULT 'INTAKE',
        notes TEXT,
        is_imported BOOLEAN DEFAULT false,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_deleted BOOLEAN NOT NULL DEFAULT false
      );
    `);

    // ─── BENEFICIARIES TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS beneficiaries (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estate_file_id UUID NOT NULL REFERENCES estate_files(id) ON DELETE CASCADE,
        full_name VARCHAR(255) NOT NULL,
        id_no VARCHAR(50),
        relationship_to_deceased VARCHAR(100),
        phone VARCHAR(20),
        address TEXT,
        is_transferee BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── ASSETS TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estate_file_id UUID NOT NULL REFERENCES estate_files(id) ON DELETE CASCADE,
        asset_type asset_type NOT NULL DEFAULT 'LAND_PARCEL',
        parcel_number VARCHAR(100),
        registry_office VARCHAR(100),
        county VARCHAR(100),
        land_size VARCHAR(100),
        title_type VARCHAR(50),
        encumbrance_flag BOOLEAN DEFAULT false,
        encumbrance_notes TEXT,
        asset_status asset_status NOT NULL DEFAULT 'PENDING',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_deleted BOOLEAN NOT NULL DEFAULT false
      );
    `);

    // ─── TRANSFERS TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
        transfer_type transfer_type NOT NULL DEFAULT 'TRANSMISSION',
        transferee_name VARCHAR(255) NOT NULL,
        transferee_id_no VARCHAR(50),
        beneficiary_id UUID REFERENCES beneficiaries(id),
        share_details VARCHAR(100),
        consideration NUMERIC(15, 2),
        instrument_date DATE,
        completion_date DATE,
        transfer_status transfer_status NOT NULL DEFAULT 'DRAFT',
        remarks TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── WORKFLOW EVENTS TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS workflow_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estate_file_id UUID NOT NULL REFERENCES estate_files(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id),
        transfer_id UUID REFERENCES transfers(id),
        event_type event_type NOT NULL DEFAULT 'NOTE',
        from_status VARCHAR(50),
        to_status VARCHAR(50),
        description TEXT NOT NULL,
        performed_by UUID NOT NULL REFERENCES users(id),
        performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address VARCHAR(45)
      );
    `);

    // ─── DOCUMENTS TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        estate_file_id UUID NOT NULL REFERENCES estate_files(id) ON DELETE CASCADE,
        asset_id UUID REFERENCES assets(id),
        transfer_id UUID REFERENCES transfers(id),
        doc_type doc_type NOT NULL DEFAULT 'OTHER',
        file_name VARCHAR(500) NOT NULL,
        storage_key VARCHAR(1000) NOT NULL,
        file_size INTEGER,
        mime_type VARCHAR(100),
        uploaded_by UUID NOT NULL REFERENCES users(id),
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── AUDIT LOG TABLE ───
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        actor_id UUID REFERENCES users(id),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        action audit_action NOT NULL,
        before_data JSONB,
        after_data JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // ─── INDEXES ───
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_file_number ON estate_files(file_number);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_deceased ON estate_files(deceased_full_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_status ON estate_files(current_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_officer ON estate_files(assigned_officer_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_county ON estate_files(county);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_admin_type ON estate_files(administration_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_intake_date ON estate_files(intake_date);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_estate_files_deleted ON estate_files(is_deleted);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_beneficiaries_estate ON beneficiaries(estate_file_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_beneficiaries_name ON beneficiaries(full_name);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_estate ON assets(estate_file_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_parcel ON assets(parcel_number);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(asset_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_deleted ON assets(is_deleted);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_asset ON transfers(asset_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_name ON transfers(transferee_name);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(transfer_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_transfers_dates ON transfers(instrument_date, completion_date);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_estate ON workflow_events(estate_file_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workflow_performed_at ON workflow_events(performed_at);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_documents_estate ON documents(estate_file_id);');

    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at);');

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
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
