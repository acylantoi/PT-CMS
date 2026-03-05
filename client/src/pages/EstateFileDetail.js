import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Loading, Modal, formatDate, formatDateTime, EmptyState } from '../components/Common';

/* helpers */
const eventIcon = (type) => {
  switch (type) {
    case 'STATUS_CHANGE': return '\u{1F504}';
    case 'DOCUMENT_UPLOADED': return '\u{1F4C4}';
    case 'NOTE': return '\u{1F4DD}';
    default: return '\u{1F4CC}';
  }
};

const ASSET_TYPE_META = {
  LAND_PARCEL:         { icon: '\u{1F3D7}\uFE0F', label: 'Land (Individual Title)', short: 'Land' },
  LAND_COMPANY:        { icon: '\u{1F3E2}', label: 'Land (Holding Company)', short: 'Company Land' },
  SHARES_CDSC:         { icon: '\u{1F4C8}', label: 'Shares (CDSC Account)', short: 'CDSC Shares' },
  SHARES_CERTIFICATE:  { icon: '\u{1F4DC}', label: 'Shares (Share Certificate)', short: 'Cert Shares' },
  MOTOR_VEHICLE:       { icon: '\u{1F697}', label: 'Motor Vehicle', short: 'Vehicle' },
  UFAA_CLAIM:          { icon: '\u{1F4B0}', label: 'UFAA Claim', short: 'UFAA' },
  DISCHARGE_OF_CHARGE: { icon: '\u{1F3E6}', label: 'Discharge of Charge', short: 'Discharge' },
  OTHER:               { icon: '\u{1F4E6}', label: 'Other Asset', short: 'Other' },
};

const getAssetLabel = (a) => {
  if (a.parcel_number) return a.parcel_number;
  if (a.vehicle_reg_number) return a.vehicle_reg_number;
  if (a.company_name) return a.company_name;
  if (a.ufaa_reference_number) return a.ufaa_reference_number;
  if (a.asset_description) return a.asset_description;
  return (a.asset_type || 'Asset').replace(/_/g, ' ');
};

const getAssetStatus = (a) => {
  if (a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY') {
    return a.parcel_status || a.asset_status || 'PARCEL_CAPTURED';
  }
  return a.generic_status || a.asset_status || 'NOT_STARTED';
};

const isAssetComplete = (a) => {
  const s = getAssetStatus(a);
  return s === 'CLOSED' || s === 'COMPLETED';
};

/* Status Progress */
const CV_STEPS = [
  { key: 'RECEIVED_AT_CONVEYANCING', label: 'Received', icon: '\u{1F4E5}' },
  { key: 'CHECKLIST', label: 'Checklist', icon: '\u2705' },
  { key: 'FORMS_IN_PROGRESS', label: 'Forms', icon: '\u{1F4DD}' },
  { key: 'FORMS_READY', label: 'Ready', icon: '\u2713' },
  { key: 'DOCUMENTS_ISSUED', label: 'Issued', icon: '\u{1F4E4}' },
  { key: 'AWAITING_RETURNED_TITLE_COPY', label: 'Proof', icon: '\u{1F4CB}' },
  { key: 'CLOSED', label: 'Closed', icon: '\u{1F512}' }
];

