// Service Worker for Cao AI Detector (Manifest V3)

const DEFAULT_BACKEND_URL = 'http://localhost:3000';

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function normalizeUrl(url) {
  return (url || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
}

// On Extension Install or Update
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(['userId', 'backendUrl', 'theme']);

  const updates = {};
  if (!data.userId) {
    updates.userId = generateUUID();
    console.log('[Cao AI Detector] Generated new user UUID:', updates.userId);
  }

  if (!data.backendUrl) {
    updates.backendUrl = DEFAULT_BACKEND_URL;
  }

  if (!data.theme) {
    updates.theme = 'auto'; // 'auto', 'light', 'dark'
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
});

// Helper: Extract Scratch Project ID from URL (ignore /editor)
function extractScratchProjectId(url) {
  if (!url || /\/projects\/\d+\/editor(\/|$)/i.test(url)) return null;
  const match = url.match(/scratch\.mit\.edu\/projects\/(\d+)/i);
  return match ? match[1] : null;
}

function applyBadgeFromStats(tabId, stats) {
  if (!tabId || !stats) return;
  if (stats.totalVotes >= 5) {
    if (stats.verdict === 'AI-generated') {
      chrome.action.setBadgeText({ tabId, text: 'AI' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#ec5959' });
    } else if (stats.verdict === 'Human-created') {
      chrome.action.setBadgeText({ tabId, text: 'OK' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#4cbf56' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '?' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#ffab19' });
    }
  } else if (stats.totalVotes > 0) {
    chrome.action.setBadgeText({ tabId, text: String(stats.totalVotes) });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#855cd6' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

async function refreshTabBadge(tabId, url) {
  const projectId = extractScratchProjectId(url);
  if (!projectId) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  try {
    const { backendUrl } = await chrome.storage.local.get(['backendUrl']);
    const apiUrl = `${normalizeUrl(backendUrl)}/api/projects/${projectId}`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const stats = await res.json();
      applyBadgeFromStats(tabId, stats);
    }
  } catch (e) {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
}

// Update Extension Action Badge when browsing Scratch (including SPA URL changes)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if ((changeInfo.status === 'complete' || changeInfo.url) && tab && tab.url) {
    refreshTabBadge(tabId, tab.url);
  }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  // Proxy API requests from content script to avoid Mixed Content / CORS issues on https://scratch.mit.edu
  if (msg.type === 'CAO_API_REQUEST') {
    (async () => {
      try {
        const { backendUrl } = await chrome.storage.local.get(['backendUrl']);
        const base = normalizeUrl(backendUrl);
        const url = `${base}${msg.path}`;
        const fetchOpts = {
          method: msg.method || 'GET',
          headers: { 'Content-Type': 'application/json' }
        };
        if (msg.body) {
          fetchOpts.body = JSON.stringify(msg.body);
        }
        const res = await fetch(url, fetchOpts);
        const data = await res.json().catch(() => ({}));
        sendResponse({ ok: res.ok, status: res.status, data });
      } catch (err) {
        sendResponse({ ok: false, status: 0, error: err.message });
      }
    })();
    return true; // Keep message channel open for async response
  }

  if (msg.type === 'CAO_VOTE_UPDATED' && msg.projectId) {
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        const pId = extractScratchProjectId(tab.url);
        if (pId === String(msg.projectId)) {
          if (msg.project) {
            applyBadgeFromStats(tab.id, msg.project);
          } else {
            refreshTabBadge(tab.id, tab.url);
          }
          chrome.tabs.sendMessage(tab.id, {
            type: 'CAO_SYNC_PROJECT',
            projectId: msg.projectId,
            project: msg.project,
            userVote: msg.userVote
          }).catch(() => {});
        }
      });
    });
    sendResponse({ ok: true });
    return false;
  }

  return false;
});
