import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { Loading } from '../components/Common';

function EstateFileForm() {
  const { id } = useParams(); // if editing
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [officers, setOfficers] = useState([]);

  const [form, setForm] = useState({
    file_number: '',
    deceased_full_name: '',
    deceased_id_no: '',
    date_of_death: '',
    county: '',
    sub_county: '',
    intake_date: new Date().toISOString().split('T')[0],
    administration_type: 'COURT',
    grant_reference: '',
    grant_date: '',
    confirmed_grant_date: '',
    estate_value_estimate: '',
    assigned_officer_id: '',
    notes: ''
  });

  useEffect(() => {
    api.get('/users', { params: { role: 'OFFICER', is_active: 'true' } })
      .then(res => setOfficers(res.data.users))
      .catch(() => {});

    if (id) {
      api.get(`/estate-files/${id}`)
        .then(res => {
          const ef = res.data.estate_file;
          setForm({
            file_number: ef.file_number || '',
            deceased_full_name: ef.deceased_full_name || '',
            deceased_id_no: ef.deceased_id_no || '',
            date_of_death: ef.date_of_death ? ef.date_of_death.split('T')[0] : '',
            county: ef.county || '',
            sub_county: ef.sub_county || '',
            intake_date: ef.intake_date ? ef.intake_date.split('T')[0] : '',
            administration_type: ef.administration_type || 'COURT',
            grant_reference: ef.grant_reference || '',
            grant_date: ef.grant_date ? ef.grant_date.split('T')[0] : '',
            confirmed_grant_date: ef.confirmed_grant_date ? ef.confirmed_grant_date.split('T')[0] : '',
            estate_value_estimate: ef.estate_value_estimate || '',
            assigned_officer_id: ef.assigned_officer_id || '',
            notes: ef.notes || ''
          });
        })
        .catch(err => setError(err.response?.data?.error || 'Failed to load estate file.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = { ...form };
      // Clean empty strings to null
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });

      if (id) {
        await api.patch(`/estate-files/${id}`, payload);
        navigate(`/estate-files/${id}`);
      } else {
        const res = await api.post('/estate-files', payload);
        navigate(`/estate-files/${res.data.estate_file.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save estate file.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div>
          <Link to="/estate-files" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>← Estate Files</Link>
          <h1>{id ? 'Edit Estate File' : 'New Estate File'}</h1>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>File Number *</label>
                <input name="file_number" value={form.file_number} onChange={handleChange} required placeholder="e.g., PT/2026/001" />
              </div>
              <div className="form-group">
                <label>Deceased Full Name *</label>
                <input name="deceased_full_name" value={form.deceased_full_name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Deceased ID Number</label>
                <input name="deceased_id_no" value={form.deceased_id_no} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Date of Death</label>
                <input type="date" name="date_of_death" value={form.date_of_death} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>County</label>
                <input name="county" value={form.county} onChange={handleChange} placeholder="e.g., Nairobi" />
              </div>
              <div className="form-group">
                <label>Sub-County</label>
                <input name="sub_county" value={form.sub_county} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Intake Date *</label>
                <input type="date" name="intake_date" value={form.intake_date} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Administration Type *</label>
                <select name="administration_type" value={form.administration_type} onChange={handleChange} required>
                  <option value="COURT">Court (Grant of Letters)</option>
                  <option value="SUMMARY">Summary (Summary Certificate)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Officer</label>
                <select name="assigned_officer_id" value={form.assigned_officer_id} onChange={handleChange}>
                  <option value="">— Select officer —</option>
                  {officers.map(o => <option key={o.id} value={o.id}>{o.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Grant Reference</label>
                <input name="grant_reference" value={form.grant_reference} onChange={handleChange} placeholder="Court case no / certificate ref" />
              </div>
              <div className="form-group">
                <label>Grant Date</label>
                <input type="date" name="grant_date" value={form.grant_date} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label>Confirmed Grant Date</label>
                <input type="date" name="confirmed_grant_date" value={form.confirmed_grant_date} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Estate Value Estimate (KES)</label>
                <input type="number" name="estate_value_estimate" value={form.estate_value_estimate} onChange={handleChange} step="0.01" />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} placeholder="Any additional notes..."></textarea>
            </div>

            <div className="btn-group" style={{ marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : (id ? 'Update Estate File' : 'Create Estate File')}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EstateFileForm;