function StatusProgress({ convStatus }) {
  const getStepIdx = (status) => {
    if (status === 'RECEIVED_AT_CONVEYANCING') return 0;
    if (status === 'AWAITING_CERTIFIED_COPIES' || status === 'AWAITING_FEE_CONFIRMATION') return 1;
    if (status === 'FORMS_IN_PROGRESS') return 2;
    if (status === 'FORMS_READY') return 3;
    if (status === 'DOCUMENTS_ISSUED') return 4;
    if (status === 'AWAITING_RETURNED_TITLE_COPY' || status === 'PARTIALLY_CLOSED') return 5;
    if (status === 'CLOSED') return 6;
    return 0;
  };
  const idx = getStepIdx(convStatus);
  return (
    <div className="status-progress">
      {CV_STEPS.map((step, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} className={`progress-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
            <div className="step-circle">{done ? '\u2713' : step.icon}</div>
            <div className="step-label">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function InfoCard({ icon, label, value, sub, accent }) {
  return (
    <div className={`info-card ${accent || ''}`}>
      <div className="info-card-icon">{icon}</div>
      <div className="info-card-content">
        <div className="info-card-value">{value || '\u2014'}</div>
        <div className="info-card-label">{label}</div>
        {sub && <div className="info-card-sub">{sub}</div>}
      </div>
    </div>
  );
}

function ChecklistItem({ checked, label, detail, onToggle, disabled }) {
  return (
    <div className={`checklist-item ${checked ? 'checked' : ''}`} onClick={!disabled ? onToggle : undefined} style={{ cursor: disabled ? 'default' : 'pointer' }}>
      <div className={`checklist-box ${checked ? 'checked' : ''}`}>{checked ? '\u2713' : ''}</div>
      <div className="checklist-content">
        <div className="checklist-label">{label}</div>
        {detail && <div className="checklist-detail">{detail}</div>}
      </div>
    </div>
  );
}


/* Type-specific detail renderer */
function AssetTypeDetails({ asset, canEdit, onUpdate }) {
  const a = asset;
  const t = a.asset_type;

  const markField = async (field, dateField) => {
    const body = { [field]: true };
    if (dateField) body[dateField] = new Date().toISOString().split('T')[0];
    try {
      await onUpdate(a.id, body);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update.');
    }
  };

  const FormCheck = ({ label, done, field, dateField, dateValue }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ fontSize: 16 }}>{done ? '\u2705' : '\u2B1C'}</span>
      <span style={{ flex: 1, fontSize: 13 }}>{label}</span>
      {done && dateValue && <span style={{ fontSize: 12, color: '#757575' }}>{formatDate(dateValue)}</span>}
      {!done && canEdit && <button className="btn btn-sm btn-primary" onClick={() => markField(field, dateField)}>Mark Done</button>}
    </div>
  );

  if (t === 'LAND_PARCEL') {
    return (
      <div className="asset-meta-grid">
        <div><span className="asset-meta-label">Parcel</span><span className="asset-meta-value">{a.parcel_number || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Registry</span><span className="asset-meta-value">{a.registry_office || '\u2014'}</span></div>
        <div><span className="asset-meta-label">County</span><span className="asset-meta-value">{a.county || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Size</span><span className="asset-meta-value">{a.land_size || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Title</span><span className="asset-meta-value">{a.title_type || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Encumbrance</span><span className="asset-meta-value">{a.encumbrance_flag ? '\u26A0\uFE0F Yes' : 'No'}</span></div>
        <div><span className="asset-meta-label">Docs Issued</span><span className="asset-meta-value">{a.docs_issued_to_client ? '\u2705 ' + formatDate(a.issue_date) : '\u2014'}</span></div>
        <div><span className="asset-meta-label">Proof</span><span className="asset-meta-value">{a.proof_of_registration_received ? '\u2705 ' + formatDate(a.proof_received_date) : a.closure_override ? '\u26A0\uFE0F Override' : '\u2014'}</span></div>
      </div>
    );
  }

  if (t === 'LAND_COMPANY') {
    return (
      <div className="asset-meta-grid">
        <div><span className="asset-meta-label">Company</span><span className="asset-meta-value">{a.company_name || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Reg No</span><span className="asset-meta-value">{a.company_reg_number || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Share Cert</span><span className="asset-meta-value">{a.share_certificate_number || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Plot</span><span className="asset-meta-value">{a.plot_allocation || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Shares</span><span className="asset-meta-value">{a.number_of_shares || '\u2014'}</span></div>
        <div><span className="asset-meta-label">Transferee</span><span className="asset-meta-value">{a.transferee_name || '\u2014'}</span></div>
      </div>
    );
  }

  if (t === 'SHARES_CDSC') {
    return (
      <>
        <div className="asset-meta-grid">
          <div><span className="asset-meta-label">Company</span><span className="asset-meta-value">{a.company_name || '\u2014'}</span></div>
          <div><span className="asset-meta-label">CDSC Acct</span><span className="asset-meta-value">{a.cdsc_account_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Shares</span><span className="asset-meta-value">{a.number_of_shares || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Transferee</span><span className="asset-meta-value">{a.transferee_name || '\u2014'}</span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13, color: '#555' }}>Required Forms:</strong>
          <FormCheck label="CDS7 Form" done={a.cds7_prepared} field="cds7_prepared" dateField="cds7_prepared_date" dateValue={a.cds7_prepared_date} />
          <FormCheck label="Discharge Indemnity" done={a.discharge_indemnity_prepared} field="discharge_indemnity_prepared" dateField="discharge_indemnity_prepared_date" dateValue={a.discharge_indemnity_prepared_date} />
        </div>
      </>
    );
  }

  if (t === 'SHARES_CERTIFICATE') {
    return (
      <>
        <div className="asset-meta-grid">
          <div><span className="asset-meta-label">Company</span><span className="asset-meta-value">{a.company_name || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Cert No</span><span className="asset-meta-value">{a.share_certificate_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Shares</span><span className="asset-meta-value">{a.number_of_shares || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Transferee</span><span className="asset-meta-value">{a.transferee_name || '\u2014'}</span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13, color: '#555' }}>Required Forms:</strong>
          <FormCheck label="CDS2 Form" done={a.cds2_prepared} field="cds2_prepared" dateField="cds2_prepared_date" dateValue={a.cds2_prepared_date} />
          <FormCheck label="CDS7 Form" done={a.cds7_prepared} field="cds7_prepared" dateField="cds7_prepared_date" dateValue={a.cds7_prepared_date} />
          <FormCheck label="Sale Transfer Form" done={a.sale_transfer_prepared} field="sale_transfer_prepared" dateField="sale_transfer_prepared_date" dateValue={a.sale_transfer_prepared_date} />
          <FormCheck label="Discharge Indemnity" done={a.discharge_indemnity_prepared} field="discharge_indemnity_prepared" dateField="discharge_indemnity_prepared_date" dateValue={a.discharge_indemnity_prepared_date} />
        </div>
      </>
    );
  }

  if (t === 'MOTOR_VEHICLE') {
    return (
      <>
        <div className="asset-meta-grid">
          <div><span className="asset-meta-label">Reg No</span><span className="asset-meta-value">{a.vehicle_reg_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Chassis</span><span className="asset-meta-value">{a.chassis_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Make/Model</span><span className="asset-meta-value">{a.vehicle_make_model || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Transferee</span><span className="asset-meta-value">{a.transferee_name || '\u2014'}</span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13, color: '#555' }}>Process:</strong>
          <FormCheck label="Form C Prepared" done={a.form_c_prepared} field="form_c_prepared" dateField="form_c_prepared_date" dateValue={a.form_c_prepared_date} />
          <FormCheck label="Signed & Sealed" done={a.signed_sealed} field="signed_sealed" dateField="signed_sealed_date" dateValue={a.signed_sealed_date} />
          <FormCheck label="Logbook Transfer Confirmed" done={a.logbook_transfer_confirmed} field="logbook_transfer_confirmed" dateField="logbook_transfer_date" dateValue={a.logbook_transfer_date} />
        </div>
      </>
    );
  }

  if (t === 'UFAA_CLAIM') {
    return (
      <>
        <div className="asset-meta-grid">
          <div><span className="asset-meta-label">UFAA Ref</span><span className="asset-meta-value">{a.ufaa_reference_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Institution</span><span className="asset-meta-value">{a.financial_institution || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Amount</span><span className="asset-meta-value">{a.amount_claimed ? 'KES ' + Number(a.amount_claimed).toLocaleString() : '\u2014'}</span></div>
          <div><span className="asset-meta-label">Beneficiary Txn</span><span className="asset-meta-value"><StatusBadge status={a.transmission_to_beneficiary_status || 'PENDING'} /></span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13, color: '#555' }}>Required Forms:</strong>
          <FormCheck label="Form 4B Prepared" done={a.form_4b_prepared} field="form_4b_prepared" dateField="form_4b_prepared_date" dateValue={a.form_4b_prepared_date} />
          <FormCheck label="Form 5 Prepared" done={a.form_5_prepared} field="form_5_prepared" dateField="form_5_prepared_date" dateValue={a.form_5_prepared_date} />
          <FormCheck label="Claimant Account Details" done={a.claimant_account_details_captured} field="claimant_account_details_captured" />
          <FormCheck label="Funds Received by PT" done={a.proof_funds_received_by_pt} field="proof_funds_received_by_pt" dateField="payment_date_to_pt" dateValue={a.payment_date_to_pt} />
        </div>
      </>
    );
  }

  if (t === 'DISCHARGE_OF_CHARGE') {
    return (
      <>
        <div className="asset-meta-grid">
          <div><span className="asset-meta-label">Lender</span><span className="asset-meta-value">{a.lending_institution || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Loan Ref</span><span className="asset-meta-value">{a.loan_reference_number || '\u2014'}</span></div>
          <div><span className="asset-meta-label">Property</span><span className="asset-meta-value">{a.property_parcel_number || '\u2014'}</span></div>
        </div>
        <div style={{ marginTop: 12 }}>
          <strong style={{ fontSize: 13, color: '#555' }}>Process:</strong>
          <FormCheck label="Discharge Document Prepared" done={a.discharge_document_prepared} field="discharge_document_prepared" dateField="discharge_document_prepared_date" dateValue={a.discharge_document_prepared_date} />
          <FormCheck label="Discharge Registered" done={a.discharge_registered} field="discharge_registered" dateField="discharge_date" dateValue={a.discharge_date} />
        </div>
      </>
    );
  }

  // OTHER
  return (
    <div className="asset-meta-grid">
      <div><span className="asset-meta-label">Description</span><span className="asset-meta-value">{a.asset_description || '\u2014'}</span></div>
      <div><span className="asset-meta-label">Est. Value</span><span className="asset-meta-value">{a.estimated_value ? 'KES ' + Number(a.estimated_value).toLocaleString() : '\u2014'}</span></div>
      <div><span className="asset-meta-label">Transferee</span><span className="asset-meta-value">{a.transferee_name || '\u2014'}</span></div>
    </div>
  );
}


/* Add Asset Modal (dynamic fields per type) */
function AddAssetForm({ onSubmit, submitting, onCancel }) {
  const [assetType, setAssetType] = useState('LAND_PARCEL');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(e, assetType); }}>
      <div className="form-group">
        <label>Asset Type *</label>
        <select name="asset_type" value={assetType} onChange={e => setAssetType(e.target.value)}>
          {Object.entries(ASSET_TYPE_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {assetType === 'LAND_PARCEL' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Parcel Number *</label><input name="parcel_number" required /></div>
            <div className="form-group"><label>Registry Office</label><input name="registry_office" placeholder="e.g., Nairobi" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>County</label><input name="county" /></div>
            <div className="form-group"><label>Land Size</label><input name="land_size" placeholder="e.g., 0.5 Ha" /></div>
          </div>
          <div className="form-group">
            <label>Title Type</label>
            <select name="title_type">
              <option value="">Select...</option>
              <option value="Freehold">Freehold</option>
              <option value="Leasehold">Leasehold</option>
            </select>
          </div>
          <div className="form-group"><label><input type="checkbox" name="encumbrance_flag" /> Has Encumbrance</label></div>
        </>
      )}

      {assetType === 'LAND_COMPANY' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Company Name *</label><input name="company_name" required /></div>
            <div className="form-group"><label>Registration No</label><input name="company_reg_number" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Share Certificate No</label><input name="share_certificate_number" /></div>
            <div className="form-group"><label>Plot Allocation</label><input name="plot_allocation" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Number of Shares</label><input name="number_of_shares" type="number" /></div>
            <div className="form-group"><label>Transferee</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      {assetType === 'SHARES_CDSC' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Company Name *</label><input name="company_name" required /></div>
            <div className="form-group"><label>CDSC Account No *</label><input name="cdsc_account_number" required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Number of Shares</label><input name="number_of_shares" type="number" /></div>
            <div className="form-group"><label>Transferee</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      {assetType === 'SHARES_CERTIFICATE' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Company Name *</label><input name="company_name" required /></div>
            <div className="form-group"><label>Certificate No *</label><input name="share_certificate_number" required /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Number of Shares</label><input name="number_of_shares" type="number" /></div>
            <div className="form-group"><label>Transferee</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      {assetType === 'MOTOR_VEHICLE' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Registration No *</label><input name="vehicle_reg_number" required placeholder="e.g., KDA 321B" /></div>
            <div className="form-group"><label>Chassis No</label><input name="chassis_number" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Make / Model</label><input name="vehicle_make_model" placeholder="e.g., Toyota Prado" /></div>
            <div className="form-group"><label>Transferee</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      {assetType === 'UFAA_CLAIM' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>UFAA Reference *</label><input name="ufaa_reference_number" required /></div>
            <div className="form-group"><label>Financial Institution</label><input name="financial_institution" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Amount Claimed (KES)</label><input name="amount_claimed" type="number" step="0.01" /></div>
            <div className="form-group"><label>Transferee / Beneficiary</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      {assetType === 'DISCHARGE_OF_CHARGE' && (
        <>
          <div className="form-row">
            <div className="form-group"><label>Lending Institution *</label><input name="lending_institution" required /></div>
            <div className="form-group"><label>Loan Reference No</label><input name="loan_reference_number" /></div>
          </div>
          <div className="form-group"><label>Property Parcel Number</label><input name="property_parcel_number" /></div>
        </>
      )}

      {assetType === 'OTHER' && (
        <>
          <div className="form-group"><label>Asset Description *</label><input name="asset_description" required /></div>
          <div className="form-row">
            <div className="form-group"><label>Estimated Value (KES)</label><input name="estimated_value" type="number" step="0.01" /></div>
            <div className="form-group"><label>Transferee</label><input name="transferee_name" /></div>
          </div>
        </>
      )}

      <div className="form-group"><label>Notes</label><textarea name="notes" rows={2} placeholder="Additional notes..."></textarea></div>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Asset'}</button>
      </div>
    </form>
  );
}


/* MAIN COMPONENT */
function EstateFileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conveyancing');
  const [error, setError] = useState('');
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const canEdit = ['ADMIN', 'OFFICER', 'CLERK'].includes(user.role);
  const isAdmin = user.role === 'ADMIN';

  const fetchData = async () => {
    try {
      const res = await api.get('/estate-files/' + id);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load estate file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  /* Handlers */
  const handleConvStatusChange = async (newStatus) => {
    if (!window.confirm('Change conveyancing status to ' + newStatus.replace(/_/g, ' ') + '?')) return;
    try {
      await api.patch('/estate-files/' + id, { conveyancing_status: newStatus });
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.blockers ? err.response.data.blockers.join('\n') : err.response?.data?.error || 'Failed to update status.';
      alert(msg);
    }
  };

  const handleChecklistToggle = async (field, value) => {
    try {
      const body = { [field]: value };
      if (field === 'fees_paid_status' && value === 'PAID') {
        const ref = prompt('Payment reference (e.g., REC/2025/xxx):');
        if (!ref) return;
        body.payment_reference = ref;
        body.payment_date = new Date().toISOString().split('T')[0];
      }
      await api.patch('/estate-files/' + id, body);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update checklist.');
    }
  };

  const handleFormToggle = async (field) => {
    try {
      await api.patch('/estate-files/' + id, {
        [field]: true,
        [field + '_date']: new Date().toISOString().split('T')[0],
        [field + '_by']: user.id
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update form status.');
    }
  };

  const handleAssetUpdate = async (assetId, body) => {
    await api.patch('/assets/' + assetId, body);
    fetchData();
  };

  const handleIssueDocuments = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.patch('/assets/' + selectedAssetId, {
        docs_issued_to_client: true,
        issue_date: new Date().toISOString().split('T')[0],
        issued_by_user_id: user.id,
        issue_notes: fd.get('issue_notes'),
        parcel_status: 'DOCUMENTS_ISSUED'
      });
      setShowIssueModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleRecordProof = async (e) => {
    e.preventDefault(); setSubmitting(true);
    try {
      await api.patch('/assets/' + selectedAssetId, {
        proof_of_registration_received: true,
        proof_received_date: new Date().toISOString().split('T')[0],
        parcel_status: 'CLOSED'
      });
      setShowProofModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleClosureOverride = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.patch('/assets/' + selectedAssetId, {
        closure_override: true,
        closure_override_reason: fd.get('reason'),
        parcel_status: 'CLOSED'
      });
      setShowClosureModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/estate-files/' + id + '/beneficiaries', {
        full_name: fd.get('full_name'), id_no: fd.get('id_no'),
        relationship_to_deceased: fd.get('relationship'),
        phone: fd.get('phone'), address: fd.get('address'),
        is_transferee: fd.get('is_transferee') === 'on'
      });
      setShowBeneficiaryModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleAddAsset = async (e, assetType) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    const body = { asset_type: assetType };
    for (const [key, val] of fd.entries()) {
      if (key === 'asset_type') continue;
      if (key === 'encumbrance_flag') { body.encumbrance_flag = true; continue; }
      if (val) body[key] = val;
    }
    try {
      await api.post('/estate-files/' + id + '/assets', body);
      setShowAssetModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleAddTransfer = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/assets/' + selectedAssetId + '/transfers', {
        transfer_type: fd.get('transfer_type'), transferee_name: fd.get('transferee_name'),
        transferee_id_no: fd.get('transferee_id_no'),
        beneficiary_id: fd.get('beneficiary_id') || null,
        share_details: fd.get('share_details'), remarks: fd.get('remarks')
      });
      setShowTransferModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleUploadDoc = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    fd.append('estate_file_id', id);
    try {
      await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowDocModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  const handleAddNote = async (e) => {
    e.preventDefault(); setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/workflow-events', { estate_file_id: id, event_type: 'NOTE', description: fd.get('description') });
      setShowNoteModal(false); fetchData();
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
    finally { setSubmitting(false); }
  };

  /* Render guards */
  if (loading) return <Loading />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { estate_file: ef, beneficiaries = [], assets = [], documents = [], workflow_events = [] } = data;
  const convStatus = ef.conveyancing_status || ef.current_status;

  const landAssets = assets.filter(a => a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY');
  const nonLandAssets = assets.filter(a => a.asset_type !== 'LAND_PARCEL' && a.asset_type !== 'LAND_COMPANY');
  const completedAssets = assets.filter(a => isAssetComplete(a)).length;

  const assetsByType = {};
  assets.forEach(a => {
    const t = a.asset_type || 'OTHER';
    if (!assetsByType[t]) assetsByType[t] = [];
    assetsByType[t].push(a);
  });

  const convStatusOptions = {
    RECEIVED_AT_CONVEYANCING: ['AWAITING_CERTIFIED_COPIES', 'AWAITING_FEE_CONFIRMATION', 'FORMS_IN_PROGRESS'],
    AWAITING_CERTIFIED_COPIES: ['RECEIVED_AT_CONVEYANCING', 'AWAITING_FEE_CONFIRMATION'],
    AWAITING_FEE_CONFIRMATION: ['RECEIVED_AT_CONVEYANCING', 'AWAITING_CERTIFIED_COPIES', 'FORMS_IN_PROGRESS'],
    FORMS_IN_PROGRESS: ['FORMS_READY'],
    FORMS_READY: ['DOCUMENTS_ISSUED', 'FORMS_IN_PROGRESS'],
    DOCUMENTS_ISSUED: ['AWAITING_RETURNED_TITLE_COPY'],
    AWAITING_RETURNED_TITLE_COPY: ['PARTIALLY_CLOSED', 'CLOSED'],
    PARTIALLY_CLOSED: ['CLOSED', 'AWAITING_RETURNED_TITLE_COPY']
  };
  const nextStatuses = convStatusOptions[convStatus] || [];

  const gateBlockers = [];
  if (ef.administration_route === 'COURT_GRANT' && !ef.certified_copy_grant_present) gateBlockers.push('Certified copy of Grant required');
  if (ef.administration_route === 'SUMMARY_CERT' && !ef.certified_copy_summary_cert_present) gateBlockers.push('Certified copy of Summary Certificate required');
  if (!ef.fees_paid_status || ef.fees_paid_status === 'NOT_PAID' || ef.fees_paid_status === 'UNKNOWN') gateBlockers.push('Fees must be confirmed PAID or EXEMPT');
  const gateOpen = gateBlockers.length === 0;

  const tabs = [
    { id: 'conveyancing', label: 'Conveyancing', icon: '\u2696\uFE0F' },
    { id: 'assets', label: 'Assets (' + assets.length + ')', icon: '\u{1F4BC}' },
    { id: 'beneficiaries', label: 'Beneficiaries (' + beneficiaries.length + ')', icon: '\u{1F465}' },
    { id: 'documents', label: 'Documents (' + documents.length + ')', icon: '\u{1F4C1}' },
    { id: 'timeline', label: 'Timeline', icon: '\u{1F4C5}' }
  ];

  return (
    <div className="estate-detail">
      {/* HEADER */}
      <div className="detail-header">
        <div className="detail-header-top">
          <Link to="/estate-files" className="back-link">{'\u2190'} Back to Estate Files</Link>
          <div className="detail-header-actions">
            {canEdit && nextStatuses.length > 0 && (
              <select className="btn btn-secondary" onChange={e => { if (e.target.value) handleConvStatusChange(e.target.value); }} defaultValue="">
                <option value="">Change Status...</option>
                {nextStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            )}
            {canEdit && <Link to={'/estate-files/' + id + '/edit'} className="btn btn-secondary">{'\u270F\uFE0F'} Edit</Link>}
          </div>
        </div>
        <div className="detail-header-main">
          <div>
            <div className="file-number-row">
              <h1 className="file-number">{ef.file_number}</h1>
              <StatusBadge status={convStatus} />
              <StatusBadge status={ef.administration_route || ef.administration_type} />
              {convStatus === 'CLOSED' && <span className="badge" style={{ background: '#C8E6C9', color: '#1B5E20' }}>{'\u2705'} FILE COMPLETE</span>}
            </div>
            <h2 className="deceased-name">{ef.deceased_full_name}</h2>
            <div className="header-meta">
              <span>{'\u{1FAA4}'} ID: {ef.deceased_id_no || '\u2014'}</span>
              <span className="meta-divider">|</span>
              <span>{'\u{1F4CD}'} {ef.county}{ef.sub_county ? ', ' + ef.sub_county : ''}</span>
              <span className="meta-divider">|</span>
              <span>{'\u{1F4E5}'} Received: {formatDate(ef.conveyancing_received_date || ef.intake_date)}</span>
              <span className="meta-divider">|</span>
              <span>{'\u{1F464}'} {ef.officer_name || 'Unassigned'}</span>
            </div>
          </div>
        </div>
        <StatusProgress convStatus={convStatus} />
      </div>

      {/* INFO CARDS */}
      <div className="info-cards-row">
        <InfoCard icon={'\u{1F464}'} label="Officer" value={ef.officer_name} accent="primary" />
        <InfoCard icon={'\u{1F4CB}'} label="Grant Reference" value={ef.grant_reference} sub={ef.confirmed_grant_date ? 'Confirmed: ' + formatDate(ef.confirmed_grant_date) : null} />
        <InfoCard icon={'\u{1F4BC}'} label="Assets" value={completedAssets + ' / ' + assets.length + ' done'} sub={landAssets.length + ' land, ' + nonLandAssets.length + ' other'} />
        <InfoCard icon={'\u{1F4B0}'} label="Estate Value" value={ef.estate_value_estimate ? 'KES ' + Number(ef.estate_value_estimate).toLocaleString() : '\u2014'} accent="success" />
      </div>

      {/* TABS */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={'tab' + (activeTab === t.id ? ' active' : '')} onClick={() => setActiveTab(t.id)}>
            <span className="tab-icon">{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="card detail-card">
        <div className="card-body">

          {/* TAB: CONVEYANCING */}
          {activeTab === 'conveyancing' && (
            <div className="conveyancing-panels">
              {/* Panel A: Intake */}
              <div className="cv-panel">
                <h3 className="cv-panel-title">{'\u{1F4E5}'} A. Conveyancing Intake</h3>
                <div className="detail-grid">
                  <div className="detail-item"><div className="label">File Number</div><div className="value"><strong>{ef.file_number}</strong></div></div>
                  <div className="detail-item"><div className="label">Deceased</div><div className="value"><strong>{ef.deceased_full_name}</strong></div></div>
                  <div className="detail-item"><div className="label">Date Received</div><div className="value">{formatDate(ef.conveyancing_received_date || ef.intake_date)}</div></div>
                  <div className="detail-item"><div className="label">Admin Route</div><div className="value"><StatusBadge status={ef.administration_route || ef.administration_type} /></div></div>
                  <div className="detail-item"><div className="label">Grant Ref</div><div className="value">{ef.grant_reference || '\u2014'}</div></div>
                  <div className="detail-item"><div className="label">Confirmed Grant</div><div className="value">{formatDate(ef.confirmed_grant_date)}</div></div>
                  <div className="detail-item"><div className="label">County</div><div className="value">{ef.county || '\u2014'}</div></div>
                  <div className="detail-item"><div className="label">Officer</div><div className="value">{ef.officer_name || '\u2014'}</div></div>
                </div>
                {ef.notes && <div className="notes-box" style={{ marginTop: 12 }}>{'\u{1F4DD}'} {ef.notes}</div>}
              </div>

              {/* Panel B: Checklist */}
              <div className="cv-panel">
                <h3 className="cv-panel-title">{'\u2705'} B. Pre-Transfer Compliance Checklist</h3>
                {!gateOpen && (
                  <div className="gate-warning">
                    <div className="gate-warning-icon">{'\u26A0\uFE0F'}</div>
                    <div className="gate-warning-content">
                      <strong>GATE BLOCKED - Cannot proceed to Forms Preparation</strong>
                      <ul>{gateBlockers.map((b, i) => <li key={i}>{b}</li>)}</ul>
                    </div>
                  </div>
                )}
                {gateOpen && (
                  <div className="gate-open">
                    <span className="gate-open-icon">{'\u2705'}</span>
                    <span>Gate passed - Forms preparation can proceed</span>
                  </div>
                )}
                <div className="checklist-grid">
                  {ef.administration_route === 'COURT_GRANT' && (
                    <ChecklistItem checked={ef.certified_copy_grant_present} label="Certified Copy of Grant" detail="Required for Court Grant route" onToggle={() => handleChecklistToggle('certified_copy_grant_present', !ef.certified_copy_grant_present)} disabled={!canEdit} />
                  )}
                  {ef.administration_route === 'SUMMARY_CERT' && (
                    <ChecklistItem checked={ef.certified_copy_summary_cert_present} label="Certified Copy of Summary Certificate" detail="Required for Summary Cert route" onToggle={() => handleChecklistToggle('certified_copy_summary_cert_present', !ef.certified_copy_summary_cert_present)} disabled={!canEdit} />
                  )}
                  <div className="checklist-item">
                    <div className={'checklist-box' + ((ef.fees_paid_status === 'PAID' || ef.fees_paid_status === 'EXEMPT') ? ' checked' : '')}>
                      {(ef.fees_paid_status === 'PAID' || ef.fees_paid_status === 'EXEMPT') ? '\u2713' : ''}
                    </div>
                    <div className="checklist-content">
                      <div className="checklist-label">Public Trustee Fees</div>
                      <div className="checklist-detail">
                        Status: <StatusBadge status={ef.fees_paid_status || 'UNKNOWN'} />
                        {ef.payment_reference && <span style={{ marginLeft: 8 }}>Ref: {ef.payment_reference}</span>}
                        {ef.payment_date && <span style={{ marginLeft: 8 }}>({formatDate(ef.payment_date)})</span>}
                      </div>
                      {canEdit && ef.fees_paid_status !== 'PAID' && ef.fees_paid_status !== 'EXEMPT' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                          <button className="btn btn-sm btn-primary" onClick={() => handleChecklistToggle('fees_paid_status', 'PAID')}>Mark Paid</button>
                          <button className="btn btn-sm btn-secondary" onClick={() => handleChecklistToggle('fees_paid_status', 'EXEMPT')}>Mark Exempt</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel C: LR Forms */}
              <div className="cv-panel">
                <h3 className="cv-panel-title">{'\u{1F4DD}'} C. Forms Preparation (LRA 39 & LRA 42)</h3>
                {!gateOpen && <p style={{ color: 'var(--text-light)', fontStyle: 'italic' }}>Complete the checklist above to unlock forms preparation.</p>}
                <div className="forms-grid">
                  {/* LRA Form 39 */}
                  <div className={'form-card' + (ef.lr39_signed_sealed ? ' done' : ef.lr39_prepared ? ' partial' : '')}>
                    <div className="form-card-header">
                      <strong>LRA Form 39</strong>
                      {ef.lr39_signed_sealed
                        ? <span className="badge" style={{ background: '#C8E6C9', color: '#1B5E20' }}>{'\u2713'} Signed & Sealed</span>
                        : ef.lr39_prepared
                          ? <span className="badge" style={{ background: '#BBDEFB', color: '#1565C0' }}>{'\u2713'} Prepared</span>
                          : <span className="badge" style={{ background: '#FFF9C4', color: '#F57F17' }}>Pending</span>}
                    </div>
                    <div className="form-card-body">
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Transfers property from estate to Public Trustee</div>
                      <div className="checklist-grid" style={{ gap: 4 }}>
                        <ChecklistItem
                          checked={ef.lr39_prepared}
                          label="Prepared"
                          detail={ef.lr39_prepared ? formatDate(ef.lr39_prepared_date) : null}
                          onToggle={() => handleFormToggle('lr39_prepared')}
                          disabled={!canEdit || !gateOpen || ef.lr39_prepared}
                        />
                        <ChecklistItem
                          checked={ef.lr39_signed_sealed}
                          label="Signed & Sealed"
                          detail={ef.lr39_signed_sealed ? formatDate(ef.lr39_signed_sealed_date) : null}
                          onToggle={() => handleFormToggle('lr39_signed_sealed')}
                          disabled={!canEdit || !gateOpen || !ef.lr39_prepared || ef.lr39_signed_sealed}
                        />
                      </div>
                    </div>
                  </div>
                  {/* LRA Form 42 */}
                  <div className={'form-card' + (ef.lr42_signed_sealed ? ' done' : ef.lr42_prepared ? ' partial' : '')}>
                    <div className="form-card-header">
                      <strong>LRA Form 42</strong>
                      {ef.lr42_signed_sealed
                        ? <span className="badge" style={{ background: '#C8E6C9', color: '#1B5E20' }}>{'\u2713'} Signed & Sealed</span>
                        : ef.lr42_prepared
                          ? <span className="badge" style={{ background: '#BBDEFB', color: '#1565C0' }}>{'\u2713'} Prepared</span>
                          : <span className="badge" style={{ background: '#FFF9C4', color: '#F57F17' }}>Pending</span>}
                    </div>
                    <div className="form-card-body">
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>Transfers property from Public Trustee to beneficiary</div>
                      <div className="checklist-grid" style={{ gap: 4 }}>
                        <ChecklistItem
                          checked={ef.lr42_prepared}
                          label="Prepared"
                          detail={ef.lr42_prepared ? formatDate(ef.lr42_prepared_date) : null}
                          onToggle={() => handleFormToggle('lr42_prepared')}
                          disabled={!canEdit || !gateOpen || ef.lr42_prepared}
                        />
                        <ChecklistItem
                          checked={ef.lr42_signed_sealed}
                          label="Signed & Sealed"
                          detail={ef.lr42_signed_sealed ? formatDate(ef.lr42_signed_sealed_date) : null}
                          onToggle={() => handleFormToggle('lr42_signed_sealed')}
                          disabled={!canEdit || !gateOpen || !ef.lr42_prepared || ef.lr42_signed_sealed}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel D: Estate Asset Register Summary */}
              <div className="cv-panel">
                <h3 className="cv-panel-title">{'\u{1F4BC}'} D. Estate Asset Register</h3>
                {assets.length === 0 ? <EmptyState icon={'\u{1F4BC}'} message="No assets added yet. Go to the Assets tab to add." /> : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                      {Object.entries(assetsByType).map(([type, arr]) => {
                        const meta = ASSET_TYPE_META[type] || ASSET_TYPE_META.OTHER;
                        const done = arr.filter(a => isAssetComplete(a)).length;
                        return (
                          <div key={type} style={{ background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 8, padding: '10px 16px', minWidth: 180 }}>
                            <div style={{ fontSize: 14, fontWeight: 600 }}>{meta.icon} {meta.short}</div>
                            <div style={{ fontSize: 12, color: '#666' }}>{done}/{arr.length} completed</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="table-container">
                      <table>
                        <thead><tr><th>Type</th><th>Asset</th><th>Status</th><th>Transferee</th><th>Actions</th></tr></thead>
                        <tbody>
                          {assets.map(a => {
                            const meta = ASSET_TYPE_META[a.asset_type] || ASSET_TYPE_META.OTHER;
                            const status = getAssetStatus(a);
                            const label = getAssetLabel(a);
                            return (
                              <tr key={a.id}>
                                <td><span style={{ fontSize: 13 }}>{meta.icon} {meta.short}</span></td>
                                <td><strong>{label}</strong></td>
                                <td><StatusBadge status={status} /></td>
                                <td>{a.transferee_name || '\u2014'}</td>
                                <td>
                                  {(a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY') && canEdit && !a.docs_issued_to_client && status !== 'CLOSED' && (
                                    <button className="btn btn-sm btn-primary" onClick={() => { setSelectedAssetId(a.id); setShowIssueModal(true); }}>{'\u{1F4E4}'} Issue</button>
                                  )}
                                  {(a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY') && canEdit && a.docs_issued_to_client && !a.proof_of_registration_received && !a.closure_override && (
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn btn-sm btn-primary" onClick={() => { setSelectedAssetId(a.id); setShowProofModal(true); }}>{'\u{1F4CB}'} Proof</button>
                                      {isAdmin && <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedAssetId(a.id); setShowClosureModal(true); }}>{'\u{1F512}'}</button>}
                                    </div>
                                  )}
                                  {isAssetComplete(a) && <span style={{ color: 'var(--success)', fontSize: 12 }}>{'\u2705'} Done</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>

              {/* Panel E: File Closure */}
              <div className="cv-panel">
                <h3 className="cv-panel-title">{'\u{1F512}'} E. File Closure</h3>
                {convStatus === 'CLOSED' ? (
                  <div className="gate-open" style={{ background: '#E8F5E9' }}>
                    <span className="gate-open-icon">{'\u{1F512}'}</span>
                    <span><strong>File is CLOSED.</strong> All conveyancing work complete.</span>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
                      {completedAssets === assets.length && assets.length > 0
                        ? '\u2705 All ' + assets.length + ' asset(s) completed. File can be closed.'
                        : '\u23F3 ' + (assets.length - completedAssets) + ' of ' + assets.length + ' asset(s) still in progress.'}
                    </div>
                    {canEdit && completedAssets === assets.length && assets.length > 0 && convStatus !== 'CLOSED' && (
                      <button className="btn btn-primary" onClick={() => handleConvStatusChange('CLOSED')}>{'\u{1F512}'} Close File</button>
                    )}
                    {canEdit && completedAssets < assets.length && isAdmin && (
                      <button className="btn btn-secondary" style={{ marginLeft: 8 }} onClick={() => { if (window.confirm('Admin override: Close file even though not all assets are completed?')) handleConvStatusChange('CLOSED'); }}>
                        {'\u{1F513}'} Admin Override - Close File
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* TAB: ASSETS */}
          {activeTab === 'assets' && (
            <>
              <div className="tab-toolbar">
                <h3 className="tab-title">{'\u{1F4BC}'} Estate Assets</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowAssetModal(true)}>+ Add Asset</button>}
              </div>

              {assets.length === 0 ? <EmptyState icon={'\u{1F4BC}'} message="No assets added yet." /> : (
                <>
                  {Object.entries(assetsByType).map(([type, arr]) => {
                    const meta = ASSET_TYPE_META[type] || ASSET_TYPE_META.OTHER;
                    return (
                      <div key={type} style={{ marginBottom: 24 }}>
                        <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12, color: '#333' }}>
                          {meta.icon} {meta.label} ({arr.length})
                        </h4>
                        <div className="asset-cards">
                          {arr.map(a => {
                            const status = getAssetStatus(a);
                            const label = getAssetLabel(a);
                            return (
                              <div key={a.id} className="asset-card">
                                <div className="asset-card-header">
                                  <span className="asset-parcel">{label}</span>
                                  <StatusBadge status={status} />
                                </div>
                                <div className="asset-card-body">
                                  <AssetTypeDetails asset={a} canEdit={canEdit} onUpdate={handleAssetUpdate} />
                                  {a.notes && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{'\u{1F4DD}'} {a.notes}</div>}
                                </div>
                                <div className="asset-card-footer">
                                  {canEdit && (a.asset_type === 'LAND_PARCEL' || a.asset_type === 'LAND_COMPANY') && (
                                    <button className="btn btn-sm btn-primary" onClick={() => { setSelectedAssetId(a.id); setShowTransferModal(true); }}>+ Transfer</button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}

          {/* TAB: BENEFICIARIES */}
          {activeTab === 'beneficiaries' && (
            <>
              <div className="tab-toolbar">
                <h3 className="tab-title">{'\u{1F465}'} Beneficiaries</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowBeneficiaryModal(true)}>+ Add Beneficiary</button>}
              </div>
              {beneficiaries.length === 0 ? <EmptyState icon={'\u{1F465}'} message="No beneficiaries added yet." /> : (
                <div className="beneficiary-cards">
                  {beneficiaries.map(b => (
                    <div key={b.id} className="beneficiary-card">
                      <div className="beneficiary-avatar">{b.full_name.charAt(0)}</div>
                      <div className="beneficiary-info">
                        <div className="beneficiary-name">{b.full_name}</div>
                        <div className="beneficiary-relation">{b.relationship_to_deceased || 'Unknown'}</div>
                        <div className="beneficiary-details">
                          {b.id_no && <span>{'\u{1FAA4}'} {b.id_no}</span>}
                          {b.phone && <span>{'\u{1F4DE}'} {b.phone}</span>}
                        </div>
                        {b.address && <div className="beneficiary-address">{'\u{1F4CD}'} {b.address}</div>}
                      </div>
                      <div className="beneficiary-badge">
                        {b.is_transferee ? <span className="badge" style={{ background: '#E8F5E9', color: '#2E7D32' }}>Transferee</span> : <span className="badge" style={{ background: '#ECEFF1', color: '#546E7A' }}>Non-transferee</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === 'documents' && (
            <>
              <div className="tab-toolbar">
                <h3 className="tab-title">{'\u{1F4C1}'} Documents</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowDocModal(true)}>+ Upload Document</button>}
              </div>
              {documents.length === 0 ? <EmptyState icon={'\u{1F4C1}'} message="No documents uploaded." /> : (
                <div className="doc-grid">
                  {documents.map(d => (
                    <div key={d.id} className="doc-card">
                      <div className="doc-icon">{'\u{1F4CE}'}</div>
                      <div className="doc-info">
                        <div className="doc-name" title={d.file_name}>{d.file_name}</div>
                        <div className="doc-type"><StatusBadge status={d.doc_type} /></div>
                        <div className="doc-meta">
                          <span>{d.uploaded_by_name}</span>
                          <span>{formatDate(d.uploaded_at)}</span>
                          {d.file_size && <span>{(d.file_size / 1024).toFixed(0)} KB</span>}
                        </div>
                      </div>
                      <a href={'/api/documents/' + d.id + '/download'} className="btn btn-sm btn-secondary doc-download" target="_blank" rel="noreferrer">{'\u2B07'}</a>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB: TIMELINE */}
          {activeTab === 'timeline' && (
            <>
              <div className="tab-toolbar">
                <h3 className="tab-title">{'\u{1F4C5}'} Activity Timeline</h3>
                {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowNoteModal(true)}>+ Add Note</button>}
              </div>
              {workflow_events.length === 0 ? <EmptyState icon={'\u{1F4C5}'} message="No activity recorded yet." /> : (
                <div className="timeline-enhanced">
                  {workflow_events.map((event, idx) => (
                    <div key={event.id} className={'timeline-entry ' + event.event_type.toLowerCase()}>
                      <div className="timeline-connector">
                        <div className="timeline-icon">{eventIcon(event.event_type)}</div>
                        {idx < workflow_events.length - 1 && <div className="timeline-line"></div>}
                      </div>
                      <div className="timeline-card">
                        <div className="timeline-card-header">
                          <strong>{event.performed_by_name}</strong>
                          <span className="timeline-date">{formatDateTime(event.performed_at)}</span>
                        </div>
                        <div className="timeline-card-body">{event.description}</div>
                        {event.from_status && event.to_status && (
                          <div className="timeline-status-change">
                            <StatusBadge status={event.from_status} /> <span className="arrow">{'\u2192'}</span> <StatusBadge status={event.to_status} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MODALS */}
      <Modal isOpen={showIssueModal} onClose={() => setShowIssueModal(false)} title="Issue Documents to Client">
        <form onSubmit={handleIssueDocuments}>
          <div className="form-group"><label>Issue Notes *</label><textarea name="issue_notes" required rows={3} placeholder="e.g., Full document bundle handed to Jane Wambui"></textarea></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowIssueModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Issuing...' : 'Issue Documents'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showProofModal} onClose={() => setShowProofModal(false)} title="Record Proof of Registration">
        <form onSubmit={handleRecordProof}>
          <p style={{ marginBottom: 12 }}>Confirm that proof of registration/transfer has been received for this asset.</p>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowProofModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Recording...' : 'Confirm Proof Received'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showClosureModal} onClose={() => setShowClosureModal(false)} title="Admin Override - Close Asset">
        <form onSubmit={handleClosureOverride}>
          <div className="form-group"><label>Override Reason *</label><textarea name="reason" required rows={3} placeholder="e.g., Client confirmed title received verbally"></textarea></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowClosureModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Closing...' : 'Override & Close'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showBeneficiaryModal} onClose={() => setShowBeneficiaryModal(false)} title="Add Beneficiary">
        <form onSubmit={handleAddBeneficiary}>
          <div className="form-group"><label>Full Name *</label><input name="full_name" required /></div>
          <div className="form-row">
            <div className="form-group"><label>ID Number</label><input name="id_no" /></div>
            <div className="form-group"><label>Relationship</label><input name="relationship" placeholder="e.g., Spouse, Son" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input name="phone" /></div>
            <div className="form-group"><label>Address</label><input name="address" /></div>
          </div>
          <div className="form-group"><label><input type="checkbox" name="is_transferee" defaultChecked /> Is Transferee</label></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowBeneficiaryModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Beneficiary'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title="Add Asset">
        <AddAssetForm onSubmit={handleAddAsset} submitting={submitting} onCancel={() => setShowAssetModal(false)} />
      </Modal>

      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Add Transfer">
        <form onSubmit={handleAddTransfer}>
          <div className="form-group"><label>Transfer Type</label><select name="transfer_type"><option value="TRANSMISSION">Transmission</option><option value="TRANSFER">Transfer</option></select></div>
          <div className="form-row">
            <div className="form-group"><label>Transferee Name *</label><input name="transferee_name" required /></div>
            <div className="form-group"><label>Transferee ID No</label><input name="transferee_id_no" /></div>
          </div>
          <div className="form-group">
            <label>Link to Beneficiary</label>
            <select name="beneficiary_id">
              <option value="">-- Select --</option>
              {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Share Details</label><input name="share_details" placeholder="e.g., 1/2 share, Whole" /></div>
          <div className="form-group"><label>Remarks</label><textarea name="remarks" rows={2}></textarea></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Transfer'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showDocModal} onClose={() => setShowDocModal(false)} title="Upload Document">
        <form onSubmit={handleUploadDoc}>
          <div className="form-group">
            <label>Document Type</label>
            <select name="doc_type">
              <option value="OTHER">Other</option>
              <option value="GRANT">Grant</option>
              <option value="CONFIRMED_GRANT">Confirmed Grant</option>
              <option value="SUMMARY_CERT">Summary Certificate</option>
              <option value="ID_COPY">ID Copy</option>
              <option value="SEARCH">Search</option>
              <option value="TRANSFER_FORM">Transfer Form</option>
              <option value="CONSENT">Consent</option>
              <option value="ECITIZEN_UPLOAD">eCitizen Upload</option>
            </select>
          </div>
          <div className="form-group"><label>File *</label><input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.tif,.tiff" /></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note">
        <form onSubmit={handleAddNote}>
          <div className="form-group"><label>Note *</label><textarea name="description" required rows={3} placeholder="Enter your note..."></textarea></div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Note'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}


/* TransfersList sub-component */
function TransfersList({ assetId, canEdit, onRefresh, beneficiaries }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/assets/' + assetId + '/transfers')
      .then(res => setTransfers(res.data.transfers))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetId]);

  const handleStatusChange = async (transferId, newStatus, currentTransfer) => {
    let body = { transfer_status: newStatus };
    if (newStatus === 'COMPLETED' && !currentTransfer.completion_date) {
      const date = prompt('Enter completion date (YYYY-MM-DD):');
      if (!date) return;
      body.completion_date = date;
    }
    try {
      await api.patch('/transfers/' + transferId, body);
      onRefresh();
      const res = await api.get('/assets/' + assetId + '/transfers');
      setTransfers(res.data.transfers);
    } catch (err) { alert(err.response?.data?.error || 'Failed.'); }
  };

  if (loading) return <Loading />;
  if (transfers.length === 0) return <p className="no-transfers-msg">No transfers yet for this asset.</p>;

  const statusOptions = {
    DRAFT: ['READY_FOR_SIGN'],
    READY_FOR_SIGN: ['SIGNED_SEALED', 'DRAFT'],
    SIGNED_SEALED: ['UPLOADED', 'READY_FOR_SIGN'],
    UPLOADED: ['RELEASED_TO_CLIENT', 'SIGNED_SEALED'],
    RELEASED_TO_CLIENT: ['COMPLETED', 'UPLOADED'],
  };

  return (
    <div className="transfers-list">
      {transfers.map(t => (
        <div key={t.id} className={'transfer-card' + (t.transfer_status === 'COMPLETED' ? ' completed' : '')}>
          <div className="transfer-card-row">
            <div className="transfer-main">
              <div className="transfer-name">{t.transferee_name}</div>
              <div className="transfer-meta">
                {t.transferee_id_no && <span>ID: {t.transferee_id_no}</span>}
                <span>{t.transfer_type}</span>
                <span>Share: {t.share_details || 'Whole'}</span>
              </div>
              {t.remarks && <div className="transfer-remarks">{t.remarks}</div>}
            </div>
            <div className="transfer-right">
              <StatusBadge status={t.transfer_status} />
              {t.completion_date && <div className="transfer-completion">Completed: {formatDate(t.completion_date)}</div>}
              {canEdit && statusOptions[t.transfer_status] && (
                <select className="btn btn-sm btn-secondary" style={{ marginTop: '8px' }} onChange={e => { if (e.target.value) handleStatusChange(t.id, e.target.value, t); }} defaultValue="">
                  <option value="">Update...</option>
                  {statusOptions[t.transfer_status].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EstateFileDetail;
