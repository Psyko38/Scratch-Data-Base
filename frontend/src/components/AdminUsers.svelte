<script>
  import { onMount } from 'svelte';
  import { isAdminLoggedIn } from '../stores/auth.js';
  import { fetchAdminUsers, banUser, unbanUser, formatDate } from '../api.js';
  import { showToast } from '../stores/toast.js';

  export let onVotesChanged = () => {};

  let users = [];
  let totalUsers = 0;
  let bannedUsers = 0;
  let filterText = '';
  let isExpanded = false;
  let loading = false;
  let errorMsg = '';

  $: filteredUsers = filterText.trim()
    ? users.filter(u => u.userId.toLowerCase().includes(filterText.trim().toLowerCase()))
    : users;

  async function loadUsers() {
    if (!$isAdminLoggedIn) return;
    loading = true;
    errorMsg = '';
    try {
      const data = await fetchAdminUsers();
      users = data.users || [];
      totalUsers = data.totalUsers || 0;
      bannedUsers = data.bannedUsers || 0;
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
    }
  }

  function handleFilterInput() {
    if (filterText.trim().length > 0) {
      isExpanded = true;
    }
  }

  async function handleBanClick(userId) {
    const purge = confirm(`Ban user ${userId}?\n\nClick OK to also delete all their submitted votes, or Cancel to ban them without deleting past votes.`);
    try {
      const data = await banUser(userId, purge);
      showToast(`User banned.${purge ? ' Removed ' + data.deletedVotesCount + ' votes.' : ''}`, 'success');
      await loadUsers();
      if (purge) onVotesChanged();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function handleUnbanClick(userId) {
    try {
      await unbanUser(userId);
      showToast(`User ${userId} unbanned`, 'success');
      await loadUsers();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function handleBanByUuid() {
    const uuid = filterText.trim();
    if (!uuid || uuid.length < 8) {
      showToast('Please enter a valid user UUID in the input field', 'error');
      return;
    }
    await handleBanClick(uuid);
  }

  function toggleExpanded() {
    isExpanded = !isExpanded;
  }

  function refresh() {
    loadUsers();
    showToast('User list refreshed', 'info');
  }

  $: if ($isAdminLoggedIn) {
    loadUsers();
  }
</script>

{#if $isAdminLoggedIn}
  <section id="adminUsersSection" class="scratch-box admin-box">
    <div class="scratch-box-header admin-box-header">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <h2 class="scratch-box-title" style="color: var(--scratch-purple-dark);">🛡️ Administration – User Management</h2>
        <span id="adminUsersSummaryBadge" class="badge badge-insufficient">
          {totalUsers} users • {bannedUsers} banned
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <input
          type="text"
          id="filterUsersInput"
          class="admin-user-search"
          placeholder="Filter or ban UUID..."
          bind:value={filterText}
          on:input={handleFilterInput}
        />
        <button id="banByUuidBtn" class="btn btn-sm inspect-btn" title="Ban entered UUID" on:click={handleBanByUuid}>
          Ban UUID
        </button>
        <button id="refreshUsersBtn" class="box-header-link" on:click={refresh}>
          ↻ Refresh
        </button>
        <button id="toggleAdminUsersBtn" class="btn btn-sm btn-secondary" type="button" on:click={toggleExpanded}>
          {isExpanded ? '▲ Hide List' : '▼ Show List'}
        </button>
      </div>
    </div>

    {#if isExpanded}
      <div id="adminUsersBody" class="scratch-box-body admin-users-body">
        <div class="table-responsive admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>User UUID</th>
                <th>Status</th>
                <th>Total Votes</th>
                <th>Breakdown (AI / Human)</th>
                <th>Last Activity</th>
                <th>User Action</th>
              </tr>
            </thead>
            <tbody id="adminUsersTableBody">
              {#if loading}
                <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">Loading users...</td></tr>
              {:else if errorMsg}
                <tr><td colspan="6" style="text-align:center; color: var(--scratch-stop-text); padding: 1rem;">Error: {errorMsg}</td></tr>
              {:else if filteredUsers.length === 0}
                <tr><td colspan="6" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No users found.</td></tr>
              {:else}
                {#each filteredUsers as u (u.userId)}
                  <tr>
                    <td>
                      <span class="code-id">{u.userId}</span>
                    </td>
                    <td>
                      {#if u.isBanned}
                        <span class="badge badge-banned">🚫 Banned</span>
                      {:else}
                        <span class="badge badge-human">✅ Active</span>
                      {/if}
                    </td>
                    <td><strong>{u.totalVotes}</strong></td>
                    <td style="font-size: 0.8rem;">
                      <span style="color: var(--scratch-stop-text); font-weight: 700;">🤖 {u.aiVotes} AI</span> •
                      <span style="color: var(--scratch-green-text); font-weight: 700;">👤 {u.humanVotes} Human</span>
                    </td>
                    <td style="font-size: 0.8rem; color: var(--text-muted);">{formatDate(u.lastActivity || u.updatedAt)}</td>
                    <td>
                      {#if !u.isBanned}
                        <button class="btn btn-sm btn-danger admin-ban-btn" on:click={() => handleBanClick(u.userId)}>
                          🚫 Ban User
                        </button>
                      {:else}
                        <button class="btn btn-sm btn-secondary admin-unban-btn" on:click={() => handleUnbanClick(u.userId)}>
                          ✅ Unban
                        </button>
                      {/if}
                    </td>
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    {/if}
  </section>
{/if}
