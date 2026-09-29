import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { workItemsAPI } from '../api/client';
import { STATUS_CONFIG, PRIORITY_CONFIG, timeAgo } from '../utils/constants';
import {
  HiOutlineClipboardList,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineCheckCircle,
  HiOutlineUser,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import './Dashboard.css';

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => workItemsAPI.dashboard().then((r) => r.data),
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="loading-center">
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'Open', value: stats?.totalOpen || 0, icon: <HiOutlineClipboardList />, color: 'var(--status-open)', bg: 'var(--status-open-bg)' },
    { label: 'In Progress', value: stats?.totalInProgress || 0, icon: <HiOutlineClock />, color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' },
    { label: 'Awaiting Approval', value: stats?.totalAwaitingApproval || 0, icon: <HiOutlineExclamation />, color: 'var(--status-awaiting)', bg: 'var(--status-awaiting-bg)' },
    { label: 'Resolved', value: stats?.totalResolved || 0, icon: <HiOutlineCheckCircle />, color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' },
    { label: 'Critical', value: stats?.totalCritical || 0, icon: <HiOutlineLightningBolt />, color: 'var(--priority-critical)', bg: 'var(--priority-critical-bg)' },
    { label: 'Assigned to Me', value: stats?.assignedToMe || 0, icon: <HiOutlineUser />, color: 'var(--accent-primary)', bg: 'var(--accent-primary-subtle)' },
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of your operational work</p>
      </div>

      <div className="stats-grid">
        {statCards.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-card animate-fade-in"
            style={{ animationDelay: `${i * 60}ms`, '--stat-color': stat.color, '--stat-bg': stat.bg }}
          >
            <div className="stat-icon" style={{ color: stat.color, background: stat.bg }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Recent Activity</h2>
          <Link to="/work-items" className="btn btn-ghost btn-sm">View All →</Link>
        </div>

        <div className="recent-items">
          {stats?.recentItems?.length > 0 ? (
            stats.recentItems.map((item, i) => (
              <Link
                key={item.id}
                to={`/work-items/${item.id}`}
                className="recent-item animate-fade-in"
                style={{ animationDelay: `${(i + 6) * 60}ms` }}
              >
                <div className="recent-item-status">
                  <span
                    className="badge"
                    style={{
                      color: STATUS_CONFIG[item.status]?.color,
                      background: STATUS_CONFIG[item.status]?.bg,
                    }}
                  >
                    {STATUS_CONFIG[item.status]?.label}
                  </span>
                  <span
                    className="badge"
                    style={{
                      color: PRIORITY_CONFIG[item.priority]?.color,
                      background: PRIORITY_CONFIG[item.priority]?.bg,
                    }}
                  >
                    {PRIORITY_CONFIG[item.priority]?.label}
                  </span>
                </div>
                <h3 className="recent-item-title">{item.title}</h3>
                <div className="recent-item-meta">
                  <span>{item.team?.name}</span>
                  <span>·</span>
                  <span>{item.assignee?.name || 'Unassigned'}</span>
                  <span>·</span>
                  <span>{timeAgo(item.updatedAt)}</span>
                </div>
              </Link>
            ))
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📋</div>
              <p className="empty-state-title">No work items yet</p>
              <p>Create your first work item to get started.</p>
              <Link to="/work-items/new" className="btn btn-primary" style={{ marginTop: 'var(--space-4)' }}>
                Create Work Item
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
