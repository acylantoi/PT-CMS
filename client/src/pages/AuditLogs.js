import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Loading, Pagination, EmptyState, formatDateTime } from '../components/Common';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [actorId, setActorId] = useState('');
  const [action, setAction] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get('/users').then(res => setUsers(res.data.users)).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const params = { page, limit: 50 };
        if (entityType) params.entity_type = entityType;
        if (actorId) params.actor_id = actorId;
        if (action) params.action = action;
        if (fromDate) params.from = fromDate;
        if (toDate) params.to = toDate;

        const res = await api.get('/audit', { params });
        setLogs(res.data.audit_logs);
        setPagination(res.data.pagination);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [page, entityType, actorId, action, fromDate, toDate]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p className="subtitle">System-wide activity and change tracking</p>
        </div>
      </div>

      {/* Filters */}
      <div className="search-bar">
        <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}>
          <option value="">All Entities</option>
          <option value="users">Users</option>
          <option value="estate_files">Estate Files</option>
          <option value="assets">Assets</option>
          <option value="transfers">Transfers</option>
          <option value="beneficiaries">Beneficiaries</option>
          <option value="documents">Documents</option>
          <option value="reports">Reports</option>
          <option value="import">Import</option>
        </select>
        <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
          <option value="EXPORT">Export</option>
        </select>
        <select value={actorId} onChange={e => { setActorId(e.target.value); setPage(1); }}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
        <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
      </div>

      <div className="card">
        {loading ? <Loading /> : logs.length === 0 ? <EmptyState message="No audit logs found." /> : (
          <>
            <div className="table-container">
              <table>
                <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>IP</th><th>Details</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.created_at)}</td>
                      <td>{log.actor_name || '—'}</td>
                      <td><span className={`badge badge-${log.action?.toLowerCase()}`}>{log.action}</span></td>
                      <td>{log.entity_type}{log.entity_id ? ` (${log.entity_id.slice(0, 8)}...)` : ''}</td>
                      <td>{log.ip_address || '—'}</td>
                      <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.after_data ? (
                          <details>
                            <summary style={{ cursor: 'pointer', fontSize: '12px' }}>View changes</summary>
                            <pre style={{ fontSize: '11px', maxHeight: '200px', overflow: 'auto', background: '#f5f5f5', padding: '8px', borderRadius: '4px', marginTop: '4px' }}>
                              {JSON.stringify(log.after_data, null, 2)}
                            </pre>
                          </details>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 16px' }}>
              <Pagination pagination={pagination} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default AuditLogs;
