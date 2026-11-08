<script>
  import { formatDate } from '../api.js';

  export let votes = [];
  export let onInspectProject = (id) => {};
</script>

<section class="scratch-box" id="recentVotesSection">
  <div class="scratch-box-header">
    <h2 class="scratch-box-title">Recent Activity – Latest Community Votes</h2>
    <span class="box-header-sub">Live stream of submitted classifications</span>
  </div>
  <div class="scratch-box-body">
    <div class="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Scratch Project</th>
            <th>Voter (Masked UUID)</th>
            <th>Vote Cast</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="recentVotesTableBody">
          {#if !votes || votes.length === 0}
            <tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No recent votes yet.</td></tr>
          {:else}
            {#each votes as v}
              <tr>
                <td style="color: var(--text-muted); font-size: 0.8rem;">{formatDate(v.createdAt)}</td>
                <td>
                  <span class="code-id">#{v.projectId}</span>
                  <a href={v.scratchUrl} target="_blank" rel="noopener noreferrer" class="external-link">↗</a>
                </td>
                <td>
                  <span class="code-id" style="color: var(--text-dim);">{v.maskedUserId}</span>
                </td>
                <td>
                  {#if v.vote === 'ai'}
                    <span class="badge badge-ai">🤖 AI</span>
                  {:else}
                    <span class="badge badge-human">👤 Human</span>
                  {/if}
                </td>
                <td>
                  <button class="btn btn-sm inspect-btn inspect-project-btn" on:click={() => onInspectProject(v.projectId)}>
                    View Project
                  </button>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </div>
</section>
