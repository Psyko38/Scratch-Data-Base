// Options Page Controller

(function() {
  const DEFAULT_BACKEND_URL = 'http://localhost:3000';
  const backendUrlInput = document.getElementById('backendUrlInput');
  const themeSelect = document.getElementById('themeSelect');
  const userIdDisplay = document.getElementById('userIdDisplay');
  const settingsForm = document.getElementById('settingsForm');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const copyIdBtn = document.getElementById('copyIdBtn');
  const statusMsg = document.getElementById('statusMsg');

  function showStatus(text, isError = false) {
    statusMsg.textContent = text;
    statusMsg.style.display = 'block';
    statusMsg.style.background = isError ? 'rgba(236, 89, 89, 0.14)' : 'rgba(76, 191, 86, 0.14)';
    statusMsg.style.color = isError ? '#b82d2d' : '#287a38';
    statusMsg.style.border = `1px solid ${isError ? 'rgba(236, 89, 89, 0.4)' : 'rgba(76, 191, 86, 0.4)'}`;
    setTimeout(() => {
      statusMsg.style.display = 'none';
    }, 4000);
  }

  // Load current settings
  async function loadSettings() {
    const data = await chrome.storage.local.get(['backendUrl', 'theme', 'userId']);
    backendUrlInput.value = data.backendUrl || DEFAULT_BACKEND_URL;
    themeSelect.value = data.theme || 'auto';
    userIdDisplay.value = data.userId || 'Not generated yet';
  }

  // Save settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = (backendUrlInput.value || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
    const theme = themeSelect.value;

    await chrome.storage.local.set({
      backendUrl: url,
      theme: theme
    });

    backendUrlInput.value = url;
    showStatus('✅ Settings saved successfully!', false);
  });

  // Test backend connection
  testConnectionBtn.addEventListener('click', async () => {
    const url = (backendUrlInput.value || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';

    try {
      const res = await fetch(`${url}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      showStatus(`✅ Connection successful! Server status: ${data.status} (${data.counts?.votes || 0} votes)`, false);
    } catch (err) {
      showStatus(`❌ Connection failed: ${err.message}. Make sure the server is running at ${url}`, true);
    } finally {
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = '🔌 Test Connection';
    }
  });

  // Copy User ID
  copyIdBtn.addEventListener('click', () => {
    if (userIdDisplay.value) {
      navigator.clipboard.writeText(userIdDisplay.value);
      showStatus('📋 UUID copied to clipboard!', false);
    }
  });

  loadSettings();
})();
