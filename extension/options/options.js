// Scratch AI – Extension Settings Controller

(function() {
  const DEFAULT_BACKEND_URL = 'http://localhost:3000';
  const backendUrlInput = document.getElementById('backendUrlInput');
  const themeSelect = document.getElementById('themeSelect');
  const userIdDisplay = document.getElementById('userIdDisplay');
  const settingsForm = document.getElementById('settingsForm');
  const testConnectionBtn = document.getElementById('testConnectionBtn');
  const copyIdBtn = document.getElementById('copyIdBtn');
  const statusMsg = document.getElementById('statusMsg');
  const legalLink = document.getElementById('legalLink');

  // Apply theme to document
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  // Display status banner
  let statusTimeout = null;
  function showStatus(text, isError = false) {
    if (statusTimeout) clearTimeout(statusTimeout);

    statusMsg.textContent = text;
    statusMsg.style.display = 'block';

    if (isError) {
      statusMsg.style.background = 'var(--status-error-bg)';
      statusMsg.style.color = 'var(--status-error-text)';
      statusMsg.style.border = '1px solid var(--status-error-border)';
    } else {
      statusMsg.style.background = 'var(--status-success-bg)';
      statusMsg.style.color = 'var(--status-success-text)';
      statusMsg.style.border = '1px solid var(--status-success-border)';
    }

    statusTimeout = setTimeout(() => {
      statusMsg.style.display = 'none';
    }, 4500);
  }

  // Load saved settings
  async function loadSettings() {
    try {
      const data = await chrome.storage.local.get(['backendUrl', 'theme', 'userId']);
      backendUrlInput.value = data.backendUrl || DEFAULT_BACKEND_URL;
      const theme = data.theme || 'auto';
      themeSelect.value = theme;
      applyTheme(theme);
      userIdDisplay.value = data.userId || 'Generating...';
      if (legalLink) {
        legalLink.href = `${backendUrlInput.value}/legal`;
      }
    } catch (e) {
      console.error('Failed to load settings from storage:', e);
    }
  }

  // Live theme preview when user changes dropdown
  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
  });

  // Save settings
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = (backendUrlInput.value || DEFAULT_BACKEND_URL).trim().replace(/\/+$/, '');
    const theme = themeSelect.value;

    try {
      await chrome.storage.local.set({
        backendUrl: url,
        theme: theme
      });

      backendUrlInput.value = url;
      applyTheme(theme);
      showStatus('✅ Settings saved successfully!', false);
    } catch (err) {
      showStatus('❌ Failed to save settings: ' + err.message, true);
    }
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
      const count = data.counts?.votes ?? 0;
      showStatus(`✅ Connection successful! Server status: ${data.status} (${count} votes registered)`, false);
    } catch (err) {
      showStatus(`❌ Connection failed: ${err.message}. Check your URL: ${url}`, true);
    } finally {
      testConnectionBtn.disabled = false;
      testConnectionBtn.textContent = '🔌 Test Connection';
    }
  });

  // Copy User UUID
  copyIdBtn.addEventListener('click', async () => {
    if (userIdDisplay.value && userIdDisplay.value !== 'Generating...') {
      try {
        await navigator.clipboard.writeText(userIdDisplay.value);
        const originalText = copyIdBtn.textContent;
        copyIdBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyIdBtn.textContent = originalText;
        }, 1800);
      } catch (err) {
        userIdDisplay.select();
        document.execCommand('copy');
        showStatus('📋 UUID copied to clipboard!', false);
      }
    }
  });

  loadSettings();
})();
