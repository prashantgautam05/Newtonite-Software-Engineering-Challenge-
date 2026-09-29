export const STATUS_CONFIG = {
  OPEN: { label: 'Open', color: 'var(--status-open)', bg: 'var(--status-open-bg)' },
  IN_PROGRESS: { label: 'In Progress', color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' },
  AWAITING_APPROVAL: { label: 'Awaiting Approval', color: 'var(--status-awaiting)', bg: 'var(--status-awaiting-bg)' },
  RESOLVED: { label: 'Resolved', color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' },
  CLOSED: { label: 'Closed', color: 'var(--status-closed)', bg: 'var(--status-closed-bg)' },
};

export const PRIORITY_CONFIG = {
  CRITICAL: { label: 'Critical', color: 'var(--priority-critical)', bg: 'var(--priority-critical-bg)' },
  HIGH: { label: 'High', color: 'var(--priority-high)', bg: 'var(--priority-high-bg)' },
  MEDIUM: { label: 'Medium', color: 'var(--priority-medium)', bg: 'var(--priority-medium-bg)' },
  LOW: { label: 'Low', color: 'var(--priority-low)', bg: 'var(--priority-low-bg)' },
};

export const CATEGORY_CONFIG = {
  CUSTOMER_ISSUE: { label: 'Customer Issue', icon: '🎧' },
  INCIDENT: { label: 'Incident', icon: '🚨' },
  COMPLIANCE: { label: 'Compliance', icon: '📋' },
  PAYMENT: { label: 'Payment', icon: '💳' },
  OPERATIONAL: { label: 'Operational', icon: '⚙️' },
  OTHER: { label: 'Other', icon: '📌' },
};

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function timeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(dateString);
}
