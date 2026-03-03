import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Loading, Modal, formatDate, formatDateTime, EmptyState } from '../components/Common';

function EstateFileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');

  // Modal states
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = ['ADMIN', 'OFFICER', 'CLERK'].includes(user.role);

  const fetchData = async () => {
    try {
      const res = await api.get(`/estate-files/${id}`);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load estate file.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  // ─── Status Change ───
  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Change status to ${newStatus.replace(/_/g, ' ')}?`)) return;
    try {
      await api.patch(`/estate-files/${id}`, { current_status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  // ─── Add Beneficiary ───
  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post(`/estate-files/${id}/beneficiaries`, {
        full_name: fd.get('full_name'),
        id_no: fd.get('id_no'),
        relationship_to_deceased: fd.get('relationship'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        is_transferee: fd.get('is_transferee') === 'on'
      });
      setShowBeneficiaryModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add beneficiary.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Asset ───
  const handleAddAsset = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post(`/estate-files/${id}/assets`, {
        asset_type: fd.get('asset_type'),
        parcel_number: fd.get('parcel_number'),
        registry_office: fd.get('registry_office'),
        county: fd.get('county'),
        land_size: fd.get('land_size'),
        title_type: fd.get('title_type'),
        encumbrance_flag: fd.get('encumbrance') === 'on'
      });
      setShowAssetModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add asset.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Transfer ───
  const handleAddTransfer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post(`/assets/${selectedAssetId}/transfers`, {
        transfer_type: fd.get('transfer_type'),
        transferee_name: fd.get('transferee_name'),
        transferee_id_no: fd.get('transferee_id_no'),
        beneficiary_id: fd.get('beneficiary_id') || null,
        share_details: fd.get('share_details'),
        remarks: fd.get('remarks')
      });
      setShowTransferModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add transfer.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Upload Document ───
  const handleUploadDoc = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.target);
    fd.append('estate_file_id', id);
    try {
      await api.post('/documents/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowDocModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload document.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Add Note ───
  const handleAddNote = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.target);
    try {
      await api.post('/workflow-events', {
        estate_file_id: id,
        event_type: 'NOTE',
        description: fd.get('description')
      });
      setShowNoteModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add note.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;
  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const { estate_file: ef, beneficiaries, assets, documents, workflow_events } = data;

  const statusOptions = {
    INTAKE: ['WAITING_GRANT', 'IN_CONVEYANCING', 'ON_HOLD'],
    WAITING_GRANT: ['IN_CONVEYANCING', 'ON_HOLD'],
    IN_CONVEYANCING: ['PARTIALLY_COMPLETED', 'COMPLETED', 'ON_HOLD'],
    PARTIALLY_COMPLETED: ['IN_CONVEYANCING', 'COMPLETED', 'ON_HOLD'],
    ON_HOLD: ['INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 'PARTIALLY_COMPLETED']
  };

  const nextStatuses = statusOptions[ef.current_status] || [];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'beneficiaries', label: `Beneficiaries (${beneficiaries.length})` },
    { id: 'assets', label: `Assets (${assets.length})` },
    { id: 'transfers', label: 'Transfers' },
    { id: 'documents', label: `Documents (${documents.length})` },
    { id: 'timeline', label: 'Activity Timeline' }
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <Link to="/estate-files" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>← Estate Files</Link>
          </div>
          <h1>{ef.file_number} — {ef.deceased_full_name}</h1>
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <StatusBadge status={ef.current_status} />
            <StatusBadge status={ef.administration_type} />
            {ef.is_imported && <span className="badge" style={{ background: '#E0E0E0', color: '#616161' }}>IMPORTED</span>}
          </div>
        </div>
        <div className="btn-group">
          {canEdit && nextStatuses.length > 0 && (
            <select
              className="btn btn-secondary"
              onChange={e => { if (e.target.value) handleStatusChange(e.target.value); }}
              defaultValue=""
            >
              <option value="">Change Status...</option>
              {nextStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          )}
          {canEdit && (
            <Link to={`/estate-files/${id}/edit`} className="btn btn-secondary">Edit</Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card">
        <div className="card-body">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="detail-grid">
              <div className="detail-item"><div className="label">File Number</div><div className="value">{ef.file_number}</div></div>
              <div className="detail-item"><div className="label">Deceased</div><div className="value">{ef.deceased_full_name}</div></div>
              <div className="detail-item"><div className="label">Deceased ID</div><div className="value">{ef.deceased_id_no || '—'}</div></div>
              <div className="detail-item"><div className="label">Date of Death</div><div className="value">{formatDate(ef.date_of_death)}</div></div>
              <div className="detail-item"><div className="label">County</div><div className="value">{ef.county || '—'}</div></div>
              <div className="detail-item"><div className="label">Sub-County</div><div className="value">{ef.sub_county || '—'}</div></div>
              <div className="detail-item"><div className="label">Intake Date</div><div className="value">{formatDate(ef.intake_date)}</div></div>
              <div className="detail-item"><div className="label">Administration Type</div><div className="value"><StatusBadge status={ef.administration_type} /></div></div>
              <div className="detail-item"><div className="label">Grant Reference</div><div className="value">{ef.grant_reference || '—'}</div></div>
              <div className="detail-item"><div className="label">Grant Date</div><div className="value">{formatDate(ef.grant_date)}</div></div>
              <div className="detail-item"><div className="label">Confirmed Grant Date</div><div className="value">{formatDate(ef.confirmed_grant_date)}</div></div>
              <div className="detail-item"><div className="label">Estate Value Estimate</div><div className="value">{ef.estate_value_estimate ? `KES ${Number(ef.estate_value_estimate).toLocaleString()}` : '—'}</div></div>
              <div className="detail-item"><div className="label">Assigned Officer</div><div className="value">{ef.officer_name || '—'}</div></div>
              <div className="detail-item"><div className="label">Created By</div><div className="value">{ef.created_by_name || '—'}</div></div>
              <div className="detail-item"><div className="label">Created</div><div className="value">{formatDateTime(ef.created_at)}</div></div>
              <div className="detail-item"><div className="label">Last Updated</div><div className="value">{formatDateTime(ef.updated_at)}</div></div>
              {ef.notes && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <div className="label">Notes</div>
                  <div className="value" style={{ whiteSpace: 'pre-wrap' }}>{ef.notes}</div>
                </div>
              )}
            </div>
          )}

          {/* Beneficiaries */}
          {activeTab === 'beneficiaries' && (
            <>
              {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowBeneficiaryModal(true)} style={{ marginBottom: '16px' }}>+ Add Beneficiary</button>}
              {beneficiaries.length === 0 ? <EmptyState message="No beneficiaries added yet." /> : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Name</th><th>ID No</th><th>Relationship</th><th>Phone</th><th>Transferee</th></tr></thead>
                    <tbody>
                      {beneficiaries.map(b => (
                        <tr key={b.id}>
                          <td><strong>{b.full_name}</strong></td>
                          <td>{b.id_no || '—'}</td>
                          <td>{b.relationship_to_deceased || '—'}</td>
                          <td>{b.phone || '—'}</td>
                          <td>{b.is_transferee ? '✅' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Assets */}
          {activeTab === 'assets' && (
            <>
              {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowAssetModal(true)} style={{ marginBottom: '16px' }}>+ Add Asset</button>}
              {assets.length === 0 ? <EmptyState message="No assets added yet." /> : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Type</th><th>Parcel No</th><th>Registry</th><th>County</th><th>Size</th><th>Title</th><th>Encumbrance</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {assets.map(a => (
                        <tr key={a.id}>
                          <td>{a.asset_type}</td>
                          <td><Link to={`/assets/${a.id}`}><strong>{a.parcel_number || '—'}</strong></Link></td>
                          <td>{a.registry_office || '—'}</td>
                          <td>{a.county || '—'}</td>
                          <td>{a.land_size || '—'}</td>
                          <td>{a.title_type || '—'}</td>
                          <td>{a.encumbrance_flag ? '⚠️ Yes' : 'No'}</td>
                          <td><StatusBadge status={a.asset_status} /></td>
                          <td>
                            {canEdit && (
                              <button className="btn btn-sm btn-secondary" onClick={() => { setSelectedAssetId(a.id); setShowTransferModal(true); }}>
                                + Transfer
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Transfers */}
          {activeTab === 'transfers' && (
            <>
              {assets.length === 0 ? <EmptyState message="Add assets first to create transfers." /> : (
                assets.map(a => {
                  const assetTransfers = [];
                  return (
                    <div key={a.id} style={{ marginBottom: '24px' }}>
                      <h4 style={{ marginBottom: '8px' }}>
                        {a.parcel_number || a.asset_type} — <StatusBadge status={a.asset_status} />
                        {canEdit && (
                          <button className="btn btn-sm btn-secondary" style={{ marginLeft: '12px' }} onClick={() => { setSelectedAssetId(a.id); setShowTransferModal(true); }}>
                            + Transfer
                          </button>
                        )}
                      </h4>
                      <TransfersList assetId={a.id} canEdit={canEdit} onRefresh={fetchData} beneficiaries={beneficiaries} />
                    </div>
                  );
                })
              )}
            </>
          )}

          {/* Documents */}
          {activeTab === 'documents' && (
            <>
              {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowDocModal(true)} style={{ marginBottom: '16px' }}>+ Upload Document</button>}
              {documents.length === 0 ? <EmptyState message="No documents uploaded." /> : (
                <div className="table-container">
                  <table>
                    <thead><tr><th>Type</th><th>File Name</th><th>Uploaded By</th><th>Date</th><th>Size</th><th></th></tr></thead>
                    <tbody>
                      {documents.map(d => (
                        <tr key={d.id}>
                          <td><StatusBadge status={d.doc_type} /></td>
                          <td>{d.file_name}</td>
                          <td>{d.uploaded_by_name}</td>
                          <td>{formatDateTime(d.uploaded_at)}</td>
                          <td>{d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : '—'}</td>
                          <td><a href={`/api/documents/${d.id}/download`} className="btn btn-sm btn-secondary" target="_blank" rel="noreferrer">Download</a></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Timeline */}
          {activeTab === 'timeline' && (
            <>
              {canEdit && <button className="btn btn-primary btn-sm" onClick={() => setShowNoteModal(true)} style={{ marginBottom: '16px' }}>+ Add Note</button>}
              {workflow_events.length === 0 ? <EmptyState message="No activity recorded yet." /> : (
                <ul className="timeline">
                  {workflow_events.map(event => (
                    <li key={event.id} className="timeline-item">
                      <div className={`timeline-dot ${event.event_type === 'STATUS_CHANGE' ? 'status-change' : event.event_type === 'DOCUMENT_UPLOADED' ? 'document' : ''}`}></div>
                      <div className="timeline-content">
                        <div className="description">
                          <strong>{event.performed_by_name}</strong> — {event.description}
                        </div>
                        {event.from_status && event.to_status && (
                          <div style={{ marginTop: '4px' }}>
                            <StatusBadge status={event.from_status} /> → <StatusBadge status={event.to_status} />
                          </div>
                        )}
                        <div className="meta">{formatDateTime(event.performed_at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Add Beneficiary Modal */}
      <Modal isOpen={showBeneficiaryModal} onClose={() => setShowBeneficiaryModal(false)} title="Add Beneficiary">
        <form onSubmit={handleAddBeneficiary}>
          <div className="form-group"><label>Full Name *</label><input name="full_name" required /></div>
          <div className="form-row">
            <div className="form-group"><label>ID Number</label><input name="id_no" /></div>
            <div className="form-group"><label>Relationship</label><input name="relationship" placeholder="e.g., Spouse, Child" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input name="phone" /></div>
            <div className="form-group"><label>Address</label><input name="address" /></div>
          </div>
          <div className="form-group">
            <label><input type="checkbox" name="is_transferee" defaultChecked /> Is Transferee</label>
          </div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBeneficiaryModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Beneficiary'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Asset Modal */}
      <Modal isOpen={showAssetModal} onClose={() => setShowAssetModal(false)} title="Add Asset (Parcel)">
        <form onSubmit={handleAddAsset}>
          <div className="form-group">
            <label>Asset Type *</label>
            <select name="asset_type" defaultValue="LAND_PARCEL">
              <option value="LAND_PARCEL">Land Parcel</option>
              <option value="HOUSE">House</option>
              <option value="MOTOR_VEHICLE">Motor Vehicle</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Parcel Number *</label><input name="parcel_number" required /></div>
            <div className="form-group"><label>Registry Office</label><input name="registry_office" placeholder="e.g., Nairobi, Kiambu" /></div>
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
          <div className="form-group">
            <label><input type="checkbox" name="encumbrance" /> Has Encumbrance (charge, caution, etc.)</label>
          </div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAssetModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Asset'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Transfer Modal */}
      <Modal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} title="Add Transfer">
        <form onSubmit={handleAddTransfer}>
          <div className="form-group">
            <label>Transfer Type</label>
            <select name="transfer_type">
              <option value="TRANSMISSION">Transmission (deceased estate)</option>
              <option value="TRANSFER">Transfer</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Transferee Name *</label><input name="transferee_name" required /></div>
            <div className="form-group"><label>Transferee ID No</label><input name="transferee_id_no" /></div>
          </div>
          <div className="form-group">
            <label>Link to Beneficiary</label>
            <select name="beneficiary_id">
              <option value="">— Select beneficiary —</option>
              {beneficiaries.map(b => <option key={b.id} value={b.id}>{b.full_name}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Share Details</label><input name="share_details" placeholder='e.g., "1/2 share", "whole"' /></div>
          <div className="form-group"><label>Remarks</label><textarea name="remarks" rows={2}></textarea></div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Transfer'}</button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
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
          <div className="form-group">
            <label>File *</label>
            <input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.tif,.tiff" />
          </div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowDocModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Uploading...' : 'Upload'}</button>
          </div>
        </form>
      </Modal>

      {/* Add Note Modal */}
      <Modal isOpen={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add Note">
        <form onSubmit={handleAddNote}>
          <div className="form-group"><label>Note *</label><textarea name="description" required rows={3} placeholder="Enter your note..."></textarea></div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNoteModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : 'Add Note'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Transfers List Sub-component ───
function TransfersList({ assetId, canEdit, onRefresh, beneficiaries }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/assets/${assetId}/transfers`)
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
      await api.patch(`/transfers/${transferId}`, body);
      onRefresh();
      // refresh transfers
      const res = await api.get(`/assets/${assetId}/transfers`);
      setTransfers(res.data.transfers);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update transfer status.');
    }
  };

  if (loading) return <Loading />;
  if (transfers.length === 0) return <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '16px' }}>No transfers yet.</p>;

  const statusOptions = {
    DRAFT: ['READY_FOR_SIGN'],
    READY_FOR_SIGN: ['SIGNED_SEALED', 'DRAFT'],
    SIGNED_SEALED: ['UPLOADED', 'READY_FOR_SIGN'],
    UPLOADED: ['RELEASED_TO_CLIENT', 'SIGNED_SEALED'],
    RELEASED_TO_CLIENT: ['COMPLETED', 'UPLOADED'],
  };

  return (
    <div className="table-container">
      <table>
        <thead><tr><th>Transferee</th><th>ID</th><th>Type</th><th>Share</th><th>Status</th><th>Completion</th>{canEdit && <th>Action</th>}</tr></thead>
        <tbody>
          {transfers.map(t => (
            <tr key={t.id}>
              <td><strong>{t.transferee_name}</strong></td>
              <td>{t.transferee_id_no || '—'}</td>
              <td>{t.transfer_type}</td>
              <td>{t.share_details || 'Whole'}</td>
              <td><StatusBadge status={t.transfer_status} /></td>
              <td>{formatDate(t.completion_date)}</td>
              {canEdit && (
                <td>
                  {statusOptions[t.transfer_status] && statusOptions[t.transfer_status].length > 0 && (
                    <select
                      className="btn btn-sm btn-secondary"
                      onChange={e => { if (e.target.value) handleStatusChange(t.id, e.target.value, t); }}
                      defaultValue=""
                    >
                      <option value="">Update...</option>
                      {statusOptions[t.transfer_status].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EstateFileDetail;
