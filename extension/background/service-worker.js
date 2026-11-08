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

// On Extension Install or Update
chrome.runtime.onInstalled.addListener(async (details) => {
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

// Helper: Extract Scratch Project ID from URL
function extractScratchProjectId(url) {
  if (!url) return null;
  const match = url.match(/scratch\.mit\.edu\/projects\/(\d+)/i);
  return match ? match[1] : null;
}

// Update Extension Action Badge when browsing Scratch
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab && tab.url) {
    const projectId = extractScratchProjectId(tab.url);
    if (projectId) {
      try {
        const { backendUrl } = await chrome.storage.local.get(['backendUrl']);
        const apiUrl = `${backendUrl || DEFAULT_BACKEND_URL}/api/projects/${projectId}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const stats = await res.json();
          if (stats.totalVotes >= 5) {
            if (stats.verdict === 'AI-generated') {
              chrome.action.setBadgeText({ tabId, text: 'AI' });
              chrome.action.setBadgeBackgroundColor({ tabId, color: '#F85149' });
            } else if (stats.verdict === 'Human-created') {
              chrome.action.setBadgeText({ tabId, text: 'H' });
              chrome.action.setBadgeBackgroundColor({ tabId, color: '#3FB950' });
            } else {
              chrome.action.setBadgeText({ tabId, text: '?' });
              chrome.action.setBadgeBackgroundColor({ tabId, color: '#D29922' });
            }
          } else {
            chrome.action.setBadgeText({ tabId, text: '' });
          }
        }
      } catch (e) {
        // Silently catch if backend is offline
        chrome.action.setBadgeText({ tabId, text: '' });
      }
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  }
});
