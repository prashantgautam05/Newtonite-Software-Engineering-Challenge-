import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workItemsAPI, teamsAPI } from '../api/client';
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from '../utils/constants';
import toast from 'react-hot-toast';
import { HiOutlineArrowLeft } from 'react-icons/hi';
import './CreateWorkItem.css';

export default function CreateWorkItemPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.list().then((r) => r.data),
  });

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: 'OTHER',
    teamId: '',
    assigneeId: '',
    dueDate: '',
  });

  const [teamMembers, setTeamMembers] = useState([]);

  const createMutation = useMutation({
    mutationFn: (data) => workItemsAPI.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['workItems']);
      queryClient.invalidateQueries(['dashboard']);
      toast.success('Work item created!');
      navigate(`/work-items/${res.data.id}`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to create work item');
    },
  });

  const handleTeamChange = async (teamId) => {
    setForm({ ...form, teamId, assigneeId: '' });
    if (teamId) {
      try {
        const res = await teamsAPI.getById(teamId);
        setTeamMembers(res.data.members || []);
      } catch {
        setTeamMembers([]);
      }
    } else {
      setTeamMembers([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (!data.assigneeId) delete data.assigneeId;
    if (!data.dueDate) delete data.dueDate;
    else data.dueDate = new Date(data.dueDate).toISOString();
    createMutation.mutate(data);
  };

  return (
    <div className="create-wi-page">
      <div className="wi-detail-header">
        <button onClick={() => navigate(-1)} className="btn btn-ghost">
          <HiOutlineArrowLeft /> Back
        </button>
      </div>

      <div className="page-header">
        <h1 className="page-title">Create Work Item</h1>
        <p className="page-subtitle">Track a new issue, task, or request</p>
      </div>

      <form className="create-wi-form card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="title">Title *</label>
          <input id="title" className="form-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Brief summary of the issue or task" required maxLength={500} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="description">Description</label>
          <textarea id="description" className="form-textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Provide details, context, and any relevant information..." rows={5} />
        </div>

        <div className="create-wi-row">
          <div className="form-group">
            <label className="form-label" htmlFor="team">Team *</label>
            <select id="team" className="form-select" value={form.teamId} onChange={(e) => handleTeamChange(e.target.value)} required>
              <option value="">Select team</option>
              {teams?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="assignee">Assignee</label>
            <select id="assignee" className="form-select" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} disabled={!form.teamId}>
              <option value="">Unassigned</option>
              {teamMembers.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </select>
          </div>
        </div>

        <div className="create-wi-row">
          <div className="form-group">
            <label className="form-label" htmlFor="priority">Priority</label>
            <select id="priority" className="form-select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="category">Category</label>
            <select id="category" className="form-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="dueDate">Due Date</label>
            <input id="dueDate" type="datetime-local" className="form-input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
          </div>
        </div>

        <div className="create-wi-actions">
          <button type="submit" className="btn btn-primary btn-lg" disabled={createMutation.isPending}>
            {createMutation.isPending ? <span className="spinner"></span> : 'Create Work Item'}
          </button>
          <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
