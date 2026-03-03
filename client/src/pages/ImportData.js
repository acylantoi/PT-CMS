import React, { useState } from 'react';
import api from '../services/api';

function ImportData() {
  const [records, setRecords] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      setCsvText(text);
      parseCsv(text);
    };
    reader.readAsText(file);
  };

  const parseCsv = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      alert('CSV must have a header row and at least one data row.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const parsed = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const record = {};
      headers.forEach((h, idx) => {
        record[h] = values[idx] || '';
      });
      parsed.push(record);
    }

    setRecords(parsed);
    setResult(null);
  };

  const handleImport = async () => {
    if (records.length === 0) {
      alert('No records to import.');
      return;
    }

    if (!window.confirm(`Import ${records.length} records? This will create estate files, assets, and transfers.`)) return;

    setLoading(true);
    try {
      const res = await api.post('/import/csv', { records });
      setResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    window.open('/api/import/template', '_blank');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Import Historical Data</h1>
          <p className="subtitle">Bulk import estate files from CSV for historical records back-capture</p>
        </div>
        <button className="btn btn-secondary" onClick={downloadTemplate}>📥 Download CSV Template</button>
      </div>

      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div className="form-group">
            <label>Upload CSV File</label>
            <input type="file" accept=".csv" onChange={handleFileUpload} />
          </div>

          <div className="alert alert-info">
            <strong>CSV Columns:</strong> file_number, deceased_full_name, administration_type, grant_reference, grant_date, county, intake_date, parcel_number, registry_office, transferee_name, transferee_id_no, completion_date, officer_name
          </div>

          {records.length > 0 && (
            <>
              <p style={{ marginBottom: '12px' }}><strong>{records.length}</strong> records parsed from CSV.</p>

              <div className="table-container" style={{ maxHeight: '400px', overflow: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      {Object.keys(records[0]).map(key => <th key={key}>{key}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 50).map((r, idx) => (
                      <tr key={idx}>
                        <td>{idx + 1}</td>
                        {Object.values(r).map((v, i) => <td key={i}>{v || '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {records.length > 50 && <p style={{ padding: '8px', color: 'var(--text-light)' }}>Showing first 50 of {records.length} rows.</p>}
              </div>

              <button className="btn btn-primary" onClick={handleImport} disabled={loading} style={{ marginTop: '16px' }}>
                {loading ? 'Importing...' : `Import ${records.length} Records`}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import Results */}
      {result && (
        <div className="card">
          <div className="card-header"><h3>Import Results</h3></div>
          <div className="card-body">
            <div className={`alert ${result.errors?.length > 0 ? 'alert-warning' : 'alert-success'}`}>
              {result.message}
            </div>

            {result.errors && result.errors.length > 0 && (
              <>
                <h4 style={{ marginBottom: '8px' }}>Errors/Skipped:</h4>
                <div className="table-container" style={{ maxHeight: '300px', overflow: 'auto' }}>
                  <table>
                    <thead><tr><th>Row</th><th>Error</th></tr></thead>
                    <tbody>
                      {result.errors.map((err, idx) => (
                        <tr key={idx}><td>{err.row}</td><td>{err.error}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportData;
