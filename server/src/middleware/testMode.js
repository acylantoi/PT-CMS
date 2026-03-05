/**
 * Test-mode middleware - Conveyancing-Stage Workflow.
 * When TEST_MODE=true, all /api/* requests get realistic mock data.
 */

const MOCK_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', username: 'admin', full_name: 'System Administrator', email: 'admin@pt-cms.go.ke', role: 'ADMIN', is_active: true, created_at: '2025-01-01T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', email: 'mercy.wanjiku@pt-cms.go.ke', role: 'OFFICER', is_active: true, created_at: '2025-01-02T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000003', username: 'james', full_name: 'James Mwangi', email: 'james.mwangi@pt-cms.go.ke', role: 'OFFICER', is_active: true, created_at: '2025-01-03T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000004', username: 'anne', full_name: 'Anne Nyambura', email: 'anne.nyambura@pt-cms.go.ke', role: 'CLERK', is_active: true, created_at: '2025-01-04T00:00:00Z' },
  { id: '00000000-0000-0000-0000-000000000005', username: 'peter', full_name: 'Peter Ochieng', email: 'peter.ochieng@pt-cms.go.ke', role: 'AUDITOR', is_active: true, created_at: '2025-01-05T00:00:00Z' }
];

const MOCK_ESTATE_FILES = [
  {
    id: 'ef-001', file_number: 'PT/CV/2025/0001',
    deceased_full_name: 'John Kamau Njoroge', deceased_id_no: '12345678',
    date_of_death: '2024-06-15', county: 'Nairobi', sub_county: 'Westlands',
    administration_type: 'COURT', administration_route: 'COURT_GRANT',
    current_status: 'IN_CONVEYANCING',
    conveyancing_status: 'FORMS_READY',
    conveyancing_received_date: '2025-02-05',
    conveyancing_assigned_officer_id: '00000000-0000-0000-0000-000000000002',
    grant_reference: 'SUC/P&A/2025/1234', grant_date: '2025-01-20', confirmed_grant_date: '2025-02-05',
    estate_value_estimate: 20500000,
    assigned_officer_id: '00000000-0000-0000-0000-000000000002', officer_name: 'Mercy Wanjiku',
    created_by: '00000000-0000-0000-0000-000000000004', created_by_name: 'Anne Nyambura',
    certified_copy_grant_present: true, certified_copy_summary_cert_present: false,
    fees_paid_status: 'PAID', payment_reference: 'REC/2025/4567', payment_date: '2025-02-06',
    lr39_prepared: true, lr39_prepared_date: '2025-02-10', lr39_prepared_by: '00000000-0000-0000-0000-000000000002',
    lr39_signed_sealed: true, lr39_signed_sealed_date: '2025-02-12', lr39_signed_sealed_by: '00000000-0000-0000-0000-000000000002',
    lr42_prepared: true, lr42_prepared_date: '2025-02-11', lr42_prepared_by: '00000000-0000-0000-0000-000000000002',
    lr42_signed_sealed: true, lr42_signed_sealed_date: '2025-02-13', lr42_signed_sealed_by: '00000000-0000-0000-0000-000000000002',
    intake_date: '2025-01-10',
    notes: 'High-value estate with multiple properties in Nairobi. All beneficiaries verified. LCB consent obtained for Kiambu parcel.',
    is_imported: false, is_deleted: false,
    created_at: '2025-01-10T08:30:00Z', updated_at: '2025-02-15T14:22:00Z'
  },
  {
    id: 'ef-002', file_number: 'PT/CV/2025/0002',
    deceased_full_name: 'Mary Akinyi Odhiambo', deceased_id_no: '23456789',
    date_of_death: '2024-08-22', county: 'Kisumu', sub_county: 'Kisumu Central',
    administration_type: 'SUMMARY', administration_route: 'SUMMARY_CERT',
    current_status: 'IN_CONVEYANCING',
    conveyancing_status: 'AWAITING_CERTIFIED_COPIES',
    conveyancing_received_date: '2025-02-20',
    conveyancing_assigned_officer_id: '00000000-0000-0000-0000-000000000003',
    grant_reference: 'SUM/KSM/2025/0456', grant_date: null, confirmed_grant_date: null,
    estate_value_estimate: 5200000,
    assigned_officer_id: '00000000-0000-0000-0000-000000000003', officer_name: 'James Mwangi',
    created_by: '00000000-0000-0000-0000-000000000004', created_by_name: 'Anne Nyambura',
    certified_copy_grant_present: false, certified_copy_summary_cert_present: false,
    fees_paid_status: 'UNKNOWN', payment_reference: null, payment_date: null,
    lr39_prepared: false, lr39_prepared_date: null, lr39_prepared_by: null,
    lr39_signed_sealed: false, lr39_signed_sealed_date: null, lr39_signed_sealed_by: null,
    lr42_prepared: false, lr42_prepared_date: null, lr42_prepared_by: null,
    lr42_signed_sealed: false, lr42_signed_sealed_date: null, lr42_signed_sealed_by: null,
    intake_date: '2025-01-15',
    notes: 'Summary administration. Single property in Kisumu. Awaiting certified copy.',
    is_imported: false, is_deleted: false,
    created_at: '2025-01-15T09:00:00Z', updated_at: '2025-02-20T14:00:00Z'
  },
  {
    id: 'ef-003', file_number: 'PT/CV/2025/0003',
    deceased_full_name: 'Peter Kibet Ruto', deceased_id_no: '34567890',
    date_of_death: '2024-10-05', county: 'Uasin Gishu', sub_county: 'Eldoret East',
    administration_type: 'COURT', administration_route: 'COURT_GRANT',
    current_status: 'IN_CONVEYANCING',
    conveyancing_status: 'RECEIVED_AT_CONVEYANCING',
    conveyancing_received_date: '2025-03-01',
    conveyancing_assigned_officer_id: '00000000-0000-0000-0000-000000000002',
    grant_reference: 'SUC/P&A/2025/2345', grant_date: '2025-02-10', confirmed_grant_date: '2025-02-28',
    estate_value_estimate: 15000000,
    assigned_officer_id: '00000000-0000-0000-0000-000000000002', officer_name: 'Mercy Wanjiku',
    created_by: '00000000-0000-0000-0000-000000000001', created_by_name: 'System Administrator',
    certified_copy_grant_present: false, certified_copy_summary_cert_present: false,
    fees_paid_status: 'NOT_PAID', payment_reference: null, payment_date: null,
    lr39_prepared: false, lr39_prepared_date: null, lr39_prepared_by: null,
    lr39_signed_sealed: false, lr39_signed_sealed_date: null, lr39_signed_sealed_by: null,
    lr42_prepared: false, lr42_prepared_date: null, lr42_prepared_by: null,
    lr42_signed_sealed: false, lr42_signed_sealed_date: null, lr42_signed_sealed_by: null,
    intake_date: '2025-02-01',
    notes: 'Large agricultural land. Just received at conveyancing.',
    is_imported: false, is_deleted: false,
    created_at: '2025-02-01T11:00:00Z', updated_at: '2025-03-01T10:00:00Z'
  },
  {
    id: 'ef-004', file_number: 'PT/CV/2025/0004',
    deceased_full_name: 'Grace Muthoni Karanja', deceased_id_no: '45678901',
    date_of_death: '2024-11-30', county: 'Mombasa', sub_county: 'Mvita',
    administration_type: 'COURT', administration_route: 'COURT_GRANT',
    current_status: 'IN_CONVEYANCING',
    conveyancing_status: 'AWAITING_RETURNED_TITLE_COPY',
    conveyancing_received_date: '2025-01-15',
    conveyancing_assigned_officer_id: '00000000-0000-0000-0000-000000000003',
    grant_reference: 'SUC/MSA/2025/0123', grant_date: '2025-01-05', confirmed_grant_date: '2025-01-12',
    estate_value_estimate: 8750000,
    assigned_officer_id: '00000000-0000-0000-0000-000000000003', officer_name: 'James Mwangi',
    created_by: '00000000-0000-0000-0000-000000000004', created_by_name: 'Anne Nyambura',
    certified_copy_grant_present: true, certified_copy_summary_cert_present: false,
    fees_paid_status: 'PAID', payment_reference: 'REC/2025/1111', payment_date: '2025-01-16',
    lr39_prepared: true, lr39_prepared_date: '2025-01-20', lr39_prepared_by: '00000000-0000-0000-0000-000000000003',
    lr39_signed_sealed: true, lr39_signed_sealed_date: '2025-01-22', lr39_signed_sealed_by: '00000000-0000-0000-0000-000000000003',
    lr42_prepared: true, lr42_prepared_date: '2025-01-20', lr42_prepared_by: '00000000-0000-0000-0000-000000000003',
    lr42_signed_sealed: true, lr42_signed_sealed_date: '2025-01-22', lr42_signed_sealed_by: '00000000-0000-0000-0000-000000000003',
    intake_date: '2025-01-05',
    notes: 'Documents issued to client. Awaiting returned title copy.',
    is_imported: false, is_deleted: false,
    created_at: '2025-01-05T07:00:00Z', updated_at: '2025-02-28T12:00:00Z'
  },
  {
    id: 'ef-005', file_number: 'PT/CV/2025/0005',
    deceased_full_name: 'Samuel Otieno Okello', deceased_id_no: '56789012',
    date_of_death: '2024-12-12', county: 'Nakuru', sub_county: 'Nakuru Town East',
    administration_type: 'COURT', administration_route: 'COURT_GRANT',
    current_status: 'IN_CONVEYANCING',
    conveyancing_status: 'CLOSED',
    conveyancing_received_date: '2025-01-10',
    conveyancing_assigned_officer_id: '00000000-0000-0000-0000-000000000002',
    grant_reference: 'SUC/P&A/2025/0789', grant_date: '2025-01-02', confirmed_grant_date: '2025-01-08',
    estate_value_estimate: 4200000,
    assigned_officer_id: '00000000-0000-0000-0000-000000000002', officer_name: 'Mercy Wanjiku',
    created_by: '00000000-0000-0000-0000-000000000004', created_by_name: 'Anne Nyambura',
    certified_copy_grant_present: true, certified_copy_summary_cert_present: false,
    fees_paid_status: 'PAID', payment_reference: 'REC/2025/0555', payment_date: '2025-01-11',
    lr39_prepared: true, lr39_prepared_date: '2025-01-15', lr39_prepared_by: '00000000-0000-0000-0000-000000000002',
    lr39_signed_sealed: true, lr39_signed_sealed_date: '2025-01-16', lr39_signed_sealed_by: '00000000-0000-0000-0000-000000000002',
    lr42_prepared: true, lr42_prepared_date: '2025-01-15', lr42_prepared_by: '00000000-0000-0000-0000-000000000002',
    lr42_signed_sealed: true, lr42_signed_sealed_date: '2025-01-16', lr42_signed_sealed_by: '00000000-0000-0000-0000-000000000002',
    intake_date: '2025-01-02',
    notes: 'All transfers completed. Proof received. File closed.',
    is_imported: false, is_deleted: false,
    created_at: '2025-01-02T06:00:00Z', updated_at: '2025-03-01T12:00:00Z'
  }
];

