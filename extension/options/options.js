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
    statusMsg.style.background = isError ? 'rgba(207, 34, 46, 0.1)' : 'rgba(26, 127, 55, 0.1)';
    statusMsg.style.color = isError ? '#cf222e' : '#1a7f37';
    statusMsg.style.border = `1px solid ${isError ? '#cf222e' : '#1a7f37'}`;
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
    let url = backendUrlInput.value.trim().replace(/\/+$/, '');
    const theme = themeSelect.value;

    await chrome.storage.local.set({
      backendUrl: url,
      theme: theme
    });

    showStatus('Settings saved successfully!');
  });

  // Test backend connection
  testConnectionBtn.addEventListener('click', async () => {
    let url = backendUrlInput.value.trim().replace(/\/+$/, '');
    testConnectionBtn.disabled = true;
    testConnectionBtn.textContent = 'Testing...';

    try {
      const res = await fetch(`${url}/api/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      showStatus(`Connection successful! Server status: ${data.status} (database: ${data.database})`, false);
    } catch (err) {
      showStatus(`Connection failed: ${err.message}. Is the backend running at ${url}?`, true);
    } finally {
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = 'Test Connection';
    }
  });

  // Copy User ID
  copyIdBtn.addEventListener('click', () => {
    if (userIdDisplay.value) {
      navigator.clipboard.writeText(userIdDisplay.value);
      showStatus('Voter UUID copied to clipboard!', false);
    }
  });

  loadSettings();
})();
