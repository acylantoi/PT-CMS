import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { StatusBadge, Pagination, Loading, EmptyState, formatDate } from '../components/Common';

function EstateFiles() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [adminType, setAdminType] = useState(searchParams.get('administration_type') || '');
  const [officerId, setOfficerId] = useState(searchParams.get('officer_id') || '');
  const [county, setCounty] = useState(searchParams.get('county') || '');

  const page = parseInt(searchParams.get('page')) || 1;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search) params.search = search;
      if (status) params.status = status;
      if (adminType) params.administration_type = adminType;
      if (officerId) params.officer_id = officerId;
      if (county) params.county = county;

      const res = await api.get('/estate-files', { params });
      setFiles(res.data.estate_files);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, status, adminType, officerId, county]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    api.get('/users', { params: { role: 'OFFICER', is_active: 'true' } })
      .then(res => setOfficers(res.data.users))
      .catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (adminType) params.administration_type = adminType;
    if (officerId) params.officer_id = officerId;
    if (county) params.county = county;
    params.page = '1';
    setSearchParams(params);
  };

  const handleClear = () => {
    setSearch('');
    setStatus('');
    setAdminType('');
    setOfficerId('');
    setCounty('');
    setSearchParams({});
  };

  const handlePageChange = (newPage) => {
    const params = Object.fromEntries(searchParams.entries());
    params.page = String(newPage);
    setSearchParams(params);
  };

  const statuses = ['INTAKE', 'WAITING_GRANT', 'IN_CONVEYANCING', 'PARTIALLY_COMPLETED', 'COMPLETED', 'ON_HOLD'];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Estate Files</h1>
          <p className="subtitle">Land transfer records for estates of deceased persons</p>
        </div>
        <Link to="/estate-files/new" className="btn btn-primary">+ New Estate File</Link>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearch} className="search-bar">
        <input
          type="text"
          placeholder="Search file no, deceased name, ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <select value={adminType} onChange={e => setAdminType(e.target.value)}>
          <option value="">All Types</option>
          <option value="COURT">Court</option>
          <option value="SUMMARY">Summary</option>
        </select>
        <select value={officerId} onChange={e => setOfficerId(e.target.value)}>
          <option value="">All Officers</option>
          {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
        </select>
        <input
          type="text"
          placeholder="County..."
          value={county}
          onChange={e => setCounty(e.target.value)}
          style={{ minWidth: '120px' }}
        />
        <button type="submit" className="btn btn-primary">Search</button>
        <button type="button" className="btn btn-secondary" onClick={handleClear}>Clear</button>
      </form>

      {/* Table */}
      <div className="card">
        {loading ? (
          <Loading />
        ) : files.length === 0 ? (
          <EmptyState message="No estate files found. Create one to get started." />
        ) : (
          <>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>File No</th>
                    <th>Deceased</th>
                    <th>Type</th>
                    <th>County</th>
                    <th>Assigned Officer</th>
                    <th>Status</th>
                    <th>Assets</th>
                    <th>Intake Date</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map(f => (
                    <tr key={f.id} className="clickable" onClick={() => window.location.href = `/estate-files/${f.id}`}>
                      <td><Link to={`/estate-files/${f.id}`} onClick={e => e.stopPropagation()}><strong>{f.file_number}</strong></Link></td>
                      <td>{f.deceased_full_name}</td>
                      <td><StatusBadge status={f.administration_type} /></td>
                      <td>{f.county || '—'}</td>
                      <td>{f.officer_name || '—'}</td>
                      <td><StatusBadge status={f.current_status} /></td>
                      <td>{f.asset_count}</td>
                      <td>{formatDate(f.intake_date)}</td>
                      <td>{formatDate(f.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '0 16px' }}>
              <Pagination pagination={pagination} onPageChange={handlePageChange} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EstateFiles;
