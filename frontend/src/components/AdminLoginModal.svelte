<script>
  import { adminLogin } from '../api.js';
  import { setLoggedIn } from '../stores/auth.js';
  import { showToast } from '../stores/toast.js';

  export let isOpen = false;
  export let onClose = () => {};
  export let onSuccess = (username) => {};

  let username = '';
  let password = '';
  let errorMsg = '';
  let loading = false;

  async function handleSubmit(e) {
    e.preventDefault();
    errorMsg = '';
    loading = true;

    try {
      const data = await adminLogin(username.trim(), password);
      setLoggedIn(data.admin.username);
      showToast(`Signed in as ${data.admin.username}`, 'success');
      onSuccess(data.admin.username);
      username = '';
      password = '';
      onClose();
    } catch (err) {
      errorMsg = err.message || 'Invalid credentials';
    } finally {
      loading = false;
    }
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

{#if isOpen}
  <div
    class="modal-overlay"
    on:click={handleOverlayClick}
    on:keydown={(e) => e.key === 'Escape' && onClose()}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div class="modal-card" style="max-width: 400px;">
      <div class="modal-header">
        <h2>🛡️ Administrator Sign In</h2>
        <button id="closeAdminLoginBtn" class="close-btn" on:click={onClose}>&times;</button>
      </div>
      <form id="adminLoginForm" class="modal-body" on:submit={handleSubmit}>
        <p style="font-size: 0.84rem; color: var(--text-muted); margin-bottom: 1rem;">
          Sign in to unlock the User Management panel directly on this page.
        </p>
        <div class="form-group">
          <label for="adminUsernameInput">Username</label>
          <input
            type="text"
            id="adminUsernameInput"
            class="form-input"
            placeholder="admin"
            required
            autocomplete="username"
            bind:value={username}
          />
        </div>
        <div class="form-group">
          <label for="adminPasswordInput">Password</label>
          <input
            type="password"
            id="adminPasswordInput"
            class="form-input"
            placeholder="••••••••"
            required
            autocomplete="current-password"
            bind:value={password}
          />
        </div>
        {#if errorMsg}
          <div id="adminLoginError" class="login-error">{errorMsg}</div>
        {/if}
        <button
          type="submit"
          id="adminLoginSubmitBtn"
          class="btn btn-primary"
          style="width: 100%; margin-top: 0.5rem;"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  </div>
{/if}
