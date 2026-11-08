// Scratch AI – Unified Community Explorer & Admin User Management Controller

(function() {
  const BASE_PATH = typeof window.__BASE_PATH__ === 'string'
    ? window.__BASE_PATH__
    : window.location.pathname.replace(/\/(admin|explore)(\/.*)?$/i, '').replace(/\/+$/, '');
  const API_BASE = (BASE_PATH ? BASE_PATH : '') + '/api';

  let authToken = localStorage.getItem('cao_admin_token') || '';
  let cachedAdminUsers = [];

  const metricTotalUsers = document.getElementById('metricTotalUsers');
  const metricTotalProjects = document.getElementById('metricTotalProjects');
  const metricTotalVotes = document.getElementById('metricTotalVotes');
  const metricVoteBreakdown = document.getElementById('metricVoteBreakdown');
  const globalRatioAi = document.getElementById('globalRatioAi');
  const globalRatioHuman = document.getElementById('globalRatioHuman');
  const globalAiLabel = document.getElementById('globalAiLabel');
  const globalHumanLabel = document.getElementById('globalHumanLabel');

  const heroQuickVotes = document.getElementById('heroQuickVotes');
  const heroQuickProjects = document.getElementById('heroQuickProjects');
  const focusSearchBtn = document.getElementById('focusSearchBtn');
  const heroExportBtn = document.getElementById('heroExportBtn');
  const heroPreviewCard = document.getElementById('heroPreviewCard');

  const featuredCarousel = document.getElementById('featuredCarousel');
  const aiCarousel = document.getElementById('aiCarousel');
  const humanCarousel = document.getElementById('humanCarousel');

  const topProjectsTableBody = document.getElementById('topProjectsTableBody');
  const recentVotesTableBody = document.getElementById('recentVotesTableBody');
  const refreshStatsBtn = document.getElementById('refreshStatsBtn');
  const exportVotesBtn = document.getElementById('exportVotesBtn');
  const exportProjectsBtn = document.getElementById('exportProjectsBtn');
  const themeToggleBtn = document.getElementById('themeToggleBtn');

  const searchProjectForm = document.getElementById('searchProjectForm');
  const searchProjectIdInput = document.getElementById('searchProjectIdInput');

  const projectModal = document.getElementById('projectModal');
  const modalProjectTitle = document.getElementById('modalProjectTitle');
  const modalScratchLink = document.getElementById('modalScratchLink');
  const modalStatsBox = document.getElementById('modalStatsBox');
  const modalVotesTableBody = document.getElementById('modalVotesTableBody');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalDoneBtn = document.getElementById('modalDoneBtn');

  // Unified Admin User Management Elements
  const openAdminLoginBtn = document.getElementById('openAdminLoginBtn');
  const adminNavControls = document.getElementById('adminNavControls');
  const navAdminUsersLink = document.getElementById('navAdminUsersLink');
  const adminUsernameText = document.getElementById('adminUsernameText');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');
  const footerAdminLink = document.getElementById('footerAdminLink');

  const adminLoginModal = document.getElementById('adminLoginModal');
  const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminUsernameInput = document.getElementById('adminUsernameInput');
  const adminPasswordInput = document.getElementById('adminPasswordInput');
  const adminLoginError = document.getElementById('adminLoginError');
  const adminLoginSubmitBtn = document.getElementById('adminLoginSubmitBtn');

  const adminUsersSection = document.getElementById('adminUsersSection');
  const adminUsersBody = document.getElementById('adminUsersBody');
  const toggleAdminUsersBtn = document.getElementById('toggleAdminUsersBtn');
  const adminUsersSummaryBadge = document.getElementById('adminUsersSummaryBadge');
  const adminUsersTableBody = document.getElementById('adminUsersTableBody');
  const filterUsersInput = document.getElementById('filterUsersInput');
  const banByUuidBtn = document.getElementById('banByUuidBtn');
  const refreshUsersBtn = document.getElementById('refreshUsersBtn');
  const toastContainer = document.getElementById('toastContainer');

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showToast(message, type = 'info') {
    if (!toastContainer) return;
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

  async function adminFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.credentials = 'include';
    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(url, options);
    if (res.status === 401) {
      setAdminLoggedOut();
      throw new Error('Session expired');
    }
    return res;
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
        return `<span class="badge badge-insufficient">⏳ Insufficient data (&lt;5 votes)</span>`;
    }
  }

  function getThumbPill(project) {
    if (project.verdict === 'AI-generated') {
      return `<span class="thumb-verdict-pill thumb-verdict-ai">🤖 AI ${project.aiPercentage}%</span>`;
    }
    if (project.verdict === 'Human-created') {
      return `<span class="thumb-verdict-pill thumb-verdict-human">👤 Human ${project.humanPercentage}%</span>`;
    }
    if (project.aiVotes > project.humanVotes) {
      return `<span class="thumb-verdict-pill thumb-verdict-other">🤖 ${project.aiPercentage}% AI</span>`;
    }
    if (project.humanVotes > project.aiVotes) {
      return `<span class="thumb-verdict-pill thumb-verdict-other">👤 ${project.humanPercentage}% Human</span>`;
    }
    return `<span class="thumb-verdict-pill thumb-verdict-other">⚖️ ${project.totalVotes} votes</span>`;
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  // =========================================================================
  // THEME MANAGEMENT (LIGHT / DARK MODE)
  // =========================================================================
  function applyWebTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (themeToggleBtn) {
        themeToggleBtn.textContent = '☀️';
        themeToggleBtn.title = 'Switch to Light Mode';
      }
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeToggleBtn) {
        themeToggleBtn.textContent = '🌙';
        themeToggleBtn.title = 'Switch to Dark Mode';
      }
    }
  }

  function initWebTheme() {
    const saved = localStorage.getItem('cao_web_theme');
    if (saved === 'dark' || saved === 'light') {
      applyWebTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyWebTheme('dark');
    } else {
      applyWebTheme('light');
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = isDark ? 'light' : 'dark';
      localStorage.setItem('cao_web_theme', next);
      applyWebTheme(next);
    });
  }

  initWebTheme();

  // =========================================================================
  // UNIFIED ADMIN AUTHENTICATION & USER MANAGEMENT (USERS ONLY)
  // =========================================================================
  function setAdminLoggedIn(username) {
    openAdminLoginBtn.classList.add('hidden');
    adminNavControls.classList.remove('hidden');
    navAdminUsersLink.classList.remove('hidden');
    adminUsersSection.classList.remove('hidden');
    adminUsernameText.textContent = username || 'admin';
  }

  function setAdminLoggedOut() {
    authToken = '';
    localStorage.removeItem('cao_admin_token');
    openAdminLoginBtn.classList.remove('hidden');
    adminNavControls.classList.add('hidden');
    navAdminUsersLink.classList.add('hidden');
    adminUsersSection.classList.add('hidden');
  }

  async function checkAdminSession() {
    const isAtAdminRoute = window.location.pathname.endsWith('/admin') || window.location.pathname.endsWith('/admin/') || window.location.pathname.includes('/admin');
    try {
      const res = await adminFetch(`${API_BASE}/admin/me`);
      if (res.ok) {
        const data = await res.json();
        setAdminLoggedIn(data.admin.username);
        await loadAdminUsers();
        if (isAtAdminRoute) {
          adminUsersSection.scrollIntoView({ behavior: 'smooth' });
        }
        return;
      }
    } catch (e) {}

    setAdminLoggedOut();
    if (isAtAdminRoute) {
      openAdminLoginModal();
    }
  }

  function openAdminLoginModal() {
    adminLoginError.classList.add('hidden');
    adminLoginModal.classList.remove('hidden');
    setTimeout(() => adminUsernameInput.focus(), 50);
  }

  function closeAdminLoginModal() {
    adminLoginModal.classList.add('hidden');
  }

  openAdminLoginBtn.addEventListener('click', openAdminLoginModal);
  closeAdminLoginBtn.addEventListener('click', closeAdminLoginModal);
  adminLoginModal.addEventListener('click', (e) => {
    if (e.target === adminLoginModal) closeAdminLoginModal();
  });

  if (footerAdminLink) {
    footerAdminLink.addEventListener('click', (e) => {
      if (adminUsersSection.classList.contains('hidden')) {
        e.preventDefault();
        openAdminLoginModal();
      }
    });
  }

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    adminLoginError.classList.add('hidden');
    adminLoginSubmitBtn.disabled = true;
    adminLoginSubmitBtn.textContent = 'Signing in...';

    const username = adminUsernameInput.value.trim();
    const password = adminPasswordInput.value;

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        adminLoginError.textContent = data.error || 'Invalid credentials';
        adminLoginError.classList.remove('hidden');
        return;
      }

      authToken = data.token;
      localStorage.setItem('cao_admin_token', data.token);
      adminLoginForm.reset();
      closeAdminLoginModal();
      setAdminLoggedIn(data.admin.username);
      showToast(`Signed in as ${data.admin.username}`, 'success');
      await loadAdminUsers();
      adminUsersSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
      adminLoginError.textContent = 'Network error during sign in';
      adminLoginError.classList.remove('hidden');
    } finally {
      adminLoginSubmitBtn.disabled = false;
      adminLoginSubmitBtn.textContent = 'Sign In';
    }
  });

  adminLogoutBtn.addEventListener('click', async () => {
    try {
      await adminFetch(`${API_BASE}/admin/logout`, { method: 'POST' });
    } catch (e) {}
    setAdminLoggedOut();
    showToast('Signed out of administrator mode', 'info');
  });

  async function loadAdminUsers() {
    try {
      const res = await adminFetch(`${API_BASE}/admin/users`);
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      cachedAdminUsers = data.users || [];
      adminUsersSummaryBadge.textContent = `${data.totalUsers} users • ${data.bannedUsers} banned`;
      renderAdminUsersTable();
    } catch (err) {
      adminUsersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--scratch-stop-text); padding: 1rem;">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderAdminUsersTable() {
    const query = (filterUsersInput.value || '').trim().toLowerCase();
    const filtered = query
      ? cachedAdminUsers.filter(u => u.userId.toLowerCase().includes(query))
      : cachedAdminUsers;

    if (filtered.length === 0) {
      adminUsersTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No users found.</td></tr>`;
      return;
    }

    adminUsersTableBody.innerHTML = filtered.map(u => `
      <tr>
        <td>
          <span class="code-id">${escapeHtml(u.userId)}</span>
        </td>
        <td>
          ${u.isBanned
            ? '<span class="badge badge-banned">🚫 Banned</span>'
            : '<span class="badge badge-human">✅ Active</span>'}
        </td>
        <td><strong>${u.totalVotes}</strong></td>
        <td style="font-size: 0.8rem;">
          <span style="color: var(--scratch-stop-text); font-weight: 700;">🤖 ${u.aiVotes} AI</span> •
          <span style="color: var(--scratch-green-text); font-weight: 700;">👤 ${u.humanVotes} Human</span>
        </td>
        <td style="font-size: 0.8rem; color: var(--text-muted);">${formatDate(u.updatedAt)}</td>
        <td>
          ${!u.isBanned ? `
            <button class="btn btn-sm btn-danger admin-ban-btn" data-user-id="${escapeHtml(u.userId)}">
              🚫 Ban User
            </button>
          ` : `
            <button class="btn btn-sm btn-secondary admin-unban-btn" data-user-id="${escapeHtml(u.userId)}">
              ✅ Unban
            </button>
          `}
        </td>
      </tr>
    `).join('');

    adminUsersTableBody.querySelectorAll('.admin-ban-btn').forEach(btn => {
      btn.addEventListener('click', () => banUser(btn.dataset.userId));
    });

    adminUsersTableBody.querySelectorAll('.admin-unban-btn').forEach(btn => {
      btn.addEventListener('click', () => unbanUser(btn.dataset.userId));
    });
  }

  function setAdminUsersExpanded(expanded) {
    if (!adminUsersBody || !toggleAdminUsersBtn) return;
    if (expanded) {
      adminUsersBody.classList.remove('hidden');
      toggleAdminUsersBtn.textContent = '▲ Hide List';
    } else {
      adminUsersBody.classList.add('hidden');
      toggleAdminUsersBtn.textContent = '▼ Show List';
    }
  }

  if (toggleAdminUsersBtn) {
    toggleAdminUsersBtn.addEventListener('click', () => {
      const isHidden = adminUsersBody.classList.contains('hidden');
      setAdminUsersExpanded(isHidden);
    });
  }

  filterUsersInput.addEventListener('input', () => {
    if (filterUsersInput.value.trim().length > 0) {
      setAdminUsersExpanded(true);
    }
    renderAdminUsersTable();
  });

  banByUuidBtn.addEventListener('click', () => {
    const uuid = (filterUsersInput.value || '').trim();
    if (!uuid || uuid.length < 8) {
      showToast('Please enter a valid user UUID in the input field', 'error');
      return;
    }
    banUser(uuid);
  });

  refreshUsersBtn.addEventListener('click', () => {
    loadAdminUsers();
    showToast('User list refreshed', 'info');
  });

  async function banUser(userId) {
    const purge = confirm(`Ban user ${userId}?\n\nClick OK to also delete all their submitted votes, or Cancel to ban them without deleting past votes.`);
    try {
      const res = await adminFetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/ban`, {
        method: 'POST',
        body: { deleteVotes: purge }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to ban user');

      showToast(`User banned.${purge ? ' Removed ' + data.deletedVotesCount + ' votes.' : ''}`, 'success');
      await loadAdminUsers();
      await loadCommunityStats();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function unbanUser(userId) {
    try {
      const res = await adminFetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/ban`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to unban user');

      showToast(`User ${userId} unbanned`, 'success');
      await loadAdminUsers();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // =========================================================================
  // PUBLIC SCRATCH COMMUNITY EXPLORER LOGIC
  // =========================================================================
  function renderProjectCarousel(container, projects, emptyMsg) {
    if (!container) return;
    if (!projects || projects.length === 0) {
      container.innerHTML = `<div class="carousel-empty">${escapeHtml(emptyMsg)}</div>`;
      return;
    }

    container.innerHTML = projects.map(p => {
      const pid = escapeHtml(p.projectId);
      const thumbUrl = `https://uploads.scratch.mit.edu/get_image/project/${pid}_282x210.png`;
      return `
        <div class="scratch-thumb-card" data-id="${pid}" title="Inspect Project #${pid}">
          <div class="thumb-image-wrap">
            <img src="${thumbUrl}" alt="Scratch Project ${pid}" class="thumb-image" loading="lazy" onerror="this.style.opacity='0.15'">
            ${getThumbPill(p)}
          </div>
          <div class="thumb-title">Project #${pid}</div>
          <div class="thumb-author">${p.totalVotes} vote${p.totalVotes === 1 ? '' : 's'} (${p.aiVotes} AI • ${p.humanVotes} Human)</div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.scratch-thumb-card').forEach(card => {
      card.addEventListener('click', () => openProjectModal(card.dataset.id));
    });
  }

  async function loadCommunityStats() {
    try {
      const res = await fetch(`${API_BASE}/stats`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const m = data.metrics;
      metricTotalUsers.textContent = m.totalUsers.toLocaleString();
      metricTotalProjects.textContent = m.totalProjects.toLocaleString();
      metricTotalVotes.textContent = m.totalVotes.toLocaleString();
      metricVoteBreakdown.textContent = `${m.aiVotes.toLocaleString()} AI (${m.aiPercentage}%) • ${m.humanVotes.toLocaleString()} Human (${m.humanPercentage}%)`;

      if (heroQuickVotes) heroQuickVotes.textContent = `${m.totalVotes.toLocaleString()} votes`;
      if (heroQuickProjects) heroQuickProjects.textContent = `${m.totalProjects.toLocaleString()} projects`;

      const aiRatio = m.totalVotes > 0 ? m.aiPercentage : 50;
      const humanRatio = m.totalVotes > 0 ? m.humanPercentage : 50;
      globalRatioAi.style.width = `${aiRatio}%`;
      globalRatioHuman.style.width = `${humanRatio}%`;
      globalAiLabel.textContent = `🤖 AI: ${aiRatio}%`;
      globalHumanLabel.textContent = `👤 Human: ${humanRatio}%`;

      renderProjectCarousel(
        featuredCarousel,
        data.mostVotedProjects,
        'No projects rated by the community yet.'
      );
      renderProjectCarousel(
        aiCarousel,
        data.topAiProjects && data.topAiProjects.length > 0
          ? data.topAiProjects
          : (data.mostVotedProjects || []).filter(p => p.aiVotes > 0),
        'No projects flagged as AI yet.'
      );
      renderProjectCarousel(
        humanCarousel,
        data.topHumanProjects && data.topHumanProjects.length > 0
          ? data.topHumanProjects
          : (data.mostVotedProjects || []).filter(p => p.humanVotes > 0),
        'No projects verified as Human yet.'
      );

      renderTopProjects(data.mostVotedProjects);
      renderRecentVotes(data.recentVotes);
    } catch (err) {
      console.error('Failed to load stats:', err);
      topProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--scratch-stop-text); padding: 1.5rem;">Error loading data: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderTopProjects(projects) {
    if (!projects || projects.length === 0) {
      topProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No projects classified yet.</td></tr>`;
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
          <button class="btn btn-sm inspect-btn inspect-project-btn" data-id="${escapeHtml(p.projectId)}">
            🔍 Inspect
          </button>
        </td>
      </tr>
    `).join('');

    topProjectsTableBody.querySelectorAll('.inspect-project-btn').forEach(btn => {
      btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
    });
  }

  function renderRecentVotes(votes) {
    if (!votes || votes.length === 0) {
      recentVotesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No recent votes yet.</td></tr>`;
      return;
    }

    recentVotesTableBody.innerHTML = votes.map(v => `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(v.createdAt)}</td>
        <td>
          <span class="code-id">#${escapeHtml(v.projectId)}</span>
          <a href="${escapeHtml(v.scratchUrl)}" target="_blank" rel="noopener noreferrer" class="external-link">↗</a>
        </td>
        <td>
          <span class="code-id" style="color: var(--text-dim);">${escapeHtml(v.maskedUserId)}</span>
        </td>
        <td>
          ${v.vote === 'ai' ? '<span class="badge badge-ai">🤖 AI</span>' : '<span class="badge badge-human">👤 Human</span>'}
        </td>
        <td>
          <button class="btn btn-sm inspect-btn inspect-project-btn" data-id="${escapeHtml(v.projectId)}">
            View Project
          </button>
        </td>
      </tr>
    `).join('');

    recentVotesTableBody.querySelectorAll('.inspect-project-btn').forEach(btn => {
      btn.addEventListener('click', () => openProjectModal(btn.dataset.id));
    });
  }

  async function openProjectModal(projectId) {
    modalProjectTitle.textContent = `Scratch Project #${projectId}`;
    modalScratchLink.href = `https://scratch.mit.edu/projects/${projectId}/`;
    modalStatsBox.innerHTML = 'Loading project details...';
    modalVotesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 1rem;">Loading votes...</td></tr>';
    projectModal.classList.remove('hidden');

    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/history/public`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderModalContent(data);
    } catch (err) {
      modalStatsBox.innerHTML = `<span style="color: var(--scratch-stop-text);">Failed to load project details: ${escapeHtml(err.message)}</span>`;
    }
  }

  function renderModalContent(data) {
    const p = data.project;
    const votes = data.votes;
    const thumbUrl = `https://uploads.scratch.mit.edu/get_image/project/${escapeHtml(p.projectId)}_282x210.png`;

    modalStatsBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <img src="${thumbUrl}" alt="Thumbnail" style="width: 96px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; background: #eee;" onerror="this.style.display='none'">
          <div>
            <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: var(--text-dark);">
              Verdict: ${getVerdictBadge(p.verdict)}
            </div>
            <div style="font-size: 0.84rem; color: var(--text-muted);">
              Total Votes: <strong>${p.totalVotes}</strong> (${p.isReliable ? 'Reaches 5+ vote reliability threshold' : 'Under 5 votes - insufficient data'})
            </div>
            <p style="font-size: 0.74rem; color: var(--text-dim); margin-top: 5px;">
              ⚠️ Community verdict based on human votes, not a technically verified AI detection result.
            </p>
          </div>
        </div>
        <div style="min-width: 210px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">
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
      modalVotesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 1rem;">No individual votes recorded for this project yet.</td></tr>';
      return;
    }

    modalVotesTableBody.innerHTML = votes.map(v => `
      <tr>
        <td>
          <span class="code-id">${escapeHtml(v.maskedUserId)}</span>
        </td>
        <td>
          ${v.vote === 'ai' ? '<span class="badge badge-ai">🤖 AI</span>' : '<span class="badge badge-human">👤 Human</span>'}
        </td>
        <td style="font-size: 0.82rem; color: var(--text-muted);">${formatDate(v.createdAt)}</td>
      </tr>
    `).join('');
  }

  function closeModal() {
    projectModal.classList.add('hidden');
  }

  closeModalBtn.addEventListener('click', closeModal);
  modalDoneBtn.addEventListener('click', closeModal);
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) closeModal();
  });

  document.querySelectorAll('.carousel-arrow').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const track = document.getElementById(targetId);
      if (!track) return;
      const scrollAmount = 340;
      if (btn.classList.contains('carousel-prev')) {
        track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    });
  });

  if (focusSearchBtn) {
    focusSearchBtn.addEventListener('click', () => {
      searchProjectIdInput.focus();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  if (heroExportBtn) {
    heroExportBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE}/export/csv?type=projects`;
    });
  }

  if (heroPreviewCard) {
    heroPreviewCard.addEventListener('click', () => {
      const statsEl = document.getElementById('statsSection');
      if (statsEl) statsEl.scrollIntoView({ behavior: 'smooth' });
    });
  }

  searchProjectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = searchProjectIdInput.value.trim();
    if (id && /^\d+$/.test(id)) {
      openProjectModal(id);
    }
  });

  refreshStatsBtn.addEventListener('click', () => {
    loadCommunityStats();
  });

  if (exportVotesBtn) {
    exportVotesBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE}/export/csv?type=votes`;
    });
  }

  if (exportProjectsBtn) {
    exportProjectsBtn.addEventListener('click', () => {
      window.location.href = `${API_BASE}/export/csv?type=projects`;
    });
  }

  // Init both Public Community Data & Unified Admin Session
  loadCommunityStats();
  checkAdminSession();
})();
