import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Loading, EmptyState, formatDate } from '../components/Common';

function Reports() {
  const [reportType, setReportType] = useState('transfers');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [officers, setOfficers] = useState([]);

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [officerId, setOfficerId] = useState('');
  const [county, setCounty] = useState('');
  const [registryOffice, setRegistryOffice] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/users', { params: { role: 'OFFICER', is_active: 'true' } })
      .then(res => setOfficers(res.data.users))
      .catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (officerId) params.officer_id = officerId;
      if (county) params.county = county;
      if (registryOffice) params.registry_office = registryOffice;
      if (status) params.status = status;
      if (search) params.search = search;

      const res = await api.get(`/reports/${reportType}`, { params });
      setData(res.data.data || res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = { format };
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      if (officerId) params.officer_id = officerId;
      if (county) params.county = county;
      if (registryOffice) params.registry_office = registryOffice;
      if (status) params.status = status;
      if (search) params.search = search;

      const res = await api.get(`/reports/${reportType}`, {
        params,
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      const ext = format === 'excel' ? 'xlsx' : 'csv';
      link.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.${ext}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Export failed.');
    }
  };

  const reportOptions = [
    { value: 'transfers', label: 'All Transfers' },
    { value: 'by-officer', label: 'By Officer' },
    { value: 'by-county', label: 'By County / Registry' },
    { value: 'summary', label: 'Administration Summary' },
    { value: 'parcel-transferee', label: 'Parcel → Transferee Mapping' },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p className="subtitle">Generate and export conveyancing reports</p>
        </div>
      </div>

      {/* Report selector + Filters */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="form-row">
            <div className="form-group">
              <label>Report Type</label>
              <select value={reportType} onChange={e => { setReportType(e.target.value); setData(null); }}>
                {reportOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
            </div>
          </div>

          {(reportType === 'transfers') && (
            <div className="form-row">
              <div className="form-group">
                <label>Officer</label>
                <select value={officerId} onChange={e => setOfficerId(e.target.value)}>
                  <option value="">All</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>County</label>
                <input value={county} onChange={e => setCounty(e.target.value)} placeholder="County..." />
              </div>
              <div className="form-group">
                <label>Registry Office</label>
                <input value={registryOffice} onChange={e => setRegistryOffice(e.target.value)} placeholder="Registry..." />
              </div>
              <div className="form-group">
                <label>Transfer Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="READY_FOR_SIGN">Ready for Sign</option>
                  <option value="SIGNED_SEALED">Signed/Sealed</option>
                  <option value="UPLOADED">Uploaded</option>
                  <option value="RELEASED_TO_CLIENT">Released to Client</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          )}

          {reportType === 'parcel-transferee' && (
            <div className="form-group">
              <label>Search (parcel or transferee)</label>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." />
            </div>
          )}

          <div className="btn-group" style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={fetchReport}>Generate Report</button>
            {data && (
              <>
                <button className="btn btn-secondary" onClick={() => handleExport('csv')}>📥 Export CSV</button>
                <button className="btn btn-secondary" onClick={() => handleExport('excel')}>📊 Export Excel</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {loading && <Loading />}
      {data && !loading && (
        <div className="card">
          <div className="card-header">
            <h3>Results ({Array.isArray(data) ? data.length : '—'})</h3>
          </div>
          <div className="card-body">
            {(!Array.isArray(data) || data.length === 0) ? (
              <EmptyState message="No data found for the selected filters." />
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {Object.keys(data[0]).map(key => (
                        <th key={key}>{key.replace(/_/g, ' ')}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(0, 200).map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, i) => (
                          <td key={i}>
                            {val === null || val === undefined ? '—' :
                              typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/) ? formatDate(val) :
                              String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 200 && <p style={{ padding: '12px', color: 'var(--text-light)', fontSize: '13px' }}>Showing first 200 of {data.length} rows. Export for full data.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
