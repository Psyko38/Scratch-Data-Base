<script>
  import { fetchProjectHistory, formatDate } from '../api.js';

  export let projectId = null;
  export let isOpen = false;
  export let onClose = () => {};

  let loading = false;
  let errorMsg = '';
  let project = null;
  let votes = [];

  $: if (isOpen && projectId) {
    loadProject(projectId);
  }

  async function loadProject(id) {
    loading = true;
    errorMsg = '';
    project = null;
    votes = [];
    try {
      const data = await fetchProjectHistory(id);
      project = data.project;
      votes = data.votes || [];
    } catch (err) {
      errorMsg = err.message;
    } finally {
      loading = false;
    }
  }

  function getVerdictBadge(verdict) {
    switch (verdict) {
      case 'AI-generated':
        return { cls: 'badge-ai', text: '🤖 AI-generated' };
      case 'Human-created':
        return { cls: 'badge-human', text: '👤 Human-created' };
      case 'Undetermined':
        return { cls: 'badge-undetermined', text: '⚖️ Undetermined' };
      default:
        return { cls: 'badge-insufficient', text: '⏳ Insufficient data (<5 votes)' };
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
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h2 id="modalProjectTitle">Project Community Verdict: #{projectId}</h2>
          <a
            id="modalScratchLink"
            href="https://scratch.mit.edu/projects/{projectId}/"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
            style="font-size: 0.85rem;"
          >
            View on Scratch ↗
          </a>
        </div>
        <button id="closeModalBtn" class="close-btn" on:click={onClose}>&times;</button>
      </div>

      <div class="modal-body">
        {#if loading}
          <div class="modal-stats-box" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
            Loading project details...
          </div>
        {:else if errorMsg}
          <div class="modal-stats-box" style="color: var(--scratch-stop-text); padding: 1rem;">
            Failed to load project details: {errorMsg}
          </div>
        {:else if project}
          {@const badge = getVerdictBadge(project.verdict)}
          <div class="modal-stats-box">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 14px;">
                <img
                  src="https://uploads.scratch.mit.edu/get_image/project/{project.projectId}_282x210.png"
                  alt="Thumbnail"
                  style="width: 96px; height: 72px; object-fit: cover; border-radius: 6px; border: 1px solid #ddd; background: #eee;"
                  on:error={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <div>
                  <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; color: var(--text-dark);">
                    Verdict: <span class="badge {badge.cls}">{badge.text}</span>
                  </div>
                  <div style="font-size: 0.84rem; color: var(--text-muted);">
                    Total Votes: <strong>{project.totalVotes}</strong>
                    ({project.isReliable ? 'Reaches 5+ vote reliability threshold' : 'Under 5 votes - insufficient data'})
                  </div>
                  <p style="font-size: 0.74rem; color: var(--text-dim); margin-top: 5px;">
                    ⚠️ Community verdict based on human votes, not a technically verified AI detection result.
                  </p>
                </div>
              </div>
              <div style="min-width: 210px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">
                  <span style="color: var(--scratch-stop-text);">🤖 AI: {project.aiVotes} ({project.aiPercentage}%)</span>
                  <span style="color: var(--scratch-green-text);">👤 Human: {project.humanVotes} ({project.humanPercentage}%)</span>
                </div>
                <div class="ratio-bar" style="height: 10px;">
                  <div class="ratio-ai" style="width: {project.aiPercentage}%;"></div>
                  <div class="ratio-human" style="width: {project.humanPercentage}%;"></div>
                </div>
              </div>
            </div>
          </div>

          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">Community Vote Log (Read-Only)</h4>

          <div class="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Voter (Masked UUID)</th>
                  <th>Vote</th>
                  <th>Submitted At</th>
                </tr>
              </thead>
              <tbody id="modalVotesTableBody">
                {#if votes.length === 0}
                  <tr><td colspan="3" style="text-align:center; color: var(--text-muted); padding: 1rem;">No individual votes recorded for this project yet.</td></tr>
                {:else}
                  {#each votes as v}
                    <tr>
                      <td>
                        <span class="code-id">{v.maskedUserId}</span>
                      </td>
                      <td>
                        {#if v.vote === 'ai'}
                          <span class="badge badge-ai">🤖 AI</span>
                        {:else}
                          <span class="badge badge-human">👤 Human</span>
                        {/if}
                      </td>
                      <td style="font-size: 0.82rem; color: var(--text-muted);">{formatDate(v.createdAt)}</td>
                    </tr>
                  {/each}
                {/if}
              </tbody>
            </table>
          </div>
        {/if}
      </div>

      <div class="modal-footer">
        <button id="modalDoneBtn" class="btn btn-secondary" on:click={onClose}>Close</button>
      </div>
    </div>
  </div>
{/if}
