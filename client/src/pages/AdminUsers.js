import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Loading, Modal, StatusBadge, formatDateTime } from '../components/Common';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    full_name: '', email: '', username: '', password: '', phone: '', role: 'CLERK'
  });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ full_name: '', email: '', username: '', password: '', phone: '', role: 'CLERK' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setForm({ full_name: u.full_name, email: u.email, username: u.username, password: '', phone: u.phone || '', role: u.role });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (editUser) {
        await api.patch(`/users/${editUser.id}`, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          role: form.role
        });
      } else {
        if (!form.password || form.password.length < 8) {
          setError('Password must be at least 8 characters.');
          setSubmitting(false);
          return;
        }
        await api.post('/users', form);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save user.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (u) => {
    if (!window.confirm(`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name}?`)) return;
    try {
      await api.patch(`/users/${u.id}`, { is_active: !u.is_active });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed.');
    }
  };

  const resetPassword = async (u) => {
    const newPwd = prompt(`Enter new password for ${u.full_name} (min 8 chars):`);
    if (!newPwd || newPwd.length < 8) {
      if (newPwd !== null) alert('Password must be at least 8 characters.');
      return;
    }
    try {
      await api.post(`/users/${u.id}/reset-password`, { newPassword: newPwd });
      alert('Password reset successfully.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password.');
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="subtitle">Manage system users and roles</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New User</button>
      </div>

      <div className="card">
        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Active</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.full_name}</strong></td>
                  <td>{u.username}</td>
                  <td>{u.email}</td>
                  <td><StatusBadge status={u.role} /></td>
                  <td>{u.is_active ? '✅ Active' : '❌ Inactive'}</td>
                  <td>{u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => toggleActive(u)}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(u)}>Reset Pwd</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editUser ? 'Edit User' : 'Create User'}>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group"><label>Full Name *</label><input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required /></div>
          <div className="form-row">
            <div className="form-group"><label>Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="form-group">
              <label>Username *</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editUser} />
            </div>
          </div>
          {!editUser && (
            <div className="form-group"><label>Password *</label><input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} /></div>
          )}
          <div className="form-row">
            <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group">
              <label>Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="ADMIN">Admin</option>
                <option value="OFFICER">Officer</option>
                <option value="CLERK">Clerk</option>
                <option value="AUDITOR">Auditor</option>
              </select>
            </div>
          </div>
          <div className="modal-footer" style={{ padding: 0, borderTop: 'none', marginTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving...' : (editUser ? 'Update' : 'Create User')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AdminUsers;
