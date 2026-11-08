<script>
  export let title = '';
  export let projects = [];
  export let emptyMsg = 'No projects found.';
  export let headerActionText = '';
  export let headerActionHref = '';
  export let headerActionExternal = false;
  export let onHeaderAction = null;
  export let onInspectProject = (id) => {};

  let trackEl;

  function scroll(direction) {
    if (!trackEl) return;
    const amount = 340;
    trackEl.scrollBy({ left: direction === 'prev' ? -amount : amount, behavior: 'smooth' });
  }

  function getThumbPill(p) {
    if (p.verdict === 'AI-generated') {
      return { cls: 'thumb-verdict-ai', text: `🤖 AI ${p.aiPercentage}%` };
    }
    if (p.verdict === 'Human-created') {
      return { cls: 'thumb-verdict-human', text: `👤 Human ${p.humanPercentage}%` };
    }
    if (p.aiVotes > p.humanVotes) {
      return { cls: 'thumb-verdict-other', text: `🤖 ${p.aiPercentage}% AI` };
    }
    if (p.humanVotes > p.aiVotes) {
      return { cls: 'thumb-verdict-other', text: `👤 ${p.humanPercentage}% Human` };
    }
    return { cls: 'thumb-verdict-other', text: `⚖️ ${p.totalVotes} votes` };
  }
</script>

<section class="scratch-box">
  <div class="scratch-box-header">
    <h2 class="scratch-box-title">{title}</h2>
    {#if headerActionText}
      {#if onHeaderAction}
        <button class="box-header-link" on:click={onHeaderAction}>{headerActionText}</button>
      {:else if headerActionExternal}
        <a href={headerActionHref} target="_blank" rel="noopener noreferrer" class="box-header-link">
          {headerActionText}
        </a>
      {:else}
        <a href={headerActionHref} class="box-header-link">
          {headerActionText}
        </a>
      {/if}
    {/if}
  </div>

  <div class="carousel-wrapper">
    <button class="carousel-arrow carousel-prev" aria-label="Previous" on:click={() => scroll('prev')}>
      &#8249;
    </button>

    <div class="carousel-track" bind:this={trackEl}>
      {#if !projects || projects.length === 0}
        <div class="carousel-empty">{emptyMsg}</div>
      {:else}
        {#each projects as p (p.projectId)}
          {@const pill = getThumbPill(p)}
          <div
            class="scratch-thumb-card"
            title="Inspect Project #{p.projectId}"
            role="button"
            tabindex="0"
            on:click={() => onInspectProject(p.projectId)}
            on:keydown={(e) => e.key === 'Enter' && onInspectProject(p.projectId)}
          >
            <div class="thumb-image-wrap">
              <img
                src="https://uploads.scratch.mit.edu/get_image/project/{p.projectId}_282x210.png"
                alt="Scratch Project {p.projectId}"
                class="thumb-image"
                loading="lazy"
                on:error={(e) => { e.currentTarget.style.opacity = '0.15'; }}
              />
              <span class="thumb-verdict-pill {pill.cls}">{pill.text}</span>
            </div>
            <div class="thumb-title">Project #{p.projectId}</div>
            <div class="thumb-author">
              {p.totalVotes} vote{p.totalVotes === 1 ? '' : 's'} ({p.aiVotes} AI • {p.humanVotes} Human)
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <button class="carousel-arrow carousel-next" aria-label="Next" on:click={() => scroll('next')}>
      &#8250;
    </button>
  </div>
</section>
