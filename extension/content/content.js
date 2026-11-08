// Cao AI Detector – Scratch Native Stage Bar & Project Thumbnail Badges
// (No floating bottom-right popup widget)

(function() {
  let userId = null;
  let currentProjectId = null;
  let projectStats = null;
  let userVote = null;
  let isSubmitting = false;

  // Cache of project stats for thumbnail previews: { [projectId]: stats }
  const statsCache = new Map();
  let pendingBatchIds = new Set();
  let batchTimer = null;

  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function extractPageProjectId() {
    // Only match /projects/<id> or /projects/<id>/fullscreen, NEVER /projects/<id>/editor
    if (/\/projects\/\d+\/editor(\/|$)/i.test(window.location.pathname)) {
      return null;
    }
    const match = window.location.pathname.match(/^\/projects\/(\d+)(\/fullscreen)?\/?$/i);
    return match ? match[1] : null;
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

  // Send API request through the background service worker (avoids HTTPS -> HTTP mixed-content blocks)
  function apiRequest(path, method = 'GET', body = null) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'CAO_API_REQUEST', path, method, body },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve({ ok: false, status: 0, data: null });
          } else {
            resolve(response);
          }
        }
      );
    });
  }

  // Remove any legacy floating widget if present
  const legacyRoot = document.getElementById('cao-ai-detector-root');
  if (legacyRoot) legacyRoot.remove();

  // =========================================================================
  // 1. STAGE HEADER BAR VERDICT & VOTE PILL (NEXT TO GREEN FLAG / STOP SIGN)
  // =========================================================================
  function findStageControlsBar() {
    // Never inject inside the Scratch code editor view
    if (/\/projects\/\d+\/editor(\/|$)/i.test(window.location.pathname) || document.querySelector('[class*="gui_editor-wrapper"]')) {
      return null;
    }
    // Look for Scratch 3 stage header controls container (contains green flag & stop button)
    const selectors = [
      '[class*="stage-header_stage-menu-wrapper"]',
      '[class*="controls_controls-container"]',
      '.stage-header_stage-menu-wrapper_15JJt',
      '.controls_controls-container_2xinB'
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    // Fallback: locate the Green Flag image and use its parent controls bar
    const greenFlagImg = document.querySelector('img[class*="green-flag"], img[alt="Go"], img[title*="Go"]');
    if (greenFlagImg && greenFlagImg.parentElement && greenFlagImg.parentElement.parentElement) {
      return greenFlagImg.parentElement.parentElement;
    }
    return null;
  }

  function getStageVerdictSummary(stats) {
    if (!stats) {
      return { text: 'Loading...', cls: 'cao-stage-neutral' };
    }
    if (stats.verdict === 'AI-generated') {
      return { text: `🤖 AI (${stats.aiPercentage}%)`, cls: 'cao-stage-ai' };
    }
    if (stats.verdict === 'Human-created') {
      return { text: `👤 Human (${stats.humanPercentage}%)`, cls: 'cao-stage-human' };
    }
    if (stats.totalVotes > 0) {
      if (stats.aiVotes > stats.humanVotes) {
        return { text: `🤖 ${stats.aiPercentage}% AI (${stats.totalVotes}/5)`, cls: 'cao-stage-pending' };
      }
      if (stats.humanVotes > stats.aiVotes) {
        return { text: `👤 ${stats.humanPercentage}% Human (${stats.totalVotes}/5)`, cls: 'cao-stage-pending' };
      }
      return { text: `⚖️ 50/50 (${stats.totalVotes} votes)`, cls: 'cao-stage-pending' };
    }
    return { text: 'Unrated (0 votes)', cls: 'cao-stage-neutral' };
  }

  function renderStageBadge() {
    const pId = extractPageProjectId();
    const existing = document.getElementById('cao-stage-bar-item');

    if (!pId) {
      if (existing) existing.remove();
      return;
    }

    const bar = findStageControlsBar();
    if (!bar) return;

    let container = existing;
    if (!container) {
      container = document.createElement('div');
      container.id = 'cao-stage-bar-item';
      container.className = 'cao-stage-bar-item';

      // Insert right after the left controls (green flag / stop) or before the fullscreen buttons
      const firstChild = bar.firstElementChild;
      if (firstChild && firstChild.nextSibling) {
        bar.insertBefore(container, firstChild.nextSibling);
      } else {
        bar.appendChild(container);
      }
    }

    const v = getStageVerdictSummary(projectStats);
    const total = projectStats ? projectStats.totalVotes : 0;

    container.innerHTML = `
      <div class="cao-stage-pill ${v.cls}" title="Scratch AI Community Verdict (${total} vote${total === 1 ? '' : 's'})">
        <span class="cao-stage-verdict-text">${escapeHtml(v.text)}</span>
        <div class="cao-stage-vote-btns">
          <button type="button" class="cao-stage-vbtn cao-vbtn-ai ${userVote === 'ai' ? 'active' : ''}" id="cao-stage-vote-ai" title="Vote: AI-generated" ${isSubmitting ? 'disabled' : ''}>🤖 AI</button>
          <button type="button" class="cao-stage-vbtn cao-vbtn-human ${userVote === 'human' ? 'active' : ''}" id="cao-stage-vote-human" title="Vote: Human-created" ${isSubmitting ? 'disabled' : ''}>👤 Human</button>
        </div>
      </div>
    `;

    const aiBtn = container.querySelector('#cao-stage-vote-ai');
    const humanBtn = container.querySelector('#cao-stage-vote-human');
    if (aiBtn) aiBtn.addEventListener('click', (e) => { e.stopPropagation(); submitStageVote('ai'); });
    if (humanBtn) humanBtn.addEventListener('click', (e) => { e.stopPropagation(); submitStageVote('human'); });
  }

  async function loadCurrentProjectStats(pId) {
    if (!pId || !userId) return;
    const res = await apiRequest(`/api/projects/${pId}?userId=${encodeURIComponent(userId)}`);
    if (res.ok && res.data) {
      projectStats = res.data;
      userVote = res.data.userVote || null;
      statsCache.set(String(pId), projectStats);
    } else {
      projectStats = {
        projectId: pId,
        totalVotes: 0,
        aiVotes: 0,
        humanVotes: 0,
        aiPercentage: 0,
        humanPercentage: 0,
        verdict: 'Insufficient data'
      };
    }
    renderStageBadge();
  }

  async function submitStageVote(voteType) {
    if (!currentProjectId || !userId || isSubmitting) return;
    isSubmitting = true;
    renderStageBadge();

    const res = await apiRequest('/api/votes', 'POST', {
      projectId: currentProjectId,
      userId,
      vote: voteType
    });

    isSubmitting = false;
    if (res.ok && res.data && res.data.project) {
      projectStats = res.data.project;
      userVote = res.data.userVote || voteType;
      statsCache.set(String(currentProjectId), projectStats);
      renderStageBadge();
      updateAllThumbnailBadges();

      chrome.runtime.sendMessage({
        type: 'CAO_VOTE_UPDATED',
        projectId: currentProjectId,
        project: projectStats,
        userVote
      }).catch(() => {});
    } else {
      renderStageBadge();
    }
  }

  // =========================================================================
  // 2. PROJECT THUMBNAIL PREVIEWS BADGE OVERLAY (ACROSS ALL SCRATCH PAGES)
  // =========================================================================
  function getThumbBadgeInfo(stats) {
    if (!stats || stats.totalVotes === 0) return null;
    if (stats.verdict === 'AI-generated') {
      return { text: `🤖 AI ${stats.aiPercentage}%`, cls: 'cao-thumb-ai' };
    }
    if (stats.verdict === 'Human-created') {
      return { text: `👤 Human ${stats.humanPercentage}%`, cls: 'cao-thumb-human' };
    }
    if (stats.aiVotes > stats.humanVotes) {
      return { text: `🤖 ${stats.aiPercentage}% AI`, cls: 'cao-thumb-pending' };
    }
    if (stats.humanVotes > stats.aiVotes) {
      return { text: `👤 ${stats.humanPercentage}% Human`, cls: 'cao-thumb-pending' };
    }
    return { text: `⚖️ ${stats.totalVotes} votes`, cls: 'cao-thumb-pending' };
  }

  function findProjectThumbnailAnchors() {
    // Find links pointing to /projects/<id>/ that wrap a thumbnail image
    const links = document.querySelectorAll('a[href*="/projects/"]');
    const items = [];

    links.forEach((a) => {
      const href = a.getAttribute('href') || '';
      const match = href.match(/\/projects\/(\d+)\/?$/i);
      if (!match) return;

      const img = a.querySelector('img');
      if (!img) return;

      items.push({ anchor: a, projectId: match[1] });
    });

    return items;
  }

  function applyBadgeToThumbnail(anchor, projectId, stats) {
    const info = getThumbBadgeInfo(stats);
    let badge = anchor.querySelector('.cao-thumb-badge');

    if (!info) {
      if (badge) badge.remove();
      return;
    }

    // Ensure anchor is positioned so absolute badge sits cleanly in corner of image
    const computedPos = window.getComputedStyle(anchor).position;
    if (computedPos === 'static') {
      anchor.style.position = 'relative';
    }
    if (window.getComputedStyle(anchor).display === 'inline') {
      anchor.style.display = 'inline-block';
    }

    if (!badge) {
      badge = document.createElement('span');
      anchor.appendChild(badge);
    }

    badge.className = `cao-thumb-badge ${info.cls}`;
    badge.textContent = info.text;
    badge.title = `Scratch AI Community Verdict: ${stats.totalVotes} vote(s) (${stats.aiVotes} AI / ${stats.humanVotes} Human)`;
  }

  function updateAllThumbnailBadges() {
    const items = findProjectThumbnailAnchors();
    for (const { anchor, projectId } of items) {
      if (statsCache.has(projectId)) {
        applyBadgeToThumbnail(anchor, projectId, statsCache.get(projectId));
      }
    }
  }

  function scanAndQueueThumbnails() {
    const items = findProjectThumbnailAnchors();
    let hasNew = false;

    for (const { anchor, projectId } of items) {
      if (statsCache.has(projectId)) {
        applyBadgeToThumbnail(anchor, projectId, statsCache.get(projectId));
      } else if (!pendingBatchIds.has(projectId)) {
        pendingBatchIds.add(projectId);
        hasNew = true;
      }
    }

    if (hasNew && !batchTimer) {
      batchTimer = setTimeout(flushPendingThumbnails, 250);
    }
  }

  async function flushPendingThumbnails() {
    batchTimer = null;
    if (pendingBatchIds.size === 0) return;

    const idsToFetch = Array.from(pendingBatchIds).slice(0, 100);
    idsToFetch.forEach((id) => pendingBatchIds.delete(id));

    const res = await apiRequest('/api/projects/batch', 'POST', { projectIds: idsToFetch });
    if (res.ok && res.data && res.data.projects) {
      for (const [id, st] of Object.entries(res.data.projects)) {
        statsCache.set(String(id), st);
      }
      updateAllThumbnailBadges();
    }

    if (pendingBatchIds.size > 0) {
      batchTimer = setTimeout(flushPendingThumbnails, 250);
    }
  }

  // =========================================================================
  // 3. INITIALIZATION & OBSERVERS
  // =========================================================================
  async function init() {
    try {
      const stored = await chrome.storage.local.get(['userId']);
      if (stored.userId) {
        userId = stored.userId;
      } else {
        userId = generateUUID();
        await chrome.storage.local.set({ userId });
      }
    } catch (e) {
      userId = generateUUID();
    }

    const pId = extractPageProjectId();
    if (pId) {
      currentProjectId = pId;
      await loadCurrentProjectStats(pId);
    } else {
      currentProjectId = null;
      projectStats = null;
    }

    scanAndQueueThumbnails();
  }

  // Listen for sync messages when the user votes inside the extension popup
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg && msg.type === 'CAO_SYNC_PROJECT' && msg.projectId) {
      const pid = String(msg.projectId);
      if (msg.project) {
        statsCache.set(pid, msg.project);
      }
      if (pid === String(currentProjectId)) {
        if (msg.project) projectStats = msg.project;
        if (msg.userVote) userVote = msg.userVote;
        renderStageBadge();
      }
      updateAllThumbnailBadges();
    }
  });

  // Periodic check for Scratch React SPA rendering & URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      init();
      return;
    }

    // Re-attach stage badge if Scratch React re-rendered the player header, or remove if entered editor
    const activePagePid = extractPageProjectId();
    if (!activePagePid || document.querySelector('[class*="gui_editor-wrapper"]')) {
      const existing = document.getElementById('cao-stage-bar-item');
      if (existing) existing.remove();
    } else if (currentProjectId && !document.getElementById('cao-stage-bar-item')) {
      renderStageBadge();
    }

    // Scan any newly loaded carousel/grid project thumbnails
    scanAndQueueThumbnails();
  }, 800);

  init();
})();
