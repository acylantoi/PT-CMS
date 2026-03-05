import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Loading, formatDateTime } from '../components/Common';

function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div className="alert alert-error">Failed to load dashboard.</div>;

  const { cards, status_breakdown, admin_type_breakdown, asset_type_breakdown, recent_events, officer_workload } = data;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Overview of conveyancing operations</p>
        </div>
        <Link to="/estate-files/new" className="btn btn-primary">+ New Estate File</Link>
      </div>

      {/* Stat Cards */}
      <div className="dashboard-cards">
        <div className="stat-card info">
          <div className="stat-value">{cards.active_files ?? 0}</div>
          <div className="stat-label">Active Files</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{cards.awaiting_certified_copies ?? 0}</div>
          <div className="stat-label">Awaiting Certified Copies</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{cards.awaiting_fees ?? 0}</div>
          <div className="stat-label">Awaiting Fee Confirmation</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{cards.forms_in_progress ?? 0}</div>
          <div className="stat-label">Forms In Progress</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{cards.awaiting_proof ?? 0}</div>
          <div className="stat-label">Awaiting Proof of Registration</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{cards.closed_files ?? 0}</div>
          <div className="stat-label">Closed Files</div>
        </div>
        <div className="stat-card info">
          <div className="stat-value">{cards.total_assets ?? cards.total_parcels ?? 0}</div>
          <div className="stat-label">Total Assets</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{cards.transfers_completed ?? cards.transfers_this_month ?? 0}</div>
          <div className="stat-label">Transfers Completed</div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h3>Recent Activity</h3>
          </div>
          <div className="card-body">
            {(recent_events || []).length === 0 ? (
              <p style={{ color: 'var(--text-light)', textAlign: 'center', padding: '20px' }}>No recent activity</p>
            ) : (
              <ul className="timeline">
                {(recent_events || []).map(event => (
                  <li key={event.id} className="timeline-item">
                    <div className={`timeline-dot ${event.event_type === 'STATUS_CHANGE' ? 'status-change' : event.event_type === 'DOCUMENT_UPLOADED' ? 'document' : ''}`}></div>
                    <div className="timeline-content">
                      <div className="description">
                        <strong>{event.performed_by_name}</strong> — {event.description}
                      </div>
                      <div className="meta">
                        {event.file_number && <Link to={`/estate-files/${event.estate_file_id}`}>File: {event.file_number}</Link>}
                        {' · '}
                        {formatDateTime(event.performed_at)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Side panels */}
        <div>
          {/* Status Breakdown */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h3>Status Breakdown</h3>
            </div>
            <div className="card-body">
              {(status_breakdown || []).map(s => {
                const key = s.current_status || s.conveyancing_status || 'Unknown';
                return (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px' }}>{key.replace(/_/g, ' ')}</span>
                    <strong>{s.count}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Admin Type */}
          <div className="card" style={{ marginBottom: '16px' }}>
            <div className="card-header">
              <h3>Administration Type</h3>
            </div>
            <div className="card-body">
              {(admin_type_breakdown || []).map(s => (
                <div key={s.administration_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                  <span style={{ fontSize: '13px' }}>{s.administration_type}</span>
                  <strong>{s.count}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Asset Type Breakdown */}
          {asset_type_breakdown && asset_type_breakdown.length > 0 && (
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-header">
                <h3>Assets by Type</h3>
              </div>
              <div className="card-body">
                {asset_type_breakdown.map(s => (
                  <div key={s.asset_type} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '13px' }}>{s.asset_type.replace(/_/g, ' ')}</span>
                    <strong>{s.count}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Officer Workload */}
          <div className="card">
            <div className="card-header">
              <h3>Officer Workload</h3>
            </div>
            <div className="card-body">
              {(officer_workload || []).map(o => (
                <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '13px' }}>{o.full_name}</span>
                  <strong>{o.active_cases} cases</strong>
                </div>
              ))}
              {(officer_workload || []).length === 0 && <p style={{ color: 'var(--text-light)', fontSize: '13px' }}>No officers assigned</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
