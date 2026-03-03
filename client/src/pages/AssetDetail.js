import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, Loading, EmptyState, formatDate, formatDateTime } from '../components/Common';

function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const canEdit = ['ADMIN', 'OFFICER', 'CLERK'].includes(user.role);

  const fetchData = async () => {
    try {
      const res = await api.get(`/assets/${id}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]); // eslint-disable-line

  const handleAssetStatus = async (newStatus) => {
    if (!window.confirm(`Change asset status to ${newStatus.replace(/_/g, ' ')}?`)) return;
    try {
      await api.patch(`/assets/${id}`, { asset_status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleTransferStatus = async (transferId, newStatus, transfer) => {
    let body = { transfer_status: newStatus };
    if (newStatus === 'COMPLETED' && !transfer.completion_date) {
      const date = prompt('Enter completion date (YYYY-MM-DD):');
      if (!date) return;
      body.completion_date = date;
    }
    try {
      await api.patch(`/transfers/${transferId}`, body);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update transfer.');
    }
  };

  if (loading) return <Loading />;
  if (!data) return <div className="alert alert-error">Asset not found.</div>;

  const { asset, transfers, workflow_events } = data;

  const assetStatusOptions = {
    PENDING: ['IN_PROGRESS', 'ON_HOLD'],
    IN_PROGRESS: ['SIGNED_SEALED', 'ON_HOLD'],
    SIGNED_SEALED: ['UPLOADED', 'ON_HOLD'],
    UPLOADED: ['COMPLETED', 'ON_HOLD'],
    ON_HOLD: ['PENDING', 'IN_PROGRESS', 'SIGNED_SEALED', 'UPLOADED']
  };

  const transferStatusOptions = {
    DRAFT: ['READY_FOR_SIGN'],
    READY_FOR_SIGN: ['SIGNED_SEALED', 'DRAFT'],
    SIGNED_SEALED: ['UPLOADED', 'READY_FOR_SIGN'],
    UPLOADED: ['RELEASED_TO_CLIENT', 'SIGNED_SEALED'],
    RELEASED_TO_CLIENT: ['COMPLETED', 'UPLOADED'],
  };

  const nextAssetStatuses = assetStatusOptions[asset.asset_status] || [];

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to={`/estate-files/${asset.estate_file_id}`} style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            ← {asset.file_number} — {asset.deceased_full_name}
          </Link>
          <h1>Asset: {asset.parcel_number || asset.asset_type}</h1>
          <div style={{ marginTop: '8px' }}><StatusBadge status={asset.asset_status} /></div>
        </div>
        {canEdit && nextAssetStatuses.length > 0 && (
          <select className="btn btn-secondary" onChange={e => { if (e.target.value) handleAssetStatus(e.target.value); }} defaultValue="">
            <option value="">Change Status...</option>
            {nextAssetStatuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        )}
      </div>

      {/* Asset Details */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header"><h3>Asset Details</h3></div>
        <div className="card-body">
          <div className="detail-grid">
            <div className="detail-item"><div className="label">Asset Type</div><div className="value">{asset.asset_type}</div></div>
            <div className="detail-item"><div className="label">Parcel Number</div><div className="value">{asset.parcel_number || '—'}</div></div>
            <div className="detail-item"><div className="label">Registry Office</div><div className="value">{asset.registry_office || '—'}</div></div>
            <div className="detail-item"><div className="label">County</div><div className="value">{asset.county || '—'}</div></div>
            <div className="detail-item"><div className="label">Land Size</div><div className="value">{asset.land_size || '—'}</div></div>
            <div className="detail-item"><div className="label">Title Type</div><div className="value">{asset.title_type || '—'}</div></div>
            <div className="detail-item"><div className="label">Encumbrance</div><div className="value">{asset.encumbrance_flag ? '⚠️ Yes' : 'No'}</div></div>
            {asset.encumbrance_notes && (
              <div className="detail-item" style={{ gridColumn: '1/-1' }}><div className="label">Encumbrance Notes</div><div className="value">{asset.encumbrance_notes}</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Transfers */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header"><h3>Transfers ({transfers.length})</h3></div>
        <div className="card-body">
          {transfers.length === 0 ? <EmptyState message="No transfers yet." /> : (
            <div className="table-container">
              <table>
                <thead><tr><th>Transferee</th><th>ID</th><th>Type</th><th>Share</th><th>Instrument Date</th><th>Completion</th><th>Status</th>{canEdit && <th>Action</th>}</tr></thead>
                <tbody>
                  {transfers.map(t => (
                    <tr key={t.id}>
                      <td><strong>{t.transferee_name}</strong></td>
                      <td>{t.transferee_id_no || '—'}</td>
                      <td>{t.transfer_type}</td>
                      <td>{t.share_details || 'Whole'}</td>
                      <td>{formatDate(t.instrument_date)}</td>
                      <td>{formatDate(t.completion_date)}</td>
                      <td><StatusBadge status={t.transfer_status} /></td>
                      {canEdit && (
                        <td>
                          {transferStatusOptions[t.transfer_status] && transferStatusOptions[t.transfer_status].length > 0 && (
                            <select className="btn btn-sm btn-secondary" onChange={e => { if (e.target.value) handleTransferStatus(t.id, e.target.value, t); }} defaultValue="">
                              <option value="">Update...</option>
                              {transferStatusOptions[t.transfer_status].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="card">
        <div className="card-header"><h3>Activity Timeline</h3></div>
        <div className="card-body">
          {workflow_events.length === 0 ? <EmptyState message="No activity." /> : (
            <ul className="timeline">
              {workflow_events.map(event => (
                <li key={event.id} className="timeline-item">
                  <div className={`timeline-dot ${event.event_type === 'STATUS_CHANGE' ? 'status-change' : ''}`}></div>
                  <div className="timeline-content">
                    <div className="description"><strong>{event.performed_by_name}</strong> — {event.description}</div>
                    <div className="meta">{formatDateTime(event.performed_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AssetDetail;
