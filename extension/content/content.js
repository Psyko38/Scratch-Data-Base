// Cao AI Detector – Scratch On-Page Injected Widget

(function() {
  const DEFAULT_BACKEND_URL = 'http://localhost:3000';
  let backendUrl = DEFAULT_BACKEND_URL;
  let userId = null;
  let currentProjectId = null;
  let isMinimized = false;
  let projectStats = null;
  let userVote = null;

  function extractProjectId() {
    const match = window.location.pathname.match(/\/projects\/(\d+)/i);
    return match ? match[1] : null;
  }

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async function init() {
    const pId = extractProjectId();
    if (!pId) return;

    currentProjectId = pId;

    try {
      const stored = await chrome.storage.local.get(['userId', 'backendUrl', 'caoWidgetMinimized']);
      if (stored.userId) {
        userId = stored.userId;
      } else {
        userId = generateUUID();
        await chrome.storage.local.set({ userId });
      }

      if (stored.backendUrl) {
        backendUrl = stored.backendUrl;
      }

      if (stored.caoWidgetMinimized !== undefined) {
        isMinimized = Boolean(stored.caoWidgetMinimized);
      }

      await fetchStats();
      renderWidget();
    } catch (e) {
      console.warn('[Cao AI Detector] Init error:', e);
    }
  }

  async function fetchStats() {
    if (!currentProjectId) return;
    try {
      const url = `${backendUrl}/api/projects/${currentProjectId}?userId=${encodeURIComponent(userId)}`;
      const res = await fetch(url);
      if (res.ok) {
        projectStats = await res.json();
        userVote = projectStats.userVote || null;
      }
    } catch (e) {
      // Backend might be offline
    }
  }

  function renderWidget() {
    let root = document.getElementById('cao-ai-detector-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'cao-ai-detector-root';
      document.body.appendChild(root);
    }

    if (!projectStats) {
      root.innerHTML = '';
      return;
    }

    if (isMinimized) {
      let icon = '🐱';
      let text = 'Cao AI Detector';
      if (projectStats.totalVotes >= 5) {
        if (projectStats.verdict === 'AI-generated') {
          icon = '🤖';
          text = `${projectStats.aiPercentage}% AI`;
        } else if (projectStats.verdict === 'Human-created') {
          icon = '👤';
          text = `${projectStats.humanPercentage}% Human`;
        }
      }

      root.innerHTML = `
        <div class="cao-minimized-pill" id="cao-maximize-btn" title="Click to open Cao AI Detector">
          <span>${icon}</span>
          <span>${text}</span>
        </div>
      `;

      document.getElementById('cao-maximize-btn').addEventListener('click', async () => {
        isMinimized = false;
        await chrome.storage.local.set({ caoWidgetMinimized: false });
        renderWidget();
      });
      return;
    }

    // Full Card View
    const aiPct = projectStats.totalVotes > 0 ? projectStats.aiPercentage : 50;
    const humanPct = projectStats.totalVotes > 0 ? projectStats.humanPercentage : 50;

    let verdictClass = 'cao-badge-insufficient';
    if (projectStats.verdict === 'AI-generated') verdictClass = 'cao-badge-ai';
    if (projectStats.verdict === 'Human-created') verdictClass = 'cao-badge-human';
    if (projectStats.verdict === 'Undetermined') verdictClass = 'cao-badge-undetermined';

    root.innerHTML = `
      <div class="cao-card">
        <div class="cao-header">
          <div class="cao-brand">
            <span>🐱</span>
            <span>Cao AI Detector</span>
          </div>
          <button class="cao-toggle-btn" id="cao-minimize-btn" title="Minimize">−</button>
        </div>
        <div class="cao-body">
          <div class="cao-verdict-row">
            <span style="font-size: 11px; color: #57606a;">${projectStats.totalVotes} votes</span>
            <span class="cao-badge ${verdictClass}">${escapeHtml(projectStats.verdict)}</span>
          </div>

          <div class="cao-progress-wrap">
            <div class="cao-progress-ai" style="width: ${aiPct}%;"></div>
            <div class="cao-progress-human" style="width: ${humanPct}%;"></div>
          </div>

          <div style="display:flex; justify-content:space-between; font-size:10px; margin-bottom:10px; color:#57606a;">
            <span>🤖 AI: ${projectStats.aiVotes} (${projectStats.aiPercentage}%)</span>
            <span>👤 Human: ${projectStats.humanVotes} (${projectStats.humanPercentage}%)</span>
          </div>

          <div class="cao-actions">
            <button class="cao-btn cao-btn-ai ${userVote === 'ai' ? 'cao-active' : ''}" id="cao-vote-ai">
              <span>🤖</span> AI
            </button>
            <button class="cao-btn cao-btn-human ${userVote === 'human' ? 'cao-active' : ''}" id="cao-vote-human">
              <span>👤</span> Human
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('cao-minimize-btn').addEventListener('click', async () => {
      isMinimized = true;
      await chrome.storage.local.set({ caoWidgetMinimized: true });
      renderWidget();
    });

    document.getElementById('cao-vote-ai').addEventListener('click', () => submitVote('ai'));
    document.getElementById('cao-vote-human').addEventListener('click', () => submitVote('human'));
  }

  async function submitVote(type) {
    if (!currentProjectId || !userId) return;
    try {
      const res = await fetch(`${backendUrl}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          userId,
          vote: type
        })
      });

      if (res.ok) {
        const data = await res.json();
        projectStats = data.project;
        userVote = type;
        renderWidget();
      }
    } catch (e) {
      console.warn('[Cao AI Detector] Vote submission error:', e);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, '');
  }

  // Observe URL changes for Scratch SPA navigation
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      init();
    }
  }, 1000);

  // Initial mount
  init();
})();
