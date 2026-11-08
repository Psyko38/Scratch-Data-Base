<script>
  import { getApiBase } from '../api.js';

  export let metrics = { totalVotes: 0, totalProjects: 0 };
  export let onFocusSearch = () => {};
  export let onScrollToStats = () => {};

  $: apiBase = getApiBase();
</script>

<section class="scratch-hero">
  <div class="scratch-hero-inner">
    <div class="hero-left">
      <h1 class="hero-heading">
        Detect AI-generated projects and celebrate human creativity.<br>
        Share your classifications with the Scratch community.
      </h1>
      <span class="sr-only">Scratch AI Detection Community Explorer</span>
      <div class="hero-cta-group">
        <a href="{apiBase}/extension/download?browser=chrome" class="hero-btn hero-btn-primary" style="text-decoration: none;">
          <span class="cta-icon">🌐</span> Chrome Extension (.zip)
        </a>
        <a href="{apiBase}/extension/download?browser=firefox" class="hero-btn hero-btn-secondary" style="text-decoration: none;">
          <span class="cta-icon">🦊</span> Firefox Extension (.zip)
        </a>
        <button id="focusSearchBtn" class="hero-btn hero-btn-secondary" on:click={onFocusSearch}>
          <span class="cta-icon">✨</span> Inspect Project
        </button>
      </div>
    </div>

    <!-- Right Visual Illustration -->
    <div class="hero-right">
      <div class="hero-illustration">
        <div class="floating-shape shape-brush">🖌️</div>
        <div class="floating-shape shape-block-yellow"></div>
        <div class="floating-shape shape-block-pink"></div>
        <div class="floating-shape shape-block-purple"></div>
        <div class="floating-shape shape-drum">🥁</div>
        <div class="floating-shape shape-Spark">🤖</div>

        <div
          class="hero-preview-card"
          id="heroPreviewCard"
          title="View live community statistics"
          role="button"
          tabindex="0"
          on:click={onScrollToStats}
          on:keydown={(e) => e.key === 'Enter' && onScrollToStats()}
        >
          <div class="preview-screen">
            <div class="preview-play-circle">
              <span>🔍</span>
            </div>
            <div class="preview-live-stats">
              <span id="heroQuickVotes">{metrics?.totalVotes?.toLocaleString() || 0} votes</span> •
              <span id="heroQuickProjects">{metrics?.totalProjects?.toLocaleString() || 0} projects</span>
            </div>
          </div>
          <div class="preview-caption-pill">Explore Database</div>
        </div>
      </div>
    </div>
  </div>
</section>
