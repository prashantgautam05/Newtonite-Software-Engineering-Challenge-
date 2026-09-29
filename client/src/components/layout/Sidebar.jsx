import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  HiOutlineViewGrid,
  HiOutlineClipboardList,
  HiOutlineUserGroup,
  HiOutlinePlus,
  HiOutlineLogout,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <HiOutlineLightningBolt />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-brand-name">Newtonian</span>
          <span className="sidebar-brand-sub">Operations Hub</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section">
          <span className="sidebar-section-label">Main</span>
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <HiOutlineViewGrid className="sidebar-link-icon" />
            Dashboard
          </NavLink>
          <NavLink to="/work-items" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <HiOutlineClipboardList className="sidebar-link-icon" />
            Work Items
          </NavLink>
          <NavLink to="/teams" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <HiOutlineUserGroup className="sidebar-link-icon" />
            Teams
          </NavLink>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-section-label">Quick Actions</span>
          <NavLink to="/work-items/new" className="sidebar-link sidebar-link-create">
            <HiOutlinePlus className="sidebar-link-icon" />
            New Work Item
          </NavLink>
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name || 'User'}</span>
            <span className="sidebar-user-email">{user?.email || ''}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <HiOutlineLogout />
        </button>
      </div>
    </aside>
  );
}
