import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workItemsAPI, commentsAPI, approvalsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG, PRIORITY_CONFIG, CATEGORY_CONFIG, formatDateTime, timeAgo } from '../utils/constants';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft, HiOutlinePencil, HiOutlineChat, HiOutlineClock, HiOutlineShieldCheck } from 'react-icons/hi';
import './WorkItemDetail.css';

export default function WorkItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('comments');
  const [commentText, setCommentText] = useState('');
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['workItem', id],
    queryFn: () => workItemsAPI.getById(id).then((r) => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => workItemsAPI.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['workItem', id]);
      queryClient.invalidateQueries(['workItems']);
      queryClient.invalidateQueries(['dashboard']);
      setEditing(false);
      toast.success('Work item updated');
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        toast.error('Conflict: This item was modified by someone else. Refreshing...');
        queryClient.invalidateQueries(['workItem', id]);
      } else {
        toast.error(err.response?.data?.error || 'Update failed');
      }
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content) => commentsAPI.add(id, content),
    onSuccess: () => {
      queryClient.invalidateQueries(['workItem', id]);
      setCommentText('');
      toast.success('Comment added');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add comment'),
  });

  const approvalRequestMutation = useMutation({
    mutationFn: () => approvalsAPI.request(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['workItem', id]);
      toast.success('Approval requested');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to request approval'),
  });

  const approvalResolveMutation = useMutation({
    mutationFn: ({ approvalId, status, reason }) => approvalsAPI.resolve(approvalId, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['workItem', id]);
      queryClient.invalidateQueries(['workItems']);
      toast.success('Approval resolved');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to resolve approval'),
  });

  if (isLoading) return <div className="loading-center"><div className="spinner spinner-lg"></div></div>;
  if (error) return <div className="empty-state"><p>Failed to load work item</p><Link to="/work-items" className="btn btn-secondary">Back to List</Link></div>;

  const handleUpdate = () => {
    updateMutation.mutate({ ...editData, version: item.version });
  };

  const handleStatusChange = (newStatus) => {
    updateMutation.mutate({ status: newStatus, version: item.version });
  };

  const handleComment = (e) => {
    e.preventDefault();
    if (commentText.trim()) commentMutation.mutate(commentText.trim());
  };

  const startEdit = () => {
    setEditData({
      title: item.title,
      description: item.description || '',
      priority: item.priority,
      category: item.category,
    });
    setEditing(true);
  };

  return (
    <div className="wi-detail">
      <div className="wi-detail-header">
        <button onClick={() => navigate('/work-items')} className="btn btn-ghost">
          <HiOutlineArrowLeft /> Back
        </button>
      </div>

      <div className="wi-detail-layout">
        {/* Main content */}
        <div className="wi-detail-main">
          <div className="wi-detail-title-row">
            {editing ? (
              <input className="form-input wi-edit-title" value={editData.title} onChange={(e) => setEditData({ ...editData, title: e.target.value })} />
            ) : (
              <h1 className="wi-detail-title">{item.title}</h1>
            )}
          </div>

          <div className="wi-detail-badges">
            <span className="badge" style={{ color: STATUS_CONFIG[item.status]?.color, background: STATUS_CONFIG[item.status]?.bg }}>
              {STATUS_CONFIG[item.status]?.label}
            </span>
            <span className="badge" style={{ color: PRIORITY_CONFIG[item.priority]?.color, background: PRIORITY_CONFIG[item.priority]?.bg }}>
              {PRIORITY_CONFIG[item.priority]?.label}
            </span>
            <span className="badge" style={{ background: 'var(--surface-glass)', color: 'var(--text-secondary)' }}>
              {CATEGORY_CONFIG[item.category]?.icon} {CATEGORY_CONFIG[item.category]?.label}
            </span>
            <span className="wi-version-badge">v{item.version}</span>
          </div>

          {editing ? (
            <div className="wi-edit-form">
              <textarea className="form-textarea" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} placeholder="Description..." />
              <div className="wi-edit-row">
                <select className="form-select" value={editData.priority} onChange={(e) => setEditData({ ...editData, priority: e.target.value })}>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="form-select" value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value })}>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="wi-edit-actions">
                <button className="btn btn-primary" onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <span className="spinner"></span> : 'Save Changes'}
                </button>
                <button className="btn btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="wi-detail-description">
              {item.description || <span className="text-muted">No description provided</span>}
            </div>
          )}

          {/* Status Actions */}
          {!editing && (
            <div className="wi-status-actions">
              <span className="wi-status-label">Move to:</span>
              {item.status === 'OPEN' && (
                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange('IN_PROGRESS')}>Start Progress</button>
              )}
              {item.status === 'IN_PROGRESS' && (
                <>
                  <button className="btn btn-sm btn-secondary" onClick={() => approvalRequestMutation.mutate()}>Request Approval</button>
                  <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange('RESOLVED')}>Resolve</button>
                </>
              )}
              {item.status === 'AWAITING_APPROVAL' && (
                <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Waiting for approval decision</span>
              )}
              {item.status === 'RESOLVED' && (
                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange('CLOSED')}>Close</button>
              )}
              {item.status === 'CLOSED' && (
                <button className="btn btn-sm btn-secondary" onClick={() => handleStatusChange('OPEN')}>Reopen</button>
              )}
            </div>
          )}

          {/* Approvals */}
          {item.approvals?.length > 0 && (
            <div className="wi-approvals">
              <h3 className="wi-section-title"><HiOutlineShieldCheck /> Approvals</h3>
              {item.approvals.map((a) => (
                <div key={a.id} className="wi-approval-card">
                  <div className="wi-approval-info">
                    <span className={`badge badge-approval-${a.status.toLowerCase()}`}>{a.status}</span>
                    <span>Requested by {a.requestedBy?.name}</span>
                    {a.resolvedBy && <span>· Resolved by {a.resolvedBy.name}</span>}
                  </div>
                  {a.status === 'PENDING' && (
                    <div className="wi-approval-actions">
                      <button className="btn btn-sm btn-primary" onClick={() => approvalResolveMutation.mutate({ approvalId: a.id, status: 'APPROVED' })}>Approve</button>
                      <button className="btn btn-sm btn-danger" onClick={() => approvalResolveMutation.mutate({ approvalId: a.id, status: 'REJECTED', reason: 'Rejected' })}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Tabs: Comments / History */}
          <div className="wi-tabs">
            <button className={`wi-tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
              <HiOutlineChat /> Comments ({item.comments?.length || 0})
            </button>
            <button className={`wi-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
              <HiOutlineClock /> History ({item.history?.length || 0})
            </button>
          </div>

          {activeTab === 'comments' && (
            <div className="wi-comments">
              <form className="wi-comment-form" onSubmit={handleComment}>
                <textarea className="form-textarea wi-comment-input" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment..." rows={3} />
                <button type="submit" className="btn btn-primary btn-sm" disabled={!commentText.trim() || commentMutation.isPending}>
                  {commentMutation.isPending ? <span className="spinner"></span> : 'Post Comment'}
                </button>
              </form>
              <div className="wi-comment-list">
                {item.comments?.map((c) => (
                  <div key={c.id} className="wi-comment">
                    <div className="wi-comment-avatar">{c.user?.name?.charAt(0)}</div>
                    <div className="wi-comment-body">
                      <div className="wi-comment-header">
                        <strong>{c.user?.name}</strong>
                        <span className="text-muted">{timeAgo(c.createdAt)}</span>
                      </div>
                      <p className="wi-comment-text">{c.content}</p>
                    </div>
                  </div>
                ))}
                {!item.comments?.length && <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>No comments yet</p>}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="wi-history">
              {item.history?.map((h) => (
                <div key={h.id} className="wi-history-entry">
                  <div className="wi-history-dot"></div>
                  <div className="wi-history-content">
                    <span className="wi-history-action">
                      <strong>{h.user?.name}</strong> {h.action.toLowerCase().replace(/_/g, ' ')}
                    </span>
                    {h.fieldChanged && (
                      <span className="wi-history-change">
                        {h.oldValue && <span className="wi-history-old">{h.oldValue}</span>}
                        {h.oldValue && ' → '}
                        {h.newValue && <span className="wi-history-new">{h.newValue}</span>}
                      </span>
                    )}
                    <span className="wi-history-time">{timeAgo(h.timestamp)}</span>
                  </div>
                </div>
              ))}
              {!item.history?.length && <p className="text-muted" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>No history yet</p>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="wi-detail-sidebar">
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Assignee</h4>
            <p className="wi-sidebar-value">{item.assignee ? item.assignee.name : 'Unassigned'}</p>
          </div>
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Reporter</h4>
            <p className="wi-sidebar-value">{item.reporter?.name}</p>
          </div>
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Team</h4>
            <p className="wi-sidebar-value">{item.team?.name}</p>
          </div>
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Due Date</h4>
            <p className="wi-sidebar-value">{item.dueDate ? formatDateTime(item.dueDate) : 'Not set'}</p>
          </div>
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Created</h4>
            <p className="wi-sidebar-value">{formatDateTime(item.createdAt)}</p>
          </div>
          <div className="wi-sidebar-section">
            <h4 className="wi-sidebar-label">Updated</h4>
            <p className="wi-sidebar-value">{timeAgo(item.updatedAt)}</p>
          </div>

          {!editing && (
            <button className="btn btn-secondary" style={{ width: '100%', marginTop: 'var(--space-4)' }} onClick={startEdit}>
              <HiOutlinePencil /> Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
