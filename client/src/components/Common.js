import React from 'react';

export function StatusBadge({ status }) {
  if (!status) return null;
  const className = `badge badge-${status.toLowerCase()}`;
  const label = status.replace(/_/g, ' ');
  return <span className={className}>{label}</span>;
}

export function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.total_pages <= 1) return null;
  
  const { page, total, total_pages, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="pagination">
      <div className="pagination-info">
        Showing {start}–{end} of {total} records
      </div>
      <div className="pagination-buttons">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          ← Prev
        </button>
        {Array.from({ length: Math.min(total_pages, 5) }, (_, i) => {
          let p;
          if (total_pages <= 5) {
            p = i + 1;
          } else if (page <= 3) {
            p = i + 1;
          } else if (page >= total_pages - 2) {
            p = total_pages - 4 + i;
          } else {
            p = page - 2 + i;
          }
          return (
            <button
              key={p}
              className={p === page ? 'active' : ''}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          );
        })}
        <button disabled={page >= total_pages} onClick={() => onPageChange(page + 1)}>
          Next →
        </button>
      </div>
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading">
      <div className="spinner"></div>
    </div>
  );
}

export function EmptyState({ icon = '📭', message = 'No records found.' }) {
  return (
    <div className="empty-state">
      <div className="icon">{icon}</div>
      <p>{message}</p>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
