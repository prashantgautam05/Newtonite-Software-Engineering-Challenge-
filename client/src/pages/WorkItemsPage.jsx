import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { workItemsAPI } from '../api/client';
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, timeAgo } from '../utils/constants';
import { HiOutlineSearch, HiOutlinePlus, HiOutlineFilter } from 'react-icons/hi';
import './WorkItems.css';

export default function WorkItemsPage() {
  const [filters, setFilters] = useState({
    page: 1, limit: 20, search: '', status: '', priority: '', category: '', sortBy: 'createdAt', sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workItems', filters],
    queryFn: () => {
      const params = { ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      return workItemsAPI.list(params).then((r) => r.data);
    },
    keepPreviousData: true,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    setFilters((f) => ({ ...f, search: searchInput, page: 1 }));
  };

  const updateFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ page: 1, limit: 20, search: '', status: '', priority: '', category: '', sortBy: 'createdAt', sortOrder: 'desc' });
    setSearchInput('');
  };

  const hasActiveFilters = filters.status || filters.priority || filters.category || filters.search;

  return (
    <div className="work-items-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Work Items</h1>
          <p className="page-subtitle">{data?.pagination?.total || 0} total items</p>
        </div>
        <Link to="/work-items/new" className="btn btn-primary">
          <HiOutlinePlus /> New Work Item
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="toolbar">
        <form className="search-bar" onSubmit={handleSearch}>
          <HiOutlineSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search work items..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </form>
        <button className={`btn btn-secondary ${showFilters ? 'active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <HiOutlineFilter /> Filters {hasActiveFilters && <span className="filter-dot"></span>}
        </button>
      </div>

      {showFilters && (
        <div className="filter-panel animate-fade-in">
          <div className="filter-row">
            <select className="form-select filter-select" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="form-select filter-select" value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
              <option value="">All Priorities</option>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="form-select filter-select" value={filters.category} onChange={(e) => updateFilter('category', e.target.value)}>
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select className="form-select filter-select" value={filters.sortBy} onChange={(e) => updateFilter('sortBy', e.target.value)}>
              <option value="createdAt">Newest</option>
              <option value="updatedAt">Recently Updated</option>
              <option value="priority">Priority</option>
              <option value="dueDate">Due Date</option>
            </select>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>Clear All</button>
            )}
          </div>
        </div>
      )}

      {/* Work Items List */}
      {isLoading ? (
        <div className="loading-center"><div className="spinner spinner-lg"></div></div>
      ) : data?.items?.length > 0 ? (
        <>
          <div className="work-items-list">
            {data.items.map((item, i) => (
              <Link
                key={item.id}
                to={`/work-items/${item.id}`}
                className="work-item-row animate-fade-in"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="wi-row-left">
                  <span className="wi-category-icon">{CATEGORY_CONFIG[item.category]?.icon || '📌'}</span>
                  <div className="wi-row-content">
                    <h3 className="wi-row-title">{item.title}</h3>
                    <div className="wi-row-meta">
                      <span>{item.team?.name}</span>
                      <span>·</span>
                      <span>{item.assignee?.name || 'Unassigned'}</span>
                      <span>·</span>
                      <span>{timeAgo(item.updatedAt)}</span>
                      {item._count?.comments > 0 && (
                        <span className="wi-comment-count">💬 {item._count.comments}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="wi-row-badges">
                  <span className="badge" style={{ color: STATUS_CONFIG[item.status]?.color, background: STATUS_CONFIG[item.status]?.bg }}>
                    {STATUS_CONFIG[item.status]?.label}
                  </span>
                  <span className="badge" style={{ color: PRIORITY_CONFIG[item.priority]?.color, background: PRIORITY_CONFIG[item.priority]?.bg }}>
                    {PRIORITY_CONFIG[item.priority]?.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={filters.page <= 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}>
                ← Previous
              </button>
              <span className="pagination-info">
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
              <button className="btn btn-secondary btn-sm" disabled={filters.page >= data.pagination.totalPages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>
                Next →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <p className="empty-state-title">No work items found</p>
          <p>{hasActiveFilters ? 'Try adjusting your filters' : 'Create your first work item to get started'}</p>
        </div>
      )}
    </div>
  );
}
