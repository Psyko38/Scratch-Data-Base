// API utilities for Scratch AI Svelte Frontend

export function getBasePath() {
  if (typeof window === 'undefined') return '';
  if (typeof window.__BASE_PATH__ === 'string' && window.__BASE_PATH__) {
    return window.__BASE_PATH__.replace(/\/+$/, '');
  }
  const match = window.location.pathname.match(/^(\/(?!api|admin|explore|legal|privacy|terms|about\b)[a-zA-Z0-9_\-]+)/);
  return match ? match[1] : '';
}

export function getApiBase() {
  const base = getBasePath();
  return (base ? base : '') + '/api';
}

export function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('cao_admin_token') || '';
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('cao_admin_token', token);
  } else {
    localStorage.removeItem('cao_admin_token');
  }
}

export async function apiFetch(endpoint, options = {}) {
  const apiBase = getApiBase();
  const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  options.headers = options.headers || {};
  options.credentials = 'include';
  
  const token = getAuthToken();
  if (token && !options.headers['Authorization']) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  
  const res = await fetch(url, options);
  return res;
}

export async function fetchCommunityStats() {
  const res = await apiFetch('/stats');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function fetchProjectHistory(projectId) {
  const res = await apiFetch(`/projects/${projectId}/history/public`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function adminLogin(username, password) {
  const res = await apiFetch('/admin/login', {
    method: 'POST',
    body: { username, password }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Invalid credentials');
  }
  setAuthToken(data.token);
  return data;
}

export async function adminLogout() {
  try {
    await apiFetch('/admin/logout', { method: 'POST' });
  } catch (e) {
    // Ignore error on logout
  }
  setAuthToken('');
}

export async function checkAdminSession() {
  const token = getAuthToken();
  try {
    const res = await apiFetch('/admin/me');
    if (res.ok) {
      const data = await res.json();
      return data.admin;
    }
  } catch (e) {}
  setAuthToken('');
  return null;
}

export async function fetchAdminUsers() {
  const res = await apiFetch('/admin/users');
  if (!res.ok) throw new Error('Failed to load users');
  return await res.json();
}

export async function banUser(userId, deleteVotes = false) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: 'POST',
    body: { deleteVotes }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to ban user');
  return data;
}

export async function unbanUser(userId) {
  const res = await apiFetch(`/admin/users/${encodeURIComponent(userId)}/ban`, {
    method: 'DELETE'
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to unban user');
  return data;
}

export function formatDate(isoStr) {
  if (!isoStr) return '-';
  const date = new Date(isoStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
