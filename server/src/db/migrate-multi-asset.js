/**
 * Migration: Multi-Asset Type Support
 * Adds columns for LAND_COMPANY, SHARES_CDSC, SHARES_CERTIFICATE,
 * MOTOR_VEHICLE, UFAA_CLAIM, DISCHARGE_OF_CHARGE asset types.
 * Run with: node src/db/migrate-multi-asset.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { pool } = require('./connection');

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ─── Extend asset_type ENUM to include all new types ───
    const newTypes = ['LAND_COMPANY', 'SHARES_CDSC', 'SHARES_CERTIFICATE', 'UFAA_CLAIM', 'DISCHARGE_OF_CHARGE'];
    for (const t of newTypes) {
      await client.query(`
        DO $$ BEGIN
          ALTER TYPE asset_type ADD VALUE IF NOT EXISTS '${t}';
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);
    }

    // ─── Add generic_status column (for non-land assets) ───
    const newCols = [
      // Generic completion status
      { name: 'generic_status', type: "VARCHAR(30) DEFAULT 'NOT_STARTED'" },
      // Common fields
      { name: 'asset_description', type: 'TEXT' },
      { name: 'estimated_value', type: 'NUMERIC(15,2)' },
      { name: 'transferee_name', type: 'VARCHAR(255)' },
      // Land Company fields
      { name: 'company_name', type: 'VARCHAR(255)' },
      { name: 'company_reg_number', type: 'VARCHAR(100)' },
      { name: 'share_certificate_number', type: 'VARCHAR(100)' },
      { name: 'plot_allocation', type: 'VARCHAR(255)' },
      { name: 'number_of_shares', type: 'VARCHAR(50)' },
      { name: 'proof_share_transfer_received', type: 'BOOLEAN DEFAULT false' },
      // Shares (CDSC / Certificate) fields
      { name: 'cdsc_account_number', type: 'VARCHAR(100)' },
      { name: 'cds7_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'cds7_prepared_date', type: 'DATE' },
      { name: 'cds2_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'cds2_prepared_date', type: 'DATE' },
      { name: 'sale_transfer_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'sale_transfer_prepared_date', type: 'DATE' },
      { name: 'discharge_indemnity_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'discharge_indemnity_prepared_date', type: 'DATE' },
      { name: 'shares_completion_date', type: 'DATE' },
      // Motor Vehicle fields
      { name: 'vehicle_reg_number', type: 'VARCHAR(50)' },
      { name: 'chassis_number', type: 'VARCHAR(100)' },
      { name: 'vehicle_make_model', type: 'VARCHAR(255)' },
      { name: 'form_c_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'form_c_prepared_date', type: 'DATE' },
      { name: 'signed_sealed', type: 'BOOLEAN DEFAULT false' },
      { name: 'signed_sealed_date', type: 'DATE' },
      { name: 'logbook_transfer_confirmed', type: 'BOOLEAN DEFAULT false' },
      { name: 'logbook_transfer_date', type: 'DATE' },
      // UFAA fields
      { name: 'ufaa_reference_number', type: 'VARCHAR(100)' },
      { name: 'financial_institution', type: 'VARCHAR(255)' },
      { name: 'amount_claimed', type: 'NUMERIC(15,2)' },
      { name: 'form_4b_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'form_4b_prepared_date', type: 'DATE' },
      { name: 'form_5_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'form_5_prepared_date', type: 'DATE' },
      { name: 'claimant_account_details_captured', type: 'BOOLEAN DEFAULT false' },
      { name: 'proof_funds_received_by_pt', type: 'BOOLEAN DEFAULT false' },
      { name: 'payment_date_to_pt', type: 'DATE' },
      { name: 'transmission_to_beneficiary_status', type: 'VARCHAR(50)' },
      // Discharge of Charge fields
      { name: 'lending_institution', type: 'VARCHAR(255)' },
      { name: 'loan_reference_number', type: 'VARCHAR(100)' },
      { name: 'property_parcel_number', type: 'VARCHAR(100)' },
      { name: 'discharge_document_prepared', type: 'BOOLEAN DEFAULT false' },
      { name: 'discharge_document_prepared_date', type: 'DATE' },
      { name: 'discharge_registered', type: 'BOOLEAN DEFAULT false' },
      { name: 'discharge_date', type: 'DATE' },
      // Notes (if not already present)
      { name: 'notes', type: 'TEXT' },
    ];

    for (const col of newCols) {
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE assets ADD COLUMN ${col.name} ${col.type};
        EXCEPTION WHEN duplicate_column THEN null;
        END $$;
      `);
    }

    // ─── Indexes ───
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_generic_status ON assets(generic_status);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_asset_type ON assets(asset_type);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_vehicle_reg ON assets(vehicle_reg_number);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_ufaa_ref ON assets(ufaa_reference_number);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_assets_company_name ON assets(company_name);');

    await client.query('COMMIT');
    console.log('✅ Multi-asset migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Multi-asset migration failed:', err.message);
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