const MOCK_BENEFICIARIES = [
  { id: 'b-001', estate_file_id: 'ef-001', full_name: 'Jane Wambui Kamau', relationship_to_deceased: 'Spouse', id_no: '87654321', phone: '0722 111 222', address: 'P.O. Box 12345, Nairobi', is_transferee: true, created_at: '2025-01-12T08:00:00Z' },
  { id: 'b-002', estate_file_id: 'ef-001', full_name: 'David Kamau Junior', relationship_to_deceased: 'Son', id_no: '87654322', phone: '0733 222 333', address: 'P.O. Box 12345, Nairobi', is_transferee: true, created_at: '2025-01-12T08:05:00Z' },
  { id: 'b-003', estate_file_id: 'ef-001', full_name: 'Faith Njeri Kamau', relationship_to_deceased: 'Daughter', id_no: '87654323', phone: '0744 333 444', address: 'P.O. Box 67890, Kiambu', is_transferee: true, created_at: '2025-01-12T08:10:00Z' },
  { id: 'b-004', estate_file_id: 'ef-001', full_name: 'Samuel Kamau Njoroge', relationship_to_deceased: 'Brother', id_no: '87654324', phone: '0755 444 555', address: 'P.O. Box 11111, Thika', is_transferee: false, created_at: '2025-01-12T08:15:00Z' },
  { id: 'b-005', estate_file_id: 'ef-002', full_name: 'Thomas Odhiambo', relationship_to_deceased: 'Son', id_no: '76543210', phone: '0711 444 555', address: 'P.O. Box 4321, Kisumu', is_transferee: true, created_at: '2025-01-16T09:00:00Z' },
  { id: 'b-006', estate_file_id: 'ef-002', full_name: 'Rebecca Achieng Odhiambo', relationship_to_deceased: 'Daughter', id_no: '76543211', phone: '0722 555 666', address: 'P.O. Box 4321, Kisumu', is_transferee: true, created_at: '2025-01-16T09:05:00Z' },
  { id: 'b-007', estate_file_id: 'ef-003', full_name: 'Emily Jepkosgei Ruto', relationship_to_deceased: 'Spouse', id_no: '65432109', phone: '0733 666 777', address: 'P.O. Box 789, Eldoret', is_transferee: true, created_at: '2025-02-03T10:00:00Z' },
  { id: 'b-008', estate_file_id: 'ef-004', full_name: 'Kevin Karanja', relationship_to_deceased: 'Son', id_no: '54321000', phone: '0744 999 000', address: 'P.O. Box 200, Mombasa', is_transferee: true, created_at: '2025-01-06T09:00:00Z' },
  { id: 'b-009', estate_file_id: 'ef-005', full_name: 'Agnes Adhiambo Okello', relationship_to_deceased: 'Spouse', id_no: '54321098', phone: '0711 888 999', address: 'P.O. Box 555, Nakuru', is_transferee: true, created_at: '2025-01-03T08:00:00Z' }
];

