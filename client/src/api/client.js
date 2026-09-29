import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Generate idempotency key for mutations
  if (['post', 'put', 'patch', 'delete'].includes(config.method)) {
    if (!config.headers['Idempotency-Key']) {
      config.headers['Idempotency-Key'] = crypto.randomUUID();
    }
  }
  return config;
});

// Handle 401 responses (expired token)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// ─── Work Items API ──────────────────────────────────
export const workItemsAPI = {
  list: (params) => api.get('/work-items', { params }),
  getById: (id) => api.get(`/work-items/${id}`),
  create: (data) => api.post('/work-items', data),
  update: (id, data) => api.put(`/work-items/${id}`, data),
  delete: (id) => api.delete(`/work-items/${id}`),
  assign: (id, assigneeId) => api.post(`/work-items/${id}/assign`, { assigneeId }),
  dashboard: () => api.get('/work-items/dashboard'),
};

// ─── Comments API ────────────────────────────────────
export const commentsAPI = {
  list: (workItemId, params) => api.get(`/work-items/${workItemId}/comments`, { params }),
  add: (workItemId, content) => api.post(`/work-items/${workItemId}/comments`, { content }),
};

// ─── History API ─────────────────────────────────────
export const historyAPI = {
  list: (workItemId, params) => api.get(`/work-items/${workItemId}/history`, { params }),
};

// ─── Approvals API ───────────────────────────────────
export const approvalsAPI = {
  request: (workItemId) => api.post(`/work-items/${workItemId}/approvals`),
  resolve: (approvalId, data) => api.put(`/work-items/approvals/${approvalId}`, data),
};

// ─── Teams API ───────────────────────────────────────
export const teamsAPI = {
  list: () => api.get('/teams'),
  getById: (id) => api.get(`/teams/${id}`),
  create: (data) => api.post('/teams', data),
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  listUsers: () => api.get('/teams/users/all'),
};

export default api;
