<script>
  export let metrics = {
    totalUsers: 0,
    totalProjects: 0,
    totalVotes: 0,
    aiVotes: 0,
    humanVotes: 0,
    aiPercentage: 0,
    humanPercentage: 0
  };
  export let topProjects = [];
  export let onInspectProject = (id) => {};

  $: aiRatio = metrics?.totalVotes > 0 ? metrics.aiPercentage : 50;
  $: humanRatio = metrics?.totalVotes > 0 ? metrics.humanPercentage : 50;

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
</script>

<section class="scratch-box" id="statsSection">
  <div class="scratch-box-header">
    <h2 class="scratch-box-title">Global Community Statistics</h2>
    <span class="box-header-sub">1 vote per user guaranteed • Real-time aggregation</span>
  </div>
  <div class="scratch-box-body">
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Total Voters</div>
        <div id="metricTotalUsers" class="metric-value">
          {metrics?.totalUsers?.toLocaleString() || 0}
        </div>
        <div class="metric-sub">Anonymous participants</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Indexed Projects</div>
        <div id="metricTotalProjects" class="metric-value">
          {metrics?.totalProjects?.toLocaleString() || 0}
        </div>
        <div class="metric-sub">Across scratch.mit.edu</div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Total Votes</div>
        <div id="metricTotalVotes" class="metric-value">
          {metrics?.totalVotes?.toLocaleString() || 0}
        </div>
        <div id="metricVoteBreakdown" class="metric-sub">
          {metrics?.aiVotes?.toLocaleString() || 0} AI ({metrics?.aiPercentage || 0}%) •
          {metrics?.humanVotes?.toLocaleString() || 0} Human ({metrics?.humanPercentage || 0}%)
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">Global AI / Human Ratio</div>
        <div class="ratio-container">
          <div class="ratio-bar">
            <div id="globalRatioAi" class="ratio-ai" style="width: {aiRatio}%;"></div>
            <div id="globalRatioHuman" class="ratio-human" style="width: {humanRatio}%;"></div>
          </div>
          <div class="ratio-labels">
            <span id="globalAiLabel" style="color: var(--scratch-stop-text);">🤖 AI: {aiRatio}%</span>
            <span id="globalHumanLabel" style="color: var(--scratch-green-text);">👤 Human: {humanRatio}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Detailed Table of Most Voted Projects -->
    <details class="detailed-table-details">
      <summary class="detailed-table-summary">📊 View Detailed Table of Most Voted Projects</summary>
      <div class="table-responsive" style="margin-top: 1rem;">
        <table>
          <thead>
            <tr>
              <th>Project ID</th>
              <th>Total Votes</th>
              <th>AI Votes</th>
              <th>Human Votes</th>
              <th>Community Ratio</th>
              <th>Verdict</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="topProjectsTableBody">
            {#if !topProjects || topProjects.length === 0}
              <tr><td colspan="7" style="text-align:center; color: var(--text-muted); padding: 1.5rem;">No projects classified yet.</td></tr>
            {:else}
              {#each topProjects as p (p.projectId)}
                {@const badge = getVerdictBadge(p.verdict)}
                <tr>
                  <td>
                    <span class="code-id">{p.projectId}</span>
                    <a href={p.scratchUrl} target="_blank" rel="noopener noreferrer" class="external-link" title="Open on Scratch">↗</a>
                  </td>
                  <td><strong>{p.totalVotes?.toLocaleString() || 0}</strong></td>
                  <td style="color: var(--scratch-stop-text); font-weight: 700;">
                    {p.aiVotes?.toLocaleString() || 0} ({p.aiPercentage}%)
                  </td>
                  <td style="color: var(--scratch-green-text); font-weight: 700;">
                    {p.humanVotes?.toLocaleString() || 0} ({p.humanPercentage}%)
                  </td>
                  <td style="min-width: 140px;">
                    <div class="ratio-bar" style="height: 8px;">
                      <div class="ratio-ai" style="width: {p.aiPercentage}%;"></div>
                      <div class="ratio-human" style="width: {p.humanPercentage}%;"></div>
                    </div>
                  </td>
                  <td>
                    <span class="badge {badge.cls}">{badge.text}</span>
                  </td>
                  <td>
                    <button class="btn btn-sm inspect-btn inspect-project-btn" on:click={() => onInspectProject(p.projectId)}>
                      🔍 Inspect
                    </button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </details>
  </div>
</section>
