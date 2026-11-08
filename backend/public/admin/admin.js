// Admin Dashboard Application Logic
(function() {
  const BASE_PATH = typeof window.__BASE_PATH__ === 'string'
    ? window.__BASE_PATH__
    : window.location.pathname.replace(/\/(admin|explore)(\/.*)?$/i, '').replace(/\/+$/, '');
  const API_BASE = (BASE_PATH ? BASE_PATH : '') + '/api';

  let authToken = localStorage.getItem('cao_admin_token') || '';
  let currentInspectedProjectId = null;

  // DOM Elements
  const authView = document.getElementById('authView');
  const dashboardView = document.getElementById('dashboardView');
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminUsernameBadge = document.getElementById('adminUsernameBadge');

  const metricTotalUsers = document.getElementById('metricTotalUsers');
  const metricBannedUsers = document.getElementById('metricBannedUsers');
  const metricTotalProjects = document.getElementById('metricTotalProjects');
  const metricTotalVotes = document.getElementById('metricTotalVotes');
  const metricVoteBreakdown = document.getElementById('metricVoteBreakdown');
  const globalRatioAi = document.getElementById('globalRatioAi');
  const globalRatioHuman = document.getElementById('globalRatioHuman');
  const globalAiLabel = document.getElementById('globalAiLabel');
  const globalHumanLabel = document.getElementById('globalHumanLabel');

  const topProjectsTableBody = document.getElementById('topProjectsTableBody');
  const recentVotesTableBody = document.getElementById('recentVotesTableBody');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');
  const exportVotesBtn = document.getElementById('exportVotesBtn');
  const exportProjectsBtn = document.getElementById('exportProjectsBtn');

  const searchProjectForm = document.getElementById('searchProjectForm');
  const searchProjectIdInput = document.getElementById('searchProjectIdInput');

  const projectModal = document.getElementById('projectModal');
  const modalProjectTitle = document.getElementById('modalProjectTitle');
  const modalScratchLink = document.getElementById('modalScratchLink');
  const modalStatsBox = document.getElementById('modalStatsBox');
  const modalVotesTableBody = document.getElementById('modalVotesTableBody');
  const resetProjectVotesBtn = document.getElementById('resetProjectVotesBtn');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalDoneBtn = document.getElementById('modalDoneBtn');
  const toastContainer = document.getElementById('toastContainer');

  // Helper for Authenticated Fetch
  async function apiFetch(url, options = {}) {
    if (url.startsWith('/api/')) {
      url = API_BASE + url.slice(4);
    }
    options.headers = options.headers || {};
    options.credentials = 'include';
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, options);
    if (response.status === 401) {
      handleUnauthorized();
      throw new Error('Unauthorized');
    }
    return response;
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getVerdictBadge(verdict) {
    switch (verdict) {
      case 'AI-generated':
        return `<span class="badge badge-ai">🤖 AI-generated</span>`;
      case 'Human-created':
        return `<span class="badge badge-human">👤 Human-created</span>`;
      case 'Undetermined':
        return `<span class="badge badge-undetermined">⚖️ Undetermined</span>`;
      default:
        return `<span class="badge badge-insufficient">⏳ Insufficient data</span>`;
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function truncateUUID(uuid) {
    if (!uuid || uuid.length < 12) return uuid || '';
    return uuid.substring(0, 8) + '…' + uuid.substring(uuid.length - 4);
  }

  // Auth Handling
  async function checkAuth() {
    try {
      const res = await apiFetch('/api/admin/me');
      if (res.ok) {
        const data = await res.json();
        adminUsernameBadge.textContent = `👤 ${data.admin.username}`;
        showDashboard();
        loadDashboardStats();
      } else {
        showLogin();
      }
    } catch (e) {
      showLogin();
    }
  }

  function handleUnauthorized() {
    authToken = '';
    localStorage.removeItem('cao_admin_token');
    showLogin();
  }

  function showLogin() {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  }

  function showDashboard() {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Login failed', 'error');
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In to Console';
        return;
      }

      authToken = data.token;
      localStorage.setItem('cao_admin_token', data.token);
      adminUsernameBadge.textContent = `👤 ${data.admin.username}`;
      showToast('Welcome back, ' + data.admin.username, 'success');
      loginForm.reset();
      showDashboard();
      loadDashboardStats();
    } catch (err) {
      showToast('Network error during login', 'error');
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign In to Console';
    }
  });

  logoutBtn.addEventListener('click', async () => {
    try {
      await apiFetch('/api/admin/logout', { method: 'POST' });
    } catch (e) {}
    authToken = '';
    localStorage.removeItem('cao_admin_token');
    showToast('Signed out successfully', 'info');
    showLogin();
  });

  // Load Dashboard Data
  async function loadDashboardStats() {
    try {
      const res = await apiFetch('/api/admin/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();

      // Update Metrics
      const m = data.metrics;
      metricTotalUsers.textContent = m.totalUsers.toLocaleString();
      metricBannedUsers.textContent = `${m.bannedUsers} banned`;
      metricTotalProjects.textContent = m.totalProjects.toLocaleString();
      metricTotalVotes.textContent = m.totalVotes.toLocaleString();
      metricVoteBreakdown.textContent = `${m.aiVotes.toLocaleString()} AI (${m.aiPercentage}%) • ${m.humanVotes.toLocaleString()} Human (${m.humanPercentage}%)`;

      const aiRatio = m.totalVotes > 0 ? m.aiPercentage : 50;
      const humanRatio = m.totalVotes > 0 ? m.humanPercentage : 50;
      globalRatioAi.style.width = `${aiRatio}%`;
      globalRatioHuman.style.width = `${humanRatio}%`;
      globalAiLabel.textContent = `🤖 AI: ${aiRatio}%`;
      globalHumanLabel.textContent = `👤 Human: ${humanRatio}%`;

      // Render Top Projects
      renderTopProjects(data.mostVotedProjects);

      // Render Recent Votes
      renderRecentVotes(data.recentVotes);
    } catch (err) {
      showToast('Error loading stats: ' + err.message, 'error');
    }
  }

  function renderTopProjects(projects) {
    if (!projects || projects.length === 0) {
      topProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted);">No projects recorded yet.</td></tr>`;
      return;
    }

    topProjectsTableBody.innerHTML = projects.map(p => `
      <tr>
        <td>
          <span class="code-id">${escapeHtml(p.projectId)}</span>
          <a href="${escapeHtml(p.scratchUrl)}" target="_blank" rel="noopener noreferrer" class="external-link" title="Open on Scratch">↗</a>
        </td>
        <td><strong>${p.totalVotes.toLocaleString()}</strong></td>
        <td style="color: var(--scratch-stop-text); font-weight: 700;">${p.aiVotes.toLocaleString()} (${p.aiPercentage}%)</td>
        <td style="color: var(--scratch-green-text); font-weight: 700;">${p.humanVotes.toLocaleString()} (${p.humanPercentage}%)</td>
        <td style="min-width: 140px;">
          <div class="ratio-bar" style="height: 8px;">
            <div class="ratio-ai" style="width: ${p.aiPercentage}%;"></div>
            <div class="ratio-human" style="width: ${p.humanPercentage}%;"></div>
          </div>
        </td>
        <td>${getVerdictBadge(p.verdict)}</td>
        <td>
          <button class="btn btn-secondary btn-sm inspect-project-btn" data-id="${escapeHtml(p.projectId)}">
            🔍 Inspect
          </button>
        </td>
      </tr>
    `).join('');

    // Attach inspect listeners
    topProjectsTableBody.querySelectorAll('.inspect-project-btn').forEach(btn => {
      btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
    });
  }

  function renderRecentVotes(votes) {
    if (!votes || votes.length === 0) {
      recentVotesTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No votes cast yet.</td></tr>`;
      return;
    }

    recentVotesTableBody.innerHTML = votes.map(v => `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(v.createdAt)}</td>
        <td>
          <span class="code-id">${escapeHtml(v.projectId)}</span>
          <button class="btn btn-secondary btn-sm inspect-project-btn" data-id="${escapeHtml(v.projectId)}" style="padding: 2px 6px; font-size: 0.72rem; margin-left: 6px;">Inspect</button>
        </td>
        <td title="${escapeHtml(v.userId)}">
          <span class="code-id" style="color: var(--text-muted);">${truncateUUID(v.userId)}</span>
        </td>
        <td>
          ${v.vote === 'ai' ? '<span class="badge badge-ai">🤖 AI</span>' : '<span class="badge badge-human">👤 Human</span>'}
        </td>
        <td>
          ${v.isBanned ? '<span class="badge badge-banned">🚫 Banned</span>' : '<span style="color: var(--scratch-green-text); font-weight: 700; font-size: 0.8rem;">Active</span>'}
        </td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-danger btn-sm delete-vote-btn" data-vote-id="${escapeHtml(v.voteId)}" title="Delete fraudulent vote">
              Delete Vote
            </button>
            ${!v.isBanned ? `
              <button class="btn btn-secondary btn-sm ban-user-btn" data-user-id="${escapeHtml(v.userId)}" title="Ban abusive user">
                Ban User
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm unban-user-btn" data-user-id="${escapeHtml(v.userId)}" title="Unban user">
                Unban
              </button>
            `}
          </div>
        </td>
      </tr>
    `).join('');

    // Attach inspect listeners
    recentVotesTableBody.querySelectorAll('.inspect-project-btn').forEach(btn => {
      btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
    });

    // Attach delete listeners
    recentVotesTableBody.querySelectorAll('.delete-vote-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteVote(btn.dataset.voteId));
    });

    // Attach ban listeners
    recentVotesTableBody.querySelectorAll('.ban-user-btn').forEach(btn => {
      btn.addEventListener('click', () => banUser(btn.dataset.userId));
    });

    // Attach unban listeners
    recentVotesTableBody.querySelectorAll('.unban-user-btn').forEach(btn => {
      btn.addEventListener('click', () => unbanUser(btn.dataset.userId));
    });
  }

  // Project History & Moderation Modal
  async function openProjectModal(projectId) {
    currentInspectedProjectId = projectId;
    modalProjectTitle.textContent = `Scratch Project #${projectId}`;
    modalScratchLink.href = `https://scratch.mit.edu/projects/${projectId}/`;
    modalStatsBox.innerHTML = 'Loading project details...';
    modalVotesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;">Loading votes...</td></tr>';
    projectModal.classList.remove('hidden');

    try {
      const res = await apiFetch(`/api/admin/projects/${projectId}/history`);
      if (!res.ok) throw new Error('Project not found');
      const data = await res.json();
      renderModalContent(data);
    } catch (err) {
      modalStatsBox.innerHTML = `<span style="color: var(--scratch-stop-text);">Failed to load project: ${escapeHtml(err.message)}</span>`;
    }
  }

  function renderModalContent(data) {
    const p = data.project;
    const votes = data.votes;

    modalStatsBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
        <div>
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px;">
            Community Verdict: ${getVerdictBadge(p.verdict)}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Total Votes: <strong>${p.totalVotes}</strong> (${p.isReliable ? 'Verified reliable threshold' : 'Under 5 votes - insufficient data'})
          </div>
        </div>
        <div style="min-width: 220px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px; font-weight: 700;">
            <span style="color: var(--scratch-stop-text);">🤖 AI: ${p.aiVotes} (${p.aiPercentage}%)</span>
            <span style="color: var(--scratch-green-text);">👤 Human: ${p.humanVotes} (${p.humanPercentage}%)</span>
          </div>
          <div class="ratio-bar" style="height: 10px;">
            <div class="ratio-ai" style="width: ${p.aiPercentage}%;"></div>
            <div class="ratio-human" style="width: ${p.humanPercentage}%;"></div>
          </div>
        </div>
      </div>
    `;

    if (!votes || votes.length === 0) {
      modalVotesTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">No individual votes recorded for this project.</td></tr>';
      return;
    }

    modalVotesTableBody.innerHTML = votes.map(v => `
      <tr>
        <td>
          <span class="code-id">${escapeHtml(v.userId)}</span>
          ${v.isBanned ? '<span class="badge badge-banned" style="margin-left:6px;">Banned</span>' : ''}
        </td>
        <td>
          ${v.vote === 'ai' ? '<span class="badge badge-ai">🤖 AI</span>' : '<span class="badge badge-human">👤 Human</span>'}
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(v.createdAt)}</td>
        <td>
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-danger btn-sm modal-del-btn" data-vote-id="${escapeHtml(v.voteId)}">Delete Vote</button>
            ${!v.isBanned ? `
              <button class="btn btn-secondary btn-sm modal-ban-btn" data-user-id="${escapeHtml(v.userId)}">Ban User</button>
            ` : `
              <button class="btn btn-secondary btn-sm modal-unban-btn" data-user-id="${escapeHtml(v.userId)}">Unban</button>
            `}
          </div>
        </td>
      </tr>
    `).join('');

    modalVotesTableBody.querySelectorAll('.modal-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await deleteVote(btn.dataset.voteId);
        openProjectModal(currentInspectedProjectId);
      });
    });

    modalVotesTableBody.querySelectorAll('.modal-ban-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await banUser(btn.dataset.userId);
        openProjectModal(currentInspectedProjectId);
      });
    });

    modalVotesTableBody.querySelectorAll('.modal-unban-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await unbanUser(btn.dataset.userId);
        openProjectModal(currentInspectedProjectId);
      });
    });
  }

  function closeModal() {
    projectModal.classList.add('hidden');
    currentInspectedProjectId = null;
    loadDashboardStats();
  }

  closeModalBtn.addEventListener('click', closeModal);
  modalDoneBtn.addEventListener('click', closeModal);

  // Moderation Handlers
  async function deleteVote(voteId) {
    if (!confirm('Are you sure you want to permanently remove this vote? Statistics will be automatically recalculated.')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/votes/${voteId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove vote');

      showToast('Vote removed and statistics updated', 'success');
      loadDashboardStats();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function banUser(userId) {
    const purge = confirm(`Ban user ${userId}?\n\nClick OK to also remove all their submitted votes, or Cancel to only ban them without purging past votes.`);
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: { deleteVotes: purge }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ban user');

      showToast(`User banned successfully.${purge ? ' Removed ' + data.deletedVotesCount + ' votes.' : ''}`, 'success');
      loadDashboardStats();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function unbanUser(userId) {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}/ban`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unban user');

      showToast(`User ${userId} unbanned`, 'success');
      loadDashboardStats();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  resetProjectVotesBtn.addEventListener('click', async () => {
    if (!currentInspectedProjectId) return;
    if (!confirm(`DANGER: Are you sure you want to delete ALL votes for Scratch project #${currentInspectedProjectId} and reset its statistics to zero? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await apiFetch(`/api/admin/projects/${currentInspectedProjectId}/reset`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset project');

      showToast(`Project #${currentInspectedProjectId} reset to 0`, 'success');
      openProjectModal(currentInspectedProjectId);
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  });

  // Search Project Form
  searchProjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = searchProjectIdInput.value.trim();
    if (!id || !/^\d+$/.test(id)) {
      showToast('Please enter a valid numeric Scratch project ID', 'error');
      return;
    }
    openProjectModal(id);
  });

  // CSV Export
  exportVotesBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/admin/export/csv?type=votes`;
  });

  exportProjectsBtn.addEventListener('click', () => {
    window.location.href = `${API_BASE}/admin/export/csv?type=projects`;
  });

  refreshStatsBtn.addEventListener('click', () => {
    showToast('Refreshing statistics...', 'info');
    loadDashboardStats();
  });

  // Init
  checkAuth();
})();
