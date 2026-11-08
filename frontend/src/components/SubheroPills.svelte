<script>
  import { getApiBase } from '../api.js';

  export let onScroll = (id) => {};
  $: apiBase = getApiBase();
</script>

<div class="subhero-pills-bar">
  <div class="subhero-pills-inner">
    <a href="#extensionDownloadSection" class="subhero-pill" on:click|preventDefault={() => onScroll('extensionDownloadSection')}>
      📥 Install Extension
    </a>
    <a href="#statsSection" class="subhero-pill" on:click|preventDefault={() => onScroll('statsSection')}>
      Global Statistics
    </a>
    <a href="{apiBase}/export/csv?type=projects" class="subhero-pill">
      Open Data (CSV)
    </a>
  </div>
</div>
