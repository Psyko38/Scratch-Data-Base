// Cao AI Detector – Community Explorer Frontend Controller

(function() {
  const metricTotalUsers = document.getElementById('metricTotalUsers');
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
  const closeModalBtn = document.getElementById('closeModalBtn');
  const modalDoneBtn = document.getElementById('modalDoneBtn');

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

  // Load Community Stats
  async function loadCommunityStats() {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const m = data.metrics;
      metricTotalUsers.textContent = m.totalUsers.toLocaleString();
      metricTotalProjects.textContent = m.totalProjects.toLocaleString();
      metricTotalVotes.textContent = m.totalVotes.toLocaleString();
      metricVoteBreakdown.textContent = `${m.aiVotes.toLocaleString()} AI (${m.aiPercentage}%) • ${m.humanVotes.toLocaleString()} Human (${m.humanPercentage}%)`;

      const aiRatio = m.totalVotes > 0 ? m.aiPercentage : 50;
      const humanRatio = m.totalVotes > 0 ? m.humanPercentage : 50;
      globalRatioAi.style.width = `${aiRatio}%`;
      globalRatioHuman.style.width = `${humanRatio}%`;
      globalAiLabel.textContent = `🤖 AI: ${aiRatio}%`;
      globalHumanLabel.textContent = `👤 Human: ${humanRatio}%`;

      renderTopProjects(data.mostVotedProjects);
      renderRecentVotes(data.recentVotes);
    } catch (err) {
      console.error('Failed to load stats:', err);
      topProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--scratch-stop-text); padding: 1.5rem;">Error loading data: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  function renderTopProjects(projects) {
    if (!projects || projects.length === 0) {
      topProjectsTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No projects classified by the community yet.</td></tr>`;
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
      recentVotesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No votes cast yet.</td></tr>`;
      return;
    }

    recentVotesTableBody.innerHTML = votes.map(v => `
      <tr>
        <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(v.createdAt)}</td>
        <td>
          <span class="code-id">${escapeHtml(v.projectId)}</span>
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

  // Project Inspection Modal (Read-Only)
  async function openProjectModal(projectId) {
    modalProjectTitle.textContent = `Scratch Project #${projectId}`;
    modalScratchLink.href = `https://scratch.mit.edu/projects/${projectId}/`;
    modalStatsBox.innerHTML = 'Loading project details...';
    modalVotesTableBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 1rem;">Loading votes...</td></tr>';
    projectModal.classList.remove('hidden');

    try {
      const res = await fetch(`/api/projects/${projectId}/history/public`);
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

    modalStatsBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
        <div>
          <div style="font-size: 1.15rem; font-weight: 700; margin-bottom: 4px;">
            Community Verdict: ${getVerdictBadge(p.verdict)}
          </div>
          <div style="font-size: 0.85rem; color: var(--text-muted);">
            Total Votes: <strong>${p.totalVotes}</strong> (${p.isReliable ? 'Reaches 5+ vote reliability threshold' : 'Under 5 votes - insufficient data'})
          </div>
          <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 6px;">
            ⚠️ Community verdict based on human votes, not a technically verified AI detection result.
          </p>
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

  exportVotesBtn.addEventListener('click', () => {
    window.location.href = '/api/export/csv?type=votes';
  });

  exportProjectsBtn.addEventListener('click', () => {
    window.location.href = '/api/export/csv?type=projects';
  });

  loadCommunityStats();
})();
