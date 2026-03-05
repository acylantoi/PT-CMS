import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊', roles: null },
    { path: '/estate-files', label: 'Estate Files', icon: '📁', roles: null },
    { path: '/reports', label: 'Reports', icon: '📈', roles: null },
    { path: '/import', label: 'Import Data', icon: '📥', roles: ['ADMIN', 'OFFICER'] },
    { path: '/admin/users', label: 'Users', icon: '👥', roles: ['ADMIN'] },
    { path: '/admin/audit', label: 'Audit Logs', icon: '🔍', roles: ['ADMIN', 'AUDITOR'] },
  ];

  return (
    <div className="app-layout">
      {/* Mobile hamburger */}
      <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
        <span className={`hamburger ${sidebarOpen ? 'open' : ''}`}>
          <span></span><span></span><span></span>
        </span>
      </button>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>🏛️ PT-CMS</h2>
          <p>Case Management System</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            if (item.roles && !item.roles.includes(user.role)) return null;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => isActive || (item.path === '/dashboard' && location.pathname === '/') ? 'active' : ''}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-name">{user.full_name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button onClick={logout} className="btn btn-sm btn-secondary" style={{ width: '100%' }}>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
