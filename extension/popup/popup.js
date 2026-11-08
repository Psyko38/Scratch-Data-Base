// Cao AI Detector – Popup Interface Controller

(function() {
  const DEFAULT_BACKEND_URL = 'http://localhost:3000';
  let backendUrl = DEFAULT_BACKEND_URL;
  let currentUserId = null;
  let currentProjectId = null;
  let currentUserVote = null;

  // DOM Elements
  const activeProjectView = document.getElementById('activeProjectView');
  const emptyStateView = document.getElementById('emptyStateView');
  const alertBanner = document.getElementById('alertBanner');
  const updateBanner = document.getElementById('updateBanner');
  const downloadUpdateBtn = document.getElementById('downloadUpdateBtn');
  const dismissUpdateBtn = document.getElementById('dismissUpdateBtn');
  const popupLegalLink = document.getElementById('popupLegalLink');

  const openExplorerBrandLink = document.getElementById('openExplorerBrandLink');
  const openExplorerBtn = document.getElementById('openExplorerBtn');
  const projectThumbImg = document.getElementById('projectThumbImg');
  const displayProjectId = document.getElementById('displayProjectId');
  const openInScratchLink = document.getElementById('openInScratchLink');
  const voteAiBtn = document.getElementById('voteAiBtn');
  const voteHumanBtn = document.getElementById('voteHumanBtn');
  const userVoteStatus = document.getElementById('userVoteStatus');

  const statTotalVotes = document.getElementById('statTotalVotes');
  const statAiVotes = document.getElementById('statAiVotes');
  const statHumanVotes = document.getElementById('statHumanVotes');
  const progressAi = document.getElementById('progressAi');
  const progressHuman = document.getElementById('progressHuman');
  const verdictBadge = document.getElementById('verdictBadge');

  const quickLookupForm = document.getElementById('quickLookupForm');
  const quickLookupInput = document.getElementById('quickLookupInput');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const openOptionsBtn = document.getElementById('openOptionsBtn');

  function normalizeUrl(url) {
    return (url || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
  }

  // Generate random UUID v4 if missing
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Theme Management
  async function initTheme() {
    const { theme } = await chrome.storage.local.get(['theme']);
    applyTheme(theme || 'auto');
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    }
  }

  themeToggleBtn.addEventListener('click', async () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    await chrome.storage.local.set({ theme: newTheme });
  });

  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  if (dismissUpdateBtn) {
    dismissUpdateBtn.addEventListener('click', () => {
      updateBanner.classList.add('hidden');
    });
  }

  // Check if a new version is available on the server by comparing code hashes
  async function checkForUpdates(url) {
    try {
      // 1. Read local hash from bundled version.json
      const localVerRes = await fetch(chrome.runtime.getURL('version.json'));
      if (!localVerRes.ok) return;
      const localVer = await localVerRes.json();
      const localHash = localVer.hash;
      if (!localHash) return;

      // 2. Fetch server version & extension hash
      const res = await fetch(`${url}/api/version`);
      if (!res.ok) return;
      const serverData = await res.json();
      const serverHash = serverData.extensionHash;

      // 3. Compare hashes
      if (serverHash && serverHash !== 'dev-unknown' && serverHash !== localHash) {
        const downloadUrl = serverData.downloadUrl || `${url}/api/extension/download?browser=chrome`;
        if (downloadUpdateBtn) downloadUpdateBtn.href = downloadUrl;
        if (updateBanner) updateBanner.classList.remove('hidden');
      }
    } catch (e) {
      // Offline / server unreachable: fail silently
    }
  }

  function showAlert(msg, isError = true) {
    alertBanner.textContent = msg;
    alertBanner.className = `alert-banner ${isError ? 'alert-error' : 'alert-success'}`;
    alertBanner.style.display = 'block';
    setTimeout(() => {
      alertBanner.style.display = 'none';
    }, 4000);
  }

  // Extract Scratch Project ID from URL (ignore /editor)
  function extractProjectId(url) {
    if (!url || /\/projects\/\d+\/editor(\/|$)/i.test(url)) return null;
    const match = url.match(/scratch\.mit\.edu\/projects\/(\d+)/i);
    return match ? match[1] : null;
  }

  // Load User and Active Tab
  async function init() {
    await initTheme();

    const stored = await chrome.storage.local.get(['userId', 'backendUrl']);
    if (stored.userId) {
      currentUserId = stored.userId;
    } else {
      currentUserId = generateUUID();
      await chrome.storage.local.set({ userId: currentUserId });
    }

    backendUrl = normalizeUrl(stored.backendUrl);
    if (openExplorerBrandLink) openExplorerBrandLink.href = backendUrl;
    if (openExplorerBtn) openExplorerBtn.href = backendUrl;
    if (popupLegalLink) popupLegalLink.href = `${backendUrl}/legal`;

    // Check for extension updates from the backend server
    checkForUpdates(backendUrl);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      const pId = activeTab ? extractProjectId(activeTab.url) : null;

      if (pId) {
        loadProject(pId);
      } else {
        showEmptyState();
      }
    });
  }

  function showEmptyState() {
    activeProjectView.classList.add('hidden');
    emptyStateView.classList.remove('hidden');
  }

  // Load project stats from Backend API
  async function loadProject(projectId) {
    currentProjectId = projectId;
    activeProjectView.classList.remove('hidden');
    emptyStateView.classList.add('hidden');

    displayProjectId.textContent = `#${projectId}`;
    openInScratchLink.href = `https://scratch.mit.edu/projects/${projectId}/`;

    if (projectThumbImg) {
      projectThumbImg.style.opacity = '1';
      projectThumbImg.src = `https://uploads.scratch.mit.edu/get_image/project/${projectId}_282x210.png`;
      projectThumbImg.onerror = () => {
        projectThumbImg.style.opacity = '0.2';
      };
    }

    try {
      const apiUrl = `${backendUrl}/api/projects/${projectId}?userId=${encodeURIComponent(currentUserId)}`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      renderStats(data, data.userVote || null);
    } catch (err) {
      showAlert(`Cannot connect to backend (${backendUrl}). Make sure server is running.`, true);
      renderDefaultStats();
    }
  }

  function renderStats(data, explicitUserVote) {
    if (explicitUserVote !== undefined) {
      currentUserVote = explicitUserVote;
    } else if (data.userVote !== undefined) {
      currentUserVote = data.userVote;
    }

    statTotalVotes.textContent = `${data.totalVotes} ${data.totalVotes === 1 ? 'vote' : 'votes'}`;
    statAiVotes.textContent = `🤖 AI: ${data.aiVotes} (${data.aiPercentage}%)`;
    statHumanVotes.textContent = `👤 Human: ${data.humanVotes} (${data.humanPercentage}%)`;

    let aiRatio = 50;
    let humanRatio = 50;
    if (data.totalVotes > 0) {
      aiRatio = data.aiPercentage;
      humanRatio = data.humanPercentage;
    }
    progressAi.style.width = `${aiRatio}%`;
    progressHuman.style.width = `${humanRatio}%`;

    verdictBadge.className = 'verdict-badge';
    if (data.verdict === 'AI-generated') {
      verdictBadge.classList.add('verdict-ai');
      verdictBadge.innerHTML = '🤖 AI-generated';
    } else if (data.verdict === 'Human-created') {
      verdictBadge.classList.add('verdict-human');
      verdictBadge.innerHTML = '👤 Human-created';
    } else if (data.verdict === 'Undetermined') {
      verdictBadge.classList.add('verdict-undetermined');
      verdictBadge.innerHTML = '⚖️ Undetermined';
    } else {
      verdictBadge.classList.add('verdict-insufficient');
      verdictBadge.innerHTML = '⏳ Insufficient data (&lt;5 votes)';
    }

    voteAiBtn.classList.remove('active-vote');
    voteHumanBtn.classList.remove('active-vote');

    if (currentUserVote === 'ai') {
      voteAiBtn.classList.add('active-vote');
      userVoteStatus.innerHTML = `Your vote: <strong style="color: var(--ai-color);">AI-generated</strong> (Click Human to change)`;
    } else if (currentUserVote === 'human') {
      voteHumanBtn.classList.add('active-vote');
      userVoteStatus.innerHTML = `Your vote: <strong style="color: var(--human-color);">Human-created</strong> (Click AI to change)`;
    } else {
      userVoteStatus.textContent = 'Vote to contribute to the community verdict';
    }
  }

  function renderDefaultStats() {
    statTotalVotes.textContent = '0 votes';
    statAiVotes.textContent = '🤖 AI: 0 (0%)';
    statHumanVotes.textContent = '👤 Human: 0 (0%)';
    progressAi.style.width = '50%';
    progressHuman.style.width = '50%';
    verdictBadge.innerHTML = '⏳ Insufficient data (&lt;5 votes)';
    verdictBadge.className = 'verdict-badge verdict-insufficient';
  }

  // Submit Vote
  async function submitVote(voteType) {
    if (!currentProjectId || !currentUserId) return;

    voteAiBtn.disabled = true;
    voteHumanBtn.disabled = true;

    try {
      const res = await fetch(`${backendUrl}/api/votes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProjectId,
          userId: currentUserId,
          vote: voteType
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Voting failed');
      }

      // Pass data.userVote (returned on top-level of POST /api/votes) so button stays active!
      renderStats(data.project, data.userVote || voteType);
      showAlert(`Vote recorded: ${voteType === 'ai' ? '🤖 AI-generated' : '👤 Human-created'}!`, false);

      // Sync badge and content script on active Scratch tab
      chrome.runtime.sendMessage({
        type: 'CAO_VOTE_UPDATED',
        projectId: currentProjectId,
        project: data.project,
        userVote: data.userVote || voteType
      }).catch(() => {});
    } catch (err) {
      showAlert(err.message, true);
    } finally {
      voteAiBtn.disabled = false;
      voteHumanBtn.disabled = false;
    }
  }

  voteAiBtn.addEventListener('click', () => submitVote('ai'));
  voteHumanBtn.addEventListener('click', () => submitVote('human'));

  quickLookupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = quickLookupInput.value.trim();
    if (id && /^\d+$/.test(id)) {
      loadProject(id);
    } else {
      showAlert('Please enter a valid numeric Scratch project ID');
    }
  });

  init();
})();
