import React from 'react';

const STATUS_COLORS = {
  // Conveyancing file statuses
  RECEIVED_AT_CONVEYANCING: { bg: '#E3F2FD', color: '#1565C0' },
  AWAITING_CERTIFIED_COPIES: { bg: '#FFF3E0', color: '#E65100' },
  AWAITING_FEE_CONFIRMATION: { bg: '#FFF8E1', color: '#F57F17' },
  FORMS_IN_PROGRESS: { bg: '#E8F5E9', color: '#2E7D32' },
  FORMS_READY: { bg: '#C8E6C9', color: '#1B5E20' },
  DOCUMENTS_ISSUED: { bg: '#E1F5FE', color: '#0277BD' },
  AWAITING_RETURNED_TITLE_COPY: { bg: '#F3E5F5', color: '#7B1FA2' },
  PARTIALLY_CLOSED: { bg: '#FCE4EC', color: '#AD1457' },
  CLOSED: { bg: '#ECEFF1', color: '#455A64' },
  // Parcel statuses
  PARCEL_CAPTURED: { bg: '#E3F2FD', color: '#1565C0' },
  TRANSFER_PREPARED: { bg: '#FFF3E0', color: '#E65100' },
  SIGNED_SEALED: { bg: '#E8F5E9', color: '#2E7D32' },
  AWAITING_PROOF: { bg: '#F3E5F5', color: '#7B1FA2' },
  // Legacy estate statuses
  INTAKE: { bg: '#E3F2FD', color: '#1565C0' },
  WAITING_GRANT: { bg: '#FFF3E0', color: '#E65100' },
  IN_CONVEYANCING: { bg: '#E8F5E9', color: '#2E7D32' },
  PARTIALLY_COMPLETED: { bg: '#FCE4EC', color: '#AD1457' },
  COMPLETED: { bg: '#C8E6C9', color: '#1B5E20' },
  ON_HOLD: { bg: '#FFF9C4', color: '#F57F17' },
  // Legacy asset statuses
  PENDING: { bg: '#E3F2FD', color: '#1565C0' },
  IN_PROGRESS: { bg: '#E8F5E9', color: '#2E7D32' },
  // Transfer statuses
  DRAFT: { bg: '#ECEFF1', color: '#546E7A' },
  READY_FOR_SIGN: { bg: '#FFF3E0', color: '#E65100' },
  UPLOADED: { bg: '#E1F5FE', color: '#0277BD' },
  RELEASED_TO_CLIENT: { bg: '#EDE7F6', color: '#5E35B1' },
  // Administration types
  COURT: { bg: '#E3F2FD', color: '#1565C0' },
  SUMMARY: { bg: '#FFF3E0', color: '#E65100' },
  COURT_GRANT: { bg: '#E3F2FD', color: '#1565C0' },
  SUMMARY_CERT: { bg: '#FFF3E0', color: '#E65100' },
  // Fees
  PAID: { bg: '#C8E6C9', color: '#1B5E20' },
  NOT_PAID: { bg: '#FFCDD2', color: '#B71C1C' },
  UNKNOWN: { bg: '#FFF9C4', color: '#F57F17' },
  EXEMPT: { bg: '#E0F7FA', color: '#00695C' },
  // Doc types
  GRANT: { bg: '#E8F5E9', color: '#2E7D32' },
  CONFIRMED_GRANT: { bg: '#C8E6C9', color: '#1B5E20' },
  SUMMARY_CERT_DOC: { bg: '#FFF3E0', color: '#E65100' },
  ID_COPY: { bg: '#ECEFF1', color: '#455A64' },
  SEARCH: { bg: '#E1F5FE', color: '#0277BD' },
  TRANSFER_FORM: { bg: '#F3E5F5', color: '#7B1FA2' },
  CONSENT: { bg: '#E0F7FA', color: '#00695C' },
  ECITIZEN_UPLOAD: { bg: '#EDE7F6', color: '#5E35B1' },
  OTHER: { bg: '#ECEFF1', color: '#546E7A' },
  TRANSMISSION: { bg: '#E8F5E9', color: '#2E7D32' },
  TRANSFER: { bg: '#E3F2FD', color: '#1565C0' },
  // Asset types
  LAND_PARCEL: { bg: '#E8F5E9', color: '#2E7D32' },
  LAND_COMPANY: { bg: '#C8E6C9', color: '#1B5E20' },
  SHARES_CDSC: { bg: '#E3F2FD', color: '#1565C0' },
  SHARES_CERTIFICATE: { bg: '#E1F5FE', color: '#0277BD' },
  MOTOR_VEHICLE: { bg: '#FFF3E0', color: '#E65100' },
  UFAA_CLAIM: { bg: '#F3E5F5', color: '#7B1FA2' },
  DISCHARGE_OF_CHARGE: { bg: '#FCE4EC', color: '#AD1457' },
  // Generic asset statuses
  NOT_STARTED: { bg: '#ECEFF1', color: '#546E7A' },
  AWAITING_DOCUMENTS: { bg: '#FFF3E0', color: '#E65100' },
  FORMS_PREPARED: { bg: '#E8F5E9', color: '#2E7D32' },
  SUBMITTED: { bg: '#E1F5FE', color: '#0277BD' },
};

export function StatusBadge({ status }) {
  if (!status) return null;
  const colors = STATUS_COLORS[status] || { bg: '#ECEFF1', color: '#455A64' };
  const label = status.replace(/_/g, ' ');
  return (
    <span className="badge" style={{ background: colors.bg, color: colors.color }}>
      {label}
    </span>
  );
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
