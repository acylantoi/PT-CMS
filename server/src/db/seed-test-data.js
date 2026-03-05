/**
 * Seed 10 realistic Kenyan estate files with assets, beneficiaries, and workflow events.
 * Run: cd server && node src/db/seed-test-data.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Real user IDs from Supabase
const USERS = {
  admin: '8329e7bb-ff9d-442d-896d-90aeb0496c22',
  mercy: '1ae708ad-f18d-4acb-a2fc-15769c1212fd',
  james: 'aa9404a3-218b-4d9b-b5de-e9c52dd1882a',
  anne:  'e5d08c02-6d9c-47ab-ad61-5da9e0c83d02',
  peter: '9628fbac-0506-4fc1-b730-d1d4db585491',
};

const OFFICERS = [USERS.mercy, USERS.james];
const CLERKS = [USERS.anne];

const COUNTIES = ['Nairobi', 'Kiambu', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Machakos', 'Nyeri', 'Kajiado', 'Kilifi'];
const SUB_COUNTIES = {
  'Nairobi': ['Westlands', 'Langata', 'Dagoretti', 'Kasarani', 'Embakasi'],
  'Kiambu': ['Thika', 'Ruiru', 'Limuru', 'Kikuyu', 'Gatundu'],
  'Mombasa': ['Mvita', 'Changamwe', 'Likoni', 'Kisauni', 'Nyali'],
  'Kisumu': ['Kisumu Central', 'Kisumu East', 'Kisumu West', 'Muhoroni'],
  'Nakuru': ['Nakuru East', 'Nakuru West', 'Naivasha', 'Gilgil'],
  'Uasin Gishu': ['Eldoret', 'Kapseret', 'Moiben', 'Soy'],
  'Machakos': ['Machakos', 'Kangundo', 'Athi River', 'Matungulu'],
  'Nyeri': ['Nyeri Central', 'Mathira', 'Othaya', 'Tetu'],
  'Kajiado': ['Kajiado Central', 'Ongata Rongai', 'Ngong', 'Kitengela'],
  'Kilifi': ['Kilifi', 'Malindi', 'Watamu', 'Mtwapa'],
};

const KENYAN_NAMES = [
  { first: 'John', last: 'Kamau' }, { first: 'Mary', last: 'Wanjiku' },
  { first: 'David', last: 'Odhiambo' }, { first: 'Grace', last: 'Nyambura' },
  { first: 'Peter', last: 'Mwangi' }, { first: 'Sarah', last: 'Achieng' },
  { first: 'James', last: 'Kiprop' }, { first: 'Alice', last: 'Chebet' },
  { first: 'Joseph', last: 'Mutua' }, { first: 'Elizabeth', last: 'Wafula' },
  { first: 'Daniel', last: 'Njoroge' }, { first: 'Margaret', last: 'Otieno' },
  { first: 'Charles', last: 'Kimani' }, { first: 'Catherine', last: 'Muthoni' },
  { first: 'Samuel', last: 'Omondi' }, { first: 'Jane', last: 'Karanja' },
  { first: 'Francis', last: 'Rotich' }, { first: 'Agnes', last: 'Njeri' },
  { first: 'Paul', last: 'Kiptoo' }, { first: 'Esther', last: 'Wairimu' },
];

const RELATIONSHIPS = ['Son', 'Daughter', 'Spouse', 'Brother', 'Sister', 'Nephew', 'Niece', 'Grandchild'];
const REGISTRIES = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi', 'Nyeri'];
const TITLE_TYPES = ['Freehold', 'Leasehold', 'Absolute'];

const STATUSES = ['INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 'IN_CONVEYANCING', 'IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'];
const CONV_STATUSES = ['AWAITING_CERTIFIED_COPIES', 'AWAITING_FEE_CONFIRMATION', 'FORMS_IN_PROGRESS', 'FORMS_READY', 'AWAITING_RETURNED_TITLE_COPY', 'CLOSED'];
// administration_type enum: COURT, SUMMARY
const ADMIN_TYPES = ['COURT', 'COURT', 'SUMMARY', 'COURT', 'SUMMARY'];
// administration_route is varchar, but we keep COURT_GRANT / SUMMARY_CERT
const ADMIN_ROUTES = ['COURT_GRANT', 'COURT_GRANT', 'SUMMARY_CERT', 'COURT_GRANT', 'SUMMARY_CERT'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randDate(yearStart, yearEnd) {
  const y = randInt(yearStart, yearEnd);
  const m = String(randInt(1, 12)).padStart(2, '0');
  const d = String(randInt(1, 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function randId() { return String(randInt(10000000, 39999999)); }
function randPhone() { return `07${randInt(10, 99)}${randInt(100000, 999999)}`; }

const ASSET_TYPES = ['LAND_PARCEL', 'LAND_COMPANY', 'SHARES_CDSC', 'SHARES_CERTIFICATE', 'MOTOR_VEHICLE', 'UFAA_CLAIM', 'DISCHARGE_OF_CHARGE', 'OTHER'];

function generateParcelNumber(county) {
  const blocks = ['BLOCK', 'LR NO.', 'PLOT'];
  return `${county.toUpperCase()}/${pick(blocks)}/${randInt(100, 9999)}/${randInt(1, 500)}`;
}

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const usedNames = new Set();
    const estateFiles = [];

    // Create 10 estate files
    for (let i = 1; i <= 10; i++) {
      const id = uuidv4();
      const county = COUNTIES[i - 1];
      const subCounty = pick(SUB_COUNTIES[county]);
      const statusIdx = i <= 2 ? 0 : i <= 4 ? 1 : i <= 8 ? 2 : i === 9 ? 5 : 6;
      const currentStatus = STATUSES[statusIdx];
      const adminType = pick(ADMIN_TYPES);
      const adminRoute = adminType === 'SUMMARY' ? 'SUMMARY_CERT' : 'COURT_GRANT';

      let deceasedIdx;
      do { deceasedIdx = randInt(0, KENYAN_NAMES.length - 1); } while (usedNames.has(deceasedIdx));
      usedNames.add(deceasedIdx);
      const deceased = KENYAN_NAMES[deceasedIdx];
      const deceasedName = `${deceased.first} ${deceased.last}`;

      const fileNum = `PT/CV/${county.substring(0, 3).toUpperCase()}/${2025}/${String(i).padStart(4, '0')}`;
      const dateOfDeath = randDate(2020, 2024);
      const intakeDate = randDate(2025, 2025);
      const officer = pick(OFFICERS);
      const clerk = pick(CLERKS);

      let grantRef = null, grantDate = null, confirmedDate = null;
      let convStatus = null, convReceivedDate = null, convOfficer = null;

      if (['WAITING_GRANT', 'IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'].includes(currentStatus)) {
        grantRef = adminRoute === 'COURT_GRANT'
          ? `SUCC. CAUSE NO. ${randInt(100, 999)} OF ${randInt(2024, 2025)}`
          : null;
        grantDate = adminRoute === 'SUMMARY_CERT' ? randDate(2025, 2025) : randDate(2025, 2025);
      }
      if (['IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'].includes(currentStatus)) {
        confirmedDate = randDate(2025, 2026);
        convStatus = currentStatus === 'COMPLETED' ? 'CLOSED' : pick(CONV_STATUSES.slice(0, 5));
        convReceivedDate = randDate(2025, 2026);
        convOfficer = officer;
      }
      if (currentStatus === 'COMPLETED') {
        convStatus = 'CLOSED';
      }

      const estateValue = randInt(500000, 50000000);

      // Checklist fields for conveyancing files
      const inConv = ['IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'].includes(currentStatus);
      const certCopyGrant = inConv ? Math.random() > 0.3 : false;
      const certCopySummary = inConv && adminRoute === 'SUMMARY_CERT' ? Math.random() > 0.3 : false;
      const feesPaid = inConv ? (Math.random() > 0.4 ? 'CONFIRMED' : 'PENDING') : 'PENDING';
      const paymentRef = feesPaid === 'CONFIRMED' ? `RCP/${randInt(1000, 9999)}/${2025}` : null;
      const paymentDate = feesPaid === 'CONFIRMED' ? randDate(2025, 2026) : null;

      const lr39p = inConv && convStatus !== 'AWAITING_CERTIFIED_COPIES' ? Math.random() > 0.3 : false;
      const lr39s = lr39p && Math.random() > 0.4;
      const lr42p = lr39p && Math.random() > 0.3;
      const lr42s = lr42p && Math.random() > 0.4;

      await client.query(`
        INSERT INTO estate_files (
          id, file_number, deceased_full_name, deceased_id_no, date_of_death,
          county, sub_county, intake_date, administration_type, administration_route,
          grant_reference, grant_date, confirmed_grant_date,
          estate_value_estimate, assigned_officer_id, current_status,
          conveyancing_status, conveyancing_received_date, conveyancing_assigned_officer_id,
          certified_copy_grant_present, certified_copy_summary_cert_present,
          fees_paid_status, payment_reference, payment_date,
          lr39_prepared, lr39_signed_sealed, lr42_prepared, lr42_signed_sealed,
          notes, created_by, is_deleted
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13,
          $14, $15, $16,
          $17, $18, $19,
          $20, $21,
          $22, $23, $24,
          $25, $26, $27, $28,
          $29, $30, false
        )
      `, [
        id, fileNum, deceasedName, randId(), dateOfDeath,
        county, subCounty, intakeDate, adminType, adminRoute,
        grantRef, grantDate, confirmedDate,
        estateValue, officer, currentStatus,
        convStatus, convReceivedDate, convOfficer,
        certCopyGrant, certCopySummary,
        feesPaid, paymentRef, paymentDate,
        lr39p, lr39s, lr42p, lr42s,
        `Test estate file for ${deceasedName} from ${county} County.`, clerk
      ]);

      estateFiles.push({ id, deceasedName, county, currentStatus, adminRoute, officer });
      console.log(`  📁 ${fileNum} — ${deceasedName} (${county}) [${currentStatus}]`);
    }

    // Add 2-4 beneficiaries per estate file
    console.log('\nAdding beneficiaries...');
    for (const ef of estateFiles) {
      const numBen = randInt(2, 4);
      for (let b = 0; b < numBen; b++) {
        const name = pick(KENYAN_NAMES);
        const benName = `${name.first} ${name.last}`;
        await client.query(`
          INSERT INTO beneficiaries (id, estate_file_id, full_name, id_no, relationship_to_deceased, phone, is_transferee)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [uuidv4(), ef.id, benName, randId(), pick(RELATIONSHIPS), randPhone(), b === 0]);
      }
    }

    // Add 1-3 assets per estate file
    console.log('Adding assets...');
    for (const ef of estateFiles) {
      const numAssets = randInt(1, 3);
      for (let a = 0; a < numAssets; a++) {
        const assetId = uuidv4();
        // First asset is always LAND_PARCEL, rest are random
        const assetType = a === 0 ? 'LAND_PARCEL' : pick(ASSET_TYPES);
        const parcelNum = ['LAND_PARCEL', 'LAND_COMPANY', 'DISCHARGE_OF_CHARGE'].includes(assetType)
          ? generateParcelNumber(ef.county) : null;

        const assetStatus = ef.currentStatus === 'COMPLETED' ? 'COMPLETED'
          : ef.currentStatus === 'IN_CONVEYANCING' ? pick(['PENDING', 'IN_PROGRESS', 'SIGNED_SEALED'])
          : 'PENDING';

        let extra = {};
        if (assetType === 'LAND_PARCEL' || assetType === 'LAND_COMPANY') {
          extra = {
            registry_office: pick(REGISTRIES),
            land_size: `${randInt(1, 50)} acres`,
            title_type: pick(TITLE_TYPES),
            encumbrance_flag: Math.random() > 0.7,
            estimated_value: randInt(1000000, 30000000),
          };
          if (assetType === 'LAND_COMPANY') {
            extra.company_name = `${pick(KENYAN_NAMES).last} Holdings Ltd`;
            extra.company_reg_number = `CPR/${randInt(10000, 99999)}`;
          }
        } else if (assetType === 'MOTOR_VEHICLE') {
          extra = {
            vehicle_reg_number: `K${String.fromCharCode(65 + randInt(0, 25))}${String.fromCharCode(65 + randInt(0, 25))} ${randInt(100, 999)}${String.fromCharCode(65 + randInt(0, 25))}`,
            chassis_number: `JTDB${randInt(100000, 999999)}`,
            vehicle_make_model: pick(['Toyota Hilux 2019', 'Nissan Note 2020', 'Toyota Land Cruiser 2018', 'Isuzu D-Max 2021', 'Mercedes C200 2017']),
            estimated_value: randInt(500000, 8000000),
          };
        } else if (assetType === 'SHARES_CDSC') {
          extra = {
            cdsc_account_number: `CDSC${randInt(100000, 999999)}`,
            number_of_shares: randInt(100, 50000),
            company_name: pick(['Safaricom PLC', 'KCB Group', 'Equity Group', 'EABL', 'BAT Kenya']),
            estimated_value: randInt(50000, 5000000),
          };
        } else if (assetType === 'SHARES_CERTIFICATE') {
          extra = {
            share_certificate_number: `CERT/${randInt(1000, 9999)}`,
            number_of_shares: randInt(50, 10000),
            company_name: pick(['Mumias Sugar', 'Nation Media', 'Limuru Tea', 'Kakuzi PLC']),
            estimated_value: randInt(100000, 3000000),
          };
        } else if (assetType === 'UFAA_CLAIM') {
          extra = {
            ufaa_reference_number: `UFAA/${randInt(1000, 9999)}/${2025}`,
            financial_institution: pick(['KCB Bank', 'Equity Bank', 'Co-op Bank', 'Stanbic Bank', 'NCBA']),
            amount_claimed: randInt(50000, 2000000),
            estimated_value: randInt(50000, 2000000),
          };
        } else if (assetType === 'DISCHARGE_OF_CHARGE') {
          extra = {
            lending_institution: pick(['KCB Bank', 'Housing Finance', 'Stanbic Bank', 'NCBA']),
            loan_reference_number: `LN/${randInt(100000, 999999)}`,
            property_parcel_number: generateParcelNumber(ef.county),
            estimated_value: randInt(1000000, 15000000),
          };
        } else {
          extra = {
            asset_description: pick(['Bank account at Equity', 'Pension benefits (NSSF)', 'Insurance policy - Jubilee', 'Household goods & furniture', 'Business inventory - Duka']),
            estimated_value: randInt(50000, 2000000),
          };
        }

        const cols = ['id', 'estate_file_id', 'asset_type', 'parcel_number', 'asset_status', 'is_deleted', ...Object.keys(extra)];
        const vals = [assetId, ef.id, assetType, parcelNum, assetStatus, false, ...Object.values(extra)];
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');

        await client.query(
          `INSERT INTO assets (${cols.join(', ')}) VALUES (${placeholders})`,
          vals
        );
      }
    }

    // Add workflow events
    console.log('Adding workflow events...');
    for (const ef of estateFiles) {
      // Intake note
      await client.query(`
        INSERT INTO workflow_events (id, estate_file_id, event_type, description, performed_by, performed_at)
        VALUES ($1, $2, 'NOTE', $3, $4, $5)
      `, [uuidv4(), ef.id, `Estate file created for ${ef.deceasedName}`, pick(CLERKS), randDate(2025, 2025) + 'T09:00:00Z']);

      if (['WAITING_GRANT', 'IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'].includes(ef.currentStatus)) {
        await client.query(`
          INSERT INTO workflow_events (id, estate_file_id, event_type, description, performed_by, performed_at)
          VALUES ($1, $2, 'STATUS_CHANGE', $3, $4, $5)
        `, [uuidv4(), ef.id, `Status changed to WAITING_GRANT`, ef.officer, randDate(2025, 2025) + 'T14:00:00Z']);
      }
      if (['IN_CONVEYANCING', 'ON_HOLD', 'COMPLETED'].includes(ef.currentStatus)) {
        await client.query(`
          INSERT INTO workflow_events (id, estate_file_id, event_type, description, performed_by, performed_at)
          VALUES ($1, $2, 'STATUS_CHANGE', $3, $4, $5)
        `, [uuidv4(), ef.id, `Moved to conveyancing`, ef.officer, randDate(2025, 2026) + 'T10:30:00Z']);
      }
      if (ef.currentStatus === 'COMPLETED') {
        await client.query(`
          INSERT INTO workflow_events (id, estate_file_id, event_type, description, performed_by, performed_at)
          VALUES ($1, $2, 'STATUS_CHANGE', $3, $4, $5)
        `, [uuidv4(), ef.id, `File completed and closed`, ef.officer, randDate(2026, 2026) + 'T16:00:00Z']);
      }
    }

    await client.query('COMMIT');
    console.log('\n✅ 10 estate files with assets, beneficiaries & events seeded successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
