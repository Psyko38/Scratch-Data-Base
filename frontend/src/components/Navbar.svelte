<script>
  import { isAdminLoggedIn, adminUser, logout } from '../stores/auth.js';
  import { currentTheme, toggleTheme } from '../stores/theme.js';
  import { showToast } from '../stores/toast.js';

  export let onSearch = (id) => {};
  export let onOpenAdminLogin = () => {};
  export let onNavigate = (view, hash) => {};

  let searchInput = '';

  function handleSearchSubmit(e) {
    e.preventDefault();
    const cleanId = searchInput.trim();
    if (cleanId && /^\d+$/.test(cleanId)) {
      onSearch(cleanId);
    }
  }

  async function handleLogout() {
    await logout();
    showToast('Signed out of administrator mode', 'info');
  }

  function handleLogoClick(e) {
    e.preventDefault();
    onNavigate('explorer', '');
  }

  function handleNavClick(e, hash) {
    e.preventDefault();
    onNavigate('explorer', hash);
  }
</script>

<header class="scratch-navbar">
  <div class="scratch-navbar-inner">
    <div class="nav-left">
      <a href="./" class="scratch-logo" title="Scratch AI – Community Explorer" on:click={handleLogoClick}>
        <span class="logo-bubble">Scratch AI</span>
      </a>
      <nav class="nav-links">
        <a href="#carouselsSection" class="nav-link" on:click={(e) => handleNavClick(e, 'carouselsSection')}>Explore</a>
        <a href="#statsSection" class="nav-link" on:click={(e) => handleNavClick(e, 'statsSection')}>Stats</a>
        <a href="#extensionDownloadSection" class="nav-link" on:click={(e) => handleNavClick(e, 'extensionDownloadSection')}>Extension</a>
        {#if $isAdminLoggedIn}
          <a href="#adminUsersSection" id="navAdminUsersLink" class="nav-link" on:click={(e) => handleNavClick(e, 'adminUsersSection')}>Users</a>
        {/if}
      </nav>
    </div>

    <!-- Scratch Top Search Bar -->
    <form id="searchProjectForm" class="nav-search-form" on:submit={handleSearchSubmit}>
      <span class="search-icon">🔍</span>
      <input
        type="text"
        id="searchProjectIdInput"
        class="nav-search-input"
        placeholder="Search Project ID..."
        pattern="\d+"
        required
        bind:value={searchInput}
      />
    </form>

    <div class="nav-right">
      <button
        id="themeToggleBtn"
        class="nav-icon-btn"
        title="Toggle Light/Dark Mode"
        on:click={toggleTheme}
      >
        {$currentTheme === 'dark' ? '☀️' : '🌙'}
      </button>

      {#if !$isAdminLoggedIn}
        <button
          id="openAdminLoginBtn"
          class="nav-action-btn"
          title="Sign in as administrator"
          on:click={onOpenAdminLogin}
        >
          Sign In
        </button>
      {:else}
        <div id="adminNavControls" class="admin-nav-controls">
          <a
            href="#adminUsersSection"
            id="adminBadgeBtn"
            class="nav-admin-badge"
            title="Go to User Management"
            on:click={(e) => handleNavClick(e, 'adminUsersSection')}
          >
            🛡️ <span id="adminUsernameText">{$adminUser?.username || 'admin'}</span>
          </a>
          <button
            id="adminLogoutBtn"
            class="nav-action-link"
            title="Sign out"
            on:click={handleLogout}
          >
            Sign Out
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>
