import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { teamsAPI } from '../api/client';
import { HiOutlineUserGroup, HiOutlineClipboardList } from 'react-icons/hi';
import './Teams.css';

export default function TeamsPage() {
  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list().then((r) => r.data),
  });

  if (isLoading) return <div className="loading-center"><div className="spinner spinner-lg"></div></div>;

  return (
    <div className="teams-page">
      <div className="page-header">
        <h1 className="page-title">Teams</h1>
        <p className="page-subtitle">Your team memberships</p>
      </div>

      <div className="teams-grid">
        {teams?.map((team, i) => (
          <div key={team.id} className="team-card card animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="team-card-header">
              <div className="team-icon"><HiOutlineUserGroup /></div>
              <div>
                <h3 className="team-name">{team.name}</h3>
                <span className="team-role-badge badge" style={{
                  color: team.role === 'ADMIN' ? 'var(--priority-high)' : team.role === 'MEMBER' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  background: team.role === 'ADMIN' ? 'var(--priority-high-bg)' : team.role === 'MEMBER' ? 'var(--accent-primary-subtle)' : 'var(--surface-glass)',
                }}>{team.role}</span>
              </div>
            </div>
            {team.description && <p className="team-description">{team.description}</p>}
            <div className="team-stats">
              <div className="team-stat">
                <HiOutlineUserGroup />
                <span>{team.memberCount} members</span>
              </div>
              <div className="team-stat">
                <HiOutlineClipboardList />
                <span>{team.workItemCount} items</span>
              </div>
            </div>
            <Link to={`/work-items?teamId=${team.id}`} className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 'var(--space-3)' }}>
              View Items
            </Link>
          </div>
        ))}
      </div>

      {!teams?.length && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <p className="empty-state-title">No teams yet</p>
          <p>You're not a member of any teams.</p>
        </div>
      )}
    </div>
  );
}