const MOCK_ASSETS = [
  // ─── LAND PARCELS ───
  { id: 'a-001', estate_file_id: 'ef-001', asset_type: 'LAND_PARCEL', parcel_number: 'LR 1234/5', registry_office: 'Nairobi', county: 'Nairobi', land_size: '0.25 Ha', title_type: 'Freehold', encumbrance_flag: false, asset_status: 'IN_PROGRESS', parcel_status: 'TRANSFER_PREPARED', transfer_rate_amount: 0, transfer_rate_currency: 'KES', transfer_rate_notes: 'N/A - transmission', docs_issued_to_client: false, issue_date: null, issued_by_user_id: null, issue_notes: null, proof_of_registration_received: false, proof_received_date: null, closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', created_at: '2025-01-11T08:00:00Z' },
  { id: 'a-002', estate_file_id: 'ef-001', asset_type: 'LAND_PARCEL', parcel_number: 'KIAMBU/RUIRU/4567', registry_office: 'Kiambu', county: 'Kiambu', land_size: '1.5 Ha', title_type: 'Freehold', encumbrance_flag: true, asset_status: 'SIGNED_SEALED', parcel_status: 'SIGNED_SEALED', transfer_rate_amount: 0, transfer_rate_currency: 'KES', transfer_rate_notes: 'N/A - transmission', docs_issued_to_client: false, issue_date: null, issued_by_user_id: null, issue_notes: null, proof_of_registration_received: false, proof_received_date: null, closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', created_at: '2025-01-11T08:10:00Z' },
  { id: 'a-003', estate_file_id: 'ef-001', asset_type: 'LAND_PARCEL', parcel_number: 'NRB/BLK/78/901', registry_office: 'Nairobi', county: 'Nairobi', land_size: '0.05 Ha', title_type: 'Leasehold', encumbrance_flag: false, asset_status: 'COMPLETED', parcel_status: 'CLOSED', transfer_rate_amount: 0, transfer_rate_currency: 'KES', transfer_rate_notes: 'Transmission', docs_issued_to_client: true, issue_date: '2025-02-20', issued_by_user_id: '00000000-0000-0000-0000-000000000002', issue_notes: 'Docs handed to David Kamau Jr.', proof_of_registration_received: true, proof_received_date: '2025-02-28', closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', created_at: '2025-01-11T08:20:00Z' },
  { id: 'a-004', estate_file_id: 'ef-002', asset_type: 'LAND_PARCEL', parcel_number: 'KSM/MUN/2345', registry_office: 'Kisumu', county: 'Kisumu', land_size: '2.0 Ha', title_type: 'Freehold', encumbrance_flag: false, asset_status: 'PENDING', parcel_status: 'PARCEL_CAPTURED', transfer_rate_amount: null, transfer_rate_currency: 'KES', transfer_rate_notes: null, docs_issued_to_client: false, issue_date: null, issued_by_user_id: null, issue_notes: null, proof_of_registration_received: false, proof_received_date: null, closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0002', deceased_full_name: 'Mary Akinyi Odhiambo', created_at: '2025-01-16T10:00:00Z' },
  { id: 'a-005', estate_file_id: 'ef-004', asset_type: 'LAND_PARCEL', parcel_number: 'MSA/MVT/7890', registry_office: 'Mombasa', county: 'Mombasa', land_size: '0.3 Ha', title_type: 'Leasehold', encumbrance_flag: false, asset_status: 'COMPLETED', parcel_status: 'AWAITING_PROOF', transfer_rate_amount: 0, transfer_rate_currency: 'KES', transfer_rate_notes: 'Transmission', docs_issued_to_client: true, issue_date: '2025-02-25', issued_by_user_id: '00000000-0000-0000-0000-000000000003', issue_notes: 'Full bundle issued to Kevin Karanja', proof_of_registration_received: false, proof_received_date: null, closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0004', deceased_full_name: 'Grace Muthoni Karanja', created_at: '2025-01-06T10:00:00Z' },
  { id: 'a-006', estate_file_id: 'ef-005', asset_type: 'LAND_PARCEL', parcel_number: 'NKR/TWN/3456', registry_office: 'Nakuru', county: 'Nakuru', land_size: '0.1 Ha', title_type: 'Leasehold', encumbrance_flag: false, asset_status: 'COMPLETED', parcel_status: 'CLOSED', transfer_rate_amount: 0, transfer_rate_currency: 'KES', transfer_rate_notes: 'Transmission', docs_issued_to_client: true, issue_date: '2025-02-20', issued_by_user_id: '00000000-0000-0000-0000-000000000002', issue_notes: 'Docs issued to Agnes Okello', proof_of_registration_received: true, proof_received_date: '2025-02-25', closure_override: false, closure_override_reason: null, file_number: 'PT/CV/2025/0005', deceased_full_name: 'Samuel Otieno Okello', created_at: '2025-01-03T09:00:00Z' },
  // ─── MOTOR VEHICLE ───
  { id: 'a-007', estate_file_id: 'ef-001', asset_type: 'MOTOR_VEHICLE', vehicle_reg_number: 'KCF 123A', chassis_number: 'JTEBU5JR5D5012345', vehicle_make_model: 'Toyota Land Cruiser 2013', asset_description: 'White Toyota LC Prado, diesel', estimated_value: 3500000, transferee_name: 'David Kamau Junior', generic_status: 'IN_PROGRESS', form_c_prepared: true, form_c_prepared_date: '2025-02-12', signed_sealed: false, signed_sealed_date: null, logbook_transfer_confirmed: false, logbook_transfer_date: null, notes: 'Vehicle at NTSA for log-book verification.', file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', estate_file_id: 'ef-001', created_at: '2025-01-11T09:00:00Z' },
  // ─── SHARES (CDSC) ───
  { id: 'a-008', estate_file_id: 'ef-001', asset_type: 'SHARES_CDSC', company_name: 'Safaricom PLC', cdsc_account_number: '1234567890', number_of_shares: '5,000', asset_description: 'Safaricom ordinary shares via CDSC', estimated_value: 1250000, transferee_name: 'Jane Wambui Kamau', generic_status: 'FORMS_PREPARED', cds7_prepared: true, cds7_prepared_date: '2025-02-14', discharge_indemnity_prepared: true, discharge_indemnity_prepared_date: '2025-02-14', notes: 'CDS7 + Discharge indemnity sent to Safaricom registrar.', file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', created_at: '2025-01-11T09:10:00Z' },
  // ─── SHARES (CERTIFICATE) ───
  { id: 'a-009', estate_file_id: 'ef-004', asset_type: 'SHARES_CERTIFICATE', company_name: 'KenGen Ltd', share_certificate_number: 'KG-2019-00456', number_of_shares: '10,000', asset_description: 'KenGen ordinary shares - physical certificate', estimated_value: 620000, transferee_name: 'Kevin Karanja', generic_status: 'IN_PROGRESS', cds2_prepared: true, cds2_prepared_date: '2025-02-18', cds7_prepared: true, cds7_prepared_date: '2025-02-18', sale_transfer_prepared: false, sale_transfer_prepared_date: null, discharge_indemnity_prepared: false, discharge_indemnity_prepared_date: null, notes: 'CDS2 + CDS7 done. Awaiting sale transfer form.', file_number: 'PT/CV/2025/0004', deceased_full_name: 'Grace Muthoni Karanja', created_at: '2025-01-06T11:00:00Z' },
  // ─── UFAA CLAIM ───
  { id: 'a-010', estate_file_id: 'ef-002', asset_type: 'UFAA_CLAIM', ufaa_reference_number: 'UFAA/KSM/2024/0891', financial_institution: 'KCB Bank - Kisumu Branch', amount_claimed: 850000, asset_description: 'Unclaimed financial asset at KCB', estimated_value: 850000, transferee_name: 'Thomas Odhiambo', generic_status: 'IN_PROGRESS', form_4b_prepared: true, form_4b_prepared_date: '2025-02-22', form_5_prepared: false, form_5_prepared_date: null, claimant_account_details_captured: true, proof_funds_received_by_pt: false, payment_date_to_pt: null, transmission_to_beneficiary_status: null, notes: 'Form 4B lodged with UFAA. Awaiting Form 5 release.', file_number: 'PT/CV/2025/0002', deceased_full_name: 'Mary Akinyi Odhiambo', created_at: '2025-01-16T11:00:00Z' },
  // ─── DISCHARGE OF CHARGE ───
  { id: 'a-011', estate_file_id: 'ef-003', asset_type: 'DISCHARGE_OF_CHARGE', lending_institution: 'Housing Finance Company', loan_reference_number: 'HF/ML/2019/3456', property_parcel_number: 'UG/ELD/1234', asset_description: 'Discharge mortgage on Eldoret property', estimated_value: null, generic_status: 'NOT_STARTED', discharge_document_prepared: false, discharge_document_prepared_date: null, discharge_registered: false, discharge_date: null, notes: 'Pending confirmation of nil balance from Housing Finance.', file_number: 'PT/CV/2025/0003', deceased_full_name: 'Peter Kibet Ruto', created_at: '2025-02-03T11:00:00Z' },
  // ─── LAND COMPANY ───
  { id: 'a-012', estate_file_id: 'ef-003', asset_type: 'LAND_COMPANY', company_name: 'Eldoret Ranches Ltd', company_reg_number: 'CPR/2015/67890', share_certificate_number: 'ER-CERT-0045', plot_allocation: 'Plot 45, Block B', number_of_shares: '200', asset_description: 'Shares in Eldoret Ranches (entitling 2-acre plot)', estimated_value: 4500000, transferee_name: 'Emily Jepkosgei Ruto', parcel_status: 'PARCEL_CAPTURED', notes: 'Awaiting company AGM resolution for share transfer.', file_number: 'PT/CV/2025/0003', deceased_full_name: 'Peter Kibet Ruto', created_at: '2025-02-03T11:30:00Z' },
  // ─── OTHER ───
  { id: 'a-013', estate_file_id: 'ef-001', asset_type: 'OTHER', asset_description: 'Household goods and personal effects', estimated_value: 120000, transferee_name: 'Jane Wambui Kamau', generic_status: 'COMPLETED', notes: 'Distributed by family agreement. No formal transfer required.', file_number: 'PT/CV/2025/0001', deceased_full_name: 'John Kamau Njoroge', created_at: '2025-01-11T09:30:00Z' }
];

const MOCK_TRANSFERS = [
  { id: 't-001', asset_id: 'a-001', estate_file_id: 'ef-001', beneficiary_id: 'b-001', transferee_name: 'Jane Wambui Kamau', transferee_id_no: '87654321', transfer_type: 'TRANSMISSION', share_details: '1/2 share', transfer_status: 'READY_FOR_SIGN', completion_date: null, remarks: 'Surviving spouse - S.35 Law of Succession Act', created_at: '2025-02-01T08:00:00Z' },
  { id: 't-002', asset_id: 'a-001', estate_file_id: 'ef-001', beneficiary_id: 'b-002', transferee_name: 'David Kamau Junior', transferee_id_no: '87654322', transfer_type: 'TRANSMISSION', share_details: '1/4 share', transfer_status: 'DRAFT', completion_date: null, remarks: 'Eldest son', created_at: '2025-02-01T08:10:00Z' },
  { id: 't-003', asset_id: 'a-001', estate_file_id: 'ef-001', beneficiary_id: 'b-003', transferee_name: 'Faith Njeri Kamau', transferee_id_no: '87654323', transfer_type: 'TRANSMISSION', share_details: '1/4 share', transfer_status: 'DRAFT', completion_date: null, remarks: null, created_at: '2025-02-01T08:20:00Z' },
  { id: 't-004', asset_id: 'a-002', estate_file_id: 'ef-001', beneficiary_id: 'b-001', transferee_name: 'Jane Wambui Kamau', transferee_id_no: '87654321', transfer_type: 'TRANSMISSION', share_details: 'Whole', transfer_status: 'SIGNED_SEALED', completion_date: null, remarks: 'LCB consent obtained.', created_at: '2025-02-05T09:00:00Z' },
  { id: 't-005', asset_id: 'a-003', estate_file_id: 'ef-001', beneficiary_id: 'b-002', transferee_name: 'David Kamau Junior', transferee_id_no: '87654322', transfer_type: 'TRANSMISSION', share_details: 'Whole', transfer_status: 'COMPLETED', completion_date: '2025-02-28', remarks: 'Transfer completed. Title collected.', created_at: '2025-02-08T10:00:00Z' },
  { id: 't-006', asset_id: 'a-005', estate_file_id: 'ef-004', beneficiary_id: 'b-008', transferee_name: 'Kevin Karanja', transferee_id_no: '54321000', transfer_type: 'TRANSMISSION', share_details: 'Whole', transfer_status: 'RELEASED_TO_CLIENT', completion_date: null, remarks: 'Docs issued, awaiting proof.', created_at: '2025-02-15T10:00:00Z' },
  { id: 't-007', asset_id: 'a-006', estate_file_id: 'ef-005', beneficiary_id: 'b-009', transferee_name: 'Agnes Adhiambo Okello', transferee_id_no: '54321098', transfer_type: 'TRANSMISSION', share_details: 'Whole', transfer_status: 'COMPLETED', completion_date: '2025-02-25', remarks: 'Proof received.', created_at: '2025-02-10T11:00:00Z' }
];

const MOCK_DOCUMENTS = [
  { id: 'doc-001', estate_file_id: 'ef-001', doc_type: 'GRANT', file_name: 'Grant_of_Letters_PT2025_0001.pdf', file_size: 245760, uploaded_by: '00000000-0000-0000-0000-000000000004', uploaded_by_name: 'Anne Nyambura', uploaded_at: '2025-01-20T10:30:00Z' },
  { id: 'doc-002', estate_file_id: 'ef-001', doc_type: 'CONFIRMED_GRANT', file_name: 'Confirmed_Grant_PT2025_0001.pdf', file_size: 312000, uploaded_by: '00000000-0000-0000-0000-000000000004', uploaded_by_name: 'Anne Nyambura', uploaded_at: '2025-02-05T11:00:00Z' },
  { id: 'doc-003', estate_file_id: 'ef-001', doc_type: 'ID_COPY', file_name: 'ID_JaneWambui_87654321.pdf', file_size: 98304, uploaded_by: '00000000-0000-0000-0000-000000000004', uploaded_by_name: 'Anne Nyambura', uploaded_at: '2025-01-12T09:00:00Z' },
  { id: 'doc-004', estate_file_id: 'ef-001', doc_type: 'SEARCH', file_name: 'Official_Search_LR1234_5.pdf', file_size: 153600, uploaded_by: '00000000-0000-0000-0000-000000000002', uploaded_by_name: 'Mercy Wanjiku', uploaded_at: '2025-01-18T14:00:00Z' },
  { id: 'doc-005', estate_file_id: 'ef-001', doc_type: 'CONSENT', file_name: 'LandControlConsent_KIAMBU_4567.pdf', file_size: 204800, uploaded_by: '00000000-0000-0000-0000-000000000002', uploaded_by_name: 'Mercy Wanjiku', uploaded_at: '2025-02-10T09:30:00Z' },
  { id: 'doc-006', estate_file_id: 'ef-001', doc_type: 'TRANSFER_FORM', file_name: 'LR39_NRB_BLK_78_901.pdf', file_size: 189440, uploaded_by: '00000000-0000-0000-0000-000000000002', uploaded_by_name: 'Mercy Wanjiku', uploaded_at: '2025-02-15T10:00:00Z' },
  { id: 'doc-007', estate_file_id: 'ef-004', doc_type: 'GRANT', file_name: 'Grant_MSA_0123.pdf', file_size: 220000, uploaded_by: '00000000-0000-0000-0000-000000000004', uploaded_by_name: 'Anne Nyambura', uploaded_at: '2025-01-06T10:00:00Z' },
  { id: 'doc-008', estate_file_id: 'ef-005', doc_type: 'GRANT', file_name: 'Grant_NKR_0789.pdf', file_size: 230000, uploaded_by: '00000000-0000-0000-0000-000000000004', uploaded_by_name: 'Anne Nyambura', uploaded_at: '2025-01-03T10:00:00Z' },
  { id: 'doc-009', estate_file_id: 'ef-005', doc_type: 'OTHER', file_name: 'Proof_Title_NKR_TWN_3456.pdf', file_size: 350000, uploaded_by: '00000000-0000-0000-0000-000000000002', uploaded_by_name: 'Mercy Wanjiku', uploaded_at: '2025-02-25T14:00:00Z' }
];

const MOCK_WORKFLOW_EVENTS = [
  { id: 'ev-001', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'STATUS_CHANGE', description: 'File received at Conveyancing Section', from_status: null, to_status: 'RECEIVED_AT_CONVEYANCING', performed_by: '00000000-0000-0000-0000-000000000004', performed_by_name: 'Anne Nyambura', performed_at: '2025-02-05T08:30:00Z' },
  { id: 'ev-002', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'Certified copy of grant confirmed. Checklist marked.', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-06T09:00:00Z' },
  { id: 'ev-003', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'Fees confirmed PAID. Ref: REC/2025/4567', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-06T09:30:00Z' },
  { id: 'ev-004', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'STATUS_CHANGE', description: 'Checklist gate passed - Forms Preparation', from_status: 'RECEIVED_AT_CONVEYANCING', to_status: 'FORMS_IN_PROGRESS', performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-06T10:00:00Z' },
  { id: 'ev-005', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'LR 39 prepared for all 3 parcels', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-10T10:00:00Z' },
  { id: 'ev-006', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'LR 42 prepared for all 3 parcels', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-11T10:00:00Z' },
  { id: 'ev-007', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'STATUS_CHANGE', description: 'LR39 & LR42 completed - Forms Ready', from_status: 'FORMS_IN_PROGRESS', to_status: 'FORMS_READY', performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-12T08:00:00Z' },
  { id: 'ev-008', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'NRB/BLK/78/901 - documents issued to David Kamau Jr.', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-20T10:00:00Z' },
  { id: 'ev-009', estate_file_id: 'ef-001', file_number: 'PT/CV/2025/0001', event_type: 'NOTE', description: 'NRB/BLK/78/901 - proof received. Parcel closed.', from_status: null, to_status: null, performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-02-28T15:00:00Z' },
  { id: 'ev-010', estate_file_id: 'ef-002', file_number: 'PT/CV/2025/0002', event_type: 'STATUS_CHANGE', description: 'File received - awaiting certified copies', from_status: null, to_status: 'AWAITING_CERTIFIED_COPIES', performed_by: '00000000-0000-0000-0000-000000000004', performed_by_name: 'Anne Nyambura', performed_at: '2025-02-20T09:00:00Z' },
  { id: 'ev-011', estate_file_id: 'ef-004', file_number: 'PT/CV/2025/0004', event_type: 'STATUS_CHANGE', description: 'Documents issued to client', from_status: 'FORMS_READY', to_status: 'DOCUMENTS_ISSUED', performed_by: '00000000-0000-0000-0000-000000000003', performed_by_name: 'James Mwangi', performed_at: '2025-02-25T10:00:00Z' },
  { id: 'ev-012', estate_file_id: 'ef-005', file_number: 'PT/CV/2025/0005', event_type: 'STATUS_CHANGE', description: 'Proof received. File closed.', from_status: 'AWAITING_RETURNED_TITLE_COPY', to_status: 'CLOSED', performed_by: '00000000-0000-0000-0000-000000000002', performed_by_name: 'Mercy Wanjiku', performed_at: '2025-03-01T12:00:00Z' }
];

const MOCK_AUDIT_LOGS = [
  { id: 'al-001', user_id: '00000000-0000-0000-0000-000000000001', username: 'admin', full_name: 'System Administrator', action: 'LOGIN', entity_type: 'auth', entity_id: null, description: 'User logged in', ip_address: '192.168.1.10', created_at: '2025-03-03T08:00:00Z' },
  { id: 'al-002', user_id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', action: 'UPDATE', entity_type: 'estate_file', entity_id: 'ef-001', description: 'Certified copy grant marked present', ip_address: '192.168.1.15', created_at: '2025-02-06T09:00:00Z' },
  { id: 'al-003', user_id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', action: 'UPDATE', entity_type: 'estate_file', entity_id: 'ef-001', description: 'Fees confirmed PAID ref REC/2025/4567', ip_address: '192.168.1.15', created_at: '2025-02-06T09:30:00Z' },
  { id: 'al-004', user_id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', action: 'UPDATE', entity_type: 'estate_file', entity_id: 'ef-001', description: 'LR39 prepared', ip_address: '192.168.1.15', created_at: '2025-02-10T10:00:00Z' },
  { id: 'al-005', user_id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', action: 'UPDATE', entity_type: 'asset', entity_id: 'a-003', description: 'Parcel NRB/BLK/78/901 closed - proof received', ip_address: '192.168.1.15', created_at: '2025-02-28T15:00:00Z' },
  { id: 'al-006', user_id: '00000000-0000-0000-0000-000000000002', username: 'mercy', full_name: 'Mercy Wanjiku', action: 'UPDATE', entity_type: 'estate_file', entity_id: 'ef-005', description: 'File closed - all parcels closed', ip_address: '192.168.1.15', created_at: '2025-03-01T12:00:00Z' }
];

// MIDDLEWARE
function testModeMiddleware(req, res, next) {
  if (process.env.TEST_MODE !== 'true') return next();
  var method = req.method;
  var p = req.path;

  // AUTH
  if (p === '/api/auth/login' && method === 'POST') return res.json({ token: 'test-token', user: MOCK_USERS[0] });
  if (p === '/api/auth/me') return res.json({ user: MOCK_USERS[0] });
  if (p === '/api/auth/logout' && method === 'POST') return res.json({ message: 'Logged out' });

  // DASHBOARD
  if (p === '/api/dashboard') {
    return res.json({
      cards: {
        active_files: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status!=='CLOSED'}).length,
        awaiting_certified_copies: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status==='AWAITING_CERTIFIED_COPIES'}).length,
        awaiting_fees: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status==='AWAITING_FEE_CONFIRMATION'}).length,
        forms_in_progress: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status==='FORMS_READY'||f.conveyancing_status==='FORMS_IN_PROGRESS'}).length,
        awaiting_proof: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status==='AWAITING_RETURNED_TITLE_COPY'}).length,
        closed_files: MOCK_ESTATE_FILES.filter(function(f){return f.conveyancing_status==='CLOSED'}).length,
        total_assets: MOCK_ASSETS.length,
        total_parcels: MOCK_ASSETS.filter(function(a){return a.asset_type==='LAND_PARCEL'||a.asset_type==='LAND_COMPANY'}).length,
        transfers_completed: MOCK_TRANSFERS.filter(function(t){return t.transfer_status==='COMPLETED'}).length
      },
      status_breakdown: [
        { conveyancing_status: 'RECEIVED_AT_CONVEYANCING', count: 1 },
        { conveyancing_status: 'AWAITING_CERTIFIED_COPIES', count: 1 },
        { conveyancing_status: 'FORMS_READY', count: 1 },
        { conveyancing_status: 'AWAITING_RETURNED_TITLE_COPY', count: 1 },
        { conveyancing_status: 'CLOSED', count: 1 }
      ],
      asset_type_breakdown: (function() {
        var counts = {};
        MOCK_ASSETS.forEach(function(a) {
          counts[a.asset_type] = (counts[a.asset_type] || 0) + 1;
        });
        return Object.keys(counts).map(function(k) { return { asset_type: k, count: counts[k] }; });
      })(),
      route_breakdown: [
        { administration_route: 'COURT_GRANT', count: 4 },
        { administration_route: 'SUMMARY_CERT', count: 1 }
      ],
      recent_events: MOCK_WORKFLOW_EVENTS.sort(function(a,b){return new Date(b.performed_at)-new Date(a.performed_at)}).slice(0,8),
      officer_workload: [
        { id: '00000000-0000-0000-0000-000000000002', full_name: 'Mercy Wanjiku', active_cases: 3, received_this_month: 1, issued_this_month: 0, closed_this_month: 1 },
        { id: '00000000-0000-0000-0000-000000000003', full_name: 'James Mwangi', active_cases: 2, received_this_month: 0, issued_this_month: 1, closed_this_month: 0 }
      ]
    });
  }

  // ESTATE FILES list
  if (p === '/api/estate-files' && method === 'GET') {
    return res.json({ estate_files: MOCK_ESTATE_FILES, pagination: { page: 1, limit: 25, total: MOCK_ESTATE_FILES.length, total_pages: 1 } });
  }

  // ESTATE FILE detail
  if (/^\/api\/estate-files\/[^/]+$/.test(p) && method === 'GET') {
    var id = p.split('/').pop();
    var file = MOCK_ESTATE_FILES.find(function(f){return f.id===id}) || MOCK_ESTATE_FILES[0];
    return res.json({
      estate_file: file,
      beneficiaries: MOCK_BENEFICIARIES.filter(function(b){return b.estate_file_id===file.id}),
      assets: MOCK_ASSETS.filter(function(a){return a.estate_file_id===file.id}),
      documents: MOCK_DOCUMENTS.filter(function(d){return d.estate_file_id===file.id}),
      workflow_events: MOCK_WORKFLOW_EVENTS.filter(function(e){return e.estate_file_id===file.id}).sort(function(a,b){return new Date(b.performed_at)-new Date(a.performed_at)})
    });
  }

  // ESTATE FILE PATCH
  if (/^\/api\/estate-files\/[^/]+$/.test(p) && method === 'PATCH') {
    var eid = p.split('/').pop();
    var ef = MOCK_ESTATE_FILES.find(function(f){return f.id===eid}) || MOCK_ESTATE_FILES[0];
    return res.json({ estate_file: Object.assign({}, ef, req.body || {}), message: '[TEST MODE] Updated' });
  }

  // ESTATE FILE create
  if (/^\/api\/estate-files/.test(p) && method === 'POST') {
    return res.status(201).json({ estate_file: Object.assign({}, MOCK_ESTATE_FILES[0], {id:'ef-new-'+Date.now(), file_number:'PT/CV/2025/'+String(Date.now()).slice(-4)}), message: '[TEST MODE] Created' });
  }
  if (/^\/api\/estate-files\/[^/]+$/.test(p) && method === 'PUT') {
    return res.json({ estate_file: MOCK_ESTATE_FILES[0], message: '[TEST MODE] Updated' });
  }

  // BENEFICIARIES
  if (/beneficiaries/.test(p) && method === 'POST') return res.status(201).json({ beneficiary: Object.assign({}, MOCK_BENEFICIARIES[0], {id:'b-new-'+Date.now()}), message: '[TEST MODE] Added' });
  if (/beneficiaries/.test(p) && method === 'GET') {
    var fid = p.match(/estate-files\/([^/]+)/);
    fid = fid ? fid[1] : null;
    return res.json({ beneficiaries: fid ? MOCK_BENEFICIARIES.filter(function(b){return b.estate_file_id===fid}) : MOCK_BENEFICIARIES });
  }

  // ASSET transfers
  if (/^\/api\/assets\/([^/]+)\/transfers/.test(p) && method === 'GET') {
    var aid = p.match(/assets\/([^/]+)/)[1];
    return res.json({ transfers: MOCK_TRANSFERS.filter(function(t){return t.asset_id===aid}) });
  }
  if (/^\/api\/assets\/([^/]+)\/transfers/.test(p) && method === 'POST') return res.status(201).json({ transfer: MOCK_TRANSFERS[0], message: '[TEST MODE] Created' });

  // ASSET detail
  if (/^\/api\/assets\/([^/]+)$/.test(p) && method === 'GET') {
    var assetId = p.split('/').pop();
    var asset = MOCK_ASSETS.find(function(a){return a.id===assetId}) || MOCK_ASSETS[0];
    return res.json({ asset: asset, transfers: MOCK_TRANSFERS.filter(function(t){return t.asset_id===asset.id}), workflow_events: MOCK_WORKFLOW_EVENTS.filter(function(e){return e.estate_file_id===asset.estate_file_id}).slice(0,5) });
  }

  // ASSET PATCH
  if (/^\/api\/assets\/[^/]+$/.test(p) && method === 'PATCH') {
    var patchAssetId = p.split('/').pop();
    var patchAsset = MOCK_ASSETS.find(function(a){return a.id===patchAssetId}) || MOCK_ASSETS[0];
    return res.json({ asset: Object.assign({}, patchAsset, req.body || {}), message: '[TEST MODE] Updated' });
  }

  // ASSETS create
  if (/assets/.test(p) && method === 'POST') return res.status(201).json({ asset: MOCK_ASSETS[0], message: '[TEST MODE] Added' });

  // TRANSFERS
  if (/^\/api\/transfers\/[^/]+$/.test(p) && method === 'PATCH') return res.json({ transfer: MOCK_TRANSFERS[0], message: '[TEST MODE] Updated' });
  if (/transfers/.test(p) && method === 'GET') return res.json({ transfers: MOCK_TRANSFERS });

  // USERS
  if (p === '/api/users' && method === 'GET') {
    var roleFilter = req.query.role;
    return res.json({ users: roleFilter ? MOCK_USERS.filter(function(u){return u.role===roleFilter}) : MOCK_USERS });
  }
  if (/^\/api\/users\/[^/]+$/.test(p) && method === 'GET') {
    var uid = p.split('/').pop();
    return res.json({ user: MOCK_USERS.find(function(u){return u.id===uid}) || MOCK_USERS[0] });
  }
  if (p === '/api/users' && method === 'POST') return res.status(201).json({ user: Object.assign({}, MOCK_USERS[0], {id:'u-new-'+Date.now()}), message: '[TEST MODE] Created' });
  if (/^\/api\/users\/[^/]+$/.test(p) && method === 'PUT') return res.json({ user: MOCK_USERS[0], message: '[TEST MODE] Updated' });

  // WORKFLOW EVENTS
  if (/workflow-events/.test(p) && method === 'POST') return res.status(201).json({ event: Object.assign({}, MOCK_WORKFLOW_EVENTS[0], {id:'ev-new-'+Date.now()}), message: '[TEST MODE] Logged' });
  if (/workflow-events/.test(p) && method === 'GET') {
    var wfFileId = req.query.estate_file_id;
    var events = wfFileId ? MOCK_WORKFLOW_EVENTS.filter(function(e){return e.estate_file_id===wfFileId}) : MOCK_WORKFLOW_EVENTS;
    return res.json({ events: events.sort(function(a,b){return new Date(b.performed_at)-new Date(a.performed_at)}) });
  }

  // DOCUMENTS
  if (/^\/api\/documents\/[^/]+\/download/.test(p)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="test-document.pdf"');
    return res.send(Buffer.from('Mock PDF content'));
  }
  if (/documents\/upload/.test(p) && method === 'POST') return res.status(201).json({ document: Object.assign({}, MOCK_DOCUMENTS[0], {id:'doc-new-'+Date.now()}), message: '[TEST MODE] Uploaded' });
  if (/documents/.test(p) && method === 'GET') {
    var docFileId = req.query.estate_file_id;
    return res.json({ documents: docFileId ? MOCK_DOCUMENTS.filter(function(d){return d.estate_file_id===docFileId}) : MOCK_DOCUMENTS });
  }

  // REPORTS
  if (/^\/api\/reports\/asset-summary/.test(p)) {
    var assetSummary = MOCK_ASSETS.map(function(a) {
      return {
        file_number: a.file_number || '',
        deceased: a.deceased_full_name || '',
        asset_type: a.asset_type,
        identifier: a.parcel_number || a.vehicle_reg_number || a.company_name || a.ufaa_reference_number || a.asset_description || a.asset_type,
        status: a.parcel_status || a.generic_status || a.asset_status || '—',
        estimated_value: a.estimated_value || null,
        transferee: a.transferee_name || '',
        created_at: a.created_at
      };
    });
    return res.json({ data: assetSummary, summary: { total: assetSummary.length } });
  }
  if (/^\/api\/reports\/parcel-transferee/.test(p)) {
    var mapping = MOCK_TRANSFERS.map(function(t) {
      var a = MOCK_ASSETS.find(function(x){return x.id===t.asset_id});
      return { parcel_number: a ? a.parcel_number : '', transferee_name: t.transferee_name, transferee_id_no: t.transferee_id_no, transfer_status: t.transfer_status, share_details: t.share_details, file_number: a ? a.file_number : '', completion_date: t.completion_date };
    });
    return res.json({ data: mapping, summary: { total: mapping.length } });
  }
  if (/^\/api\/reports\/transfers/.test(p)) return res.json({ data: MOCK_TRANSFERS, summary: { total: MOCK_TRANSFERS.length, completed: MOCK_TRANSFERS.filter(function(t){return t.transfer_status==='COMPLETED'}).length } });
  if (/^\/api\/reports/.test(p)) return res.json({ data: MOCK_ESTATE_FILES, summary: { total: MOCK_ESTATE_FILES.length } });

  // AUDIT LOGS
  if (/^\/api\/audit/.test(p)) return res.json({ logs: MOCK_AUDIT_LOGS, pagination: { page: 1, limit: 50, total: MOCK_AUDIT_LOGS.length, total_pages: 1 } });

  // IMPORT
  if (/^\/api\/import/.test(p) && method === 'POST') return res.json({ message: '[TEST MODE] Import processed', imported: 0 });

  // HEALTH
  if (p === '/api/health') return res.json({ status: 'ok (test mode)', timestamp: new Date().toISOString() });

  next();
}

module.exports = testModeMiddleware;
