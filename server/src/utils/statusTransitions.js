/**
 * Status transitions for the Conveyancing-Stage Workflow.
 *
 * CONVEYANCING FILE statuses (the primary workflow):
 *   RECEIVED_AT_CONVEYANCING → AWAITING_CERTIFIED_COPIES | AWAITING_FEE_CONFIRMATION | FORMS_IN_PROGRESS
 *   AWAITING_CERTIFIED_COPIES → RECEIVED_AT_CONVEYANCING | AWAITING_FEE_CONFIRMATION
 *   AWAITING_FEE_CONFIRMATION → RECEIVED_AT_CONVEYANCING | AWAITING_CERTIFIED_COPIES | FORMS_IN_PROGRESS
 *   FORMS_IN_PROGRESS → FORMS_READY
 *   FORMS_READY → DOCUMENTS_ISSUED
 *   DOCUMENTS_ISSUED → AWAITING_RETURNED_TITLE_COPY
 *   AWAITING_RETURNED_TITLE_COPY → PARTIALLY_CLOSED | CLOSED
 *   PARTIALLY_CLOSED → CLOSED
 *   CLOSED → (terminal)
 *
 * PARCEL statuses:
 *   PARCEL_CAPTURED → TRANSFER_PREPARED
 *   TRANSFER_PREPARED → SIGNED_SEALED
 *   SIGNED_SEALED → DOCUMENTS_ISSUED
 *   DOCUMENTS_ISSUED → AWAITING_PROOF
 *   AWAITING_PROOF → CLOSED
 *   CLOSED → (terminal)
 */

// ─── Conveyancing File Status Transitions ───
const CONVEYANCING_STATUS_TRANSITIONS = {
  RECEIVED_AT_CONVEYANCING: ['AWAITING_CERTIFIED_COPIES', 'AWAITING_FEE_CONFIRMATION', 'FORMS_IN_PROGRESS'],
  AWAITING_CERTIFIED_COPIES: ['RECEIVED_AT_CONVEYANCING', 'AWAITING_FEE_CONFIRMATION'],
  AWAITING_FEE_CONFIRMATION: ['RECEIVED_AT_CONVEYANCING', 'AWAITING_CERTIFIED_COPIES', 'FORMS_IN_PROGRESS'],
  FORMS_IN_PROGRESS: ['FORMS_READY'],
  FORMS_READY: ['DOCUMENTS_ISSUED', 'FORMS_IN_PROGRESS'],
  DOCUMENTS_ISSUED: ['AWAITING_RETURNED_TITLE_COPY'],
  AWAITING_RETURNED_TITLE_COPY: ['PARTIALLY_CLOSED', 'CLOSED'],
  PARTIALLY_CLOSED: ['CLOSED', 'AWAITING_RETURNED_TITLE_COPY'],
  CLOSED: []
};

// ─── Parcel Status Transitions ───
const PARCEL_STATUS_TRANSITIONS = {
  PARCEL_CAPTURED: ['TRANSFER_PREPARED'],
  TRANSFER_PREPARED: ['SIGNED_SEALED', 'PARCEL_CAPTURED'],
  SIGNED_SEALED: ['DOCUMENTS_ISSUED', 'TRANSFER_PREPARED'],
  DOCUMENTS_ISSUED: ['AWAITING_PROOF'],
  AWAITING_PROOF: ['CLOSED'],
  CLOSED: []
};

// ─── Legacy estate_status transitions (kept for backward compat) ───
const ESTATE_STATUS_TRANSITIONS = {
  INTAKE: ['WAITING_GRANT', 'IN_CONVEYANCING', 'ON_HOLD'],
  WAITING_GRANT: ['IN_CONVEYANCING', 'ON_HOLD'],
  IN_CONVEYANCING: ['PARTIALLY_COMPLETED', 'COMPLETED', 'ON_HOLD'],
  PARTIALLY_COMPLETED: ['IN_CONVEYANCING', 'COMPLETED', 'ON_HOLD'],
  COMPLETED: [],
  ON_HOLD: ['INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 'PARTIALLY_COMPLETED']
};

// ─── Transfer Status Transitions ───
const TRANSFER_STATUS_TRANSITIONS = {
  DRAFT: ['READY_FOR_SIGN'],
  READY_FOR_SIGN: ['SIGNED_SEALED', 'DRAFT'],
  SIGNED_SEALED: ['UPLOADED', 'READY_FOR_SIGN'],
  UPLOADED: ['RELEASED_TO_CLIENT', 'SIGNED_SEALED'],
  RELEASED_TO_CLIENT: ['COMPLETED', 'UPLOADED'],
  COMPLETED: []
};

// ─── Legacy asset_status transitions ───
const ASSET_STATUS_TRANSITIONS = {
  PENDING: ['IN_PROGRESS', 'ON_HOLD'],
  IN_PROGRESS: ['SIGNED_SEALED', 'ON_HOLD'],
  SIGNED_SEALED: ['UPLOADED', 'ON_HOLD'],
  UPLOADED: ['COMPLETED', 'ON_HOLD'],
  COMPLETED: [],
  ON_HOLD: ['PENDING', 'IN_PROGRESS', 'SIGNED_SEALED', 'UPLOADED']
};

// ─── Generic Asset Completion Status (shared by all non-land asset types) ───
const GENERIC_ASSET_STATUS_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS'],
  IN_PROGRESS: ['AWAITING_DOCUMENTS', 'FORMS_PREPARED', 'COMPLETED'],
  AWAITING_DOCUMENTS: ['IN_PROGRESS', 'FORMS_PREPARED'],
  FORMS_PREPARED: ['SUBMITTED', 'IN_PROGRESS'],
  SUBMITTED: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: []
};

const isValidTransition = (transitions, from, to) => {
  if (!transitions[from]) return false;
  return transitions[from].includes(to);
};

/**
 * Checklist gate: must have certified copies + fees confirmed
 * before moving to FORMS_IN_PROGRESS.
 */
function checkConveyancingGate(estateFile) {
  const errors = [];
  const route = estateFile.administration_route || '';

  // Certified copies check
  if (route === 'COURT_GRANT' && !estateFile.certified_copy_grant_present) {
    errors.push('Certified copy of Grant is required before forms preparation.');
  }
  if (route === 'SUMMARY_CERT' && !estateFile.certified_copy_summary_cert_present) {
    errors.push('Certified copy of Summary Certificate is required before forms preparation.');
  }
  if (!route) {
    if (!estateFile.certified_copy_grant_present && !estateFile.certified_copy_summary_cert_present) {
      errors.push('At least one certified copy (Grant or Summary Cert) is required.');
    }
  }

  // Fees check
  if (!estateFile.fees_paid_status || estateFile.fees_paid_status === 'NOT_PAID' || estateFile.fees_paid_status === 'UNKNOWN') {
    errors.push('Publication fees must be confirmed (PAID or EXEMPT) before forms preparation.');
  }

  return errors;
}

/**
 * Closure gate: parcel must have proof_of_registration OR closure_override.
 */
function checkParcelClosureGate(asset) {
  if (!asset.proof_of_registration_received && !asset.closure_override) {
    return ['Proof of registration not received. Use admin override or upload proof first.'];
  }
  return [];
}

/**
 * Generic asset completion gate: checks whether a non-land asset can be marked COMPLETED.
 */
function checkGenericAssetCompletionGate(asset) {
  const errors = [];
  const t = asset.asset_type;

  if (t === 'MOTOR_VEHICLE') {
    if (!asset.form_c_prepared) errors.push('Form C must be prepared before completion.');
    if (!asset.signed_sealed) errors.push('Vehicle transfer must be signed and sealed.');
  }
  if (t === 'SHARES_CDSC') {
    if (!asset.cds7_prepared) errors.push('CDS7 form must be prepared.');
    if (!asset.discharge_indemnity_prepared) errors.push('Discharge indemnity must be prepared.');
  }
  if (t === 'SHARES_CERTIFICATE') {
    if (!asset.cds7_prepared) errors.push('CDS7 form must be prepared.');
    if (!asset.cds2_prepared) errors.push('CDS2 form must be prepared.');
    if (!asset.sale_transfer_prepared) errors.push('Sale transfer form must be prepared.');
    if (!asset.discharge_indemnity_prepared) errors.push('Discharge indemnity must be prepared.');
  }
  if (t === 'UFAA_CLAIM') {
    if (!asset.form_4b_prepared) errors.push('Form 4B must be prepared.');
    if (!asset.form_5_prepared) errors.push('Form 5 must be prepared.');
    if (!asset.proof_funds_received_by_pt) errors.push('Proof of funds received by Public Trustee required.');
  }
  if (t === 'DISCHARGE_OF_CHARGE') {
    if (!asset.discharge_document_prepared) errors.push('Discharge document must be prepared.');
    if (!asset.discharge_registered) errors.push('Discharge must be registered.');
  }

  return errors;
}

/**
 * File closure gate: all assets must be closed/completed OR override used.
 */
function checkFileClosureGate(assets) {
  const unclosed = assets.filter(a => {
    const ps = a.parcel_status;
    const gs = a.generic_status;
    const as = a.asset_status;
    // Land parcels use parcel_status
    if (a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY') {
      return ps !== 'CLOSED';
    }
    // Other asset types use generic_status
    if (gs) return gs !== 'COMPLETED';
    // Legacy fallback
    return as !== 'COMPLETED';
  });
  if (unclosed.length > 0) {
    return [`${unclosed.length} asset(s) not yet completed. Close/complete all assets first or use override.`];
  }
  return [];
}

module.exports = {
  CONVEYANCING_STATUS_TRANSITIONS,
  PARCEL_STATUS_TRANSITIONS,
  ESTATE_STATUS_TRANSITIONS,
  ASSET_STATUS_TRANSITIONS,
  GENERIC_ASSET_STATUS_TRANSITIONS,
  TRANSFER_STATUS_TRANSITIONS,
  isValidTransition,
  checkConveyancingGate,
  checkParcelClosureGate,
  checkGenericAssetCompletionGate,
  checkFileClosureGate
};
